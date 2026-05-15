import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { StatusLine, type StatusType } from "../ui/StatusLine.js";
import { Banner } from "../ui/Banner.js";
import { Divider } from "../ui/Divider.js";
import { Spinner } from "../ui/Spinner.js";
import { AuthScreen } from "./AuthScreen.js";
import { checkGit, checkNode } from "../commands/init/checks.js";
import { probeNetwork, NetworkError } from "../utils/network.js";
import { cloneRepo } from "../commands/init/cloner.js";
import {
  installPythonDependencies,
  installNpmDependencies,
} from "../commands/init/installer.js";
import { saveWorkspace } from "../utils/workspace.js";
import { isAuthenticated, loadAuth } from "../utils/auth.js";

const CURRICULUM_URL =
  "https://github.com/rawlingsnsame/evaluation_internship.git";
// const ASSISTANT_URL  = "https://github.com/rawlingsnsame/track_my_directory_ai.git";

const S = {
  GIT: 0,
  NODE: 1,
  NETWORK: 2,
  CLONE_C: 3,
  INSTALL_C: 4,
  CLONE_A: 5,
  INSTALL_A: 6,
} as const;

const STEP_LABELS: Record<number, string> = {
  [S.GIT]: "git installed",
  [S.NODE]: "Node.js ≥ 18",
  [S.NETWORK]: "Internet connectivity",
  [S.CLONE_C]: "Clone curriculum repo",
  [S.INSTALL_C]: "Curriculum dependencies",
  [S.CLONE_A]: "Clone assistant repo",
  [S.INSTALL_A]: "Assistant dependencies",
};

const STEP_COUNT = Object.keys(STEP_LABELS).length;

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
  const total = steps.length;
  const pct = Math.round((done / total) * 100);
  const filled = Math.round((done / total) * 32);
  const bar = "█".repeat(filled) + "░".repeat(32 - filled);

  return (
    <Box flexDirection="row" gap={2} marginBottom={1}>
      <Text color={theme.colors.primary}>{bar}</Text>
      <Text color={theme.colors.muted}>{pct}%</Text>
      <Text color={theme.colors.dim}>
        {done}/{total} steps
      </Text>
    </Box>
  );
};

// Main

export const InitScreen: React.FC<InitScreenProps> = ({ onComplete, clearHistory }) => {
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

      // 3. network
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

      // 4. clone curriculum
      setStep(S.CLONE_C, "loading", "Cloning from GitHub…");
      try {
        const { cloned } = await cloneRepo(
          CURRICULUM_URL,
          "./internship/curriculum",
          (attempt) => setStep(S.CLONE_C, "warning", `Retry ${attempt}/3…`),
        );
        if (cancelled) return;
        setStep(
          S.CLONE_C,
          "success",
          cloned
            ? "Cloned → ./internship/curriculum/"
            : "Already exists — skipped",
        );
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setStep(S.CLONE_C, "error", msg);
        setFatalMsg(`Failed to clone curriculum: ${msg}`);
        return;
      }

      // 5. curriculum deps
      setStep(S.INSTALL_C, "loading", "Setting up Python environment…");
      try {
        const installed = await installPythonDependencies(
          "./internship/curriculum",
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

      if (!cancelled) {
        await saveWorkspace(process.cwd());
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

    if (clearHistory && char === "c" && key.ctrl) {
      clearHistory();
      return;
    }

    // Network error prompt
    if (hasNetworkError && networkChoice === "waiting") {
      if (char === "r") {
        setNetworkChoice("retrying");
        setRetryTrigger((n) => n + 1);
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

  // auth
  if (phase === "auth") {
    return (
      <AuthScreen
        onComplete={(success) => {
          if (success) {
            setUserEmail(loadAuth()?.email ?? null);
            setPhase("running");
          } else {
            onComplete();
          }
        }}
      />
    );
  }

  // running / done / fatal
  const completedSteps = steps.filter(
    (s) => s.status === "success" || s.status === "skipped",
  ).length;

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
              <Text color={theme.colors.dim}>{userEmail}</Text>
            </>
          )}
        </Box>
        <Box marginTop={1}>
          <Text color={theme.colors.border}>{"─".repeat(52)}</Text>
        </Box>
      </Box>

      {/* Progress bar */}
      <ProgressBar steps={steps} />

      {/* Step groups */}
      <Box flexDirection="column" marginBottom={1}>
        <Box marginBottom={0}>
          <Text color={theme.colors.dim} bold>
            {" "}
            ENVIRONMENT
          </Text>
        </Box>
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
          status={steps[S.NETWORK]?.status ?? "pending"}
          label={`  ${STEP_LABELS[S.NETWORK]}`}
          detail={steps[S.NETWORK]?.detail ?? ""}
        />

        <Box marginTop={1} marginBottom={0}>
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

        <Box marginTop={1} marginBottom={0}>
          <Text color={theme.colors.dim} bold>
            {" "}
            ASSISTANT
          </Text>
        </Box>
        <StatusLine
          status={steps[S.CLONE_A]?.status ?? "pending"}
          label={`  ${STEP_LABELS[S.CLONE_A]}`}
          detail={steps[S.CLONE_A]?.detail ?? ""}
        />
        <StatusLine
          status={steps[S.INSTALL_A]?.status ?? "pending"}
          label={`  ${STEP_LABELS[S.INSTALL_A]}`}
          detail={steps[S.INSTALL_A]?.detail ?? ""}
        />
      </Box>

      {/* Network error */}
      {hasNetworkError && networkChoice === "waiting" && (
        <Banner type="error" title="No Internet Connection">
          <Text color={theme.colors.text}>
            ZILA needs internet access to clone its components.
          </Text>
          <Box marginTop={1} flexDirection="column">
            <Text color={theme.colors.muted}>
              Check your connection, then press:
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
          <Box flexDirection="column" gap={0}>
            <Text color={theme.colors.text}>
              Everything is set up. Here is what was created:
            </Text>
            <Box marginTop={1} flexDirection="column">
              <Box flexDirection="row" gap={1}>
                <Text color={theme.colors.primary} bold>
                  ./internship/curriculum/
                </Text>
                <Text color={theme.colors.muted}>
                  ML & AI beginner track content
                </Text>
              </Box>
              <Box flexDirection="row" gap={1}>
                <Text color={theme.colors.primary} bold>
                  ./internship/assistant/
                </Text>
                <Text color={theme.colors.muted}>Your AI repo companion</Text>
              </Box>
            </Box>
            <Box marginTop={1} flexDirection="column">
              <Text color={theme.colors.text}>What you can do now:</Text>
              <Box marginLeft={2} flexDirection="column">
                <Text color={theme.colors.dim}>
                  <Text color={theme.colors.secondary}>assistant</Text> — ask
                  questions about your repo
                </Text>
                <Text color={theme.colors.dim}>
                  <Text color={theme.colors.secondary}>info</Text> — view your
                  internship status
                </Text>
                <Text color={theme.colors.dim}>
                  <Text color={theme.colors.secondary}>about-me</Text> — view
                  your Zigex profile
                </Text>
              </Box>
            </Box>
            <Box marginTop={1}>
              <Text color={theme.colors.dim}>Press any key to return…</Text>
            </Box>
          </Box>
        </Banner>
      )}
    </Box>
  );
};
function clearHistory() {
  throw new Error("Function not implemented.");
}

