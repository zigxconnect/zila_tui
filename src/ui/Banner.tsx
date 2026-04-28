import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";

export type BannerType = "success" | "error" | "warning" | "info";

interface BannerProps {
  type: BannerType;
  title: string;
  children: React.ReactNode;
}

function borderColor(type: BannerType): string {
  switch (type) {
    case "success": return theme.colors.success;
    case "error":   return theme.colors.error;
    case "warning": return theme.colors.warning;
    case "info":    return theme.colors.info;
  }
}

function titleIcon(type: BannerType): string {
  switch (type) {
    case "success": return theme.symbols.tick;
    case "error":   return theme.symbols.cross;
    case "warning": return theme.symbols.warning;
    case "info":    return theme.symbols.info;
  }
}

export const Banner: React.FC<BannerProps> = ({ type, title, children }) => {
  const color = borderColor(type);
  const icon  = titleIcon(type);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={color}
      paddingX={2}
      paddingY={1}
      marginTop={1}
    >
      {/* Title row */}
      <Box flexDirection="row" gap={1} marginBottom={1}>
        <Text color={color} bold>{icon}</Text>
        <Text color={color} bold>{title}</Text>
      </Box>

      {/* Content */}
      <Box flexDirection="column" gap={0}>
        {children}
      </Box>
    </Box>
  );
};
