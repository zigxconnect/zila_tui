import figures from "figures";

export const theme = {
  colors: {
    primary: "#5CC8FF",
    secondary: "#FFB454",
    accent: "#BC8CFF",
    success: "#7EE787",
    successDim: "#2EA043",
    warning: "#E3B341",
    error: "#FF7B72",
    info: "#79C0FF",
    white: "#F0F6FC",
    text: "#C9D1D9",
    muted: "#8B949E",
    dim: "#6E7681",
    border: "#30363D",
    borderActive: "#388BFD",
    panel: "#161B22",
  },

  symbols: {
    pointer: figures.pointer, // ❯
    tick: figures.tick, // ✔
    cross: figures.cross, // ✘
    warning: figures.warning, // ⚠
    info: figures.info, // ℹ
    bullet: figures.bullet, // ●
    line: figures.line, // ─
    ellipsis: figures.ellipsis, // …
  },

  spinner: {
    frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"] as const,
    intervalMs: 80,
  },

  timing: {
    splashStaggerMs: 55,
    exitDelayMs: 700,
    toastDurationMs: 1800,
  },
} as const;

export type ThemeColors = keyof typeof theme.colors;
