import test from "node:test";
import assert from "node:assert/strict";
import { fetchCohortOptions } from "../dist/screens/CohortPickerScreen.js";
import { groupCommand } from "../dist/commands/group.js";
import { leaderboardCommand } from "../dist/commands/gamification.js";

test("Cohort picker loads enrolled cohort names and IDs", async () => {
  const data = await fetchCohortOptions(async <T>(endpoint: string): Promise<T> => {
    assert.equal(endpoint, "/cohorts/my-cohorts");
    return {
      cohorts: [{ id: "cohort-1", name: "Machine Learning", department: "AI" }],
    } as T;
  });

  assert.deepEqual(data, [{ id: "cohort-1", name: "Machine Learning", department: "AI" }]);
});

test("group --cohorts opens the team picker", async () => {
  let selectedMode = "";
  await groupCommand.handler(["--cohorts"], () => {}, {
    startCohortPicker: (mode) => { selectedMode = mode; },
  } as any);
  assert.equal(selectedMode, "group");
});

test("leaderboard --cohorts opens the leaderboard picker", async () => {
  let selectedMode = "";
  await leaderboardCommand.handler(["--cohorts"], () => {}, {
    startCohortPicker: (mode) => { selectedMode = mode; },
  } as any);
  assert.equal(selectedMode, "leaderboard");
});