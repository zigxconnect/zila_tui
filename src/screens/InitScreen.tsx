import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { StatusLine, type StatusType } from "../ui/StatusLine.js";
import { Banner } from "../ui/Banner.js";
import { AuthScreen } from "./AuthScreen.js";
import { checkGit, checkNode, checkPython } from "../commands/init/checks.js";
import { probeNetwork, NetworkError } from "../utils/network.js";
import { cloneRepo } from "../commands/init/cloner.js";
import {
  installPythonDependencies,
  installNpmDependencies,
} from "../commands/init/installer.js";
import { saveWorkspace } from "../utils/workspace.js";
import { isAuthenticated, loadAuth, zilaApi } from "../utils/auth.js";

interface InternshipProfile {
  department: string;
  level: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  curriculum_repo_url?: string;
}

async function fetchInternshipProfile(): Promise<InternshipProfile> {
  // Fetch internship details (department, level, curriculum repo) from Zigex
  const data = await zilaApi<{
    profile?: InternshipProfile;
    internship?: InternshipProfile;
  }>("/auth/profile");
  const profile = data.profile ?? data.internship;
  if (!profile)
    throw new Error(
      "No internship profile returned from Zigex. Make sure you have an active internship.",
    );
  if (!profile.department)
    throw new Error(
      "Zigex profile is missing 'department'. Complete your registration on the Zigex platform.",
    );
  if (!profile.level)
    throw new Error(
      "Zigex profile is missing 'level'. Complete your registration on the Zigex platform.",
    );
  return profile;
}

