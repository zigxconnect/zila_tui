import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { Cursor } from "../ui/Cursor.js";

interface SubmitTaskScreenProps {
  onComplete: () => void;
}

const taskStates = ["Pending", "In Progress", "Done"] as const;

export const SubmitTaskScreen: React.FC<SubmitTaskScreenProps> = ({ onComplete }) => {
  const [taskId, setTaskId] = useState("");
  const [description, setDescription] = useState("");
  const [state, setState] = useState<typeof taskStates[number]>(taskStates[0]);
  const [activeField, setActiveField] = useState(0);
  const [cursorOn, setCursorOn] = useState(true);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (completed) return;
    setCursorOn(true);
    const interval = setInterval(() => setCursorOn((v) => !v), 500);
    return () => clearInterval(interval);
  }, [completed, activeField]);

  useInput((char, key) => {
    if (completed) {
      if (key.escape || char === "q" || key.return) onComplete();
      return;
    }

    if (key.escape) {
      onComplete();
      return;
    }

    if (key.tab) {
      setActiveField((prev) => (prev + 1) % 3);
      return;
    }

    if (key.upArrow) {
      setActiveField((prev) => (prev > 0 ? prev - 1 : 2));
      return;
    }

    if (key.downArrow) {
      setActiveField((prev) => (prev < 2 ? prev + 1 : 0));
      return;
    }

    if (key.return) {
      if (activeField < 2) {
        setActiveField((prev) => prev + 1);
      } else if (taskId.trim().length > 0) {
        setCompleted(true);
      }
      return;
    }

    if (activeField === 0) {
      if (key.backspace || key.delete) {
        setTaskId((prev) => prev.slice(0, -1));
      } else if (char) {
        setTaskId((prev) => prev + char);
        setCursorOn(true);
      }
      return;
    }

    if (activeField === 1) {
      if (key.backspace || key.delete) {
        setDescription((prev) => prev.slice(0, -1));
      } else if (char) {
        setDescription((prev) => prev + char);
        setCursorOn(true);
      }
      return;
    }

    if (activeField === 2) {
      if (key.leftArrow || key.upArrow) {
        setState((prev) => {
          const index = taskStates.indexOf(prev);
          const nextIndex = ((index === -1 ? 0 : index) + taskStates.length - 1) % taskStates.length;
          return taskStates[nextIndex]!;
        });
      }
      if (key.rightArrow || key.downArrow) {
        setState((prev) => {
          const index = taskStates.indexOf(prev);
          const nextIndex = ((index === -1 ? 0 : index) + 1) % taskStates.length;
          return taskStates[nextIndex]!;
        });
      }
    }
  });

  const activeHint = activeField === 2 ? "use ←/→ to toggle status" : "tab to switch fields";

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Top rule */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.retroBlue} bold>{"lil-zila"}</Text>
          <Text color={theme.colors.retroSlateDark}>{"›"}</Text>
          <Text color={theme.colors.white} bold>{"task dispatch"}</Text>
        </Box>
        <Text color={theme.colors.retroSlateDark}>{"interactive form"}</Text>
      </Box>

      {/* Divider */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {completed ? (
        <Box flexDirection="column" paddingY={1}>
          <Box flexDirection="row" gap={1} marginBottom={1}>
            <Text color={theme.colors.retroGreenBright}>{"✓"}</Text>
            <Text color={theme.colors.white} bold>{"Task recorded successfully."}</Text>
          </Box>
          <Box flexDirection="row" gap={2}>
            <Box width={16}>
              <Text color={theme.colors.retroSlateDark}>{"Task Reference:"}</Text>
            </Box>
            <Text color={theme.colors.white} bold>{taskId}</Text>
          </Box>
          <Box flexDirection="row" gap={2}>
            <Box width={16}>
              <Text color={theme.colors.retroSlateDark}>{"Status:"}</Text>
            </Box>
            <Text color={theme.colors.retroGreenBright} bold>{state}</Text>
          </Box>
          <Box flexDirection="row" gap={2}>
            <Box width={16}>
              <Text color={theme.colors.retroSlateDark}>{"Summary:"}</Text>
            </Box>
            <Text color={theme.colors.white}>{description || "No notes."}</Text>
          </Box>
          <Box marginTop={1}>
            <Text color={theme.colors.retroSlateDark}>{"press any key to return"}</Text>
          </Box>
        </Box>
      ) : (
        <>
          {/* Field 0: Task ID */}
          <Box flexDirection="column" marginBottom={1}>
            <Box flexDirection="row" gap={1} alignItems="center">
              <Box width={18}>
                <Text color={activeField === 0 ? theme.colors.retroBlueBright : theme.colors.retroSlateDark} bold>
                  {activeField === 0 ? "› Task ID:" : "  Task ID:"}
                </Text>
              </Box>
              <Text color={theme.colors.white}>
                {taskId || (activeField === 0 ? "" : "(e.g., TASK-101)")}
              </Text>
              {activeField === 0 && <Cursor on={cursorOn} />}
            </Box>
          </Box>

          {/* Field 1: Description / PR */}
          <Box flexDirection="column" marginBottom={1}>
            <Box flexDirection="row" gap={1} alignItems="center">
              <Box width={18}>
                <Text color={activeField === 1 ? theme.colors.retroBlueBright : theme.colors.retroSlateDark} bold>
                  {activeField === 1 ? "› PR / Summary:" : "  PR / Summary:"}
                </Text>
              </Box>
              <Text color={theme.colors.white}>
                {description || (activeField === 1 ? "" : "(e.g., PR #12 or summary)")}
              </Text>
              {activeField === 1 && <Cursor on={cursorOn} />}
            </Box>
          </Box>

          {/* Field 2: State */}
          <Box flexDirection="column" marginBottom={1}>
            <Box flexDirection="row" gap={1} alignItems="center">
              <Box width={18}>
                <Text color={activeField === 2 ? theme.colors.retroBlueBright : theme.colors.retroSlateDark} bold>
                  {activeField === 2 ? "› Status:" : "  Status:"}
                </Text>
              </Box>
              <Text color={theme.colors.retroGreenBright} bold>{state}</Text>
              {activeField === 2 && (
                <Text color={theme.colors.retroSlateDark}>{" (←/→ to toggle)"}</Text>
              )}
            </Box>
          </Box>

          {/* Dispatch Preview */}
          <Box flexDirection="column" marginTop={0} marginBottom={1}>
            <Text color={theme.colors.retroBlueBright} bold>{"PREVIEW"}</Text>
            <Box flexDirection="row" gap={2}>
              <Box width={14}>
                <Text color={theme.colors.retroSlateDark}>{"Task:"}</Text>
              </Box>
              <Text color={theme.colors.white}>{taskId || "—"}</Text>
            </Box>
            <Box flexDirection="row" gap={2}>
              <Box width={14}>
                <Text color={theme.colors.retroSlateDark}>{"Status:"}</Text>
              </Box>
              <Text color={theme.colors.retroGreenBright}>{state}</Text>
            </Box>
            <Box flexDirection="row" gap={2}>
              <Box width={14}>
                <Text color={theme.colors.retroSlateDark}>{"Notes:"}</Text>
              </Box>
              <Text color={theme.colors.retroSlate}>{description || "—"}</Text>
            </Box>
          </Box>

          {/* Bottom rule */}
          <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

          {/* Footer */}
          <Box flexDirection="row" justifyContent="space-between">
            <Text color={theme.colors.retroSlateDark}>{"tab next · enter submit · esc cancel"}</Text>
            <Text color={theme.colors.retroSlateDark}>{activeHint}</Text>
          </Box>
        </>
      )}
    </Box>
  );
};
