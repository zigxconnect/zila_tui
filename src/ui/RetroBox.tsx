import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";

export interface RetroBoxProps {
  title?: string;
  tag?: string;
  borderStyle?: "single" | "double" | "round" | "ascii";
  borderColor?: keyof typeof theme.colors;
  paddingX?: number;
  paddingY?: number;
  width?: number;
  marginTop?: number;
  marginBottom?: number;
  children: React.ReactNode;
}

export const RetroBox: React.FC<RetroBoxProps> = ({
  title,
  tag,
  borderStyle = "single",
  borderColor = "accent",
  paddingX = 1,
  paddingY = 0,
  width,
  marginTop = 0,
  marginBottom = 0,
  children,
}) => {
  const chars =
    borderStyle === "double"
      ? theme.boxDouble
      : borderStyle === "ascii"
      ? theme.boxAscii
      : borderStyle === "round"
      ? theme.box
      : theme.boxSingle;

  const color = theme.colors[borderColor] || theme.colors.accent;

  // Render top border with optional inset title and tag
  const renderTopBorder = () => {
    if (!title && !tag) {
      return (
        <Box flexDirection="row">
          <Text color={color}>{chars.topLeft}</Text>
          <Text color={color}>{chars.horizontal.repeat(width ? Math.max(0, width - 2) : 58)}</Text>
          <Text color={color}>{chars.topRight}</Text>
        </Box>
      );
    }

    return (
      <Box flexDirection="row" alignItems="center">
        <Text color={color}>{chars.topLeft}{chars.horizontal}</Text>
        {title && (
          <Box flexDirection="row">
            <Text color={color}>[ </Text>
            <Text color={theme.colors.textBright} bold>{title}</Text>
            <Text color={color}> ]</Text>
          </Box>
        )}
        <Text color={color}>
          {chars.horizontal.repeat(
            width
              ? Math.max(1, width - (title ? title.length + 8 : 4) - (tag ? tag.length + 6 : 0))
              : 20
          )}
        </Text>
        {tag && (
          <Box flexDirection="row">
            <Text color={color}>[ </Text>
            <Text color={theme.colors.retroGreen} bold>{tag}</Text>
            <Text color={color}> ]</Text>
          </Box>
        )}
        <Text color={color}>{chars.topRight}</Text>
      </Box>
    );
  };

  // Render bottom border
  const renderBottomBorder = () => {
    return (
      <Box flexDirection="row">
        <Text color={color}>{chars.bottomLeft}</Text>
        <Text color={color}>{chars.horizontal.repeat(width ? Math.max(0, width - 2) : 58)}</Text>
        <Text color={color}>{chars.bottomRight}</Text>
      </Box>
    );
  };

  return (
    <Box
      flexDirection="column"
      marginTop={marginTop}
      marginBottom={marginBottom}
      width={width}
    >
      {renderTopBorder()}
      <Box
        flexDirection="column"
        paddingX={paddingX}
        paddingY={paddingY}
      >
        {children}
      </Box>
      {renderBottomBorder()}
    </Box>
  );
};
