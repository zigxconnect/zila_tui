import test from "node:test";
import assert from "node:assert/strict";
import { parseGroupArguments } from "../dist/commands/group.js";

test("Group command accepts positional and named cohort IDs", () => {
  assert.deepEqual(parseGroupArguments(["cohort-1"]), {
    cohortId: "cohort-1",
    refresh: false,
  });
  assert.deepEqual(parseGroupArguments(["--cohort", "cohort-2"]), {
    cohortId: "cohort-2",
    refresh: false,
  });
  assert.deepEqual(parseGroupArguments(["-c", "cohort-3", "--refresh"]), {
    cohortId: "cohort-3",
    refresh: true,
  });
  assert.deepEqual(parseGroupArguments(["--cohort=cohort-4", "-r"]), {
    cohortId: "cohort-4",
    refresh: true,
  });
});

test("Group command rejects missing, duplicate, and unknown options", () => {
  assert.match(parseGroupArguments(["--cohort"]).error ?? "", /Missing cohort ID/);
  assert.match(parseGroupArguments(["--cohort", "one", "two"]).error ?? "", /only one cohort ID/);
  assert.match(parseGroupArguments(["--unknown"]).error ?? "", /Unknown group option/);
});