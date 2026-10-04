import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { loadAuth } from "../utils/auth.js";
import { loadGitHubAuth } from "../utils/githubAuth.js";
import {
  executeAutomatedTaskSubmission,
  checkDailyPrQuota,
  DAY_WEIGHTS,
  CURRICULUM_TRACKS,
  type TaskSubmissionPayload,
  type AutomatedPrResult,
  SAMPLE_COHORT_REPO,
} from "../utils/githubPrAutomation.js";
import { theme } from "../ui/theme.js";
import { Cursor } from "../ui/Cursor.js";

interface SubmitTaskScreenProps {
  onComplete: () => void;
}

export const SubmitTaskScreen: React.FC<SubmitTaskScreenProps> = ({ onComplete }) => {
  const [levelIndex, setLevelIndex] = useState(0); // 0: beginner, 1: intermediate, 2: advance
  const [module, setModule] = useState("1_python");
  const [day, setDay] = useState("1");
  const [summary, setSummary] = useState("");
  const [practicals, setPracticals] = useState("");
  const [challenges, setChallenges] = useState("");
  const [deploymentUrl, setDeploymentUrl] = useState("");

  const [activeField, setActiveField] = useState(0); // 0: level, 1: module, 2: day, 3: summary, 4: practicals, 5: challenges, 6: deploymentUrl
  const [cursorOn, setCursorOn] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [result, setResult] = useState<AutomatedPrResult | null>(null);
  const [error, setError] = useState("");

  const levels: Array<"beginner" | "intermediate" | "advance"> = ["beginner", "intermediate", "advance"];
  const currentLevel = levels[levelIndex] || "beginner";
  const quota = checkDailyPrQuota();

  useEffect(() => {
    if (result || submitting) return;
    setCursorOn(true);
    const interval = setInterval(() => setCursorOn((visible) => !visible), 500);
    return () => clearInterval(interval);
  }, [result, submitting, activeField]);

  const sendSubmission = async () => {
    setError("");
    const session = loadAuth();
    if (!session?.token) {
      setError("Not logged in to Zigex. Run 'zila auth' first.");
      return;
    }

    if (!summary.trim()) {
      setError("Please provide an exercise summary.");
      return;
    }

    setSubmitting(true);
    setProgressMsg("Initiating automated GitHub PR pipeline...");
    try {
      const payload: TaskSubmissionPayload = {
        level: currentLevel,
        module: module.trim() || "1_python",
        day: Math.max(1, Math.min(4, Number(day) || 1)),
        summary,
        practicalsDescription: practicals || "Implementation completed according to curriculum specification.",
        challenges: challenges || "None reported.",
        deploymentUrl: deploymentUrl || undefined,
      };

      const res = await executeAutomatedTaskSubmission(payload, (step) => setProgressMsg(step));
      setResult(res);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : String(submissionError));
    } finally {
      setSubmitting(false);
    }
  };

  useInput((char, key) => {
    if (result) {
      if (key.escape || char === "q" || key.return) onComplete();
      return;
    }
    if (submitting) return;

    if (key.escape) {
      onComplete();
      return;
    }

    if (key.tab) {
      setActiveField((prev) => (prev + 1) % 7);
      return;
    }

    if (key.upArrow) {
      setActiveField((prev) => (prev > 0 ? prev - 1 : 6));
      return;
    }

    if (key.downArrow) {
      setActiveField((prev) => (prev < 6 ? prev + 1 : 0));
      return;
    }

    // Toggle level or day with left/right
    if (activeField === 0 && (key.leftArrow || key.rightArrow)) {
      setLevelIndex((prev) => (key.rightArrow ? (prev + 1) % 3 : prev > 0 ? prev - 1 : 2));
      const nextLvl = levels[(key.rightArrow ? (levelIndex + 1) % 3 : levelIndex > 0 ? levelIndex - 1 : 2)] || "beginner";
      setModule(CURRICULUM_TRACKS[nextLvl]?.[0] || "1_python");
      return;
    }

    if (activeField === 2 && (key.leftArrow || key.rightArrow)) {
      setDay((prev) => {
        const d = Number(prev) || 1;
        const next = key.rightArrow ? (d < 4 ? d + 1 : 1) : d > 1 ? d - 1 : 4;
        return String(next);
      });
      return;
    }

    if (key.return) {
      if (activeField < 6) setActiveField((prev) => prev + 1);
      else void sendSubmission();
      return;
    }

    // Text inputs
    const setters = [
      () => {}, // level
      setModule,
      setDay,
      setSummary,
      setPracticals,
      setChallenges,
      setDeploymentUrl,
    ];

    const currentSetter = setters[activeField];
    if (currentSetter && activeField !== 0) {
      if (key.backspace || key.delete) {
        currentSetter((prev: string) => prev.slice(0, -1));
      } else if (char) {
        currentSetter((prev: string) => prev + char);
        setCursorOn(true);
      }
    }
  });

  const dayNumber = Math.max(1, Math.min(4, Number(day) || 1));
  const dayWeightInfo = DAY_WEIGHTS[dayNumber] || { weight: 1, percentage: 12.5 };
  const ghAuth = loadGitHubAuth();
  const username = ghAuth?.username || "student";
  const branchPreview = `${module.replace(/[^a-zA-Z0-9_-]/g, "_")}/${username}/day-${dayNumber}`;
  const pathPreview = `contributors/${username}/${currentLevel}/${module}/day-${dayNumber}/exercise.md`;

  const fieldLabels = [
    "Track Level:",
    "Curriculum Module:",
    "Curriculum Day:",
    "Exercise Summary:",
    "Practicals Report:",
    "Challenges / Roadblocks:",
    "Deployment URL (opt):",
  ];

  const fieldValues = [
    `[ ${currentLevel.toUpperCase()} ] (use ←/→ to toggle)`,
    module,
    `Day 0${dayNumber} (use ←/→ to toggle)`,
    summary,
    practicals,
    challenges,
    deploymentUrl,
  ];

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Top rule */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.retroBlue} bold>{"lil-zila"}</Text>
          <Text color={theme.colors.retroSlateDark}>{"›"}</Text>
          <Text color={theme.colors.white} bold>{"automated task submission pipeline"}</Text>
        </Box>
        <Text color={quota.countToday >= 2 ? theme.colors.error : theme.colors.retroGreenBright}>
          {`PR quota: ${quota.countToday}/2 used today`}
        </Text>
      </Box>

      {/* Divider */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {result ? (
        <Box flexDirection="column" paddingY={1}>
          <Text color={theme.colors.retroGreenBright} bold>
            {"✓ Automated Pull Request Created & Submitted Successfully!"}
          </Text>
          <Box flexDirection="column" marginTop={1} gap={0}>
            <Box flexDirection="row" gap={1}>
              <Box width={18}><Text color={theme.colors.retroSlateDark}>{"Target Repo:"}</Text></Box>
              <Text color={theme.colors.white} bold>{result.repositoryUrl}</Text>
            </Box>
            <Box flexDirection="row" gap={1}>
              <Box width={18}><Text color={theme.colors.retroSlateDark}>{"Automated Branch:"}</Text></Box>
              <Text color={theme.colors.retroBlueBright} bold>{result.branchName}</Text>
            </Box>
            <Box flexDirection="row" gap={1}>
              <Box width={18}><Text color={theme.colors.retroSlateDark}>{"Pull Request:"}</Text></Box>
              <Text color={theme.colors.retroGreenBright} bold>{result.pullRequestUrl}</Text>
            </Box>
            <Box flexDirection="row" gap={1}>
              <Box width={18}><Text color={theme.colors.retroSlateDark}>{"Contributor Path:"}</Text></Box>
              <Text color={theme.colors.text}>{result.contributorFilePath}</Text>
            </Box>
            <Box flexDirection="row" gap={1}>
              <Box width={18}><Text color={theme.colors.retroSlateDark}>{"Rubric Weight:"}</Text></Box>
              <Text color={theme.colors.white}>{`${result.dayWeight} pt (${result.normalizedPercentage}% normalized)`}</Text>
            </Box>
            <Box flexDirection="row" gap={1}>
              <Box width={18}><Text color={theme.colors.retroSlateDark}>{"Remaining Quota:"}</Text></Box>
              <Text color={theme.colors.retroBlueBright}>{`${result.quotaRemaining}/2 PRs remaining today`}</Text>
            </Box>
          </Box>
          <Box marginTop={1}>
            <Text color={theme.colors.retroSlateDark}>{"press enter or esc to return to prompt"}</Text>
          </Box>
        </Box>
      ) : (
        <>
          {/* Form Fields */}
          {fieldLabels.map((label, index) => {
            const isSelected = activeField === index;
            const labelColor = isSelected ? theme.colors.retroBlueBright : theme.colors.retroSlateDark;
            const val = fieldValues[index];

            return (
              <Box key={label} flexDirection="row" gap={1} marginBottom={0}>
                <Box width={26}>
                  <Text color={labelColor} bold={isSelected}>
                    {isSelected ? `› ${label}` : `  ${label}`}
                  </Text>
                </Box>
                <Text color={isSelected ? theme.colors.white : theme.colors.text}>
                  {val || (isSelected ? "" : "—")}
                </Text>
                {isSelected && !submitting && index !== 0 && index !== 2 && <Cursor on={cursorOn} />}
              </Box>
            );
          })}

          {error && (
            <Box marginTop={1}>
              <Text color={theme.colors.error} bold>{`! ${error}`}</Text>
            </Box>
          )}

          {submitting && (
            <Box marginTop={1}>
              <Text color={theme.colors.retroBlueBright} bold>{`[PIPELINE] ${progressMsg}`}</Text>
            </Box>
          )}

          {/* Live Preview Box */}
          <Box flexDirection="column" marginTop={1}>
            <Text color={theme.colors.retroBlueBright} bold>{"AUTOMATED PIPELINE PREVIEW"}</Text>
            <Box flexDirection="row" gap={1}>
              <Box width={18}><Text color={theme.colors.retroSlateDark}>{"Branch:"}</Text></Box>
              <Text color={theme.colors.white}>{branchPreview}</Text>
            </Box>
            <Box flexDirection="row" gap={1}>
              <Box width={18}><Text color={theme.colors.retroSlateDark}>{"File Location:"}</Text></Box>
              <Text color={theme.colors.retroSlate}>{pathPreview}</Text>
            </Box>
            <Box flexDirection="row" gap={1}>
              <Box width={18}><Text color={theme.colors.retroSlateDark}>{"Sprint Progress:"}</Text></Box>
              <Text color={theme.colors.retroBlueBright}>
                {`[ ${"■ ".repeat(dayNumber)}${"□ ".repeat(4 - dayNumber)}] (Day ${dayNumber} of 4)`}
              </Text>
            </Box>
            <Box flexDirection="row" gap={1}>
              <Box width={18}><Text color={theme.colors.retroSlateDark}>{"Normalized Score:"}</Text></Box>
              <Text color={theme.colors.retroGreenBright}>{`${dayWeightInfo.weight} pt · ${dayWeightInfo.percentage}% of weekly 100`}</Text>
            </Box>
          </Box>

          {/* Bottom rule */}
          <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

          {/* Footer */}
          <Box flexDirection="row" justifyContent="space-between">
            <Text color={theme.colors.retroSlateDark}>{"tab next · enter submit · esc cancel"}</Text>
            <Text color={theme.colors.retroSlateDark}>
              {activeField === 6 ? "enter to launch automated PR" : "tab / ↑ / ↓ to navigate"}
            </Text>
          </Box>
        </>
      )}
    </Box>
  );
};
