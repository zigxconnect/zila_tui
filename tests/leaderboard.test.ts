import test from "node:test";
import assert from "node:assert/strict";
import { fetchLeaderboardData } from "../dist/screens/LeaderboardScreen.js";

test("Leaderboard loads real students from the same active cohort as group", async () => {
  const requests: string[] = [];
  const expectedEntries = [
    {
      rank: 1,
      studentId: "student-1",
      studentName: "Actual Student",
      studentEmail: "actual@example.com",
      totalPoints: 340,
      latestScore: 91,
    },
    {
      rank: 2,
      studentId: "student-2",
      studentName: "Another Student",
      studentEmail: "another@example.com",
      totalPoints: 275,
      latestScore: 84,
    },
  ];

  const request = async <T>(endpoint: string): Promise<T> => {
    requests.push(endpoint);
    if (endpoint === "/cohorts/group") {
      return {
        cohort: { id: "cohort-123", name: "Real cohort" },
        peers: [{ studentEmail: "another@example.com" }],
      } as T;
    }
    return { leaderboard: expectedEntries } as T;
  };

  const data = await fetchLeaderboardData(request);

  assert.deepEqual(requests, [
    "/cohorts/group",
    "/gamification/leaderboard/cohort-123?limit=2",
  ]);
  assert.equal(data.cohortName, "Real cohort");
  assert.deepEqual(data.entries.map((entry) => entry.studentEmail), [
    "actual@example.com",
    "another@example.com",
  ]);
});

test("Leaderboard does not fabricate entries without an active group", async () => {
  const requests: string[] = [];
  const request = async <T>(endpoint: string): Promise<T> => {
    requests.push(endpoint);
    return { cohort: null, peers: [] } as T;
  };

  const data = await fetchLeaderboardData(request);

  assert.deepEqual(requests, ["/cohorts/group"]);
  assert.equal(data.cohortName, null);
  assert.deepEqual(data.entries, []);
});