import test from "node:test";
import assert from "node:assert/strict";
import { fetchLeaderboardData } from "../dist/screens/LeaderboardScreen.js";

// ─── helpers ────────────────────────────────────────────────────────────────
// fetchLeaderboardData resolves the active cohort from disk first, then calls:
//   /cohorts/<cohortId>/chat-group   (when active cohort is known)
//   /cohorts/group                   (fallback when no active cohort file)
// followed by /gamification/leaderboard/<cohortId>?limit=N  and  /profile/me.
//
// Tests supply a mock `request` that handles BOTH URL shapes so they are
// hermetic regardless of what active-cohort is stored on the test machine.
// ─────────────────────────────────────────────────────────────────────────────

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

    // Cohort-scoped chat-group (new path when active cohort is set)
    if (endpoint.startsWith("/cohorts/") && endpoint.endsWith("/chat-group")) {
      return { peers: [{ studentEmail: "another@example.com" }] } as T;
    }
    // Legacy group fallback (when no active cohort on disk)
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
    // Leaderboard: /gamification/leaderboard/<cohortId>?limit=N
    if (endpoint.startsWith("/gamification/leaderboard/")) {
      return { leaderboard: expectedEntries } as T;
    }
    return { leaderboard: expectedEntries } as T;
  };

  const data = await fetchLeaderboardData(request, "fonyuyjudegita@gmail.com");

  // First call must be a cohort group endpoint (either form)
  const firstIsChatGroup =
    requests[0]?.startsWith("/cohorts/") && requests[0]?.endsWith("/chat-group");
  const firstIsLegacyGroup = requests[0] === "/cohorts/group";
  assert.ok(
    firstIsChatGroup || firstIsLegacyGroup,
    `First request should be a cohort group endpoint, got: ${requests[0]}`
  );

  // Leaderboard must have been fetched
  const leaderboardReq = requests.find((r) =>
    r.startsWith("/gamification/leaderboard/")
  );
  assert.ok(leaderboardReq, "Leaderboard endpoint should have been called");

  // Profile must be fetched
  assert.ok(requests.includes("/profile/me"), "Profile endpoint should be called");

  assert.deepEqual(
    data.entries.map((e) => e.studentEmail),
    ["FonyuyJudeGita@gmail.com", "sanda@example.com"]
  );
  assert.equal(data.entries[0].name, "Fonyuy Gita");
  assert.equal(data.entries[1].name, "Sanda Maurice");
  assert.equal(data.currentStudentEmail, "fonyuyjudegita@gmail.com");
  assert.equal(data.entries[0].status, "none");
});

test("Leaderboard correctly maps pending, accepted, and rejected PR statuses", async () => {
  const request = async <T>(endpoint: string): Promise<T> => {
    if (endpoint.startsWith("/cohorts/") && endpoint.endsWith("/chat-group")) {
      return { peers: [] } as T;
    }
    if (endpoint === "/cohorts/group") {
      return { cohort: { id: "cohort-123", name: "AI/ML Track" }, peers: [] } as T;
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
    // Both endpoint patterns return no usable cohort data
    if (endpoint.startsWith("/cohorts/") && endpoint.endsWith("/chat-group")) {
      // Return peers empty; the cohortId still comes from activeCohort on disk
      return { peers: [] } as T;
    }
    if (endpoint === "/cohorts/group") {
      return { cohort: null, peers: [] } as T;
    }
    return { leaderboard: [] } as T;
  };

  const data = await fetchLeaderboardData(request);

  // At minimum a cohort-group endpoint was called
  const firstIsCohortEndpoint =
    (requests[0]?.startsWith("/cohorts/") && requests[0]?.endsWith("/chat-group")) ||
    requests[0] === "/cohorts/group";
  assert.ok(firstIsCohortEndpoint, `Expected a group endpoint first, got: ${requests[0]}`);

  // When no cohortName resolved and no leaderboard data, entries should be empty
  if (data.cohortName === null) {
    assert.deepEqual(data.entries, []);
  } else {
    // If activeCohort was set on disk, leaderboard may return [] from our mock
    assert.deepEqual(data.entries, []);
  }
});

test("Leaderboard does not relabel another student's row when profile identity conflicts", async () => {
  const request = async <T>(endpoint: string): Promise<T> => {
    if (endpoint.startsWith("/cohorts/") && endpoint.endsWith("/chat-group")) {
      return { peers: [{ studentEmail: "sanda@example.com" }] } as T;
    }
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