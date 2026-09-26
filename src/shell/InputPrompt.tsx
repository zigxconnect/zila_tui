import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";

interface InputPromptProps {
  running: boolean;
  onSubmit: (input: string) => void;
}

export const InputPrompt: React.FC<InputPromptProps> = ({ running, onSubmit }) => {
  const [input, setInput] = useState("");
  const [cursorVisible, setCursorVisible] = useState(true);

  // Blinking cursor effect
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 530);
    return () => clearInterval(interval);
  }, []);

  useInput(
    (char, key) => {
      if (running) return;

      if (key.return) {
        if (input.trim()) {
          onSubmit(input);
          setInput("");
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
      <Box marginTop={1} flexDirection="row">
        <Text color={theme.colors.logoColor} bold>
          lil-zila
        </Text>
        <Text color={theme.colors.accent} bold>
          {" > "}
        </Text>
        <Text color={theme.colors.accent}>
          Processing...
        </Text>
      </Box>
    );
  }

  return (
    <Box marginTop={1} flexDirection="column">
      {/* Input line matching brand screenshot */}
      <Box flexDirection="row">
        <Text color={theme.colors.logoColor} bold>
          lil-zila
        </Text>
        <Text color={theme.colors.accent} bold>
          {" > "}
        </Text>
        <Text color={theme.colors.textBright}>{input}</Text>
        {cursorVisible && (
          <Text color={theme.colors.accent} bold>
            |
          </Text>
        )}
      </Box>

      {/* Clean hint line without tab or emoji */}
      {!input && (
        <Box marginTop={1}>
          <Text color={theme.colors.dim} dimColor>
            Type a command like <Text color={theme.colors.accent}>group</Text>, <Text color={theme.colors.accent}>cohorts</Text>, or <Text color={theme.colors.accent}>help</Text> to get started
          </Text>
        </Box>
      )}
    </Box>
  );
};
