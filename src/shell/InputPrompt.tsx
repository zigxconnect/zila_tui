import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { isMonitorRunning } from "../utils/monitor.js";
import { loadWorkspace } from "../utils/workspace.js";

interface InputPromptProps {
  running: boolean;
  onSubmit: (input: string) => void;
}
const MONITOR_CHECK_INTERVAL_MS = 5_000;

export const InputPrompt: React.FC<InputPromptProps> = ({
  running,
  onSubmit,
}) => {
  const [input, setInput] = useState("");
  const [cursorOn, setCursorOn] = useState(true);
  const [monitorOn, setMonitorOn] = useState(false);
  const [hasWorkspace, setHasWorkspace] = useState(false);
  const [watchPath, setWatchPath] = useState<string | null>(null);

  // Load workspace path once on mount
  useEffect(() => {
    loadWorkspace()
      .then((ws) => {
        if (ws) {
          setHasWorkspace(true);
          setWatchPath(ws.curriculumPath);
          setMonitorOn(isMonitorRunning(ws.curriculumPath));
        }
      })
      .catch(() => {});
  }, []);

  // Poll monitor state
  useEffect(() => {
    if (!watchPath) return;
    const id = setInterval(() => {
      setMonitorOn(isMonitorRunning(watchPath));
    }, MONITOR_CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [watchPath]);

  // Cursor blink
  useEffect(() => {
    if (running) return;
    const id = setInterval(() => setCursorOn((v) => !v), 530);
    return () => clearInterval(id);
  }, [running]);

  useInput((char, key) => {
    if (running) return;
    if (key.return) {
      const trimmed = input.trim();
      setInput("");
      // Refresh monitor state immediately after any command
      if (watchPath) setMonitorOn(isMonitorRunning(watchPath));
      onSubmit(trimmed);
      return;
    }
    if (key.backspace || key.delete) {
      setInput((p) => p.slice(0, -1));
      return;
    }
    if (key.ctrl || key.meta) return;
    if (char) setInput((p) => p + char);
  });

  if (running) return null;

  return (
    <Box flexDirection="column">
      {/* Monitor reminder line — only shown when workspace exists */}
      {hasWorkspace && (
        <Box flexDirection="row" gap={1} marginBottom={0}>
          {monitorOn ? (
            <>
              <Text color={theme.colors.success}>●</Text>
              <Text color={theme.colors.successDim}>Tracking </Text>
              <Text color={theme.colors.dim}>
                - run monitor stop to end session
              </Text>
            </>
          ) : (
            <>
              <Text color={theme.colors.warning}>○</Text>
              <Text color={theme.colors.warning}>Not tracking</Text>
              <Text color={theme.colors.dim}>
                - run monitor start before you begin working
              </Text>
            </>
          )}
        </Box>
      )}

      {/* Input row */}
      <Box flexDirection="row" gap={1}>
        <Text color={theme.colors.muted} bold>
          zila
        </Text>
        <Text color={theme.colors.primary} bold>
          {" ❯"}
        </Text>
        <Text color={theme.colors.white}>{input}</Text>
        <Text color={theme.colors.primary}>{cursorOn ? "▊" : " "}</Text>
      </Box>
    </Box>
  );
};
