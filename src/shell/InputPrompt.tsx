import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";

interface InputPromptProps {
  /** When true the prompt hides itself and ignores keystrokes */
  running: boolean;
  onSubmit: (input: string) => void;
}

export const InputPrompt: React.FC<InputPromptProps> = ({
  running,
  onSubmit,
}) => {
  const [input, setInput]         = useState("");
  const [cursorOn, setCursorOn]   = useState(true);

  // Blink cursor at 530 ms interval (matches most terminal defaults)
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
      onSubmit(trimmed);
      return;
    }

    if (key.backspace || key.delete) {
      setInput((prev) => prev.slice(0, -1));
      return;
    }

    // Ignore control sequences (ctrl+c is handled globally)
    if (key.ctrl || key.meta) return;

    if (char) {
      setInput((prev) => prev + char);
    }
  });

  if (running) return null;

  return (
    <Box flexDirection="row" marginTop={0}>
      {/* Prompt symbol */}
      <Text color={theme.colors.primary} bold>{"zila "}</Text>
      <Text color={theme.colors.secondary} bold>{theme.symbols.pointer + " "}</Text>

      {/* User's typed text */}
      <Text color={theme.colors.white}>{input}</Text>

      {/* Blinking block cursor */}
      <Text color={theme.colors.primary}>{cursorOn ? "▊" : " "}</Text>
    </Box>
  );
};
