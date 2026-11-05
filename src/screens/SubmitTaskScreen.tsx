import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { loadAuth } from "../utils/auth.js";
import { loadGitHubAuth } from "../utils/githubAuth.js";
import { getActiveCohort } from "../utils/activeCohort.js";
import {
  executeAutomatedTaskSubmission,
  checkDailyPrQuota,
  type TaskSubmissionPayload,
  type AutomatedPrResult,
} from "../utils/githubPrAutomation.js";
import { theme } from "../ui/theme.js";
import { Cursor } from "../ui/Cursor.js";

interface SubmitTaskScreenProps {
  onComplete: () => void;
}

export const SubmitTaskScreen: React.FC<SubmitTaskScreenProps> = ({ onComplete }) => {
  const activeCohort = getActiveCohort();
  const defaultDomain = activeCohort?.domainKey || "ml";
  const defaultLevel = (activeCohort?.level === "advanced" ? "advance" : activeCohort?.level) || "beginner";

  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [moduleName, setModuleName] = useState<string>("1_python");
  const [summary, setSummary] = useState<string>("");
  const [challenges, setChallenges] = useState<string>("");
  const [projectRepo, setProjectRepo] = useState<string>("");
  const [activeField, setActiveField] = useState<number>(0); // 0: Day, 1: Module, 2: Summary, 3: Challenges, 4: Project/Deploy
  const [cursorOn, setCursorOn] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [currentProgress, setCurrentProgress] = useState<string>("");
  const [submissionResult, setSubmissionResult] = useState<AutomatedPrResult | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (submissionResult || submitting) return;
    setCursorOn(true);
    const interval = setInterval(() => setCursorOn((visible) => !visible), 500);
    return () => clearInterval(interval);
  }, [submissionResult, submitting, activeField]);

  const sendSubmission = async () => {
    setError("");
    const session = loadAuth();
    const github = loadGitHubAuth();
    if (!session?.token) {
      setError("Not logged in to Zigex. Run 'zila auth' first.");
      return;
    }
    if (!github?.token) {
      setError("Not connected to GitHub. Run 'zila github-auth' first.");
      return;
    }

    const quota = checkDailyPrQuota();
    if (!quota.allowed) {
      setError(quota.message);
      return;
    }

    if (!summary.trim()) {
      setError("Please provide a brief summary of what you implemented.");
      return;
    }

    setSubmitting(true);
    setCurrentProgress("Initializing automated GitHub PR pipeline...");

    try {
      const payload: TaskSubmissionPayload = {
        cohortId: activeCohort?.id || undefined,
        domain: defaultDomain,
        level: defaultLevel as "beginner" | "intermediate" | "advance",
        module: moduleName.trim() || "1_python",
        day: selectedDay,
        summary: summary.trim(),
        practicalsDescription: summary.trim(),
        challenges: challenges.trim() || "None reported.",
        deploymentUrl: projectRepo.trim() || undefined,
        githubRepoUrl: activeCohort?.githubRepoUrl || undefined,
      };

      const result = await executeAutomatedTaskSubmission(payload, (step) => {
        setCurrentProgress(step);
      });

      setSubmissionResult(result);
    } catch (submissionError: any) {
      setError(submissionError instanceof Error ? submissionError.message : String(submissionError));
    } finally {
      setSubmitting(false);
    }
  };

  useInput((char, key) => {
    if (submissionResult) {
      if (key.escape || char === "q" || key.return) onComplete();
      return;
    }
    if (submitting) return;

    if (key.escape) {
      onComplete();
      return;
    }

    // Day selection shortcuts (1, 2, 3, 4)
    if (char === "1" || char === "2" || char === "3" || char === "4") {
      if (activeField === 0) {
        setSelectedDay(Number(char));
        return;
      }
    }

    if (activeField === 0) {
      if (key.leftArrow) {
        setSelectedDay((prev) => (prev > 1 ? prev - 1 : 4));
        return;
      }
      if (key.rightArrow) {
        setSelectedDay((prev) => (prev < 4 ? prev + 1 : 1));
        return;
      }
    }

    if (key.tab) {
      setActiveField((prev) => (prev + 1) % 5);
      return;
    }
    if (key.upArrow) {
      setActiveField((prev) => (prev > 0 ? prev - 1 : 4));
      return;
    }
    if (key.downArrow) {
      setActiveField((prev) => (prev < 4 ? prev + 1 : 0));
      return;
    }
    if (key.return) {
      if (activeField < 4) {
        setActiveField((prev) => prev + 1);
      } else {
        void sendSubmission();
      }
      return;
    }

    if (activeField === 1) {
      if (key.backspace || key.delete) {
        setModuleName((prev) => prev.slice(0, -1));
      } else if (char) {
        setModuleName((prev) => prev + char);
      }
    } else if (activeField === 2) {
      if (key.backspace || key.delete) {
        setSummary((prev) => prev.slice(0, -1));
      } else if (char) {
        setSummary((prev) => prev + char);
      }
    } else if (activeField === 3) {
      if (key.backspace || key.delete) {
        setChallenges((prev) => prev.slice(0, -1));
      } else if (char) {
        setChallenges((prev) => prev + char);
      }
    } else if (activeField === 4) {
      if (key.backspace || key.delete) {
        setProjectRepo((prev) => prev.slice(0, -1));
      } else if (char) {
        setProjectRepo((prev) => prev + char);
      }
    }
  });

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.retroBlue} bold>{"lil-zila"}</Text>
          <Text color={theme.colors.retroSlateDark}>{"›"}</Text>
          <Text color={theme.colors.white} bold>{"automated task submission & pr generation"}</Text>
        </Box>
        <Text color={theme.colors.retroBlueBright}>
          {activeCohort?.name ? `[${activeCohort.name.slice(0, 24)}]` : "[General Track]"}
        </Text>
      </Box>
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {submissionResult ? (
        <Box flexDirection="column" paddingY={1}>
          <Text color={theme.colors.retroGreenBright} bold>
            {"✓ Pull Request Created and Task Submitted Successfully!"}
          </Text>
          <Box marginTop={1} flexDirection="column">
            <Text color={theme.colors.white} bold>
              {`PR Link:     `}
              <Text color={theme.colors.retroCyanBright} underline>{submissionResult.pullRequestUrl}</Text>
            </Text>
            <Text color={theme.colors.retroSlate}>
              {`Branch:      ${submissionResult.branchName}`}
            </Text>
            <Text color={theme.colors.retroSlate}>
              {`Exercise:    ${submissionResult.contributorFilePath}`}
            </Text>
            <Text color={theme.colors.white}>
              {`Day Weight:  ${submissionResult.dayWeight} pt (${submissionResult.normalizedPercentage}% normalized)`}
            </Text>
            {submissionResult.proposedMark !== undefined && (
              <Text color={theme.colors.retroGreenBright} bold>
                {`Proposed Allocation Mark: ${(submissionResult.proposedMark * 100).toFixed(0)}% (${submissionResult.proposedMark.toFixed(2)} / 1.0)`}
              </Text>
            )}
            <Text
              color={
                submissionResult.cheatingRisk === "CLEAN"
                  ? theme.colors.retroGreenBright
                  : theme.colors.warning
              }
              bold
            >
              {`Integrity:   ${submissionResult.cheatingRisk === "CLEAN" ? "✔ CLEAN (Verified Genuine Work)" : `⚠ ${submissionResult.cheatingRisk || "AUDITED"} (Malpractice Review Flagged)`}`}
            </Text>
            <Text color={theme.colors.retroSlateDark}>
              {`Remaining Quota Today: ${submissionResult.quotaRemaining}/2 PRs`}
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text color={theme.colors.retroBlueBright}>{"press enter or esc to return to workstation"}</Text>
          </Box>
        </Box>
      ) : (
        <>
          {/* Field 0: Day Selector */}
          <Box flexDirection="row" gap={1} marginBottom={1} alignItems="center">
            <Box width={16}>
              <Text color={activeField === 0 ? theme.colors.retroBlueBright : theme.colors.retroSlateDark} bold>
                {activeField === 0 ? "› Day Select:" : "  Day Select:"}
              </Text>
            </Box>
            {[1, 2, 3, 4].map((dayNum) => {
              const isSelected = selectedDay === dayNum;
              return (
                <Box
                  key={dayNum}
                  paddingX={1}
                  borderStyle={isSelected ? "round" : undefined}
                  borderColor={isSelected ? theme.colors.retroBlueBright : undefined}
                >
                  <Text
                    color={isSelected ? theme.colors.retroCyanBright : theme.colors.retroSlateDark}
                    bold={isSelected}
                  >
                    {`Day 0${dayNum}`}
                  </Text>
                </Box>
              );
            })}
            <Text color={theme.colors.retroSlateDark}>{"(Use ←/→ arrows or 1-4 keys)"}</Text>
          </Box>

          {/* Field 1: Module */}
          <Box flexDirection="row" gap={1} marginBottom={1}>
            <Box width={16}>
              <Text color={activeField === 1 ? theme.colors.retroBlueBright : theme.colors.retroSlateDark} bold>
                {activeField === 1 ? "› Module:" : "  Module:"}
              </Text>
            </Box>
            <Text color={theme.colors.white}>{moduleName || "(e.g. 1_python)"}</Text>
            {activeField === 1 && !submitting && <Cursor on={cursorOn} />}
          </Box>

          {/* Field 2: Summary */}
          <Box flexDirection="row" gap={1} marginBottom={1}>
            <Box width={16}>
              <Text color={activeField === 2 ? theme.colors.retroBlueBright : theme.colors.retroSlateDark} bold>
                {activeField === 2 ? "› Summary:" : "  Summary:"}
              </Text>
            </Box>
            <Text color={theme.colors.white}>{summary || "(e.g. Implemented circular buffer and unit tests)"}</Text>
            {activeField === 2 && !submitting && <Cursor on={cursorOn} />}
          </Box>

          {/* Field 3: Challenges */}
          <Box flexDirection="row" gap={1} marginBottom={1}>
            <Box width={16}>
              <Text color={activeField === 3 ? theme.colors.retroBlueBright : theme.colors.retroSlateDark} bold>
                {activeField === 3 ? "› Roadblocks:" : "  Roadblocks:"}
              </Text>
            </Box>
            <Text color={theme.colors.white}>{challenges || "(optional challenges encountered)"}</Text>
            {activeField === 3 && !submitting && <Cursor on={cursorOn} />}
          </Box>

          {/* Field 4: Project / Deploy Link */}
          <Box flexDirection="row" gap={1} marginBottom={1}>
            <Box width={16}>
              <Text color={activeField === 4 ? theme.colors.retroBlueBright : theme.colors.retroSlateDark} bold>
                {activeField === 4 ? "› Deploy Link:" : "  Deploy Link:"}
              </Text>
            </Box>
            <Text color={theme.colors.white}>{projectRepo || "(optional repo or live URL)"}</Text>
            {activeField === 4 && !submitting && <Cursor on={cursorOn} />}
          </Box>

          {error && (
            <Box marginY={1}>
              <Text color={theme.colors.error} bold>{`! ${error}`}</Text>
            </Box>
          )}

          {submitting && (
            <Box flexDirection="column" marginY={1}>
              <Text color={theme.colors.retroCyan} bold>{"Running automated submission pipeline..."}</Text>
              <Text color={theme.colors.retroSlateDark}>{currentProgress}</Text>
            </Box>
          )}

          <Box flexDirection="column" marginTop={1} marginBottom={1}>
            <Text color={theme.colors.retroBlueBright} bold>{"SUBMISSION TARGET"}</Text>
            <Text color={theme.colors.retroSlate}>
              {`Domain: ${defaultDomain.toUpperCase()} | Track: ${defaultLevel.toUpperCase()} | Target: Day 0${selectedDay} (${moduleName})`}
            </Text>
            <Text color={theme.colors.retroSlateDark}>
              {`Target Repo: ${activeCohort?.githubRepoUrl || "Default Supervisor Cohort Repository"}`}
            </Text>
          </Box>

          <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>
          <Box flexDirection="row" justifyContent="space-between">
            <Text color={theme.colors.retroSlateDark}>{"tab next · enter submit · esc cancel"}</Text>
            <Text color={theme.colors.retroSlateDark}>
              {activeField === 4 ? "enter to launch automatic PR" : "tab to next field"}
            </Text>
          </Box>
        </>
      )}
    </Box>
  );
};
