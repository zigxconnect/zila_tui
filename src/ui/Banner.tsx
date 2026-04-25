import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";

interface BannerProps {
  type: "success" | "error" | "info";
  title: string;
  children: React.ReactNode;
}

export const Banner: React.FC<BannerProps> = ({ type, title, children }) => {
  const borderColor =
    type === "error"
      ? theme.colors.error
      : type === "success"
        ? theme.colors.success
        : theme.colors.border;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor} // Ink uses color names for borders
      paddingX={2}
      marginY={1}
    >
      <Text bold color={borderColor}>
        {title.toUpperCase()}
      </Text>
      <Box marginTop={1} flexDirection="column">
        {children}
      </Box>
    </Box>
  );
};
