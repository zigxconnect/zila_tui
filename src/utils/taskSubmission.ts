import { API_BASE } from "./auth.js";

export interface GitHubAccount {
  token: string;
  username: string;
}

export interface PullRequestReference {
  url: string;
  repositoryUrl: string;
  owner: string;
  repository: string;
  number: number;
}

export function parseGitHubPullRequestUrl(value: string): PullRequestReference {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("Enter a valid GitHub pull request URL.");
  }

  const parts = url.pathname.split("/").filter(Boolean);
  const pullNumber = parts[3];
  if (
    url.protocol !== "https:" ||
    url.hostname !== "github.com" ||
    url.username ||
    url.password ||
    parts.length < 4 ||
    !parts[0] ||
    !parts[1] ||
    parts[2]?.toLowerCase() !== "pull" ||
    !pullNumber ||
    !/^\d+$/.test(pullNumber)
  ) {
    throw new Error("Enter a GitHub pull request URL like https://github.com/owner/repo/pull/123.");
  }

  const owner = decodeURIComponent(parts[0]);
  const repository = decodeURIComponent(parts[1].replace(/\.git$/i, ""));
  const number = Number(pullNumber);
  if (!Number.isSafeInteger(number) || number < 1) {
    throw new Error("The pull request number is invalid.");
  }

  return {
    url: `https://github.com/${owner}/${repository}/pull/${number}`,
    repositoryUrl: `https://github.com/${owner}/${repository}`,
    owner,
    repository,
    number,
  };
}

interface GitHubPullRequestResponse {
  user?: { login?: string };
  head?: { ref?: string; sha?: string };
  message?: string;
}

interface TaskSubmissionResponse {
  submission?: unknown;
  error?: string;
  message?: string;
}

export async function submitTaskWithPullRequest(
  taskId: string,
  pullRequestUrl: string,
  summary: string,
  sessionToken: string,
  githubAccount: GitHubAccount,
  fetchImpl: typeof fetch = fetch,
): Promise<{ pullRequestUrl: string; repositoryUrl: string; submission: unknown }> {
  const normalizedTaskId = taskId.trim();
  if (!normalizedTaskId) throw new Error("Enter the task ID.");
  if (!sessionToken) throw new Error("Run 'zila auth' before submitting a task.");
  if (!githubAccount.token || !githubAccount.username) {
    throw new Error("Run 'zila github-auth' before submitting a GitHub pull request.");
  }

  const pullRequest = parseGitHubPullRequestUrl(pullRequestUrl);
  const githubResponse = await fetchImpl(
    `https://api.github.com/repos/${encodeURIComponent(pullRequest.owner)}/${encodeURIComponent(pullRequest.repository)}/pulls/${pullRequest.number}`,
    {
      headers: {
        Authorization: `Bearer ${githubAccount.token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Zigex-Zila-Agent/1.0",
      },
    },
  );
  const pullRequestData = await githubResponse.json() as GitHubPullRequestResponse;
  if (!githubResponse.ok) {
    throw new Error(pullRequestData.message || `Could not verify pull request (HTTP ${githubResponse.status}).`);
  }
  if (pullRequestData.user?.login?.toLowerCase() !== githubAccount.username.toLowerCase()) {
    throw new Error(`This pull request was not opened by your connected GitHub account (@${githubAccount.username}).`);
  }

  const cleanSummary = summary.trim();
  const submissionResponse = await fetchImpl(`${API_BASE}/tasks/${encodeURIComponent(normalizedTaskId)}/submit`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: `Task ${normalizedTaskId} submission`,
      description: cleanSummary || `Submitted pull request ${pullRequest.url}`,
      content: [cleanSummary, `Pull request: ${pullRequest.url}`].filter(Boolean).join("\n\n"),
      githubRepoUrl: pullRequest.repositoryUrl,
      githubPrUrl: pullRequest.url,
      githubBranch: pullRequestData.head?.ref,
      commitHash: pullRequestData.head?.sha,
    }),
  });
  const submissionData = await submissionResponse.json() as TaskSubmissionResponse;
  if (!submissionResponse.ok) {
    throw new Error(submissionData.error || submissionData.message || `Task submission failed (HTTP ${submissionResponse.status}).`);
  }

  return {
    pullRequestUrl: pullRequest.url,
    repositoryUrl: pullRequest.repositoryUrl,
    submission: submissionData.submission,
  };
}