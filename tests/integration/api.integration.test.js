import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../../server.js";
import { pool } from "../../config/db.js";

let adminToken = "";
let memberToken = "";
let memberOperatorId = 0;
let createdTaskId = 0;
let lowClearanceEmail = "";

const uniqueSuffix = Date.now();

before(async () => {
  const memberLogin = await request(app).post("/api/auth/login").send({
    email: "m.vance@opstrack.mil",
    password: "password123",
  });

  assert.equal(memberLogin.status, 200);
  assert.equal(typeof memberLogin.body.token, "string");
  memberToken = memberLogin.body.token;
  memberOperatorId = memberLogin.body.operator.id;

  const adminLogin = await request(app).post("/api/auth/login").send({
    email: "k.mills@opstrack.mil",
    password: "password123",
  });

  assert.equal(adminLogin.status, 200);
  assert.equal(typeof adminLogin.body.token, "string");
  adminToken = adminLogin.body.token;
});

after(async () => {
  if (createdTaskId) {
    await pool.query("DELETE FROM tasks WHERE id = $1", [createdTaskId]);
  }

  if (lowClearanceEmail) {
    await pool.query("DELETE FROM users WHERE LOWER(email) = LOWER($1)", [
      lowClearanceEmail,
    ]);
  }

  await pool.end();
});

test("GET /healthz returns liveness status", async () => {
  const response = await request(app).get("/healthz");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: "ok" });
});

test("POST /api/auth/login rejects invalid payload", async () => {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ email: "not-an-email" });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "Payload validation failed");
  assert.ok(Array.isArray(response.body.errors));
});

test("GET /api/users requires bearer token", async () => {
  const response = await request(app).get("/api/users");

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
  assert.equal(
    response.body.message,
    "Access Denied: No valid token provided.",
  );
});

test("GET /api/tasks/1 requires bearer token", async () => {
  const response = await request(app).get("/api/tasks/1");

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
  assert.equal(
    response.body.message,
    "Access Denied: No valid token provided.",
  );
});

test("GET /api/tasks/1/audit-logs requires bearer token", async () => {
  const response = await request(app).get("/api/tasks/1/audit-logs");

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
  assert.equal(
    response.body.message,
    "Access Denied: No valid token provided.",
  );
});

test("POST /api/auth/login accepts valid credentials", async () => {
  const response = await request(app).post("/api/auth/login").send({
    email: "k.mills@opstrack.mil",
    password: "password123",
  });

  assert.equal(response.status, 200);
  assert.equal(typeof response.body.token, "string");
  assert.equal(response.body.operator.role, "ADMIN");
});

