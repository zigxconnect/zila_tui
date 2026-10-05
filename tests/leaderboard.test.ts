import test from "node:test";
import assert from "node:assert/strict";
import { fetchLeaderboardData } from "../dist/screens/LeaderboardScreen.js";

test("Leaderboard loads real students from the same active cohort as group", async () => {
  const requests: string[] = [];
  const expectedEntries = [
    {
      rank: 1,
      studentId: "different-student-id",
      studentName: "Old Cohort Name",
      studentEmail: "FonyuyJudeGita@gmail.com",
      totalPoints: 340,
      latestScore: 91,
    },
    {
      rank: 2,
      studentId: "student-sanda",
      studentName: "Sanda Maurice",
      studentEmail: "sanda@example.com",
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
    if (endpoint === "/profile/me") {
      return {
        profile: {
          user_id: "authenticated-user-id",
          full_name: "Fonyuy Gita",
          email: "fonyuyjudegita@gmail.com",
        },
      } as T;
    }
    return { leaderboard: expectedEntries } as T;
  };

  const data = await fetchLeaderboardData(request, "fonyuyjudegita@gmail.com");

  assert.deepEqual(requests, [
    "/cohorts/group",
    "/gamification/leaderboard/cohort-123?limit=2",
    "/profile/me",
  ]);
  assert.equal(data.cohortName, "Real cohort");
  assert.deepEqual(data.entries.map((entry) => entry.studentEmail), [
    "FonyuyJudeGita@gmail.com",
    "sanda@example.com",
  ]);
  assert.equal(data.entries[0].name, "Fonyuy Gita");
  assert.equal(data.entries[1].name, "Sanda Maurice");
  assert.equal(data.currentStudentEmail, "fonyuyjudegita@gmail.com");
  assert.equal(data.entries[0].status, "none");
});

test("Leaderboard correctly maps pending, accepted, and rejected PR statuses", async () => {
  const request = async <T>(endpoint: string): Promise<T> => {
    if (endpoint === "/cohorts/group") {
      return {
        cohort: { id: "cohort-123", name: "AI/ML Track" },
        peers: [],
      } as T;
    }
    if (endpoint === "/profile/me") {
      return {
        profile: { user_id: "u1", full_name: "Alice", email: "alice@test.com" }
      } as T;
    }
    return {
      leaderboard: [
        { rank: 1, studentId: "s1", studentName: "Alice", studentEmail: "alice@test.com", totalPoints: 100, latestScore: 90, status: "accepted" },
        { rank: 2, studentId: "s2", studentName: "Bob", studentEmail: "bob@test.com", totalPoints: 80, latestScore: 75, status: "pending" },
        { rank: 3, studentId: "s3", studentName: "Charlie", studentEmail: "charlie@test.com", totalPoints: 50, latestScore: 60, status: "rejected" },
      ]
    } as T;
  };

  const data = await fetchLeaderboardData(request, "alice@test.com");
  assert.equal(data.entries.length, 3);
  assert.equal(data.entries[0].status, "accepted");
  assert.equal(data.entries[1].status, "pending");
  assert.equal(data.entries[2].status, "rejected");
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

test("Leaderboard does not relabel another student's row when profile identity conflicts", async () => {
  const request = async <T>(endpoint: string): Promise<T> => {
    if (endpoint === "/cohorts/group") {
      return {
        cohort: { id: "cohort-123", name: "Real cohort" },
        peers: [{ studentEmail: "sanda@example.com" }],
      } as T;
    }
    if (endpoint === "/profile/me") {
      return {
        profile: {
          user_id: "sanda-user-id",
          full_name: "Sanda Maurice",
          email: "sanda@example.com",
        },
      } as T;
    }
    return {
      leaderboard: [{
        rank: 1,
        studentId: "sanda-user-id",
        studentName: "Sanda Maurice",
        studentEmail: "sanda@example.com",
        totalPoints: 100,
        latestScore: 80,
      }],
    } as T;
  };

  const data = await fetchLeaderboardData(request, "fonyuyjudegita@gmail.com");

  assert.equal(data.profileMatchesAccount, false);
  assert.equal(data.entries[0].name, "Sanda Maurice");
});