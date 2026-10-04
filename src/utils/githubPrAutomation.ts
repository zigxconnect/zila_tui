import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { API_BASE, loadAuth } from "./auth.js";
import { loadGitHubAuth, type GitHubAuthRecord } from "./githubAuth.js";

export interface TaskSubmissionPayload {
  domain?: string; // ml, web, cyber, embeded, app, cloud, or custom!
  level: "beginner" | "intermediate" | "advance" | string;
  module: string;
  day: number;
  summary: string;
  practicalsDescription: string;
  challenges: string;
  deploymentUrl?: string;
  githubRepoUrl?: string;
}

export interface AutomatedPrResult {
  pullRequestUrl: string;
  repositoryUrl: string;
  branchName: string;
  contributorFilePath: string;
  dayWeight: number;
  normalizedPercentage: number;
  quotaRemaining: number;
  submissionId?: string;
}

export interface DomainDefinition {
  id: string;
  name: string;
  levels: Record<string, string[]>;
}

export const CURRICULUM_DOMAINS: Record<string, DomainDefinition> = {
  ml: {
    id: "ml",
    name: "Machine Learning & AI",
    levels: {
      beginner: ["1_python", "2_eda_and_classical_ml"],
      intermediate: ["1_deeplearning_and_neural_nets", "2_computer_vision_and_nlp"],
      advance: ["1_generative_ai_and_agents", "2_reinforcement_learning_and_llms"],
    },
  },
  web: {
    id: "web",
    name: "Web & Fullstack",
    levels: {
      beginner: ["1_html_css_javascript", "2_typescript_and_react"],
      intermediate: ["1_nodejs_and_microservices", "2_databases_and_graphql"],
      advance: ["1_distributed_systems_and_wasm", "2_fullstack_architecture"],
    },
  },
  cyber: {
    id: "cyber",
    name: "Cybersecurity & InfoSec",
    levels: {
      beginner: ["1_networking_and_linux_security", "2_cryptography_basics"],
      intermediate: ["1_penetration_testing_and_soc", "2_web_app_security_owasp"],
      advance: ["1_malware_analysis_and_reversing", "2_zero_trust_and_cloud_security"],
    },
  },
  embeded: {
    id: "embeded",
    name: "Embedded Systems & IoT",
    levels: {
      beginner: ["1_c_and_embedded_fundamentals", "2_microcontrollers_and_gpio"],
      intermediate: ["1_rtos_and_firmware_dev", "2_communication_protocols_i2c_spi"],
      advance: ["1_tinyml_and_edge_computing", "2_secure_firmware_and_bootloaders"],
    },
  },
  app: {
    id: "app",
    name: "Mobile App Development",
    levels: {
      beginner: ["1_mobile_ui_and_dart_flutter", "2_state_management_and_apis"],
      intermediate: ["1_native_bridges_and_offline_first", "2_performance_and_security"],
      advance: ["1_cross_platform_arch_and_ci_cd", "2_multithreaded_mobile_systems"],
    },
  },
  cloud: {
    id: "cloud",
    name: "Cloud & DevOps",
    levels: {
      beginner: ["1_linux_and_containers_docker", "2_ci_cd_and_gitops"],
      intermediate: ["1_kubernetes_orchestration", "2_terraform_and_infrastructure_as_code"],
      advance: ["1_site_reliability_and_chaos_eng", "2_multi_cloud_and_service_mesh"],
    },
  },
};

export const DAY_WEIGHTS: Record<number, { weight: number; percentage: number }> = {
  1: { weight: 1, percentage: 12.5 },
  2: { weight: 1, percentage: 12.5 },
  3: { weight: 2, percentage: 25.0 },
  4: { weight: 4, percentage: 50.0 },
};

export const SAMPLE_COHORT_REPO = "https://github.com/iws3/sample_repo_zila.git";
export const REPO_OWNER = "iws3";
export const REPO_NAME = "sample_repo_zila";

interface LocalQuotaRecord {
  date: string; // YYYY-MM-DD
  count: number;
}

const QUOTA_FILE = path.join(os.homedir(), ".zila", "submissions_quota.json");

/**
 * Check and evaluate local daily PR submission quota (max 2 per day)
 */
