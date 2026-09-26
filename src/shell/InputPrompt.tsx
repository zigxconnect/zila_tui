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

  // Blinking block cursor effect (authentic 90s CRT cursor)
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

  if (running) {
    return (
      <Box marginTop={1} flexDirection="row" alignItems="center">
        <Text color={theme.colors.logoColor} bold>
          lil-zila
        </Text>
        <Text color={theme.colors.accent} bold>
          {" > "}
        </Text>
        <Spinner style="classic" color={theme.colors.accentBright} label="executing command..." />
      </Box>
    );
  }

  return (
    <Box marginTop={1} flexDirection="column">
      {/* Input line matching brand screenshot */}
      <Box flexDirection="row" alignItems="center">
        <Text color={theme.colors.logoColor} bold>
          lil-zila
        </Text>
        <Text color={theme.colors.accent} bold>
          {" > "}
        </Text>
        <Text color={theme.colors.textBright}>{input}</Text>
        {cursorVisible ? (
          <Text color={theme.colors.accentBright} bold>
            █
          </Text>
        ) : (
          <Text color={theme.colors.accent}> </Text>
        )}
      </Box>

      {/* Clean hint line without tab or emoji */}
      {!input && (
        <Box marginTop={1} flexDirection="row">
          <Text color={theme.colors.dim} dimColor>
            Commands: <Text color={theme.colors.accent}>group</Text> · <Text color={theme.colors.accent}>cohorts</Text> · <Text color={theme.colors.accent}>tasks</Text> · <Text color={theme.colors.accent}>docs</Text> · <Text color={theme.colors.accent}>help</Text>
          </Text>
        </Box>
      )}
    </Box>
  );
};
