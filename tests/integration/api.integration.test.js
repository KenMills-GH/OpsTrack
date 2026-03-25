import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../../server.js";

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
  assert.equal(
    response.body.message,
    "Access Denied: No valid token provided.",
  );
});
