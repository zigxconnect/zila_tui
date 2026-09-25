import figures from "figures";

export const theme = {
  colors: {
    // Primary brand colors - inspired by Claude Code
    primary: "#9b87f5",      // Soft purple
    primaryBright: "#b8a7ff",
    primaryDim: "#7c6bbd",

    // Accent colors
    accent: "#06b6d4",       // Cyan
    accentBright: "#22d3ee",
    success: "#10b981",      // Emerald
    successBright: "#34d399",
    successDim: "#059669",
    warning: "#f59e0b",      // Amber
    warningBright: "#fbbf24",
    error: "#ef4444",        // Red
    errorBright: "#f87171",
    info: "#3b82f6",         // Blue
    infoBright: "#60a5fa",

    // Text colors
    text: "#e5e7eb",         // Light gray
    textBright: "#f9fafb",   // Almost white
    muted: "#9ca3af",        // Gray
    dim: "#6b7280",          // Darker gray
    dimmer: "#4b5563",       // Even darker

    // UI colors
    border: "#374151",       // Border gray
    borderActive: "#9b87f5", // Active border (primary)
    borderFocus: "#06b6d4",  // Focus border (accent)
    background: "#111827",   // Dark background
    backgroundLight: "#1f2937",
    panel: "#0f172a",        // Darker panel

    // Semantic colors
    link: "#60a5fa",
    linkHover: "#93c5fd",

    // Gamification colors
    gold: "#fbbf24",
    silver: "#d1d5db",
    bronze: "#f97316",

    // Status colors
    active: "#10b981",
    inactive: "#6b7280",
    pending: "#f59e0b",

    // Aliases for compatibility
    white: "#f9fafb",
    secondary: "#FFB454",
  },

  symbols: {
    // Navigation
    pointer: "›",           // Modern pointer
    pointerFancy: "▸",      // Alternative pointer
    bullet: "•",            // Bullet point
    bulletHollow: "○",      // Hollow bullet

    // Status indicators
    tick: "✓",              // Success
    cross: "✗",             // Error
    warning: "⚠",           // Warning
    info: "ℹ",              // Info

    // Progress indicators
    spinner: "◐",
    loading: "⋯",
    ellipsis: "…",

    // Decorative
    line: "─",
    lineDouble: "═",
    lineThick: "━",
    corner: "└",
    cornerRound: "╰",
    tee: "├",
    star: "★",
    starHollow: "☆",

    // Icons
    rocket: "🚀",
    fire: "🔥",
    trophy: "🏆",
    medal: "🎖️",
    target: "🎯",
    sparkles: "✨",
    checkmark: "✅",
    xmark: "❌",

    // Ranks
    rank1: "🥇",
    rank2: "🥈",
    rank3: "🥉",

    // Categories
    folder: "📁",
    file: "📄",
    code: "💻",
    book: "📚",
    link: "🔗",
    lock: "🔒",
    unlock: "🔓",
  },

  spinner: {
    frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"] as const,
    intervalMs: 80,
  },

  // Alternative spinner styles
  spinners: {
    dots: {
      frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
      interval: 80,
    },
    line: {
      frames: ["-", "\\", "|", "/"],
      interval: 100,
    },
    bounce: {
      frames: ["⠁", "⠂", "⠄", "⡀", "⢀", "⠠", "⠐", "⠈"],
      interval: 80,
    },
    arc: {
      frames: ["◜", "◠", "◝", "◞", "◡", "◟"],
      interval: 100,
    },
    pulse: {
      frames: ["◐", "◓", "◑", "◒"],
      interval: 120,
    },
  },

  timing: {
    splashStaggerMs: 40,
    exitDelayMs: 600,
    toastDurationMs: 2000,
    fadeInMs: 200,
    fadeOutMs: 300,
    slideInMs: 150,
  },

  // Box drawing characters
  box: {
    topLeft: "╭",
    topRight: "╮",
    bottomLeft: "╰",
    bottomRight: "╯",
    horizontal: "─",
    vertical: "│",
    verticalRight: "├",
    verticalLeft: "┤",
    horizontalDown: "┬",
    horizontalUp: "┴",
    cross: "┼",
  },

  // Typography
  typography: {
    heading1: {
      prefix: "▸",
      color: "primaryBright",
    },
    heading2: {
      prefix: "›",
      color: "primary",
    },
    code: {
      background: "backgroundLight",
      border: "border",
    },
  },

  // Spacing
  spacing: {
    xs: 1,
    sm: 2,
    md: 3,
    lg: 4,
    xl: 6,
  },
} as const;

export type ThemeColors = keyof typeof theme.colors;
export type ThemeSymbols = keyof typeof theme.symbols;

// Utility function to create gradients (simulated with color transitions)
export const gradients = {
  purple: ["#9b87f5", "#b8a7ff", "#d4c5ff"],
  blue: ["#06b6d4", "#22d3ee", "#67e8f9"],
  green: ["#10b981", "#34d399", "#6ee7b7"],
  rainbow: ["#9b87f5", "#06b6d4", "#10b981", "#f59e0b"],
};

// Presets for common UI patterns
export const presets = {
  success: {
    icon: "✓",
    color: "success",
    prefix: "✓",
  },
  error: {
    icon: "✗",
    color: "error",
    prefix: "✗",
  },
  warning: {
    icon: "⚠",
    color: "warning",
    prefix: "⚠",
  },
  info: {
    icon: "ℹ",
    color: "info",
    prefix: "ℹ",
  },
  loading: {
    icon: "⋯",
    color: "accent",
  },
};
