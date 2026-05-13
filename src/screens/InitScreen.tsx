import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { StatusLine, type StatusType } from "../ui/StatusLine.js";
import { Banner } from "../ui/Banner.js";
import { Divider } from "../ui/Divider.js";
import { checkGit, checkNode } from "../commands/init/checks.js";
import { probeNetwork, NetworkError } from "../utils/network.js";
import { cloneRepo } from "../commands/init/cloner.js";
import {
  installPythonDependencies,
  installNpmDependencies,
} from "../commands/init/installer.js";
import { saveWorkspace } from "../utils/workspace.js";

// Repo URLs 
const CURRICULUM_URL = "https://github.com/rawlingsnsame/evaluation_internship.git";
//const ASSISTANT_URL  = "https://github.com/rawlingsnsame/track_my_directory_ai.git";

const S = {
  GIT:       0,
  NODE:      1,
  NETWORK:   2,
  CLONE_C:   3,
  INSTALL_C: 4,
  CLONE_A:   5,
  INSTALL_A: 6,
} as const;

const STEP_LABELS: Record<number, string> = {
  [S.GIT]:       "Check git",
  [S.NODE]:      "Check Node.js ≥ 18",
  [S.NETWORK]:   "Network connectivity",
  [S.CLONE_C]:   "Clone curriculum",
  [S.INSTALL_C]: "Curriculum dependencies",
  [S.CLONE_A]:   "Clone assistant",
  [S.INSTALL_A]: "Assistant dependencies",
};

const STEP_COUNT = Object.keys(STEP_LABELS).length;

interface Step {
  status: StatusType;
  detail: string;
}

function makeSteps(): Step[] {
  return Array.from({ length: STEP_COUNT }, () => ({
    status: "pending" as StatusType,
    detail: "",
  }));
}

// Network retry state 
type NetworkRetryChoice = "waiting" | "retrying" | "skipping";

interface InitScreenProps {
  onComplete: () => void;
}

