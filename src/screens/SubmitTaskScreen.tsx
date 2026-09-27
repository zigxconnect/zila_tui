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

  const activeHint = activeField === 2 ? "Use ←/→ to toggle status, TAB/ENTER to navigate." : "Type to enter text, TAB to switch fields.";

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* 90s Norton Commander Style Submit Dialog */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={theme.colors.accent}
        paddingX={2}
        paddingY={1}
      >
        <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
          <Box flexDirection="row">
            <Text color={theme.colors.retroCyanBright} bold>
              [ TASK DISPATCH GATEWAY ]
            </Text>
          </Box>
          <Box flexDirection="row">
            <Text color={theme.colors.retroGreen} bold>[FORM: INTERACTIVE]</Text>
          </Box>
        </Box>

        {completed ? (
          <Box flexDirection="column" borderStyle="single" borderColor={theme.colors.success} paddingX={2} paddingY={1}>
            <Text color={theme.colors.successBright} bold>[OK] Task update recorded successfully.</Text>
            <Box marginTop={1} flexDirection="row">
              <Text color={theme.colors.muted}>Task Reference: </Text>
              <Text color={theme.colors.textBright} bold>{taskId}</Text>
            </Box>
            <Box flexDirection="row">
              <Text color={theme.colors.muted}>New State:      </Text>
              <Text color={theme.colors.retroGreen} bold>{state}</Text>
            </Box>
            <Box flexDirection="row">
              <Text color={theme.colors.muted}>Log Summary:    </Text>
              <Text color={theme.colors.text}>{description || "No notes provided."}</Text>
            </Box>
            <Box marginTop={1}>
              <Text color={theme.colors.dim}>[ Press any key to return to terminal prompt ]</Text>
            </Box>
          </Box>
        ) : (
          <>
            {/* Input fields */}
            <Box flexDirection="column">
              {/* Field 0: Task ID */}
              <Box
                flexDirection="column"
                borderStyle="single"
                borderColor={activeField === 0 ? theme.colors.retroCyanBright : theme.colors.border}
                paddingX={1}
                marginBottom={1}
              >
                <Box flexDirection="row">
                  <Text color={activeField === 0 ? theme.colors.retroCyanBright : theme.colors.muted} bold>
                    {activeField === 0 ? "› " : "  "}TASK IDENTIFIER:
                  </Text>
                </Box>
                <Box flexDirection="row" alignItems="center">
                  <Text color={theme.colors.textBright}>{taskId || (activeField === 0 ? "" : "(e.g., TASK-101)")}</Text>
                  {activeField === 0 && <Cursor on={cursorOn} />}
                </Box>
              </Box>

              {/* Field 1: Description */}
              <Box
                flexDirection="column"
                borderStyle="single"
                borderColor={activeField === 1 ? theme.colors.retroCyanBright : theme.colors.border}
                paddingX={1}
                marginBottom={1}
              >
                <Box flexDirection="row">
                  <Text color={activeField === 1 ? theme.colors.retroCyanBright : theme.colors.muted} bold>
                    {activeField === 1 ? "› " : "  "}PR LINK / SUBMISSION SUMMARY:
                  </Text>
                </Box>
                <Box flexDirection="row" alignItems="center">
                  <Text color={theme.colors.textBright}>{description || (activeField === 1 ? "" : "(e.g., https://github.com/org/repo/pull/1)")}</Text>
                  {activeField === 1 && <Cursor on={cursorOn} />}
                </Box>
              </Box>

              {/* Field 2: State */}
              <Box
                flexDirection="column"
                borderStyle="single"
                borderColor={activeField === 2 ? theme.colors.retroCyanBright : theme.colors.border}
                paddingX={1}
                marginBottom={1}
              >
                <Box flexDirection="row">
                  <Text color={activeField === 2 ? theme.colors.retroCyanBright : theme.colors.muted} bold>
                    {activeField === 2 ? "› " : "  "}SUBMISSION STATUS:
                  </Text>
                </Box>
                <Box flexDirection="row" alignItems="center">
                  <Text color={theme.colors.retroGreenBright} bold>{state}</Text>
                  {activeField === 2 && <Text color={theme.colors.dim}> (Use ← / → to change)</Text>}
                </Box>
              </Box>
            </Box>

            {/* Live Preview Panel */}
            <Box
              flexDirection="column"
              borderStyle="single"
              borderColor={theme.colors.border}
              paddingX={1}
              paddingY={0}
            >
              <Text color={theme.colors.accent} bold>LIVE DISPATCH PREVIEW:</Text>
              <Box flexDirection="row">
                <Text color={theme.colors.muted}>Task: </Text>
                <Text color={theme.colors.textBright}>{taskId || "<unspecified>"}</Text>
              </Box>
              <Box flexDirection="row">
                <Text color={theme.colors.muted}>State: </Text>
                <Text color={theme.colors.retroGreen}>{state}</Text>
              </Box>
              <Box flexDirection="row">
                <Text color={theme.colors.muted}>Notes: </Text>
                <Text color={theme.colors.text}>{description || "<no description>"}</Text>
              </Box>
            </Box>

            {/* Footer */}
            <Box marginTop={1} flexDirection="row" justifyContent="space-between">
              <Text color={theme.colors.dim}>[TAB: NEXT FIELD] [ENTER: SUBMIT] [ESC: CANCEL]</Text>
              <Text color={theme.colors.retroSlateDark}>{activeHint}</Text>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};
