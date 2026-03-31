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

  const response = await request(app).post("/api/users").send({
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
