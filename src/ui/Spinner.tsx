import React, { useState, useEffect } from "react";
import { Text } from "ink";
import { theme } from "./theme.js";

interface SpinnerProps {
  color?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  color = theme.colors.primary,
}) => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setFrame((prev) => (prev + 1) % theme.spinner.frames.length);
    }, theme.spinner.intervalMs);
    return () => clearInterval(id);
  }, []);

  return <Text color={color}>{theme.spinner.frames[frame]}</Text>;
};
