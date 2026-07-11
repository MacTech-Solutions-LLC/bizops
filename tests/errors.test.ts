import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AppError,
  AuthzError,
  NotFoundError,
  OperationalError,
  ValidationError,
  isAppError,
  toAppError,
} from "@/lib/errors";

test("AppError maps code to status and safe body", () => {
  const err = new AppError("boom", { code: "forbidden" });
  assert.equal(err.status, 403);
  assert.deepEqual(err.toResponseBody(), {
    error: "forbidden",
    message: "You do not have permission to perform this action.",
  });
});

test("NotFoundError is distinct from OperationalError", () => {
  assert.notEqual(new NotFoundError().status, new OperationalError().status);
  assert.equal(new NotFoundError().status, 404);
  assert.equal(new OperationalError().status, 503);
});

test("AuthzError is forbidden and never leaks internals", () => {
  const err = new AuthzError("user lacks org:govcon:write", {
    context: { userId: "u1" },
  });
  assert.equal(err.status, 403);
  assert.equal(err.toResponseBody().error, "forbidden");
  // The internal message is retained for logs but not exposed to the client.
  assert.equal(err.toResponseBody().message.includes("org:govcon"), false);
});

test("ValidationError surfaces field issues", () => {
  const err = new ValidationError("bad", { issues: { name: ["Required"] } });
  assert.equal(err.status, 422);
  assert.deepEqual(err.toResponseBody().issues, { name: ["Required"] });
});

test("toAppError wraps unknown throwables; isAppError guards", () => {
  const wrapped = toAppError(new Error("raw"));
  assert.ok(isAppError(wrapped));
  assert.equal(wrapped.code, "internal");
  assert.equal(isAppError("nope"), false);
});
