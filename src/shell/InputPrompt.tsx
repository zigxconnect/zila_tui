import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { run } from "node:test";

interface InputPromptProps {
  running: boolean;
  onSubmit: (input: string) => void;
}

export const InputPrompt: React.FC<InputPromptProps> = ({
  running,
  onSubmit,
}) => {
  const [input, setInput] = useState("");

  useInput((char, key) => {
    if (running) return;
    if (key.return) {
      onSubmit(input.trim());
      setInput("");
    } else if (key.backspace || key.delete) {
      setInput((prev) => prev.slice(0, -1));
    } else if (!key.ctrl && !key.meta && char) {
      setInput((prev) => prev + char);
    }
  });

  if (running) return null;
  return (
    <>
      <Box flexDirection="row">
        <Text color={theme.colors.primary} bold>
          {"zila> "}
        </Text>
        <Text color={theme.colors.white}>{input}</Text>
        <Text color={theme.colors.warning}></Text>
      </Box>
    </>
  );
};