export function checkDailyPrQuota(): { allowed: boolean; countToday: number; remainingToday: number; message: string } {
  const todayStr = new Date().toISOString().slice(0, 10);
  let record: LocalQuotaRecord = { date: todayStr, count: 0 };

  try {
    if (fs.existsSync(QUOTA_FILE)) {
      const content = fs.readFileSync(QUOTA_FILE, "utf8");
      const parsed = JSON.parse(content) as LocalQuotaRecord;
      if (parsed.date === todayStr) {
        record = parsed;
      }
    }
  } catch {
    // ignore
  }

  const remaining = Math.max(0, 2 - record.count);
  const allowed = record.count < 2;

  let message = "";
  if (!allowed) {
    message = "Daily PR quota reached: Maximum 2 PR submissions allowed per day. Please continue tomorrow!";
  } else if (record.count === 1) {
    message = "Notice: 1 PR already made today. Cohort policy allows 1 PR/day recommended (1 remaining).";
  } else {
    message = `Quota available: ${remaining}/2 PR submissions remaining today.`;
  }

  return { allowed, countToday: record.count, remainingToday: remaining, message };
}

/**
 * Returns available domains list
 */
export function getAvailableDomains(): Array<{ id: string; name: string }> {
  return Object.values(CURRICULUM_DOMAINS).map((d) => ({ id: d.id, name: d.name }));
}

/**
 * Retrieve list of curriculum modules for a given track level and domain
 */
export function getTrackModules(level: string, domainId: string = "ml"): string[] {
  const domainKey = domainId.toLowerCase().trim();
  const domain = CURRICULUM_DOMAINS[domainKey];
  if (!domain) {
    return [`1_${sanitizePathComponent(domainId)}_fundamentals`];
  }

  const normLevel = level.toLowerCase().trim();
  return domain.levels[normLevel] || domain.levels.beginner || [];
}

/**
 * Reset local daily PR quota (useful for development and testing)
 */
export function resetLocalQuota(): void {
  try {
    if (fs.existsSync(QUOTA_FILE)) {
      fs.unlinkSync(QUOTA_FILE);
    }
  } catch {
    // ignore
  }
}

/**
 * Validates if a string is a well-formed HTTP/HTTPS URL
 */
