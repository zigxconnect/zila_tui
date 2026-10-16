import test from "node:test";
import assert from "node:assert/strict";
import { checkEvaluationQuota } from "../dist/utils/billingGuard.js";

test("checkEvaluationQuota allows submissions under 5 free tasks", () => {
  const status = checkEvaluationQuota(3, false);
  assert.equal(status.canSubmit, true);
  assert.equal(status.freeTasksUsed, 3);
  assert.equal(status.freeTasksMax, 5);
  assert.equal(status.hasPaid, false);
});

test("checkEvaluationQuota blocks submission when 5 free tasks are reached without payment", () => {
  const status = checkEvaluationQuota(5, false, "student-123", "cohort-456");
  assert.equal(status.canSubmit, false);
  assert.equal(status.freeTasksUsed, 5);
  assert.ok(status.checkoutUrl?.includes("student-123"));
  assert.ok(status.checkoutUrl?.includes("cohort-456"));
});

test("checkEvaluationQuota allows unlimited submissions when student has paid", () => {
  const status = checkEvaluationQuota(15, true);
  assert.equal(status.canSubmit, true);
  assert.equal(status.hasPaid, true);
});
