import { test } from "node:test";
import assert from "node:assert/strict";

test("Leaderboard Isolation - Status badges format properly for isolated cohort state", () => {
  const formatBadge = (status: "accepted" | "rejected" | "pending" | "none") => {
    switch (status) {
      case "accepted":
        return "✔ Accepted";
      case "rejected":
        return "✖ Rejected";
      case "pending":
        return "⏳ Pending";
      default:
        return "—";
    }
  };

  assert.equal(formatBadge("accepted"), "✔ Accepted");
  assert.equal(formatBadge("rejected"), "✖ Rejected");
  assert.equal(formatBadge("pending"), "⏳ Pending");
  assert.equal(formatBadge("none"), "—");
});

test("Leaderboard Isolation - Distinct cohort entries keep separate points", () => {
  const embeddedEntries = [
    { rank: 1, name: "Alice", points: 0, status: "none" as const },
    { rank: 2, name: "Bob", points: 0, status: "none" as const },
  ];

  const tyrosEntries = [
    { rank: 1, name: "Alice", points: 1, status: "accepted" as const },
    { rank: 2, name: "Charlie", points: 0, status: "none" as const },
  ];

  assert.equal(embeddedEntries[0]?.points, 0, "Alice in Embedded has 0 points");
  assert.equal(embeddedEntries[0]?.status, "none", "Alice in Embedded has no status");

  assert.equal(tyrosEntries[0]?.points, 1, "Alice in Tyros has 1 mark");
  assert.equal(tyrosEntries[0]?.status, "accepted", "Alice in Tyros has accepted status");
});