export function isValidHttpUrl(candidate: string): boolean {
  if (!candidate || !candidate.trim()) return false;
  try {
    const parsed = new URL(candidate.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Sanitizes a path component
 */
export function sanitizePathComponent(input: string): string {
  return (input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "") || "module";
}

/**
 * Increment local daily PR count after successful submission
 */
export function recordPrSubmission(): number {
  const todayStr = new Date().toISOString().slice(0, 10);
  let count = 0;
  try {
    if (fs.existsSync(QUOTA_FILE)) {
      const content = fs.readFileSync(QUOTA_FILE, "utf8");
      const parsed = JSON.parse(content) as LocalQuotaRecord;
      if (parsed.date === todayStr) count = parsed.count;
    }
    count += 1;
    fs.mkdirSync(path.dirname(QUOTA_FILE), { recursive: true });
    fs.writeFileSync(QUOTA_FILE, JSON.stringify({ date: todayStr, count }, null, 2), "utf8");
  } catch {
    count = 1;
  }
  return Math.max(0, 2 - count);
}

/**
 * Generate formatted exercise.md content
 */
export function generateExerciseReport(payload: TaskSubmissionPayload, githubUsername: string, branchName: string): string {
  const dayWeightInfo = DAY_WEIGHTS[payload.day] || { weight: 1, percentage: 12.5 };
  const dateStr = new Date().toISOString().slice(0, 10);
  const domainName = (payload.domain || "ml").toUpperCase();

  return `# Daily Cohort Exercise Report — Day 0${payload.day}

## Student Metadata
- **GitHub Intern:** @${githubUsername}
- **Curriculum Domain:** ${domainName}
- **Cohort Track Level:** ${payload.level.toUpperCase()}
- **Curriculum Module:** ${payload.module}
- **Submission Date:** ${dateStr}
- **Git Branch:** \`${branchName}\`

---

## 1. Exercise Summary
${payload.summary.trim()}

---

## 2. Theory & Practical Implementation
${payload.practicalsDescription.trim()}

---

## 3. Challenges & Roadblocks Encountered
${payload.challenges.trim()}

---

## 4. Repositories & Deployments
- **Main Cohort Repository:** ${SAMPLE_COHORT_REPO}
- **Submission Branch:** \`${branchName}\`
- **Deployment URL:** ${payload.deploymentUrl?.trim() || "N/A"}

---

## 5. Tutor Evaluation Rubric (Normalized to 100%)
- **Day Weight:** ${dayWeightInfo.weight} point(s)
- **Module Share:** ${dayWeightInfo.percentage}% (Normalized over 100)
- **Status:** Automated PR Created & Dispatched for Supervisor Review
`;
}

/**
 * Execute automated background GitHub PR creation and task recording pipeline
 */
export async function executeAutomatedTaskSubmission(
  payload: TaskSubmissionPayload,
  onProgress?: (step: string) => void,
  fetchImpl: typeof fetch = fetch,
): Promise<AutomatedPrResult> {
  // 1. Quota check
  const quota = checkDailyPrQuota();
  if (!quota.allowed) {
    throw new Error(quota.message);
  }

  // 2. Auth check
  const zigexAuth = loadAuth();
  if (!zigexAuth?.token) {
    throw new Error("You must log in to Zigex first. Run 'zila auth'.");
  }

  const githubAuth = loadGitHubAuth();
  const githubUsername = githubAuth?.username || "intern-" + (zigexAuth.email ? zigexAuth.email.split("@")[0] : "student");
  const githubToken = githubAuth?.token;

  // 3. Automated branch and path construction
  // Branch format: module_name/student_github_username/day
  const cleanDomain = sanitizePathComponent(payload.domain || "ml");
  const cleanModule = sanitizePathComponent(payload.module || "1_python");
  const branchName = `${cleanModule}/${githubUsername}/day-${payload.day}`;
  const contributorFilePath = `contributors/${githubUsername}/${cleanDomain}/${payload.level}/${cleanModule}/day-${payload.day}/exercise.md`;

  onProgress?.(`Configuring automated branch: ${branchName}`);

  // 4. Generate exercise report
  const exerciseContent = generateExerciseReport(payload, githubUsername, branchName);

  // 5. Create PR via GitHub API
  if (!githubToken) {
    throw new Error(
      "No GitHub token found. Please run 'zila github-auth' or ensure your credentials are set in ~/.git-credentials."
    );
  }

  onProgress?.(`Connecting to GitHub repository ${REPO_OWNER}/${REPO_NAME}...`);

  // Fetch repository metadata to obtain default branch
  const repoRes = await fetchImpl(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "Zila-Agent/1.0",
    },
  });

  if (!repoRes.ok) {
    const errData = await repoRes.json().catch(() => ({})) as any;
    throw new Error(
      `GitHub API error (${repoRes.status}): ${errData.message || "Cannot access repository " + REPO_OWNER + "/" + REPO_NAME}`
    );
  }

  const repoData = await repoRes.json() as any;
  const defaultBranch = repoData.default_branch || "master";

  // Fetch head commit SHA of default branch
  const branchRes = await fetchImpl(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/branches/${encodeURIComponent(defaultBranch)}`,
    {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Zila-Agent/1.0",
      },
    }
  );

  if (!branchRes.ok) {
    const errData = await branchRes.json().catch(() => ({})) as any;
    throw new Error(
      `Failed to resolve default branch '${defaultBranch}' (${branchRes.status}): ${errData.message || "Unknown error"}`
    );
  }

  const branchData = await branchRes.json() as any;
  const baseSha = branchData.commit?.sha;
  if (!baseSha) {
    throw new Error(`Could not determine commit SHA for branch '${defaultBranch}'.`);
  }

  // Create isolated branch ref (or continue if it already exists)
  onProgress?.(`Configuring automated branch: ${branchName}`);
  await fetchImpl(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${githubToken}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
      "User-Agent": "Zila-Agent/1.0",
    },
    body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: baseSha }),
  });

  // Check if file already exists on this branch to support seamless updates
  let existingFileSha: string | undefined;
  try {
    const fileCheckRes = await fetchImpl(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${contributorFilePath}?ref=${encodeURIComponent(branchName)}`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "Zila-Agent/1.0",
        },
      }
    );
    if (fileCheckRes.ok) {
      const fileCheckData = await fileCheckRes.json() as any;
      existingFileSha = fileCheckData.sha;
    }
  } catch {
    /* file does not exist yet */
  }

  // Commit exercise.md file
  onProgress?.(`Committing exercise report to ${contributorFilePath}...`);
  const contentPayload: any = {
    message: `feat(cohort): add ${cleanDomain.toUpperCase()} Day 0${payload.day} exercise for @${githubUsername}`,
    content: Buffer.from(exerciseContent).toString("base64"),
    branch: branchName,
  };
  if (existingFileSha) {
    contentPayload.sha = existingFileSha;
  }

  const contentRes = await fetchImpl(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${contributorFilePath}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github+json",
        "User-Agent": "Zila-Agent/1.0",
      },
      body: JSON.stringify(contentPayload),
    }
  );

  if (!contentRes.ok) {
    const errData = await contentRes.json().catch(() => ({})) as any;
    throw new Error(
      `Failed to commit exercise to GitHub (${contentRes.status}): ${errData.message || "Unknown error"}`
    );
  }

  const contentData = await contentRes.json() as any;
  let commitHash = contentData.commit?.sha || "latest";

  // Create Pull Request
  onProgress?.(`Opening pull request on ${REPO_OWNER}/${REPO_NAME}...`);
  let pullRequestUrl = "";

  const prRes = await fetchImpl(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${githubToken}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
      "User-Agent": "Zila-Agent/1.0",
    },
    body: JSON.stringify({
      title: `[${cleanDomain.toUpperCase()} Day 0${payload.day}] ${payload.module} by @${githubUsername}`,
      head: branchName,
      base: defaultBranch,
      body: `Automated exercise submission for **${cleanDomain}/${payload.level}/${payload.module}/Day ${payload.day}**.\n\n### Summary\n${payload.summary}\n\n### Practical Details\n${payload.practicalsDescription}\n\n### Challenges Encountered\n${payload.challenges}`,
    }),
  });

  if (prRes.ok) {
    const prData = await prRes.json() as any;
    pullRequestUrl = prData.html_url;
  } else {
    const prErr = await prRes.json().catch(() => ({})) as any;
    // If PR already exists for this branch, fetch the open PR URL
    const existingPrsRes = await fetchImpl(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls?head=${encodeURIComponent(REPO_OWNER)}:${encodeURIComponent(branchName)}&state=all`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "Zila-Agent/1.0",
        },
      }
    );
    if (existingPrsRes.ok) {
      const existingPrs = await existingPrsRes.json() as any[];
      if (existingPrs.length > 0 && existingPrs[0].html_url) {
        pullRequestUrl = existingPrs[0].html_url;
      }
    }

    if (!pullRequestUrl) {
      throw new Error(
        `Failed to create Pull Request (${prRes.status}): ${prErr.message || "Unknown error"}`
      );
    }
  }

  onProgress?.(`Recording task submission on Zigex API...`);

  // 6. Submit task record to Zigex API
  let submissionId: string | undefined;
  try {
    const apiRes = await fetchImpl(`${API_BASE}/tasks/auto-submit`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${zigexAuth.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        domain: cleanDomain,
        level: payload.level,
        module: cleanModule,
        day: payload.day,
        githubPrUrl: pullRequestUrl,
        githubRepoUrl: SAMPLE_COHORT_REPO,
        githubBranch: branchName,
        commitHash,
        summary: payload.summary,
        challenges: payload.challenges,
        deploymentUrl: payload.deploymentUrl,
      }),
    });

    if (apiRes.ok) {
      const apiData = await apiRes.json() as any;
      submissionId = apiData.submission?.id;
    }
  } catch {
    // ignore
  }

  // 7. Update daily quota
  const quotaRemaining = recordPrSubmission();

  const dayInfo = DAY_WEIGHTS[payload.day] || { weight: 1, percentage: 12.5 };

  return {
    pullRequestUrl,
    repositoryUrl: SAMPLE_COHORT_REPO,
    branchName,
    contributorFilePath,
    dayWeight: dayInfo.weight,
    normalizedPercentage: dayInfo.percentage,
    quotaRemaining,
    submissionId,
  };
}
