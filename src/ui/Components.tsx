import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  title?: string;
  children: React.ReactNode;
  borderColor?: keyof typeof theme.colors;
  padding?: number;
  marginTop?: number;
  marginBottom?: number;
  double?: boolean;
}

export const Card: React.FC<CardProps> = ({
  title,
  children,
  borderColor = "retroBlue",
  padding = 1,
  marginTop = 0,
  marginBottom = 0,
  double = false,
}) => {
  const bStyle = double ? "double" : "single";
  return (
    <Box flexDirection="column" marginTop={marginTop} marginBottom={marginBottom}>
      {title && (
        <Box marginBottom={0}>
          <Text bold color={theme.colors.white}>
            {"[ "}{title}{" ]"}
          </Text>
        </Box>
      )}
      <Box
        flexDirection="column"
        borderStyle={bStyle}
        borderColor={theme.colors[borderColor] || theme.colors.retroBlue}
        paddingX={padding}
        paddingY={padding}
      >
        {children}
      </Box>
    </Box>
  );
};

// ─── ProgressBar ─────────────────────────────────────────────────────────────

interface ProgressBarProps {
  current: number;
  max: number;
  width?: number;
  showPercentage?: boolean;
  color?: keyof typeof theme.colors;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  max,
  width = 24,
  showPercentage = true,
  color = "retroBlueBright",
}) => {
  const percentage = Math.min((current / max) * 100, 100);
  const filled = Math.round((width * percentage) / 100);
  const empty = width - filled;

  return (
    <Box flexDirection="row" gap={1}>
      <Text color={theme.colors.retroSlateDark}>{"["}</Text>
      <Text color={theme.colors[color] || theme.colors.retroBlueBright}>
        {"▓".repeat(filled)}
      </Text>
      <Text color={theme.colors.retroSlateDark}>
        {"░".repeat(empty)}
      </Text>
      <Text color={theme.colors.retroSlateDark}>{"]"}</Text>
      {showPercentage && (
        <Text color={theme.colors.white} bold>
          {Math.round(percentage).toString().padStart(3, " ")}{"%"}
        </Text>
      )}
    </Box>
  );
};

// ─── Badge ────────────────────────────────────────────────────────────────────

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info" | "primary";
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = "default" }) => {
  const colors: Record<string, string> = {
    default: theme.colors.retroSlateDark,
    success: theme.colors.retroGreenBright,
    warning: theme.colors.retroAmberBright,
    error:   theme.colors.error,
    info:    theme.colors.retroBlueBright,
    primary: theme.colors.retroBlue,
  };

  return (
    <Box flexDirection="row">
      <Text color={colors[variant] || theme.colors.retroSlateDark} bold>
        {"["}{children}{"]"}
      </Text>
    </Box>
  );
};

// ─── Divider ──────────────────────────────────────────────────────────────────

interface DividerProps {
  title?: string;
  color?: keyof typeof theme.colors;
  marginY?: number;
  double?: boolean;
}

export const Divider: React.FC<DividerProps> = ({
  title,
  color = "retroBlue",
  marginY = 1,
  double = false,
}) => {
  const ch = double ? "═" : "─";
  const c  = theme.colors[color] || theme.colors.retroBlue;

  if (title) {
    return (
      <Box marginTop={marginY} marginBottom={marginY}>
        <Text color={c}>
          {ch.repeat(3)}{" [ "}
        </Text>
        <Text color={theme.colors.white} bold>
          {title}
        </Text>
        <Text color={c}>
          {" ] "}{ch.repeat(40)}
        </Text>
      </Box>
    );
  }

  return (
    <Box marginTop={marginY} marginBottom={marginY}>
      <Text color={c}>{ch.repeat(72)}</Text>
    </Box>
  );
};

// ─── StatItem ─────────────────────────────────────────────────────────────────

interface StatItemProps {
  label: string;
  value: string | number;
  icon?: string;
  color?: keyof typeof theme.colors;
  width?: number;
}

export const StatItem: React.FC<StatItemProps> = ({
  label,
  value,
  icon,
  color = "white",
  width = 20,
}) => {
  const labelStr = (icon ? `${icon} ` : "") + label;
  const dots = ".".repeat(Math.max(2, width - labelStr.length));

  return (
    <Box flexDirection="row">
      <Text color={theme.colors.retroSlateDark}>
        {labelStr}
      </Text>
      <Text color={theme.colors.retroSlateDark}>{dots}</Text>
      <Text color={theme.colors[color] || theme.colors.white} bold>
        {String(value)}
      </Text>
    </Box>
  );
};

// ─── ListItem ─────────────────────────────────────────────────────────────────

interface ListItemProps {
  children: React.ReactNode;
  selected?: boolean;
  prefix?: string;
  icon?: string;
}

