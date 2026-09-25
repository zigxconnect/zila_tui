import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";

interface CardProps {
  title?: string;
  children: React.ReactNode;
  borderColor?: keyof typeof theme.colors;
  padding?: number;
  marginTop?: number;
  marginBottom?: number;
}

export const Card: React.FC<CardProps> = ({
  title,
  children,
  borderColor = "border",
  padding = 1,
  marginTop = 0,
  marginBottom = 0,
}) => {
  return (
    <Box flexDirection="column" marginTop={marginTop} marginBottom={marginBottom}>
      {title && (
        <Box marginBottom={1}>
          <Text bold color={theme.colors.primaryBright}>
            {theme.symbols.pointerFancy} {title}
          </Text>
        </Box>
      )}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={theme.colors[borderColor]}
        paddingX={padding}
        paddingY={padding}
      >
        {children}
      </Box>
    </Box>
  );
};

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
  width = 20,
  showPercentage = true,
  color = "primary",
}) => {
  const percentage = Math.min((current / max) * 100, 100);
  const filled = Math.round((width * percentage) / 100);
  const empty = width - filled;

  return (
    <Box>
      <Text color={theme.colors[color]}>
        {"█".repeat(filled)}
      </Text>
      <Text color={theme.colors.dimmer}>
        {"░".repeat(empty)}
      </Text>
      {showPercentage && (
        <Text color={theme.colors.muted} dimColor>
          {" "}
          {Math.round(percentage)}%
        </Text>
      )}
    </Box>
  );
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info" | "primary";
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = "default" }) => {
  const colors = {
    default: theme.colors.muted,
    success: theme.colors.success,
    warning: theme.colors.warning,
    error: theme.colors.error,
    info: theme.colors.info,
    primary: theme.colors.primary,
  };

  return (
    <Box
      borderStyle="round"
      borderColor={colors[variant]}
      paddingX={1}
    >
      <Text color={colors[variant]} bold>
        {children}
      </Text>
    </Box>
  );
};

interface DividerProps {
  title?: string;
  color?: keyof typeof theme.colors;
  marginY?: number;
}

export const Divider: React.FC<DividerProps> = ({
  title,
  color = "border",
  marginY = 1,
}) => {
  if (title) {
    return (
      <Box marginTop={marginY} marginBottom={marginY}>
        <Text color={theme.colors[color]} dimColor>
          {theme.box.horizontal.repeat(2)} {title} {theme.box.horizontal.repeat(40)}
        </Text>
      </Box>
    );
  }

  return (
    <Box marginTop={marginY} marginBottom={marginY}>
      <Text color={theme.colors[color]} dimColor>
        {theme.box.horizontal.repeat(60)}
      </Text>
    </Box>
  );
};

interface StatItemProps {
  label: string;
  value: string | number;
  icon?: string;
  color?: keyof typeof theme.colors;
}

export const StatItem: React.FC<StatItemProps> = ({
  label,
  value,
  icon,
  color = "text",
}) => {
  return (
    <Box justifyContent="space-between" paddingY={0}>
      <Box>
        {icon && (
          <Text>
            {icon}{" "}
          </Text>
        )}
        <Text color={theme.colors.muted}>{label}</Text>
      </Box>
      <Text color={theme.colors[color]} bold>
        {value}
      </Text>
    </Box>
  );
};

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
    <Box>
      <Text color={selected ? theme.colors.primary : theme.colors.dim}>
        {selected ? theme.symbols.pointer : " "}{" "}
      </Text>
      {icon && <Text>{icon} </Text>}
      {prefix && (
        <Text color={theme.colors.muted}>
          {prefix}{" "}
        </Text>
      )}
      <Text color={selected ? theme.colors.textBright : theme.colors.text}>
        {children}
      </Text>
    </Box>
  );
};

interface HeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, icon }) => {
  return (
    <Box flexDirection="column" marginBottom={2}>
      <Box>
        {icon && (
          <Text>
            {icon}{" "}
          </Text>
        )}
        <Text bold color={theme.colors.primaryBright}>
          {title}
        </Text>
      </Box>
      {subtitle && (
        <Box marginTop={1}>
          <Text color={theme.colors.muted}>{subtitle}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text color={theme.colors.border} dimColor>
          {theme.box.horizontal.repeat(60)}
        </Text>
      </Box>
    </Box>
  );
};

interface InfoBoxProps {
  type: "info" | "success" | "warning" | "error";
  title?: string;
  children: React.ReactNode;
}

export const InfoBox: React.FC<InfoBoxProps> = ({ type, title, children }) => {
  const config = {
    info: {
      icon: theme.symbols.info,
      color: theme.colors.info,
      borderColor: theme.colors.info,
    },
    success: {
      icon: theme.symbols.tick,
      color: theme.colors.success,
      borderColor: theme.colors.success,
    },
    warning: {
      icon: theme.symbols.warning,
      color: theme.colors.warning,
      borderColor: theme.colors.warning,
    },
    error: {
      icon: theme.symbols.cross,
      color: theme.colors.error,
      borderColor: theme.colors.error,
    },
  };

  const { icon, color, borderColor } = config[type];

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      paddingX={2}
      paddingY={1}
      marginY={1}
    >
      <Box>
        <Text color={color} bold>
          {icon} {title || type.toUpperCase()}
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color={theme.colors.text}>{children}</Text>
      </Box>
    </Box>
  );
};

interface KeyValueProps {
  label: string;
  value: string;
  inline?: boolean;
}

export const KeyValue: React.FC<KeyValueProps> = ({ label, value, inline = false }) => {
  if (inline) {
    return (
      <Box>
        <Text color={theme.colors.muted}>{label}: </Text>
        <Text color={theme.colors.text}>{value}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text color={theme.colors.muted} dimColor>
        {label}
      </Text>
      <Text color={theme.colors.text}>{value}</Text>
    </Box>
  );
};

interface ScoreCircleProps {
  score: number;
  size?: "small" | "medium" | "large";
}

export const ScoreCircle: React.FC<ScoreCircleProps> = ({ score, size = "medium" }) => {
  const getColor = (score: number) => {
    if (score >= 90) return theme.colors.success;
    if (score >= 80) return theme.colors.successDim;
    if (score >= 70) return theme.colors.warning;
    if (score >= 60) return theme.colors.warningBright;
    return theme.colors.error;
  };

  const fontSize = size === "large" ? "  " : size === "small" ? "" : " ";

  return (
    <Box flexDirection="column" alignItems="center">
      <Text bold color={getColor(score)}>
        {fontSize}{score}%{fontSize}
      </Text>
    </Box>
  );
};

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
    <Box flexDirection="column" alignItems="center" paddingY={3}>
      <Text>{icon}</Text>
      <Box marginTop={1}>
        <Text bold color={theme.colors.text}>
          {title}
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color={theme.colors.muted}>{message}</Text>
      </Box>
      {action && (
        <Box marginTop={1}>
          <Text color={theme.colors.info} dimColor>
            {action}
          </Text>
        </Box>
      )}
    </Box>
  );
};