test("POST /api/auth/login denies deactivated account with specific error code", async () => {
  const newUserEmail = `integration.disabled.${uniqueSuffix}@opstrack.mil`;

  const created = await request(app)
    .post("/api/users")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      name: "Disabled Login User",
      email: newUserEmail,
      password: "password123",
      rank: "SGT",
    });

  assert.equal(created.status, 201);
  const userId = created.body.id;

  const deactivated = await request(app)
    .patch(`/api/users/${userId}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ is_active: false });

  assert.equal(deactivated.status, 200);

  const loginResponse = await request(app).post("/api/auth/login").send({
    email: newUserEmail,
    password: "password123",
  });

  assert.equal(loginResponse.status, 403);
  assert.equal(loginResponse.body.success, false);
  assert.equal(
    loginResponse.body.code,
    "ERR_AUTH_ACCOUNT_DEACTIVATED",
  );

  await pool.query("DELETE FROM users WHERE id = $1", [userId]);
});

test("GET /api/tasks returns paginated response for authenticated member", async () => {
  const response = await request(app)
    .get("/api/tasks?limit=5&offset=0")
    .set("Authorization", `Bearer ${memberToken}`);

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.data));
  assert.equal(typeof response.body.meta.total, "number");
});

test("GET /api/tasks/audit-logs denies non-admin users", async () => {
  const response = await request(app)
    .get("/api/tasks/audit-logs")
    .set("Authorization", `Bearer ${memberToken}`);

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
});

test("POST /api/users requires admin role", async () => {
  const response = await request(app)
    .post("/api/users")
    .set("Authorization", `Bearer ${memberToken}`)
    .send({
      name: "Unauthorized User",
      email: `integration.unauth.${uniqueSuffix}@opstrack.mil`,
      password: "password123",
      rank: "PVT",
    });

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
});

test("POST /api/tasks creates a task for authenticated member", async () => {
  const response = await request(app)
    .post("/api/tasks")
    .set("Authorization", `Bearer ${memberToken}`)
    .send({
      title: `Integration Task ${uniqueSuffix}`,
      description: "Created by integration test",
      priority_level: "MEDIUM",
      assigned_to: memberOperatorId,
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.title, `Integration Task ${uniqueSuffix}`);
  createdTaskId = response.body.id;
});

test("POST /api/users creates a low-clearance operator", async () => {
  lowClearanceEmail = `integration.pvt.${uniqueSuffix}@opstrack.mil`;

  const response = await request(app)
    .post("/api/users")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      name: "Integration Private",
      email: lowClearanceEmail,
      password: "password123",
      rank: "PVT",
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.email, lowClearanceEmail);
  assert.equal(response.body.clearance_level, "UNCLASSIFIED");
});

test("PATCH /api/tasks/:id denies low-clearance user", async () => {
  const loginResponse = await request(app).post("/api/auth/login").send({
    email: lowClearanceEmail,
    password: "password123",
  });

  assert.equal(loginResponse.status, 200);

  const patchResponse = await request(app)
    .patch(`/api/tasks/${createdTaskId}`)
    .set("Authorization", `Bearer ${loginResponse.body.token}`)
    .send({ priority_level: "HIGH" });

  assert.equal(patchResponse.status, 403);
  assert.equal(patchResponse.body.success, false);
});

test("PATCH /api/tasks/:id updates task for authorized user", async () => {
  const response = await request(app)
    .patch(`/api/tasks/${createdTaskId}`)
    .set("Authorization", `Bearer ${memberToken}`)
    .send({ priority_level: "CRITICAL" });

  assert.equal(response.status, 200);
  assert.equal(response.body.priority_level, "CRITICAL");
});

test("DELETE /api/tasks/:id allows admin deletion", async () => {
  const response = await request(app)
    .delete(`/api/tasks/${createdTaskId}`)
    .set("Authorization", `Bearer ${adminToken}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.message, "Task successfully purged from system.");
  createdTaskId = 0;
});

test("GET /api/users allows admin and returns paginated roster", async () => {
  const response = await request(app)
    .get("/api/users?limit=5&offset=0")
    .set("Authorization", `Bearer ${adminToken}`);

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.data));
  assert.equal(typeof response.body.meta.total, "number");
});

test("POST /api/users rejects duplicate email", async () => {
  const duplicateEmail = `integration.dup.${uniqueSuffix}@opstrack.mil`;

  const first = await request(app)
    .post("/api/users")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      name: "First User",
      email: duplicateEmail,
      password: "password123",
      rank: "PVT",
    });

  assert.equal(first.status, 201);

  const second = await request(app)
    .post("/api/users")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      name: "Second User",
      email: duplicateEmail,
      password: "password123",
      rank: "PVT",
    });

  assert.equal(second.status, 400);
  assert.equal(second.body.success, false);
  assert.match(second.body.message, /already registered/i);

  await pool.query("DELETE FROM users WHERE LOWER(email) = LOWER($1)", [
    duplicateEmail,
  ]);
});

test("GET /api/tasks/:id returns 404 for nonexistent task", async () => {
  const response = await request(app)
    .get("/api/tasks/999999")
    .set("Authorization", `Bearer ${memberToken}`);

  assert.equal(response.status, 404);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "Task not found");
});

test("PATCH /api/tasks/:id returns 404 for nonexistent task", async () => {
  const response = await request(app)
    .patch("/api/tasks/999999")
    .set("Authorization", `Bearer ${memberToken}`)
    .send({ priority_level: "HIGH" });

  assert.equal(response.status, 404);
  assert.equal(response.body.success, false);
});

