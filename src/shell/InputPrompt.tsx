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
      <Box marginTop={1}>
        <Text color={theme.colors.primary} bold>
          {theme.symbols.pointerFancy}{" "}
        </Text>
        <Text color={theme.colors.accent}>
          {theme.spinners.pulse.frames[0]} Processing...
        </Text>
      </Box>
    );
  }

  return (
    <Box marginTop={1} flexDirection="column">
      {/* Input line */}
      <Box>
        <Text color={theme.colors.primaryBright} bold>
          {theme.symbols.pointerFancy}{" "}
        </Text>
        <Text color={theme.colors.primary} dimColor>
          zila{" "}
        </Text>
        <Text color={theme.colors.text}>{input}</Text>
        {cursorVisible && (
          <Text color={theme.colors.textBright} backgroundColor={theme.colors.primary}>
            {" "}
          </Text>
        )}
      </Box>

      {/* Hint text */}
      {!input && (
        <Box marginTop={1}>
          <Text color={theme.colors.dimmer} dimColor>
            Type a command or "help" to get started • Press <Text bold>Tab</Text> for suggestions
          </Text>
        </Box>
      )}
    </Box>
  );
};
