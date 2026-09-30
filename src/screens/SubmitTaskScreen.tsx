import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { loadAuth } from "../utils/auth.js";
import { loadGitHubAuth } from "../utils/githubAuth.js";
import { submitTaskWithPullRequest } from "../utils/taskSubmission.js";
import { theme } from "../ui/theme.js";
import { Cursor } from "../ui/Cursor.js";

interface SubmitTaskScreenProps {
  onComplete: () => void;
}

export const SubmitTaskScreen: React.FC<SubmitTaskScreenProps> = ({ onComplete }) => {
  const [taskId, setTaskId] = useState("");
  const [pullRequestUrl, setPullRequestUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [activeField, setActiveField] = useState(0);
  const [cursorOn, setCursorOn] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (submitted || submitting) return;
    setCursorOn(true);
    const interval = setInterval(() => setCursorOn((visible) => !visible), 500);
    return () => clearInterval(interval);
  }, [submitted, submitting, activeField]);

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

    setSubmitting(true);
    try {
      await submitTaskWithPullRequest(taskId, pullRequestUrl, summary, session.token, github);
      setSubmitted(true);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : String(submissionError));
    } finally {
      setSubmitting(false);
    }
  };

  useInput((char, key) => {
    if (submitted) {
      if (key.escape || char === "q" || key.return) onComplete();
      return;
    }
    if (submitting) return;

    if (key.escape) {
      onComplete();
      return;
    }
    if (key.tab) {
      setActiveField((previous) => (previous + 1) % 3);
      return;
    }
    if (key.upArrow) {
      setActiveField((previous) => (previous > 0 ? previous - 1 : 2));
      return;
    }
    if (key.downArrow) {
      setActiveField((previous) => (previous < 2 ? previous + 1 : 0));
      return;
    }
    if (key.return) {
      if (activeField < 2) setActiveField((previous) => previous + 1);
      else void sendSubmission();
      return;
    }

    const updateField = activeField === 0 ? setTaskId : activeField === 1 ? setPullRequestUrl : setSummary;
    if (key.backspace || key.delete) {
      updateField((previous) => previous.slice(0, -1));
    } else if (char) {
      updateField((previous) => previous + char);
      setCursorOn(true);
    }
  });

  const values = [taskId, pullRequestUrl, summary];
  const placeholders = ["(e.g., TASK-101)", "(https://github.com/owner/repo/pull/123)", "(optional summary)"];
  const labels = ["Task ID:", "GitHub PR:", "Summary:"];
  const activeHint = activeField === 2 ? "enter to submit" : "tab to switch fields";

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.retroBlue} bold>{"lil-zila"}</Text>
          <Text color={theme.colors.retroSlateDark}>{"›"}</Text>
          <Text color={theme.colors.white} bold>{"task submission"}</Text>
        </Box>
        <Text color={theme.colors.retroSlateDark}>{"GitHub pull request"}</Text>
      </Box>
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {submitted ? (
        <Box flexDirection="column" paddingY={1}>
          <Text color={theme.colors.retroGreenBright} bold>{"Task submitted successfully."}</Text>
          <Text color={theme.colors.white}>{`Task: ${taskId}`}</Text>
          <Text color={theme.colors.white}>{pullRequestUrl}</Text>
          {summary && <Text color={theme.colors.retroSlate}>{summary}</Text>}
          <Text color={theme.colors.retroSlateDark}>{"press enter to return"}</Text>
        </Box>
      ) : (
        <>
          {labels.map((label, index) => (
            <Box key={label} flexDirection="row" gap={1} marginBottom={1}>
              <Box width={18}>
                <Text color={activeField === index ? theme.colors.retroBlueBright : theme.colors.retroSlateDark} bold>
                  {activeField === index ? `› ${label}` : `  ${label}`}
                </Text>
              </Box>
              <Text color={theme.colors.white}>
                {values[index] || (activeField === index ? "" : placeholders[index])}
              </Text>
              {activeField === index && !submitting && <Cursor on={cursorOn} />}
            </Box>
          ))}

          {error && <Text color={theme.colors.error}>{error}</Text>}
          {submitting && <Text color={theme.colors.retroCyan}>{"Verifying pull request and submitting task..."}</Text>}

          <Box flexDirection="column" marginBottom={1}>
            <Text color={theme.colors.retroBlueBright} bold>{"PREVIEW"}</Text>
            <Text color={theme.colors.retroSlate}>{`Task: ${taskId || "—"}`}</Text>
            <Text color={theme.colors.white}>{pullRequestUrl || "—"}</Text>
            {summary && <Text color={theme.colors.retroSlate}>{summary}</Text>}
          </Box>

          <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>
          <Box flexDirection="row" justifyContent="space-between">
            <Text color={theme.colors.retroSlateDark}>{"tab next · enter submit · esc cancel"}</Text>
            <Text color={theme.colors.retroSlateDark}>{activeHint}</Text>
          </Box>
        </>
      )}
    </Box>
  );
};
