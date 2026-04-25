import React, { useState, useEffect } from "react";
import { Text } from "ink";
import { theme } from "./theme.js";

export const Spinner: React.FC = () => {
  const [frame, setFrame] = useState(0);
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prev) => (prev + 1) % frames.length);
    }, 80);
    return () => clearInterval(timer);
  }, []);

  return <Text color={theme.colors.primary}>{frames[frame]}</Text>;
};
