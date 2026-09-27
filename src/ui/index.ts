// ─── Core Theme ──────────────────────────────────────────────────────────────
export { theme } from "./theme.js";
export type { ThemeColors, ThemeSymbols } from "./theme.js";

// ─── Retro Component Library ─────────────────────────────────────────────────
export { RetroBox }          from "./RetroBox.js";
export type { RetroBoxProps }  from "./RetroBox.js";

export { RetroHeader }         from "./RetroHeader.js";
export type { RetroHeaderProps } from "./RetroHeader.js";

export { RetroMeter }          from "./RetroMeter.js";
export type { RetroMeterProps }  from "./RetroMeter.js";

export { RetroStatusBar }      from "./RetroStatusBar.js";
export type { RetroStatusBarProps } from "./RetroStatusBar.js";

export { RetroBadge, FunctionKey } from "./RetroBadge.js";

export { RetroTable, DottedLeader } from "./RetroTable.js";

export { RetroKeyboardLegend } from "./RetroKeyboardLegend.js";
export type { RetroKeyboardLegendProps, KeyBinding } from "./RetroKeyboardLegend.js";

export { RetroLogLine }        from "./RetroLogLine.js";
export type { RetroLogLineProps, LogLevel } from "./RetroLogLine.js";

export { RetroTypingText }     from "./RetroTypingText.js";
export type { RetroTypingTextProps } from "./RetroTypingText.js";

export { RetroClock }          from "./RetroClock.js";
export type { RetroClockProps }  from "./RetroClock.js";

// ─── Primitive Components ─────────────────────────────────────────────────────
export { Spinner }             from "./Spinner.js";
export type { RetroSpinnerStyle } from "./Spinner.js";

export { Divider }             from "./Divider.js";
export type { DividerProps }   from "./Divider.js";

export { StatusLine }          from "./StatusLine.js";
export type { StatusLineProps, StatusType } from "./StatusLine.js";

export { LilZilaBanner }       from "./LilZilaBanner.js";

// ─── Generic Components ───────────────────────────────────────────────────────
export {
  Card,
  ProgressBar,
  Badge,
  Divider as ComponentsDivider,
  StatItem,
  ListItem,
  Header,
  InfoBox,
  KeyValue,
  ScoreCircle,
  EmptyState,
} from "./Components.js";
