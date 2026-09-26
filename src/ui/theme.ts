import figures from "figures";

export const theme = {
  colors: {
    // Primary Zigex brand colors
    primary: "#155DFC",        // Zigex Brand Blue
    primaryBright: "#3B82F6",  // Electric Blue
    primaryDim: "#1D4ED8",     // Deep Blue
    logoColor: "#818CF8",      // lil-zila periwinkle/blue from brand screenshot

    // Accent colors
    accent: "#38BDF8",         // Sky Blue / Cyan
    accentBright: "#7DD3FC",   // Bright Cyan
    success: "#10B981",        // Emerald
    successBright: "#34D399",
    successDim: "#059669",
    warning: "#F59E0B",        // Amber
    warningBright: "#FBBF24",
    error: "#EF4444",          // Red
    errorBright: "#F87171",
    info: "#38BDF8",           // Sky Blue
    infoBright: "#60A5FA",

    // Text colors (Zigex White & Slate)
    text: "#F8FAFC",           // Clean White
    textBright: "#FFFFFF",     // Pure White
    muted: "#94A3B8",          // Slate Gray
    dim: "#64748B",            // Muted Slate
    dimmer: "#475569",         // Dark Slate

    // UI colors
    border: "#1E293B",         // Deep slate border
    borderActive: "#155DFC",   // Active border (Zigex Blue)
    borderFocus: "#38BDF8",    // Focus border (Sky Blue)
    background: "#090D16",     // Dark terminal background
    backgroundLight: "#0F172A",
    panel: "#0F172A",

    // Semantic colors
    link: "#38BDF8",
    linkHover: "#60A5FA",

    // Gamification colors
    gold: "#FBBF24",
    silver: "#E2E8F0",
    bronze: "#F97316",

    // Status colors
    active: "#10B981",
    inactive: "#64748B",
    pending: "#F59E0B",

    // Aliases for compatibility
    white: "#FFFFFF",
    secondary: "#38BDF8",
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

    // Clean Terminal Indicators (No emojis)
    rocket: ">",
    fire: "!",
    trophy: "[TOP]",
    medal: "*",
    target: "->",
    sparkles: "*",
    checkmark: "[OK]",
    xmark: "[FAIL]",

    // Ranks
    rank1: "1.",
    rank2: "2.",
    rank3: "3.",

    // Categories
    folder: "[DIR]",
    file: "[FILE]",
    code: "[CODE]",
    book: "[DOC]",
    link: "->",
    lock: "[LOCKED]",
    unlock: "[UNLOCKED]",
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
