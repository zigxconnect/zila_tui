import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { Spinner } from "../ui/Spinner.js";

interface InputPromptProps {
  running: boolean;
  onSubmit: (input: string) => void;
}

export const InputPrompt: React.FC<InputPromptProps> = ({ running, onSubmit }) => {
  const [input, setInput] = useState("");
  const [cursorVisible, setCursorVisible] = useState(true);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Blinking block cursor — authentic 90s CRT feel
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 450);
    return () => clearInterval(interval);
  }, []);

  useInput(
    (char, key) => {
      if (running) return;

      if (key.return) {
        if (input.trim()) {
          const trimmed = input.trim();
          setHistory((prev) => [...prev, trimmed]);
          setHistoryIndex(-1);
          onSubmit(trimmed);
          setInput("");
        }
      } else if (key.upArrow) {
        if (history.length > 0) {
          const nextIdx = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
          setHistoryIndex(nextIdx);
          setInput(history[nextIdx] || "");
        }
      } else if (key.downArrow) {
        if (historyIndex !== -1) {
          const nextIdx = historyIndex + 1;
          if (nextIdx >= history.length) {
            setHistoryIndex(-1);
            setInput("");
          } else {
            setHistoryIndex(nextIdx);
            setInput(history[nextIdx] || "");
          }
        }
      } else if (key.backspace || key.delete) {
        setInput(input.slice(0, -1));
      } else if (key.ctrl && char === "u") {
        setInput("");
      } else if (!key.ctrl && !key.meta && char) {
        setInput(input + char);
      }
    },
    { isActive: !running }
  );

  // ─── Running state ────────────────────────────────────────────────────────
  if (running) {
    return (
      <Box marginTop={1} flexDirection="column">
        <Box flexDirection="row" alignItems="center" gap={1}>
          <Text color={theme.colors.retroCyan}>{"═".repeat(4)}</Text>
          <Text color={theme.colors.retroCyanBright} bold>{"LIL-ZILA"}</Text>
          <Text color={theme.colors.retroAmberBright} bold>{"▸"}</Text>
          <Spinner style="radar" color={theme.colors.retroAmber} label="executing…" />
        </Box>
      </Box>
    );
  }

  // ─── Ready state ──────────────────────────────────────────────────────────
  return (
    <Box marginTop={1} flexDirection="column">
      {/* Prompt line */}
      <Box flexDirection="row" alignItems="center" gap={0}>
        <Text color={theme.colors.retroCyan}>{"══"}</Text>
        <Text color={theme.colors.retroCyanBright} bold>{"["}</Text>
        <Text color={theme.colors.retroAmberBright} bold>{"LIL-ZILA"}</Text>
        <Text color={theme.colors.retroCyanBright} bold>{"]"}</Text>
        <Text color={theme.colors.retroAmberBright} bold>{"▸ "}</Text>
        <Text color={theme.colors.white}>{input}</Text>
        {cursorVisible ? (
          <Text color={theme.colors.retroCyanBright} bold>{"█"}</Text>
        ) : (
          <Text color={theme.colors.retroCyan}>{" "}</Text>
        )}
      </Box>

      {/* Hint line — show quick-access commands when input is empty */}
      {!input && (
        <Box marginTop={0} flexDirection="row" gap={1}>
          <Text color={theme.colors.retroSlateDark}>{"──"}</Text>
          <Text color={theme.colors.retroSlateDark}>{"CMDS:"}</Text>
          {["group", "cohorts", "tasks", "docs", "assist", "stats", "help"].map((cmd, i, arr) => (
            <Box key={cmd} flexDirection="row">
              <Text color={theme.colors.retroCyan}>{cmd}</Text>
              {i < arr.length - 1 && <Text color={theme.colors.retroPanel}>{" · "}</Text>}
            </Box>
          ))}
          {historyIndex !== -1 && (
            <Text color={theme.colors.retroSlateDark}>
              {"  [ ↑/↓ HISTORY: "}{historyIndex + 1}{"/"}{history.length}{" ]"}
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
};
