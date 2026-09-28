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

  React.useEffect(() => {
    const interval = setInterval(() => setCursorVisible((v) => !v), 500);
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
          if (nextIdx >= history.length) { setHistoryIndex(-1); setInput(""); }
          else { setHistoryIndex(nextIdx); setInput(history[nextIdx] || ""); }
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

  if (running) {
    return (
      <Box marginTop={1} flexDirection="row" gap={1} alignItems="center">
        <Text color={theme.colors.retroBlue} bold>{"lil-zila"}</Text>
        <Text color={theme.colors.retroSlateDark}>{"›"}</Text>
        <Spinner style="classic" color={theme.colors.retroBlueBright} label="running…" />
      </Box>
    );
  }

  return (
    <Box marginTop={1} flexDirection="column">
      {/* Prompt */}
      <Box flexDirection="row" alignItems="center" gap={1}>
        <Text color={theme.colors.retroBlue} bold>{"lil-zila"}</Text>
        <Text color={theme.colors.retroSlateDark}>{"›"}</Text>
        <Text color={theme.colors.white}>{input}</Text>
        {cursorVisible
          ? <Text color={theme.colors.retroBlueBright} bold>{"█"}</Text>
          : <Text color={theme.colors.retroBlue}>{" "}</Text>
        }
      </Box>

      {/* Subtle hint — only when input is empty */}
      {!input && (
        <Box flexDirection="row" gap={2} marginTop={0} marginLeft={10}>
          {["help", "group", "tasks", "docs", "assist", "stats"].map((cmd) => (
            <Text key={cmd} color={theme.colors.retroSlateDark}>{cmd}</Text>
          ))}
          {historyIndex !== -1 && (
            <Text color={theme.colors.retroSlateDark}>
              {"  ↑↓ hist "}{historyIndex + 1}{"/"}{history.length}
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
};