export const ListItem: React.FC<ListItemProps> = ({
  children,
  selected = false,
  prefix,
  icon,
}) => {
  return (
    <Box flexDirection="row" gap={1}>
      <Text color={selected ? theme.colors.retroBlueBright : theme.colors.retroSlateDark} bold>
        {selected ? "›" : " "}
      </Text>
      {icon && <Text>{icon}</Text>}
      {prefix && (
        <Text color={theme.colors.retroSlateDark}>
          {prefix}
        </Text>
      )}
      <Text color={selected ? theme.colors.white : theme.colors.retroSlate} bold={selected}>
        {children}
      </Text>
    </Box>
  );
};

// ─── Header ───────────────────────────────────────────────────────────────────

interface HeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, icon }) => {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>
      <Box flexDirection="row" gap={1} alignItems="center">
        <Text color={theme.colors.retroBlue} bold>{"lil-zila"}</Text>
        <Text color={theme.colors.retroSlateDark}>{"›"}</Text>
        {icon && <Text>{icon}</Text>}
        <Text bold color={theme.colors.white}>
          {title}
        </Text>
      </Box>
      {subtitle && (
        <Box>
          <Text color={theme.colors.retroSlateDark}>{subtitle}</Text>
        </Box>
      )}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>
    </Box>
  );
};

// ─── InfoBox ──────────────────────────────────────────────────────────────────

interface InfoBoxProps {
  type: "info" | "success" | "warning" | "error";
  title?: string;
  children: React.ReactNode;
}

export const InfoBox: React.FC<InfoBoxProps> = ({ type, title, children }) => {
  const config: Record<string, { tag: string; color: string }> = {
    info:    { tag: "[INFO]",  color: theme.colors.retroBlueBright },
    success: { tag: "[ OK ]",  color: theme.colors.retroGreenBright },
    warning: { tag: "[WARN]",  color: theme.colors.retroAmberBright },
    error:   { tag: "[FAIL]",  color: theme.colors.error },
  };

  const cfg = (config[type] ?? config["info"])!;
  const { tag, color } = cfg;

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={color}
      paddingX={2}
      paddingY={1}
      marginY={1}
    >
      <Box flexDirection="row" gap={1}>
        <Text color={color} bold>{tag}</Text>
        <Text color={color} bold>{(title || type).toUpperCase()}</Text>
      </Box>
      <Box marginTop={1}>
        <Text color={theme.colors.white}>{children}</Text>
      </Box>
    </Box>
  );
};

// ─── KeyValue ─────────────────────────────────────────────────────────────────

interface KeyValueProps {
  label: string;
  value: string;
  inline?: boolean;
  width?: number;
}

export const KeyValue: React.FC<KeyValueProps> = ({ label, value, inline = false, width = 18 }) => {
  if (inline) {
    const dots = ".".repeat(Math.max(2, width - label.length));
    return (
      <Box flexDirection="row">
        <Text color={theme.colors.retroSlateDark}>{label}</Text>
        <Text color={theme.colors.retroSlateDark}>{dots}</Text>
        <Text color={theme.colors.white} bold>{value}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color={theme.colors.retroSlateDark}>
        {label}
      </Text>
      <Text color={theme.colors.white} bold>{value}</Text>
    </Box>
  );
};

// ─── ScoreCircle ──────────────────────────────────────────────────────────────

interface ScoreCircleProps {
  score: number;
  size?: "small" | "medium" | "large";
}

export const ScoreCircle: React.FC<ScoreCircleProps> = ({ score, size = "medium" }) => {
  const getColor = (s: number): string => {
    if (s >= 90) return theme.colors.retroGreenBright;
    if (s >= 80) return theme.colors.retroGreen;
    if (s >= 70) return theme.colors.retroAmberBright;
    if (s >= 60) return theme.colors.retroAmber;
    return theme.colors.error;
  };

  const pad = size === "large" ? "  " : size === "small" ? "" : " ";

  return (
    <Box flexDirection="column" alignItems="center">
      <Text bold color={getColor(score)}>
        {"["}{pad}{score}{"%"}{pad}{"]"}
      </Text>
    </Box>
  );
};

// ─── EmptyState ───────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon: string;
  title: string;
  message: string;
  action?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  action,
}) => {
  return (
    <Box flexDirection="column" alignItems="center" paddingY={2}>
      <Text color={theme.colors.retroBlueBright}>{icon}</Text>
      <Box marginTop={1}>
        <Text bold color={theme.colors.white}>
          {title}
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color={theme.colors.retroSlateDark}>{message}</Text>
      </Box>
      {action && (
        <Box marginTop={1}>
          <Text color={theme.colors.retroBlueBright}>{action}</Text>
        </Box>
      )}
    </Box>
  );
};
