import test from "node:test";
import assert from "node:assert/strict";
import { API_BASE } from "../dist/utils/auth.js";
import {
  parseGitHubPullRequestUrl,
  submitTaskWithPullRequest,
} from "../dist/utils/taskSubmission.js";

test("Task submission - normalizes GitHub PR URLs and rejects non-PR links", () => {
  assert.deepEqual(
    parseGitHubPullRequestUrl("https://github.com/zigex/course/pull/42/files?view=1"),
    {
      url: "https://github.com/zigex/course/pull/42",
      repositoryUrl: "https://github.com/zigex/course",
      owner: "zigex",
      repository: "course",
      number: 42,
    },
  );
  assert.throws(() => parseGitHubPullRequestUrl("https://github.com/zigex/course/issues/42"), /pull request URL/i);
});

test("Task submission - verifies author and sends PR link to Zila API", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const fetchMock: typeof fetch = async (input, init) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.startsWith("https://api.github.com/")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          user: { login: "StudentOne" },
          head: { ref: "task/feature", sha: "abc123" },
        }),
      } as Response;
    }
    return {
      ok: true,
      status: 201,
      json: async () => ({ submission: { id: "submission-1" } }),
    } as Response;
  };

  const result = await submitTaskWithPullRequest(
    "task-42",
    "https://github.com/zigex/course/pull/42",
    "Implemented the feature",
    "zigex-session-token",
    { token: "github-access-token", username: "studentone" },
    fetchMock,
  );

  assert.equal(result.pullRequestUrl, "https://github.com/zigex/course/pull/42");
  assert.equal(result.repositoryUrl, "https://github.com/zigex/course");
  assert.equal(requests.length, 2);
  assert.equal(requests[0]?.init?.headers && (requests[0].init?.headers as Record<string, string>).Authorization, "Bearer github-access-token");
  assert.equal(requests[1]?.url, `${API_BASE}/tasks/task-42/submit`);
  assert.equal(requests[1]?.init?.headers && (requests[1].init?.headers as Record<string, string>).Authorization, "Bearer zigex-session-token");

  const payload = JSON.parse(String(requests[1]?.init?.body));
  assert.equal(payload.githubPrUrl, "https://github.com/zigex/course/pull/42");
  assert.equal(payload.githubRepoUrl, "https://github.com/zigex/course");
  assert.equal(payload.githubBranch, "task/feature");
  assert.equal(payload.commitHash, "abc123");
  assert.match(payload.content, /Implemented the feature/);
});

test("Task submission - rejects pull requests from another GitHub account", async () => {
  let requestCount = 0;
  const fetchMock: typeof fetch = async () => {
    requestCount++;
    return {
      ok: true,
      status: 200,
      json: async () => ({ user: { login: "someone-else" } }),
    } as Response;
  };

  await assert.rejects(
    submitTaskWithPullRequest(
      "task-42",
      "https://github.com/zigex/course/pull/42",
      "",
      "zigex-session-token",
      { token: "github-access-token", username: "studentone" },
      fetchMock,
    ),
    /not opened by your connected GitHub account/i,
  );
  assert.equal(requestCount, 1, "must not submit the task when PR ownership fails");
});