test("PATCH /api/tasks/:id returns 400 for invalid task id", async () => {
  const response = await request(app)
    .patch("/api/tasks/abc")
    .set("Authorization", `Bearer ${memberToken}`)
    .send({ priority_level: "HIGH" });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "Invalid task id");
});

test("DELETE /api/tasks/:id returns 404 for nonexistent task", async () => {
  const response = await request(app)
    .delete("/api/tasks/999999")
    .set("Authorization", `Bearer ${adminToken}`);

  assert.equal(response.status, 404);
  assert.equal(response.body.success, false);
});

test("DELETE /api/tasks/:id returns 400 for invalid task id", async () => {
  const response = await request(app)
    .delete("/api/tasks/abc")
    .set("Authorization", `Bearer ${adminToken}`);

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "Invalid task id");
});

test("GET /api/users/:id requires admin role", async () => {
  const response = await request(app)
    .get("/api/users/1")
    .set("Authorization", `Bearer ${memberToken}`);

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
});

test("GET /api/users/:id returns 404 for nonexistent user", async () => {
  const response = await request(app)
    .get("/api/users/999999")
    .set("Authorization", `Bearer ${adminToken}`);

  assert.equal(response.status, 404);
  assert.equal(response.body.success, false);
});

test("PATCH /api/users/:id updates user clearance and name", async () => {
  const newUserEmail = `integration.updateable.${uniqueSuffix}@opstrack.mil`;

  const created = await request(app)
    .post("/api/users")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      name: "Before Update",
      email: newUserEmail,
      password: "password123",
      rank: "SGT",
    });

  assert.equal(created.status, 201);
  const userId = created.body.id;

  const updated = await request(app)
    .patch(`/api/users/${userId}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      name: "After Update",
      clearance_level: "SECRET",
    });

  assert.equal(updated.status, 200);
  assert.equal(updated.body.name, "After Update");
  assert.equal(updated.body.clearance_level, "SECRET");

  await pool.query("DELETE FROM users WHERE id = $1", [userId]);
});

test("PATCH /api/users/:id toggles is_active status", async () => {
  const newUserEmail = `integration.deactivate.${uniqueSuffix}@opstrack.mil`;

  const created = await request(app)
    .post("/api/users")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      name: "Deactivatable User",
      email: newUserEmail,
      password: "password123",
      rank: "CPL",
    });

  assert.equal(created.status, 201);
  const userId = created.body.id;
  assert.equal(created.body.is_active, true);

  const deactivated = await request(app)
    .patch(`/api/users/${userId}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ is_active: false });

  assert.equal(deactivated.status, 200);
  assert.equal(deactivated.body.is_active, false);

  await pool.query("DELETE FROM users WHERE id = $1", [userId]);
});

test("DELETE /api/users/:id requires admin role", async () => {
  const response = await request(app)
    .delete("/api/users/1")
    .set("Authorization", `Bearer ${memberToken}`);

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
});

test("GET /tasks/:id/audit-logs captures create action", async () => {
  if (!createdTaskId) return;

  const response = await request(app)
    .get(`/api/tasks/${createdTaskId}/audit-logs`)
    .set("Authorization", `Bearer ${memberToken}`);

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.data));
  assert.ok(response.body.data.length > 0);

  const createLog = response.body.data.find((log) => log.action === "CREATE");
  assert.ok(createLog);
  assert.equal(createLog.resource, `Task #${createdTaskId}`);
});

test("GET /api/tasks/audit-logs admin view returns full system log", async () => {
  const response = await request(app)
    .get("/api/tasks/audit-logs?limit=10&offset=0")
    .set("Authorization", `Bearer ${adminToken}`);

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.data));
  assert.ok(response.body.meta.total > 0);
});

test("PATCH with empty object rejected", async () => {
  if (!createdTaskId) return;

  const response = await request(app)
    .patch(`/api/tasks/${createdTaskId}`)
    .set("Authorization", `Bearer ${memberToken}`)
    .send({});

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});