function resolveStudentName(profile: InternshipProfile): string {
  if (profile.full_name?.trim()) return profile.full_name.trim();
  const parts = [profile.first_name, profile.last_name]
    .map((s) => s?.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Student";
}

// Step indices — sequential, no gaps
const S = {
  GIT: 0,
  NODE: 1,
  PYTHON: 2,
  NETWORK: 3,
  PROFILE: 4,
  CLONE_C: 5,
  INSTALL_C: 6,
  INSTALL_NPM: 7,
} as const;
const STEP_COUNT = 8;

const STEP_LABELS: Record<number, string> = {
  [S.GIT]: "git installed",
  [S.NODE]: "Node.js ≥ 18",
  [S.PYTHON]: "Python 3",
  [S.NETWORK]: "Internet connectivity",
  [S.PROFILE]: "Fetch internship profile from Zigex",
  [S.CLONE_C]: "Clone curriculum repo",
  [S.INSTALL_C]: "Python dependencies",
  [S.INSTALL_NPM]: "Node.js dependencies",
};

interface Step {
  status: StatusType;
  detail: string;
}
const makeSteps = (): Step[] =>
  Array.from({ length: STEP_COUNT }, () => ({
    status: "pending" as StatusType,
    detail: "",
  }));

type NetworkRetryChoice = "waiting" | "retrying" | "skipping";
type InitPhase = "auth" | "running" | "done" | "fatal";

interface InitScreenProps {
  onComplete: () => void;
  clearHistory?: () => void;
}

// Progress bar

const ProgressBar: React.FC<{ steps: Step[] }> = ({ steps }) => {
  const done = steps.filter(
    (s) => s.status === "success" || s.status === "skipped",
  ).length;
  const pct = Math.round((done / STEP_COUNT) * 100);
  const filled = Math.round((done / STEP_COUNT) * 32);
  return (
    <Box flexDirection="row" gap={2} marginBottom={1}>
      <Text color={theme.colors.primary}>
        {"█".repeat(filled)}
        {"░".repeat(32 - filled)}
      </Text>
      <Text color={theme.colors.muted}>{pct}%</Text>
      <Text color={theme.colors.dim}>
        {done}/{STEP_COUNT}
      </Text>
    </Box>
  );
};

// Main

export const InitScreen: React.FC<InitScreenProps> = ({
  onComplete,
  clearHistory,
}) => {
  const [phase, setPhase] = useState<InitPhase>(
    isAuthenticated() ? "running" : "auth",
  );
  const [steps, setSteps] = useState<Step[]>(makeSteps());
  const [fatalMsg, setFatalMsg] = useState<string | null>(null);
  const [hasNetworkError, setHasNetworkError] = useState(false);
  const [networkChoice, setNetworkChoice] =
    useState<NetworkRetryChoice>("waiting");
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [userEmail, setUserEmail] = useState<string | null>(
    loadAuth()?.email ?? null,
  );
  const [workspaceInfo, setWorkspaceInfo] = useState<{
    department: string;
    level: string;
    path: string;
  } | null>(null);

  const setStep = useCallback(
    (index: number, status: StatusType, detail = "") => {
      setSteps((prev) => {
        const next = [...prev];
        next[index] = { status, detail };
        return next;
      });
    },
    [],
  );

  // Init flow
  useEffect(() => {
    if (phase !== "running") return;
    let cancelled = false;

    async function runFlow() {
      setSteps(makeSteps());
      setFatalMsg(null);
      setHasNetworkError(false);

      // 1. git
      setStep(S.GIT, "loading", "Checking…");
      const git = await checkGit();
      if (cancelled) return;
      if (!git.passed) {
        setStep(S.GIT, "error", git.error);
        setFatalMsg(git.error ?? "git not found.");
        return;
      }
      setStep(S.GIT, "success", git.version);

      // 2. node
      setStep(S.NODE, "loading", "Checking…");
      const node = await checkNode();
      if (cancelled) return;
      if (!node.passed) {
        setStep(S.NODE, "error", node.error);
        setFatalMsg(node.error ?? "Node check failed.");
        return;
      }
      setStep(S.NODE, "success", node.version);

      // 3. python
      setStep(S.PYTHON, "loading", "Checking…");
      const python = await checkPython();
      if (cancelled) return;
      // Python is non-fatal for non-ML/data departments — warn and continue
      if (!python.passed) {
        setStep(
          S.PYTHON,
          "skipped",
          "Not found — Python exercises may not work",
        );
      } else {
        setStep(S.PYTHON, "success", python.version);
      }

      // 4. network
      setStep(S.NETWORK, "loading", "Probing github.com…");
      try {
        await probeNetwork();
        if (cancelled) return;
        setStep(S.NETWORK, "success", "Connected");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof NetworkError) {
          setStep(S.NETWORK, "error", "Offline");
          setHasNetworkError(true);
          return;
        }
        throw err;
      }

      // 5. fetch internship profile from Zigex
      setStep(
        S.PROFILE,
        "loading",
        "Fetching your internship details from Zigex…",
      );
      let internshipProfile: InternshipProfile;
      try {
        internshipProfile = await fetchInternshipProfile();
        if (cancelled) return;
        setStep(
          S.PROFILE,
          "success",
          `${internshipProfile.department} · ${internshipProfile.level}`,
        );
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setStep(S.PROFILE, "error", msg);
        setFatalMsg(msg);
        return;
      }

      // Resolve curriculum URL from Zigex profile, falling back to a sensible default
      const curriculumUrl =
        internshipProfile.curriculum_repo_url ??
        "https://github.com/rawlingsnsame/evaluation_internship.git";

      const workspaceName = `${internshipProfile.department}-${internshipProfile.level}`;
      const workspaceTarget = `./internship/curriculum`;

      // 6. clone curriculum (URL from Zigex)
      setStep(S.CLONE_C, "loading", `Cloning ${workspaceName} curriculum…`);
      try {
        const { cloned } = await cloneRepo(
          curriculumUrl,
          workspaceTarget,
          (attempt) => setStep(S.CLONE_C, "warning", `Retry ${attempt}/3…`),
        );
        if (cancelled) return;
        setStep(
          S.CLONE_C,
          "success",
          cloned ? `Cloned → ${workspaceTarget}/` : "Already exists — skipped",
        );
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setStep(S.CLONE_C, "error", msg);
        setFatalMsg(`Failed to clone curriculum: ${msg}`);
        return;
      }

      // 7. Python deps
      setStep(S.INSTALL_C, "loading", "Setting up Python environment…");
      try {
        const installed = await installPythonDependencies(
          workspaceTarget,
          (attempt) => setStep(S.INSTALL_C, "warning", `Retry ${attempt}/3…`),
        );
        if (cancelled) return;
        setStep(
          S.INSTALL_C,
          installed ? "success" : "skipped",
          installed
            ? "Python packages installed"
            : "No requirements.txt — skipped",
        );
      } catch (err) {
        if (cancelled) return;
        setStep(
          S.INSTALL_C,
          "warning",
          `Install failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      // 8. Node deps
      setStep(S.INSTALL_NPM, "loading", "Installing Node.js dependencies…");
      try {
        const installed = await installNpmDependencies(
          workspaceTarget,
          (attempt) => setStep(S.INSTALL_NPM, "warning", `Retry ${attempt}/3…`),
        );
        if (cancelled) return;
        setStep(
          S.INSTALL_NPM,
          installed ? "success" : "skipped",
          installed ? "npm packages installed" : "No package.json — skipped",
        );
      } catch (err) {
        if (cancelled) return;
        setStep(
          S.INSTALL_NPM,
          "warning",
          `npm install failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      if (!cancelled) {
        const studentName = resolveStudentName(internshipProfile);
        // BUG FIX: pass all required profile fields to saveWorkspace — previously called with only workspaceRoot
        await saveWorkspace(process.cwd(), {
          department: internshipProfile.department,
          level: internshipProfile.level,
          studentName,
        });
        setWorkspaceInfo({
          department: internshipProfile.department,
          level: internshipProfile.level,
          path: workspaceTarget,
        });
        setPhase("done");
      }
    }

    runFlow().catch((err) => {
      if (!cancelled)
        setFatalMsg(err instanceof Error ? err.message : String(err));
    });

    return () => {
      cancelled = true;
    };
  }, [phase, retryTrigger, setStep]);

  // Keyboard
  useInput((char, key) => {
    if (phase === "auth") return;

    if (hasNetworkError && networkChoice === "waiting") {
      if (char === "r") {
        setNetworkChoice("retrying");
        setRetryTrigger((n) => n + 1);
        setNetworkChoice("waiting");
        setPhase("running");
      } else if (char === "s") {
        setNetworkChoice("skipping");
        setSteps((prev) => {
          const next = [...prev];
          for (let i = S.CLONE_C; i < STEP_COUNT; i++)
            next[i] = { status: "skipped", detail: "Skipped (offline)" };
          return next;
        });
        setHasNetworkError(false);
        setPhase("done");
      } else if (char === "q" || key.escape) {
        onComplete();
      }
      return;
    }

    if (phase === "done" || fatalMsg) onComplete();
  });

  // Auth gate
  if (phase === "auth") {
    return (
      <AuthScreen
        onComplete={(success) => {
          if (success) {
            setUserEmail(loadAuth()?.email ?? null);
            setPhase("running");
          } else onComplete();
        }}
      />
    );
  }

  // Running / done / fatal
  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Header */}
      <Box flexDirection="column" marginBottom={1}>
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.primary} bold>
            ZILA
          </Text>
          <Text color={theme.colors.dim}>›</Text>
          <Text color={theme.colors.muted}>init</Text>
          {userEmail && (
            <>
              <Text color={theme.colors.border}> │ </Text>
              <Text color={theme.colors.successDim}>{theme.symbols.tick}</Text>
              <Text color={theme.colors.dim}> {userEmail}</Text>
            </>
          )}
        </Box>
        <Box marginTop={1}>
          <Text color={theme.colors.border}>{"─".repeat(52)}</Text>
        </Box>
      </Box>

      <ProgressBar steps={steps} />

      {/* Steps */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color={theme.colors.dim} bold>
          {" "}
          ENVIRONMENT
        </Text>
        <StatusLine
          status={steps[S.GIT]?.status ?? "pending"}
          label={`  ${STEP_LABELS[S.GIT]}`}
          detail={steps[S.GIT]?.detail ?? ""}
        />
        <StatusLine
          status={steps[S.NODE]?.status ?? "pending"}
          label={`  ${STEP_LABELS[S.NODE]}`}
          detail={steps[S.NODE]?.detail ?? ""}
        />
        <StatusLine
          status={steps[S.PYTHON]?.status ?? "pending"}
          label={`  ${STEP_LABELS[S.PYTHON]}`}
          detail={steps[S.PYTHON]?.detail ?? ""}
        />
        <StatusLine
          status={steps[S.NETWORK]?.status ?? "pending"}
          label={`  ${STEP_LABELS[S.NETWORK]}`}
          detail={steps[S.NETWORK]?.detail ?? ""}
        />

        <Box marginTop={1}>
          <Text color={theme.colors.dim} bold>
            {" "}
            ZIGEX PROFILE
          </Text>
        </Box>
        <StatusLine
          status={steps[S.PROFILE]?.status ?? "pending"}
          label={`  ${STEP_LABELS[S.PROFILE]}`}
          detail={steps[S.PROFILE]?.detail ?? ""}
        />

        <Box marginTop={1}>
          <Text color={theme.colors.dim} bold>
            {" "}
            CURRICULUM
          </Text>
        </Box>
        <StatusLine
          status={steps[S.CLONE_C]?.status ?? "pending"}
          label={`  ${STEP_LABELS[S.CLONE_C]}`}
          detail={steps[S.CLONE_C]?.detail ?? ""}
        />
        <StatusLine
          status={steps[S.INSTALL_C]?.status ?? "pending"}
          label={`  ${STEP_LABELS[S.INSTALL_C]}`}
          detail={steps[S.INSTALL_C]?.detail ?? ""}
        />
        <StatusLine
          status={steps[S.INSTALL_NPM]?.status ?? "pending"}
          label={`  ${STEP_LABELS[S.INSTALL_NPM]}`}
          detail={steps[S.INSTALL_NPM]?.detail ?? ""}
        />
      </Box>

      {/* Network error */}
      {hasNetworkError && networkChoice === "waiting" && (
        <Banner type="error" title="No Internet Connection">
          <Text color={theme.colors.text}>
            ZILA needs internet access to clone its components.
          </Text>
          <Box marginTop={1} flexDirection="column" marginLeft={2}>
            <Text>
              <Text color={theme.colors.primary} bold>
                r
              </Text>{" "}
              Retry now
            </Text>
            <Text>
              <Text color={theme.colors.warning} bold>
                s
              </Text>{" "}
              Skip cloning (checks only)
            </Text>
            <Text>
              <Text color={theme.colors.muted} bold>
                q
              </Text>{" "}
              Return to shell
            </Text>
          </Box>
        </Banner>
      )}

      {/* Fatal error */}
      {fatalMsg && !hasNetworkError && (
        <Banner type="error" title="Setup halted">
          <Text color={theme.colors.text}>{fatalMsg}</Text>
          <Box marginTop={1}>
            <Text color={theme.colors.muted}>
              Fix the issue above, then run{" "}
              <Text color={theme.colors.primary} bold>
                zila init
              </Text>{" "}
              again.
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text color={theme.colors.dim}>Press any key to return…</Text>
          </Box>
        </Banner>
      )}

      {/* Success */}
      {phase === "done" && !fatalMsg && (
        <Banner type="success" title="ZILA workspace ready">
          <Text color={theme.colors.text}>Everything is set up.</Text>
          {workspaceInfo && (
            <Box marginTop={1} flexDirection="column">
              <Box flexDirection="row" gap={1}>
                <Text color={theme.colors.muted}>Department:</Text>
                <Text color={theme.colors.secondary} bold>
                  {workspaceInfo.department}
                </Text>
                <Text color={theme.colors.muted}> Level:</Text>
                <Text color={theme.colors.secondary} bold>
                  {workspaceInfo.level}
                </Text>
              </Box>
              <Box flexDirection="row" gap={1} marginTop={1}>
                <Text color={theme.colors.primary} bold>
                  {workspaceInfo.path}/
                </Text>
                <Text color={theme.colors.muted}>your workspace</Text>
              </Box>
            </Box>
          )}
          <Box marginTop={1} flexDirection="column">
            <Text color={theme.colors.text}>Next steps:</Text>
            <Box marginLeft={2} flexDirection="column">
              <Text color={theme.colors.dim}>
                <Text color={theme.colors.secondary}>monitor start</Text> begin
                tracking your work
              </Text>
              <Text color={theme.colors.dim}>
                <Text color={theme.colors.secondary}>assistant</Text> ask
                questions about your curriculum
              </Text>
              <Text color={theme.colors.dim}>
                <Text color={theme.colors.secondary}>info</Text> view internship
                status
              </Text>
              <Text color={theme.colors.dim}>
                <Text color={theme.colors.secondary}>about-me</Text> view your
                Zigex profile
              </Text>
            </Box>
          </Box>
          <Box marginTop={1}>
            <Text color={theme.colors.dim}>Press any key to return…</Text>
          </Box>
        </Banner>
      )}
    </Box>
  );
};
