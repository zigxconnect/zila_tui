import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { loadAuth, zilaApi } from "../utils/auth.js";
import { loadGitHubAuth } from "../utils/githubAuth.js";
import {
  executeAutomatedTaskSubmission,
  checkDailyPrQuota,
  DAY_WEIGHTS,
  CURRICULUM_DOMAINS,
  getTrackModules,
  type TaskSubmissionPayload,
  type AutomatedPrResult,
  SAMPLE_COHORT_REPO,
} from "../utils/githubPrAutomation.js";
import { theme } from "../ui/theme.js";
import { Cursor } from "../ui/Cursor.js";

import { getActiveCohort, mapDepartmentToDomain, mapLevel } from "../utils/activeCohort.js";

interface SubmitTaskScreenProps {
  onComplete: () => void;
}

export const SubmitTaskScreen: React.FC<SubmitTaskScreenProps> = ({ onComplete }) => {
  const activeCohort = getActiveCohort();

  const [currentDomainKey, setCurrentDomainKey] = useState<string>(activeCohort?.domainKey || "ml");
  const [currentLevel, setCurrentLevel] = useState<"beginner" | "intermediate" | "advance">(
    ((activeCohort?.level === "advanced" ? "advance" : activeCohort?.level) as any) || "beginner"
  );

  const initialModule = getTrackModules(currentDomainKey, currentLevel)[0] || "1_fundamentals";
  const [module, setModule] = useState(initialModule);
  const [day, setDay] = useState("1");
  const [summary, setSummary] = useState("");
  const [practicals, setPracticals] = useState("");
  const [challenges, setChallenges] = useState("");
  const [deploymentUrl, setDeploymentUrl] = useState("");

  const [activeField, setActiveField] = useState(0); // 0: module, 1: day, 2: summary, 3: practicals, 4: challenges, 5: deploymentUrl
  const [cursorOn, setCursorOn] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [result, setResult] = useState<AutomatedPrResult | null>(null);
  const [error, setError] = useState("");

  // Automatically fetch student placement program & level directly from endpoint if not cached
  useEffect(() => {
    if (!activeCohort) {
      zilaApi<{ cohorts: any[] }>("/cohorts/my-cohorts")
        .then((res) => {
          if (res?.cohorts && res.cohorts.length > 0) {
            const first = res.cohorts[0];
            const dom = mapDepartmentToDomain(first.department, first.name);
            const lvl = mapLevel(first.level, first.name);
            setCurrentDomainKey(dom);
            const mappedLvl = lvl === "advanced" ? "advance" : lvl;
            setCurrentLevel(mappedLvl);
            const mods = getTrackModules(mappedLvl, dom);
            if (mods.length > 0) setModule(mods[0]!);
          }
        })
        .catch(() => {});
    }
  }, []);

  const currentDomainDef = CURRICULUM_DOMAINS[currentDomainKey] || CURRICULUM_DOMAINS.ml!;
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
        domain: currentDomainKey,
        level: currentLevel,
        module: module.trim() || "1_fundamentals",
        day: Math.max(1, Math.min(4, Number(day) || 1)),
        summary,
        practicalsDescription: practicals || "Implementation completed according to curriculum specification.",
        challenges: challenges || "None reported.",
        deploymentUrl: deploymentUrl || undefined,
        githubRepoUrl: activeCohort?.githubRepoUrl || undefined,
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
      setActiveField((prev) => (prev + 1) % 6);
      return;
    }

    if (key.upArrow) {
      setActiveField((prev) => (prev > 0 ? prev - 1 : 5));
      return;
    }

    if (key.downArrow) {
      setActiveField((prev) => (prev < 5 ? prev + 1 : 0));
      return;
    }

    // Toggle day with left/right
    if (activeField === 1 && (key.leftArrow || key.rightArrow)) {
      setDay((prev) => {
        const d = Number(prev) || 1;
        const next = key.rightArrow ? (d < 4 ? d + 1 : 1) : d > 1 ? d - 1 : 4;
        return String(next);
      });
      return;
    }

    if (key.return) {
      if (activeField < 5) setActiveField((prev) => prev + 1);
      else void sendSubmission();
      return;
    }

    // Text inputs
    const setters = [
      setModule,
      () => {}, // day (toggled via arrows)
      setSummary,
      setPracticals,
      setChallenges,
      setDeploymentUrl,
    ];

    const currentSetter = setters[activeField];
    if (currentSetter && activeField !== 1) {
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
  const cleanModule = module.replace(/[^a-zA-Z0-9_]/g, "_");
  const branchPreview = `${cleanModule}/${username}/day_${dayNumber}`;
  const pathPreview = `contributors/${username}/${currentDomainKey}/${currentLevel}/${cleanModule}/day_${dayNumber}/exercise.md`;

  const fieldLabels = [
    "Curriculum Module:",
    "Curriculum Day:",
    "Exercise Summary:",
    "Practicals Report:",
    "Challenges / Roadblocks:",
    "Deployment URL (opt):",
  ];

  const fieldValues = [
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

      {/* Active cohort indicator */}
      {activeCohort ? (
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.retroSlateDark}>{"Cohort Context:"}</Text>
          <Text color={theme.colors.retroCyanBright} bold>{`[${activeCohort.name}]`}</Text>
          <Text color={theme.colors.retroGreenBright}>{"(Auto-selected from your placement)"}</Text>
        </Box>
      ) : (
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.retroSlateDark}>{"Cohort Context: [None - Type 'select --cohorts' to bind]"}</Text>
        </Box>
      )}

      {/* Divider */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {result ? (
        <Box flexDirection="column" paddingY={1}>
          <Text color={theme.colors.retroGreenBright} bold>
            {"✓ Automated Pull Request Created & Submitted Successfully!"}
          </Text>
          <Box flexDirection="column" marginTop={1} gap={0}>
            <Box flexDirection="row" gap={1}>
              <Box width={18}><Text color={theme.colors.retroSlateDark}>{"Domain & Track:"}</Text></Box>
              <Text color={theme.colors.white} bold>{`${currentDomainKey.toUpperCase()} / ${currentLevel.toUpperCase()}`}</Text>
            </Box>
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
          {/* Locked Program Domain & Track Level (Direct from endpoint / cohort) */}
          <Box flexDirection="row" gap={1} marginBottom={0}>
            <Box width={26}>
              <Text color={theme.colors.retroSlateDark}>{"  Curriculum Domain:"}</Text>
            </Box>
            <Text color={theme.colors.retroCyanBright} bold>
              {`[ ${currentDomainKey.toUpperCase()}: ${currentDomainDef.name} ]`}
            </Text>
            <Text color={theme.colors.retroGreenBright}>{"(Fixed from cohort)"}</Text>
          </Box>

          <Box flexDirection="row" gap={1} marginBottom={0}>
            <Box width={26}>
              <Text color={theme.colors.retroSlateDark}>{"  Track Level:"}</Text>
            </Box>
            <Text color={theme.colors.retroCyanBright} bold>
              {`[ ${currentLevel.toUpperCase()} ]`}
            </Text>
            <Text color={theme.colors.retroGreenBright}>{"(Fixed from cohort)"}</Text>
          </Box>

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
                {isSelected && !submitting && index !== 1 && <Cursor on={cursorOn} />}
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
              <Box width={18}><Text color={theme.colors.retroSlateDark}>{"Domain / Track:"}</Text></Box>
              <Text color={theme.colors.white}>{`${currentDomainKey.toUpperCase()} · ${currentLevel}`}</Text>
            </Box>
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
              {activeField === 7 ? "enter to launch automated PR" : "tab / ↑ / ↓ to navigate"}
            </Text>
          </Box>
        </>
      )}
    </Box>
  );
};
