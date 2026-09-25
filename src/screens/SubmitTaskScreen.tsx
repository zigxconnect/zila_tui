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

  const boxFor = (title: string, value: string, active: boolean, hint: string) => (
    <Box flexDirection="column" borderStyle="single" borderColor={active ? theme.colors.primary : theme.colors.border} paddingX={1} paddingY={1} marginBottom={1}>
      <Box flexDirection="row" alignItems="center" gap={1}>
        <Text color={active ? theme.colors.primary : theme.colors.dim}>{active ? theme.symbols.pointer : " "}</Text>
        <Text color={active ? theme.colors.textBright : theme.colors.muted} bold>{title}</Text>
      </Box>
      <Box marginTop={1}>
        <Text color={active ? theme.colors.textBright : theme.colors.text}>{value || hint}</Text>
      </Box>
      {active && <Text color={theme.colors.dim}>{hint}</Text>}
    </Box>
  );

  const activeHint = activeField === 2 ? "Use ←/→ to change state, ↑/↓ to move fields." : "Use ↑/↓ to move between fields and type to edit.";

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1} borderStyle="round" borderColor={theme.colors.accent}>
      <Box marginBottom={1}>
        <Text color={theme.colors.primary} bold>ZILA</Text>
        <Text color={theme.colors.muted}>submit-task</Text>
      </Box>

      {completed ? (
        <Box flexDirection="column" borderStyle="round" borderColor={theme.colors.success} paddingX={2} paddingY={1}>
          <Text color={theme.colors.success} bold>Task update recorded.</Text>
          <Box marginTop={1}>
            <Text color={theme.colors.text}>Task {taskId} is now <Text color={theme.colors.textBright} bold>{state}</Text>.</Text>
          </Box>
          <Box marginTop={1}>
            <Text color={theme.colors.text}>{description || "No further details provided."}</Text>
          </Box>
          <Box marginTop={1}>
            <Text color={theme.colors.dim}>Press any key to return.</Text>
          </Box>
        </Box>
      ) : (
        <>
          <Box flexDirection="column" width={80} marginBottom={1}>
            {boxFor("Task ID", taskId, activeField === 0, "Add the task identifier.")}
            {boxFor("Description", description, activeField === 1, "Describe the task work or update.")}
            <Box flexDirection="column" borderStyle="single" borderColor={activeField === 2 ? theme.colors.primary : theme.colors.border} paddingX={1} paddingY={1} marginBottom={1}>
              <Box flexDirection="row" alignItems="center" gap={1}>
                <Text color={activeField === 2 ? theme.colors.primary : theme.colors.dim}>{activeField === 2 ? theme.symbols.pointer : " "}</Text>
                <Text color={activeField === 2 ? theme.colors.white : theme.colors.muted} bold>Status</Text>
              </Box>
              <Box flexDirection="row" alignItems="center" marginTop={1} gap={1}>
                <Text color={theme.colors.white}>{state}</Text>
                {activeField === 2 && <Cursor on={cursorOn} />}
              </Box>
              {activeField === 2 && <Text color={theme.colors.dim}>Use ←/→ to change state.</Text>}
            </Box>
          </Box>

          <Box flexDirection="column" borderStyle="single" borderColor={theme.colors.border} paddingX={1} paddingY={1}>
            <Text color={theme.colors.accent} bold>Live Task Preview</Text>
            <Box marginTop={1}>
              <Text color={theme.colors.info}>Task</Text> <Text color={theme.colors.white}>{taskId || "<empty>"}</Text>
            </Box>
            <Box marginTop={1}>
              <Text color={theme.colors.info}>State</Text> <Text color={theme.colors.white}>{state}</Text>
            </Box>
            <Box marginTop={1}>
              <Text color={theme.colors.info}>Details</Text> <Text color={theme.colors.white}>{description || "No description yet."}</Text>
            </Box>
          </Box>

          <Box flexDirection="column" marginTop={1}>
            <Text color={theme.colors.dim}>{activeHint}</Text>
            <Text color={theme.colors.dim}>Tab: switch fields · Enter: next / submit · Esc: cancel</Text>
          </Box>
        </>
      )}
    </Box>
  );
};