export const InitScreen: React.FC<InitScreenProps> = ({ onComplete }) => {
  const [steps, setSteps]                         = useState<Step[]>(makeSteps);
  const [isDone, setIsDone]                       = useState(false);
  const [fatalMsg, setFatalMsg]                   = useState<string | null>(null);
  const [hasNetworkError, setHasNetworkError]     = useState(false);
  const [networkChoice, setNetworkChoice]         = useState<NetworkRetryChoice>("waiting");
  // A trigger value incremented to re-run the network probe + rest of flow
  const [retryTrigger, setRetryTrigger]           = useState(0);

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

  useEffect(() => {
    let cancelled = false;

    async function runFlow() {
      // Reset on retry
      setSteps(makeSteps());
      setFatalMsg(null);
      setHasNetworkError(false);
      setIsDone(false);

      // 1. git 
      setStep(S.GIT, "loading", "Checking…");
      const git = await checkGit();
      if (cancelled) return;

      if (!git.passed) {
        setStep(S.GIT, "error", git.error);
        setFatalMsg(git.error ?? "git check failed.");
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
          (_attempt: number) =>
            setStep(S.CLONE_C, "warning", `Retry ${_attempt}/3…`),
        );
        if (cancelled) return;
        setStep(
          S.CLONE_C,
          "success",
          cloned ? "Cloned → ./internship/curriculum/" : "Already exists — skipped",
        );
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setStep(S.CLONE_C, "error", msg);
        setFatalMsg(`Failed to clone curriculum: ${msg}`);
        return;
      }

      // 5. curriculum dependencies 
      setStep(S.INSTALL_C, "loading", "Setting up Python environment…");
      try {
        const installed = await installPythonDependencies(
          "./internship/curriculum",
          (_attempt: number) =>
            setStep(S.INSTALL_C, "warning", `Retry ${_attempt}/3…`),
        );
        if (cancelled) return;
        setStep(
          S.INSTALL_C,
          installed ? "success" : "skipped",
          installed ? "Python packages installed" : "No requirements.txt — skipped",
        );
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setStep(S.INSTALL_C, "warning", `Install failed: ${msg}`);
      }

      if (!cancelled) {
        await saveWorkspace(process.cwd());
        setIsDone(true);
      }
    }

    runFlow().catch((err: unknown) => {
      if (!cancelled) {
        const msg = err instanceof Error ? err.message : String(err);
        setFatalMsg(msg);
      }
    });

    return () => { cancelled = true; };
  }, [retryTrigger]);
  useInput((char) => {
    if ((isDone || fatalMsg) && !hasNetworkError) {
      if (char === "\r" || char === "q" || char === "\u001b") {
        onComplete();
      }
      return;
    }

    if (hasNetworkError && networkChoice === "waiting") {
      if (char === "r") {
        setNetworkChoice("retrying");
        setRetryTrigger((n) => n + 1);
      } else if (char === "s") {
        setNetworkChoice("skipping");
        setSteps((prev) => {
          const next = [...prev];
          for (let i = S.CLONE_C; i < STEP_COUNT; i++) {
            next[i] = { status: "skipped", detail: "Skipped (offline)" };
          }
          return next;
        });
        setHasNetworkError(false);
        setIsDone(true);
      } else if (char === "q" || char === "\u001b") {
        onComplete();
      }
      return;
    }

    if (isDone || fatalMsg) {
      onComplete();
    }
  });

  // Render 

  const stepLabel = (i: number) =>
    `[${i + 1}/${STEP_COUNT}]  ${STEP_LABELS[i]}`;

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Section header */}
      <Box marginBottom={1}>
        <Divider label="zila init" width={40} />
      </Box>

      {/* Step list */}
      {Array.from({ length: STEP_COUNT }, (_, i) => (
        <StatusLine
          key={i}
          status={steps[i]?.status ?? "pending"}
          label={stepLabel(i)}
          detail={steps[i]?.detail}
        />
      ))}

      {/* Network error inline prompt  */}
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
              <Text color={theme.colors.white}>
                <Text color={theme.colors.primary} bold>r</Text>
                {"  Retry now"}
              </Text>
              <Text color={theme.colors.white}>
                <Text color={theme.colors.warning} bold>s</Text>
                {"  Skip cloning (checks only)"}
              </Text>
              <Text color={theme.colors.white}>
                <Text color={theme.colors.muted} bold>q</Text>
                {"  Return to shell"}
              </Text>
            </Box>
          </Box>
        </Banner>
      )}

      {/* Fatal error (git / node missing)  */}
      {fatalMsg && !hasNetworkError && (
        <Banner type="error" title="Setup Halted">
          <Box flexDirection="column" gap={0}>
            <Text color={theme.colors.text}>{fatalMsg}</Text>
            <Box marginTop={1}>
              <Text color={theme.colors.muted}>
                Fix the issue above, then run{" "}
                <Text color={theme.colors.primary} bold>zila init</Text>
                {" "}again.
              </Text>
            </Box>
            <Box marginTop={1}>
              <Text color={theme.colors.border}>
                Press any key to return to shell…
              </Text>
            </Box>
          </Box>
        </Banner>
      )}

      {/* Success  */}
      {isDone && !fatalMsg && (
        <Banner type="success" title="ZILA is ready">
          <Box flexDirection="column" gap={0}>
            <Text color={theme.colors.text}>
              Your workspace has been set up successfully.
            </Text>

            <Box marginTop={1} flexDirection="column">
              <Box flexDirection="row">
                <Text color={theme.colors.primary} bold>{"./internship/curriculum/"}</Text>
                <Text color={theme.colors.muted}>{"  ML & AI beginner track content"}</Text>
              </Box>
              <Box flexDirection="row">
                <Text color={theme.colors.primary} bold>{"./internship/assistant/"}</Text>
                <Text color={theme.colors.muted}>{"  Your AI progress companion"}</Text>
              </Box>
            </Box>

            <Box marginTop={1}>
              <Text color={theme.colors.text}>
                {"Next: type "}
                <Text color={theme.colors.primary} bold>{"assistant --agent"}</Text>
                {" to get started."}
              </Text>
            </Box>

            <Box marginTop={1}>
              <Text color={theme.colors.border}>
                Press any key to return to shell…
              </Text>
            </Box>
          </Box>
        </Banner>
      )}
    </Box>
  );
};

