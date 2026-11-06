import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import stringWidth from "string-width";
import { theme } from "../ui/theme.js";
import { loadAgentConfig, saveAgentConfig, getProviderModelFamilies } from "../utils/aiConfig.js";
import { generateChatResponse, type ChatMessage } from "../utils/aiClient.js";
import { extractWorkspaceContext, type WorkspaceContext } from "../utils/contextExtractor.js";
import { formatPlanOverview } from "../commands/plan.js";
import { getActiveCohort } from "../utils/activeCohort.js";
import { checkDailyPrQuota } from "../utils/githubPrAutomation.js";
import { hasSeenLilAgentWelcome, markLilAgentWelcomeSeen } from "../utils/onboarding.js";

import { LogbookSidebar } from "./LogbookSidebar.js";
import { LeaderboardSidebar } from "./LeaderboardSidebar.js";
import { GroupSidebar } from "./GroupSidebar.js";
import { CohortsSidebar } from "./CohortsSidebar.js";
import { SubmitReportScreen } from "./SubmitReportScreen.js";
import { SubmitTaskScreen } from "./SubmitTaskScreen.js";
import { OpportunitiesSidebar } from "./OpportunitiesSidebar.js";
import { HistorySidebar } from "./HistorySidebar.js";
import { WorkspaceEditorSidebar } from "./WorkspaceEditorSidebar.js";
import { formatTerminalText } from "../utils/terminalTextFormatter.js";
import {
  saveLocalChatSession,
  syncChatSessionWithApi,
  type LocalChatSession,
  type StoredChatMessage,
} from "../utils/chatHistory.js";
import { ZigexLoader } from "../ui/Spinner.js";
import { clearTerminalScreen } from "../ui/terminal.js";
import { LLAMA_ART, LIL_ZILA_TEXT } from "../ui/LilZilaBanner.js";
import { executeAttachRepo } from "../commands/attachRepo.js";
import { executeGenerateRepo } from "../commands/generateRepo.js";
import { executeDetachRepo } from "../commands/detachRepo.js";
import { isMouseOrControlSequence, cleanTypedInput } from "../utils/terminalInputSanitizer.js";

interface LilAgentShellScreenProps {
  onClose: () => void;
  initialShowWelcome?: boolean;
}

export interface DisplayMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatVisualLine {
  id: string;
  role: "system" | "user" | "assistant" | "blank";
  text: string;
  isHeader?: boolean;
}

export function wrapTextToLines(text: string, maxWidth: number): string[] {
  if (maxWidth <= 10) return [text];
  const paragraphs = text.split("\n");
  const lines: string[] = [];

  for (const para of paragraphs) {
    if (para.length === 0) {
      lines.push("");
      continue;
    }
    const words = para.split(" ");
    let cur = "";
    for (const w of words) {
      if (!cur) {
        if (w.length > maxWidth) {
          for (let i = 0; i < w.length; i += maxWidth) {
            lines.push(w.slice(i, i + maxWidth));
          }
        } else {
          cur = w;
        }
      } else {
        if (cur.length + 1 + w.length <= maxWidth) {
          cur += " " + w;
        } else {
          lines.push(cur);
          if (w.length > maxWidth) {
            for (let i = 0; i < w.length; i += maxWidth) {
              const chunk = w.slice(i, i + maxWidth);
              if (chunk.length === maxWidth) {
                lines.push(chunk);
              } else {
                cur = chunk;
              }
            }
          } else {
            cur = w;
          }
        }
      }
    }
    if (cur) {
      lines.push(cur);
    }
  }

  return lines;
}

export function buildChatVisualLines(messages: DisplayMessage[], maxWidth: number): ChatVisualLine[] {
  const result: ChatVisualLine[] = [];
  const contentWidth = Math.max(20, maxWidth - 4);

  messages.forEach((m, mIdx) => {
    if (mIdx > 0) {
      result.push({
        id: `${m.id}-gap`,
        role: "blank",
        text: "",
      });
    }

    if (m.role === "system") {
      const wrapped = wrapTextToLines(m.content, Math.max(16, contentWidth - 4));
      wrapped.forEach((wLine, idx) => {
        result.push({
          id: `${m.id}-${idx}`,
          role: "system",
          text: idx === 0 ? `ℹ ${wLine}` : `  ${wLine}`,
          isHeader: idx === 0,
        });
      });
    } else if (m.role === "user") {
      const userPrefixLen = 10;
      const wrapped = wrapTextToLines(m.content, Math.max(16, contentWidth - userPrefixLen));
      wrapped.forEach((wLine, idx) => {
        result.push({
          id: `${m.id}-${idx}`,
          role: "user",
          text: wLine,
          isHeader: idx === 0,
        });
      });
    } else {
      // Assistant / Lil-Zila
      result.push({
        id: `${m.id}-hdr`,
        role: "assistant",
        text: "🤖 Lil-Zila:",
        isHeader: true,
      });

      const bodyWrapped = wrapTextToLines(m.content, Math.max(16, contentWidth - 4));
      bodyWrapped.forEach((wLine, idx) => {
        result.push({
          id: `${m.id}-${idx}`,
          role: "assistant",
          text: wLine,
          isHeader: false,
        });
      });
    }
  });

  return result;
}

interface SlashCommandItem {
  cmd: string;
  desc: string;
}

type SidebarMode =
  | "logbook"
  | "leaderboard"
  | "group"
  | "cohorts"
  | "submit-task"
  | "submit-report"
  | "command-output"
  | "search"
  | "history"
  | "editor"
  | null;
type ModalMode = "submit-report" | "submit-task" | null;

export const LIL_AGENT_WELCOME_MASCOT = LLAMA_ART.join("\n");

export interface CommandPanelData {
  title: string;
  command: string;
  content: string;
}

export function getCommandPanelTitle(cmd: string): string {
  const base = cmd.trim().toLowerCase().split(/\s+/)[0]?.replace(/^\//, "") || "command";
  switch (base) {
    case "help":
      return "Command Reference & Help";
    case "plan":
    case "my-plan":
      return "Internship Program & Tuition Plan";
    case "quota":
      return "Daily PR & Submission Quota";
    case "status":
      return "Agent Runtime & Workspace Status";
    case "about":
      return "System Architecture & Mentor Profile";
    case "model":
      return "AI Model & Provider Config";
    case "code":
    case "editor":
    case "workspace":
    case "work":
      return "Supervisor Code Workspace & Editor";
    case "search":
    case "opportunities":
      return "Tavily Career & Opportunity Radar";
    case "history":
    case "sessions":
      return "Chat Session History";
    case "generate-repo":
    case "create-curriculum":
      return "Curriculum Prototype Generator";
    case "attach-repo":
    case "link-repo":
      return "Curriculum Repo Validator & Attachment";
    case "detach-repo":
    case "unlink-repo":
    case "remove-repo":
      return "Cohort Repository Unlink (Supervisor)";
    case "welcome":
    case "mascot":
      return "Lil-Zila Mascot & Anti-Cheating Mission";
    default:
      return `${base.toUpperCase()} Command Output`;
  }
}

interface CommandOutputSidebarProps {
  title: string;
  command: string;
  content: string;
  width: number;
  height: number;
  isFocused?: boolean;
  onClose: () => void;
  scrollOffset: number;
}

export const CommandOutputSidebar: React.FC<CommandOutputSidebarProps> = ({
  title,
  command,
  content,
  width,
  height,
  isFocused = false,
  onClose,
  scrollOffset,
}) => {
  const contentLines = useMemo(() => {
    return wrapTextToLines(content, Math.max(20, width - 4));
  }, [content, width]);

  const viewportHeight = Math.max(5, height - 6);
  const maxScroll = Math.max(0, contentLines.length - viewportHeight);
  const clampedOffset = Math.min(scrollOffset, maxScroll);
  const visibleLines = contentLines.slice(clampedOffset, clampedOffset + viewportHeight);

  const availLineW = Math.max(10, width - 4);
  const emptyRows = Math.max(0, viewportHeight - visibleLines.length);

  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
      borderStyle="single"
      borderColor={isFocused ? theme.colors.retroBlueBright : theme.colors.retroBlue}
      paddingX={1}
      overflow="hidden"
    >
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.retroBlue} bold>{"◈"}</Text>
          <Text color={theme.colors.white} bold>{title}</Text>
        </Box>
        <Text color={theme.colors.retroCyanBright} bold>{`[ ${command} ]`}</Text>
      </Box>
      <Text color={theme.colors.sidebarDivider}>{"─".repeat(Math.max(10, width - 4))}</Text>

      <Box flexDirection="column" flexGrow={1} height={viewportHeight} overflow="hidden">
        {visibleLines.map((line, idx) => {
          const pad = Math.max(0, availLineW - stringWidth(line));
          return (
            <Text key={idx} color={theme.colors.white} backgroundColor={theme.colors.sidebarBg}>
              {line + " ".repeat(pad)}
            </Text>
          );
        })}
        {Array.from({ length: emptyRows }).map((_, idx) => (
          <Text key={`empty-${idx}`} backgroundColor={theme.colors.sidebarBg}>
            {" ".repeat(availLineW)}
          </Text>
        ))}
      </Box>

      <Text color={theme.colors.sidebarDivider}>{"─".repeat(Math.max(10, width - 4))}</Text>
      <Box flexDirection="row" justifyContent="space-between">
        <Text color={theme.colors.retroSlateDark}>
          {`Line ${clampedOffset + 1}-${Math.min(clampedOffset + viewportHeight, contentLines.length)} of ${contentLines.length}`}
        </Text>
        <Text color={theme.colors.retroCyanBright}>
          {"Tab chat · ↑/↓ scroll · Esc close"}
        </Text>
      </Box>
    </Box>
  );
};

const AVAILABLE_SLASH_COMMANDS: SlashCommandItem[] = [
  { cmd: "/help", desc: "Display interactive command directory & tips" },
  { cmd: "/welcome", desc: "View the Lil-Zila child mascot & anti-cheating mission" },
  { cmd: "/code", desc: "Open supervisor curriculum repo & in-terminal editor on the right" },
  { cmd: "/submit-task", desc: "Launch automated task submission & PR evaluation pipeline on the right" },
  { cmd: "/search", desc: "Search internships, bounties & opportunities via Tavily API" },
  { cmd: "/history", desc: "Browse and resume previous Lil-Zila chat sessions" },
  { cmd: "/leaderboard", desc: "Open cohort rankings & PR evaluation leaderboard on the right" },
  { cmd: "/group", desc: "Open cohort team & fellow interns roster on the right" },
  { cmd: "/cohorts", desc: "Browse enrolled programs and cohort workspaces on the right" },
  { cmd: "/logbook", desc: "Toggle right-hand Contributor Audit Ledger logbook sidebar" },
  { cmd: "/submit-report", desc: "Open interactive daily sprint engineering report modal on the right" },
  { cmd: "/submit-task", desc: "Launch automated task submission & PR evaluation pipeline on the right" },
  { cmd: "/attach-repo", desc: "Scan, validate and attach curriculum repo to cohort (Supervisor)" },
  { cmd: "/generate-repo", desc: "Build & push a prototype curriculum repository to GitHub (Supervisor)" },
  { cmd: "/detach-repo", desc: "Detach and unlink the live repository from the active cohort (Supervisor)" },
  { cmd: "/plan", desc: "View program enrollment, tuition plan & evaluation quota" },
  { cmd: "/quota", desc: "Check daily GitHub PR & tuition submission quota" },
  { cmd: "/top", desc: "Jump to the very beginning of the chat transcript" },
  { cmd: "/bottom", desc: "Jump to the latest live messages at the bottom" },
  { cmd: "/about", desc: "System telemetry, architecture & pair mentor profile" },
  { cmd: "/status", desc: "Check engine connection, git branch & active cohort" },
  { cmd: "/model", desc: "Inspect or switch active AI model & family (Groq, Gemini, Claude)" },
  { cmd: "/clear", desc: "Wipe terminal conversation history" },
  { cmd: "/close", desc: "Close any active right-hand sidebar" },
  { cmd: "/exit", desc: "Return to the primary Zigex workstation shell" },
];

export const LilAgentShellScreen: React.FC<LilAgentShellScreenProps> = ({
  onClose,
  initialShowWelcome,
}) => {
  const [showFirstRunWelcome, setShowFirstRunWelcome] = useState(
    () => (initialShowWelcome !== undefined ? initialShowWelcome : true),
  );
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: "msg-0",
      role: "system",
      content: `Connected to Zigex Autonomous AI Agent · Engine: Active\nAsk questions about your code, debugging, or task instructions.`,
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [cursorIndex, setCursorIndex] = useState(0);
  const textRef = useRef("");
  const cursorRef = useRef(0);

  const updateInputAndCursor = useCallback((newText: string, newCursor: number) => {
    const clampedCursor = Math.max(0, Math.min(newText.length, newCursor));
    textRef.current = newText;
    cursorRef.current = clampedCursor;
    setInputText(newText);
    setCursorIndex(clampedCursor);
  }, []);

  useEffect(() => {
    textRef.current = inputText;
  }, [inputText]);

  useEffect(() => {
    cursorRef.current = cursorIndex;
  }, [cursorIndex]);
  const [isThinking, setIsThinking] = useState(false);
  const [statusText, setStatusText] = useState("Ready");
  const [workspaceContext, setWorkspaceContext] = useState<WorkspaceContext | null>(null);
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);
  const [activeSidebar, setActiveSidebar] = useState<SidebarMode>(null);
  const [activeModal, setActiveModal] = useState<ModalMode>(null);
  const [chatScrollOffset, setChatScrollOffset] = useState<number>(0);
  const [activeFocus, setActiveFocus] = useState<"chat" | "sidebar">("chat");
  const [commandPanelData, setCommandPanelData] = useState<CommandPanelData | null>(null);
  const [sidebarScrollOffset, setSidebarScrollOffset] = useState<number>(0);
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => `session-${Date.now()}`);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const config = loadAgentConfig();

  useEffect(() => {
    if (showFirstRunWelcome) markLilAgentWelcomeSeen();
  }, [showFirstRunWelcome]);

  const isSlashActive = inputText.startsWith("/");
  const matchingSlashCommands = isSlashActive
    ? AVAILABLE_SLASH_COMMANDS.filter((sc) =>
        sc.cmd.toLowerCase().startsWith(inputText.trim().toLowerCase()),
      )
    : [];

  useEffect(() => {
    setSelectedSlashIndex(0);
  }, [inputText]);

  useEffect(() => {
    const ctx = extractWorkspaceContext();
    setWorkspaceContext(ctx);
  }, []);

  useEffect(() => {
    try {
      // Disable terminal mouse tracking modes so user can natively highlight,
      // select, and copy text in terminal with mouse without escape code leaks.
      process.stdout.write("\x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1006l\x1b[?1015l");
    } catch {
      // Ignore
    }
    return () => {
      try {
        process.stdout.write("\x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1006l\x1b[?1015l");
      } catch {
        // Ignore
      }
      // Purge screen buffer on teardown to prevent trailing artifacts
      clearTerminalScreen();
    };
  }, []);

  const { stdout } = useStdout();
  const termCols = stdout?.columns || process.stdout.columns || 120;
  const termRows = stdout?.rows || process.stdout.rows || 36;
  const isSplitActive = activeSidebar !== null;
  const splitLeftWidth = Math.floor(termCols * 0.52);
  const splitRightWidth = termCols - splitLeftWidth - 2;
  const fullHeight = Math.max(16, termRows - 6);
  const activeLineWidth = Math.max(24, (isSplitActive ? splitLeftWidth : termCols) - 4);

  const autocompleteHeight = (isSlashActive && matchingSlashCommands.length > 0)
    ? Math.min(8, matchingSlashCommands.length + 3)
    : 0;
  const headerHeight = 4;
  const bottomInputHeight = 6 + autocompleteHeight;
  const thinkingHeight = isThinking ? 1 : 0;
  const chatViewportHeight = Math.max(3, fullHeight - headerHeight - bottomInputHeight - thinkingHeight);

  const allChatLines = useMemo(
    () => buildChatVisualLines(messages, isSplitActive ? splitLeftWidth : termCols),
    [messages, isSplitActive, splitLeftWidth, termCols],
  );

  const totalLines = allChatLines.length;
  const maxScroll = Math.max(0, totalLines - chatViewportHeight);
  const currentOffset = Math.min(chatScrollOffset, maxScroll);
  const endIndex = Math.max(0, totalLines - currentOffset);
  const startIndex = Math.max(0, endIndex - chatViewportHeight);
  const visibleLines = allChatLines.slice(startIndex, endIndex);

  const chatScrollbar = useMemo(() => {
    if (totalLines <= chatViewportHeight) return null;
    const thumbSize = Math.max(1, Math.round((chatViewportHeight / totalLines) * chatViewportHeight));
    const maxScrollLines = Math.max(1, totalLines - chatViewportHeight);
    const scrollRatio = 1 - currentOffset / maxScrollLines;
    const thumbStart = Math.min(
      chatViewportHeight - thumbSize,
      Math.max(0, Math.round(scrollRatio * (chatViewportHeight - thumbSize))),
    );
    return { thumbStart, thumbSize };
  }, [totalLines, chatViewportHeight, currentOffset]);

  useEffect(() => {
    if (chatScrollOffset > maxScroll) {
      setChatScrollOffset(maxScroll);
    }
  }, [chatScrollOffset, maxScroll]);

  useInput((input, key) => {
    // Intercept and discard any stray SGR mouse tracking escape sequences or control noise
    // so no gibberish leaks into the prompt or buffer.
    if (isMouseOrControlSequence(input)) {
      return;
    }

    // When focus is on an interactive sidebar (submit-task, submit-report, search, history, or editor), pass keyboard input to sidebar
    const isInteractiveSidebar =
      activeSidebar === "submit-task" ||
      activeSidebar === "submit-report" ||
      activeSidebar === "search" ||
      activeSidebar === "history" ||
      activeSidebar === "editor";

    if (activeFocus === "sidebar" && isInteractiveSidebar) {
      if (key.tab) {
        setActiveFocus("chat");
        return;
      }
      if (key.escape) {
        setActiveSidebar(null);
        setActiveFocus("chat");
        return;
      }
      // Let interactive sidebar handle its field inputs
      return;
    }

    // When focus is on a display sidebar (leaderboard, group, cohorts, logbook, command-output):
    if (activeFocus === "sidebar") {
      if (key.tab) {
        setActiveFocus("chat");
        return;
      }
      if (key.escape) {
        setActiveSidebar(null);
        setActiveFocus("chat");
        return;
      }
      if (key.upArrow) {
        setSidebarScrollOffset((prev) => Math.max(0, prev - 1));
        return;
      }
      if (key.downArrow) {
        setSidebarScrollOffset((prev) => prev + 1);
        return;
      }
      if (key.pageUp) {
        setSidebarScrollOffset((prev) => Math.max(0, prev - 10));
        return;
      }
      if (key.pageDown) {
        setSidebarScrollOffset((prev) => prev + 10);
        return;
      }
      if (input === "q" && textRef.current.length === 0) {
        setActiveSidebar(null);
        setActiveFocus("chat");
        return;
      }
      // If user typed any character, backspace, or enter, immediately switch to chat and process!
      setActiveFocus("chat");
    }

    if (key.escape) {
      if (isSlashActive || textRef.current.length > 0) {
        updateInputAndCursor("", 0);
        return;
      }
      if (chatScrollOffset > 0) {
        setChatScrollOffset(0);
        return;
      }
      if (activeSidebar !== null) {
        setActiveSidebar(null);
        setActiveFocus("chat");
        return;
      }
      clearTerminalScreen();
      onClose();
      return;
    }

    if (isThinking) {
      return;
    }

    // Tab key toggles focus between Chat and Sidebar when split view is active
    if (key.tab && !isSlashActive && activeSidebar !== null) {
      setActiveFocus((prev) => (prev === "chat" ? "sidebar" : "chat"));
      return;
    }

    // PageUp / PageDown chat scrolling when chat has focus
    if (key.pageUp) {
      setChatScrollOffset((prev) => Math.min(maxScroll, prev + 5));
      return;
    }
    if (key.pageDown) {
      setChatScrollOffset((prev) => Math.max(0, prev - 5));
      return;
    }

    // Ctrl+U / Ctrl+D scrolling
    if (key.ctrl && input === "u") {
      setChatScrollOffset((prev) => Math.min(maxScroll, prev + 10));
      return;
    }
    if (key.ctrl && input === "d") {
      setChatScrollOffset((prev) => Math.max(0, prev - 10));
      return;
    }

    // Ctrl+B / Ctrl+F (vim-style scrolling)
    if (key.ctrl && input === "b") {
      setChatScrollOffset((prev) => Math.min(maxScroll, prev + 10));
      return;
    }
    if (key.ctrl && input === "f") {
      setChatScrollOffset((prev) => Math.max(0, prev - 10));
      return;
    }

    // Up/Down navigation inside autocomplete menu
    if (isSlashActive && matchingSlashCommands.length > 0) {
      if (key.upArrow) {
        setSelectedSlashIndex((prev) =>
          prev > 0 ? prev - 1 : matchingSlashCommands.length - 1,
        );
        return;
      }
      if (key.downArrow) {
        setSelectedSlashIndex((prev) =>
          prev < matchingSlashCommands.length - 1 ? prev + 1 : 0,
        );
        return;
      }
      if (key.tab) {
        const picked = matchingSlashCommands[selectedSlashIndex];
        if (picked) {
          updateInputAndCursor(picked.cmd, picked.cmd.length);
        }
        return;
      }
    }

    // Left / Right arrow cursor navigation in text input
    if (key.leftArrow) {
      const cur = Math.max(0, cursorRef.current - 1);
      cursorRef.current = cur;
      setCursorIndex(cur);
      return;
    }
    if (key.rightArrow) {
      const cur = Math.min(textRef.current.length, cursorRef.current + 1);
      cursorRef.current = cur;
      setCursorIndex(cur);
      return;
    }

    // Ctrl+A / Home navigation
    if ((key.ctrl && input === "a") || (key as any).home) {
      cursorRef.current = 0;
      setCursorIndex(0);
      return;
    }

    // Ctrl+E / End navigation
    if ((key.ctrl && input === "e") || (key as any).end) {
      const cur = textRef.current.length;
      cursorRef.current = cur;
      setCursorIndex(cur);
      return;
    }

    // Ctrl+U / Ctrl+C clear entire input text
    if (key.ctrl && (input === "u" || input === "c")) {
      updateInputAndCursor("", 0);
      return;
    }

    // Ctrl+W delete word backwards
    if (key.ctrl && input === "w") {
      const cur = cursorRef.current;
      const txt = textRef.current;
      const before = txt.slice(0, cur);
      const after = txt.slice(cur);
      const trimmedBefore = before.replace(/\s+$/, "");
      const lastSpace = trimmedBefore.lastIndexOf(" ");
      const newBefore = lastSpace >= 0 ? trimmedBefore.slice(0, lastSpace + 1) : "";
      updateInputAndCursor(newBefore + after, newBefore.length);
      return;
    }

    // Ctrl+K kill to end of line
    if (key.ctrl && input === "k") {
      const cur = cursorRef.current;
      const txt = textRef.current;
      updateInputAndCursor(txt.slice(0, cur), cur);
      return;
    }

    // When not typing, Up/Down arrows scroll chat line-by-line
    if (key.upArrow && !isSlashActive && textRef.current === "") {
      setChatScrollOffset((prev) => Math.min(maxScroll, prev + 1));
      return;
    }
    if (key.downArrow && !isSlashActive && textRef.current === "") {
      setChatScrollOffset((prev) => Math.max(0, prev - 1));
      return;
    }

    if (key.return) {
      // If menu is open and user presses enter on a highlighted option:
      if (isSlashActive && matchingSlashCommands.length > 0) {
        const picked = matchingSlashCommands[selectedSlashIndex];
        if (picked) {
          handleSlashCommand(picked.cmd);
          return;
        }
      }

      const trimmed = inputText.trim();
      if (!trimmed) return;
      setShowFirstRunWelcome(false);

      if (trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "quit") {
        onClose();
        return;
      }

      if (trimmed.toLowerCase() === "clear") {
        setMessages([]);
        updateInputAndCursor("", 0);
        return;
      }

      const lowerTrimmed = trimmed.toLowerCase();

      // Interactive modal/sidebar triggers
      if (
        lowerTrimmed === "/submit-report" ||
        lowerTrimmed === "submit-report" ||
        lowerTrimmed === "/report" ||
        lowerTrimmed === "report"
      ) {
        setActiveSidebar("submit-report");
        setActiveFocus("sidebar");
        updateInputAndCursor("", 0);
        return;
      }

      if (
        lowerTrimmed === "/submit-task" ||
        lowerTrimmed === "submit-task" ||
        lowerTrimmed === "/submit" ||
        lowerTrimmed === "submit" ||
        lowerTrimmed === "zila-submit" ||
        lowerTrimmed === "/zila-submit"
      ) {
        setActiveSidebar("submit-task");
        setActiveFocus("sidebar");
        updateInputAndCursor("", 0);
        return;
      }

      // Close sidebar commands
      if (
        lowerTrimmed === "close" ||
        lowerTrimmed === "/close" ||
        lowerTrimmed === "hide" ||
        lowerTrimmed === "close sidebar" ||
        lowerTrimmed === "close-sidebar" ||
        lowerTrimmed === "close logbook" ||
        lowerTrimmed === "close-logbook" ||
        lowerTrimmed === "hide logbook" ||
        lowerTrimmed === "close leaderboard" ||
        lowerTrimmed === "close group" ||
        lowerTrimmed === "close cohorts" ||
        lowerTrimmed === "close search" ||
        lowerTrimmed === "close history" ||
        lowerTrimmed === "close editor" ||
        lowerTrimmed === "close workspace" ||
        lowerTrimmed === "close code"
      ) {
        setActiveSidebar(null);
        setActiveFocus("chat");
        setMessages((prev) => [
          ...prev,
          {
            id: `user-${Date.now()}`,
            role: "user",
            content: trimmed,
          },
          {
            id: `agent-${Date.now()}`,
            role: "assistant",
            content: "Closed right-hand sidebar.",
          },
        ]);
        updateInputAndCursor("", 0);
        return;
      }

      // Direct shortcuts for sidebars
      if (
        lowerTrimmed === "code" ||
        lowerTrimmed === "/code" ||
        lowerTrimmed.startsWith("code ") ||
        lowerTrimmed.startsWith("/code ") ||
        lowerTrimmed === "editor" ||
        lowerTrimmed === "/editor" ||
        lowerTrimmed === "workspace" ||
        lowerTrimmed === "/workspace" ||
        lowerTrimmed === "work" ||
        lowerTrimmed === "/work"
      ) {
        handleSlashCommand("/code");
        return;
      }

      if (
        lowerTrimmed === "leaderboard" ||
        lowerTrimmed === "/leaderboard" ||
        lowerTrimmed === "rankings" ||
        lowerTrimmed === "/rankings"
      ) {
        handleSlashCommand("/leaderboard");
        return;
      }

      if (
        lowerTrimmed === "group" ||
        lowerTrimmed === "/group" ||
        lowerTrimmed === "peers" ||
        lowerTrimmed === "/peers"
      ) {
        handleSlashCommand("/group");
        return;
      }

      if (
        lowerTrimmed === "cohorts" ||
        lowerTrimmed === "/cohorts" ||
        lowerTrimmed === "programs" ||
        lowerTrimmed === "/programs"
      ) {
        handleSlashCommand("/cohorts");
        return;
      }

      if (
        lowerTrimmed === "search" ||
        lowerTrimmed === "/search" ||
        lowerTrimmed.startsWith("search ") ||
        lowerTrimmed.startsWith("/search ") ||
        lowerTrimmed === "opportunities" ||
        lowerTrimmed === "/opportunities"
      ) {
        handleSlashCommand(trimmed);
        return;
      }

      if (
        lowerTrimmed === "history" ||
        lowerTrimmed === "/history" ||
        lowerTrimmed === "sessions" ||
        lowerTrimmed === "/sessions"
      ) {
        handleSlashCommand("/history");
        return;
      }

      if (
        lowerTrimmed === "logbook" ||
        lowerTrimmed === "/logbook" ||
        lowerTrimmed === "logbook --view" ||
        lowerTrimmed === "logbook -v" ||
        lowerTrimmed === "logbook view" ||
        lowerTrimmed === "view logbook" ||
        lowerTrimmed === "show logbook" ||
        lowerTrimmed === "open logbook"
      ) {
        handleSlashCommand("/logbook");
        return;
      }

      if (
        lowerTrimmed === "plan" ||
        lowerTrimmed === "/plan" ||
        lowerTrimmed === "my plan" ||
        lowerTrimmed === "my-plan"
      ) {
        handleSlashCommand("/plan");
        return;
      }

      if (lowerTrimmed === "quota" || lowerTrimmed === "/quota") {
        handleSlashCommand("/quota");
        return;
      }

      if (trimmed.startsWith("/")) {
        handleSlashCommand(trimmed);
        return;
      }

      updateInputAndCursor("", 0);
      handleSend(trimmed);
    } else {
      const isBackspace =
        key.backspace ||
        input === "\x7f" ||
        input === "\b" ||
        input === "\x08";

      const isDelete = key.delete || input === "\x1b[3~";

      if (isBackspace) {
        const txt = textRef.current;
        const cur = Math.min(cursorRef.current, txt.length);
        if (cur > 0) {
          const newTxt = txt.slice(0, cur - 1) + txt.slice(cur);
          updateInputAndCursor(newTxt, cur - 1);
        } else if (txt.length > 0) {
          const newTxt = txt.slice(0, -1);
          updateInputAndCursor(newTxt, newTxt.length);
        }
        return;
      }

      if (isDelete) {
        const txt = textRef.current;
        const cur = Math.min(cursorRef.current, txt.length);
        if (cur < txt.length) {
          const newTxt = txt.slice(0, cur) + txt.slice(cur + 1);
          updateInputAndCursor(newTxt, cur);
        } else if (txt.length > 0) {
          // Fallback for terminals that map physical Backspace to key.delete
          const newTxt = txt.slice(0, -1);
          updateInputAndCursor(newTxt, newTxt.length);
        }
        return;
      }

      if (input && !key.ctrl && !key.meta && !isBackspace && !isDelete && input !== "\r" && input !== "\n") {
        const cleaned = cleanTypedInput(input);
        if (!cleaned) return;
        const txt = textRef.current;
        const cur = Math.min(cursorRef.current, txt.length);
        const newTxt = txt.slice(0, cur) + cleaned + txt.slice(cur);
        updateInputAndCursor(newTxt, cur + cleaned.length);
        return;
      }
    }
  });

  async function handleSlashCommand(commandStr: string) {
    const rawCmd = commandStr.trim().toLowerCase();
    const userMsg: DisplayMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: commandStr,
    };

    let reply = "";

    if (rawCmd === "/help") {
      reply = [
        "◈ Zigex Lil-Agent Command Reference:",
        "  /help          — Display this interactive help directory",
        "  /welcome       — View the Lil-Zila companion mascot & anti-cheating mission",
        "  /code          — Open supervisor curriculum repo & in-terminal editor on the right",
        "  /submit-task   — Launch automated task submission & PR evaluation pipeline",
        "  /search        — Search internships, bounties & opportunities via Tavily API",
        "  /history       — View and resume previous Lil-Zila chat sessions",
        "  /leaderboard   — Open cohort rankings & PR evaluation leaderboard on the right",
        "  /group         — Open cohort team & fellow interns roster on the right",
        "  /cohorts       — Browse enrolled programs and cohort workspaces on the right",
        "  /logbook       — Toggle right-hand Contributor Audit Ledger logbook sidebar",
        "  /submit-report — Open interactive daily sprint engineering report modal",
        "  /plan          — View program enrollment, tuition plan & evaluation quota",
        "  /quota         — Check daily GitHub PR & tuition submission quota",
        "  /about         — System telemetry, architecture & pair mentor profile",
        "  /status        — Check engine connection, git context & active cohort",
        "  /clear         — Wipe terminal conversation history",
        "  /close         — Close any active right-hand sidebar",
        "  /exit          — Return to the primary Zigex workstation shell",
        "",
        "💡 Tip: You can ask anything naturally without slashes, e.g.:",
        "   'explain this error', 'how do I structure day 3 task?', 'review my commit'",
      ].join("\n");
    } else if (rawCmd === "/welcome" || rawCmd === "/mascot") {
      setShowFirstRunWelcome(true);
      reply = "Displayed Lil-Zila companion mascot & anti-cheating mission.";
    } else if (
      rawCmd === "/code" ||
      rawCmd === "code" ||
      rawCmd.startsWith("/code ") ||
      rawCmd.startsWith("code ") ||
      rawCmd === "/editor" ||
      rawCmd === "editor" ||
      rawCmd === "/workspace" ||
      rawCmd === "workspace" ||
      rawCmd === "/work" ||
      rawCmd === "work"
    ) {
      setActiveSidebar("editor");
      setActiveFocus("sidebar");
      reply = "Opened Supervisor Code Workspace & Editor on the right. Navigate files with ↑/↓, press Enter to view, 'O' for VS Code, or 'S' to submit task.";
    } else if (
      rawCmd === "/search" ||
      rawCmd === "search" ||
      rawCmd.startsWith("/search ") ||
      rawCmd.startsWith("search ") ||
      rawCmd === "/opportunities" ||
      rawCmd === "opportunities"
    ) {
      const parts = commandStr.trim().split(/\s+/);
      const query = parts.length > 1 ? parts.slice(1).join(" ") : "";
      setSearchQuery(query);
      setActiveSidebar("search");
      setActiveFocus("sidebar");
      reply = "Opened Career & Opportunity Radar on the right. Press Tab to switch to chat, or Esc to close.";
    } else if (
      rawCmd === "/history" ||
      rawCmd === "history" ||
      rawCmd === "/sessions" ||
      rawCmd === "sessions"
    ) {
      setActiveSidebar("history");
      setActiveFocus("sidebar");
      reply = "Opened Chat History on the right. Select a session and press Enter to resume, or Esc to close.";
    } else if (rawCmd === "/leaderboard" || rawCmd === "leaderboard" || rawCmd === "rankings" || rawCmd === "/rankings") {
      setActiveSidebar("leaderboard");
      setActiveFocus("chat");
      reply = "Opened Cohort Leaderboard on the right. Press Tab to switch to sidebar, or Esc to close.";
    } else if (rawCmd === "/group" || rawCmd === "group" || rawCmd === "peers" || rawCmd === "/peers") {
      setActiveSidebar("group");
      setActiveFocus("chat");
      reply = "Opened Cohort Team & Intern Roster on the right. Press Tab to switch to sidebar, or Esc to close.";
    } else if (rawCmd === "/cohorts" || rawCmd === "cohorts" || rawCmd === "programs" || rawCmd === "/programs") {
      setActiveSidebar("cohorts");
      setActiveFocus("chat");
      reply = "Opened Enrolled Programs & Cohorts on the right. Press Tab to switch to sidebar, or Esc to close.";
    } else if (rawCmd === "/logbook" || rawCmd === "logbook" || rawCmd === "ledger") {
      setActiveSidebar("logbook");
      setActiveFocus("chat");
      reply = "Opened Contributor Audit Ledger on the right. Press Tab to switch to sidebar, or Esc to close.";
    } else if (rawCmd === "/submit-report" || rawCmd === "submit-report" || rawCmd === "/report" || rawCmd === "report") {
      setActiveSidebar("submit-report");
      setActiveFocus("sidebar");
      updateInputAndCursor("", 0);
      return;
    } else if (rawCmd === "/submit-task" || rawCmd === "submit-task" || rawCmd === "/submit" || rawCmd === "submit" || rawCmd === "zila-submit" || rawCmd === "/zila-submit") {
      setActiveSidebar("submit-task");
      setActiveFocus("sidebar");
      updateInputAndCursor("", 0);
      return;
    } else if (rawCmd.startsWith("/attach-repo") || rawCmd.startsWith("attach-repo") || rawCmd.startsWith("/link-repo") || rawCmd.startsWith("link-repo")) {
      const parts = commandStr.trim().split(/\s+/);
      const repoArg = parts[1];
      setStatusText("Scanning repository structure...");
      reply = await executeAttachRepo(repoArg);
    } else if (rawCmd.startsWith("/generate-repo") || rawCmd.startsWith("generate-repo") || rawCmd.startsWith("/create-curriculum")) {
      const parts = commandStr.trim().split(/\s+/);
      const specArg = parts[1];
      const pushFlag = commandStr.includes("--push");
      setStatusText("Generating curriculum prototype repository...");
      reply = await executeGenerateRepo(specArg, { push: pushFlag });
    } else if (rawCmd.startsWith("/detach-repo") || rawCmd.startsWith("detach-repo") || rawCmd.startsWith("/unlink-repo") || rawCmd.startsWith("unlink-repo") || rawCmd.startsWith("/remove-repo")) {
      const parts = commandStr.trim().split(/\s+/);
      let cohortId = "";
      if (parts.includes("--cohort")) {
        cohortId = parts[parts.indexOf("--cohort") + 1] || "";
      }
      setStatusText("Detaching repository from cohort...");
      reply = await executeDetachRepo({ cohortId });
    } else if (rawCmd === "/close" || rawCmd === "close" || rawCmd === "hide") {
      setActiveSidebar(null);
      reply = "Closed right-hand sidebar.";
    } else if (rawCmd === "/quota" || rawCmd === "quota") {
      const q = checkDailyPrQuota();
      const currentCohort = getActiveCohort();
      reply = [
        "◈ Daily PR & Evaluation Quota:",
        `  PR Submissions Today: ${q.countToday}/2 used (${q.remainingToday} available)`,
        `  Plan / Tuition:       ${currentCohort?.isPaid ? "PAID (Unlimited Evaluations)" : `FREE TRIAL (${currentCohort?.tasksSubmittedCount || 0}/5 used)`}`,
        `  Status:               ${q.message}`,
        "",
        "Tip: Run 'quota --reset' to clear your local daily PR quota.",
      ].join("\n");
    } else if (rawCmd === "/plan" || rawCmd === "plan" || rawCmd === "my-plan") {
      setStatusText("Fetching program plan & tuition status...");
      reply = await formatPlanOverview();
    } else if (rawCmd === "/about") {
      reply = [
        "◈ About Lil-Zila Autonomous Pair Engineer:",
        "  Engine:      Zigex AI Engine (v2.5 High-Throughput Reasoning)",
        "  Role:        Autonomous Pair Programming Mentor for Intern Engineers",
        "  Creator:     Fonyuy Gita (Founder & Chief Architect) & Zigex Team",
        "  Ecosystem:   SEED 50 Days of Code Bootcamp & Founder Program",
        "  Mission:     Anti-cheating zero-sycophancy mentor, AST rubric verification,",
        "               points of truth (0.0-1.0) grading & contributor ledger audit.",
      ].join("\n");
    } else if (rawCmd === "/status") {
      const currentCohort = getActiveCohort();
      const planStatus = currentCohort?.isPaid
        ? "PAID (Unlimited Evaluations)"
        : `FREE TRIAL (${currentCohort?.tasksSubmittedCount || 0}/5 evaluations used)`;

      reply = [
        "◈ Lil-Agent Runtime Status:",
        `  AI Engine:     Connected & Ready (v2.5)`,
        `  Active Cohort: ${workspaceContext?.cohortName || "None selected"}`,
        `  Domain:        ${(workspaceContext?.domain || "general").toUpperCase()}`,
        `  Plan & Status: ${planStatus}`,
        `  Active Sidebar:${activeSidebar ? activeSidebar.toUpperCase() : "None"}`,
        `  Git Branch:    ${workspaceContext?.gitBranch || "local"}`,
        `  Recent Commits: ${workspaceContext?.recentCommits.length ? workspaceContext.recentCommits[0] : "none"}`,
        `  Exercise File: ${workspaceContext?.exerciseFile ? workspaceContext.exerciseFile.path : "None detected in workspace"}`,
      ].join("\n");
    } else if (rawCmd === "/model" || rawCmd === "model" || rawCmd.startsWith("/model ") || rawCmd.startsWith("model ")) {
      const parts = rawCmd.split(/\s+/);
      const targetModel = parts[1]?.trim();
      const currentConfig = loadAgentConfig();

      if (!currentConfig) {
        reply = "No AI provider configured yet. Run 'agent' from workstation shell to configure your API key.";
      } else if (targetModel) {
        saveAgentConfig({ ...currentConfig, model: targetModel });
        reply = `[✔] Successfully switched active model to: ${targetModel}\n(Provider: ${currentConfig.provider})`;
      } else {
        const families = getProviderModelFamilies(currentConfig.provider);
        const familyList = families.map((fam) => {
          const mList = fam.models.map((m) => {
            const isCurrent = m.id === currentConfig.model ? " (Active ✔)" : "";
            const isRec = m.recommended ? " [Recommended]" : "";
            return `    - ${m.id}${isCurrent}${isRec}${m.description ? ` — ${m.description}` : ""}`;
          }).join("\n");
          return `  • ${fam.name}:\n${mList}`;
        }).join("\n\n");

        reply = [
          "◈ Active AI Model & Provider Configuration:",
          `  Provider:     ${currentConfig.provider.toUpperCase()}`,
          `  Active Model: ${currentConfig.model}`,
          `  Configured:   ${new Date(currentConfig.configuredAt).toLocaleString()}`,
          "",
          `◈ Available Model Families (${currentConfig.provider}):`,
          familyList,
          "",
          "Tip: Type '/model <model_id>' to switch model immediately (e.g. '/model llama-3.1-8b-instant').",
        ].join("\n");
      }
    } else if (rawCmd === "/top" || rawCmd === "top" || rawCmd === "/scroll top") {
      setChatScrollOffset(maxScroll);
      reply = `Scrolled to the top of the chat transcript (line 1 of ${totalLines}). Press PgDn, ↓, or Esc to return.`;
    } else if (rawCmd === "/bottom" || rawCmd === "bottom" || rawCmd === "/scroll bottom") {
      setChatScrollOffset(0);
      reply = "Returned to the latest live messages at the bottom.";
    } else if (rawCmd === "/clear") {
      clearTerminalScreen();
      setMessages([]);
      setShowFirstRunWelcome(true);
      updateInputAndCursor("", 0);
      setChatScrollOffset(0);
      return;
    } else if (rawCmd === "/exit" || rawCmd === "/quit") {
      clearTerminalScreen();
      onClose();
      return;
    } else {
      reply = `Unknown command '${commandStr}'. Type /help to see all available agent commands.`;
    }

    const dedicatedSidebars = [
      "/leaderboard", "leaderboard", "rankings", "/rankings",
      "/group", "group", "peers", "/peers",
      "/cohorts", "cohorts", "programs", "/programs",
      "/logbook", "logbook", "ledger",
      "/submit-task", "submit-task", "/submit", "submit", "zila-submit", "/zila-submit",
      "/submit-report", "submit-report", "/report", "report",
      "/search", "search", "/opportunities", "opportunities",
      "/history", "history", "/sessions", "sessions",
      "/code", "code", "/editor", "editor", "/workspace", "workspace", "/work", "work",
      "/clear", "/exit", "/quit", "/top", "/bottom", "/scroll top", "/scroll bottom", "/close", "close", "hide",
    ];

    if (reply && !dedicatedSidebars.includes(rawCmd)) {
      setCommandPanelData({
        title: getCommandPanelTitle(rawCmd),
        command: rawCmd.split(/\s+/)[0] || "/command",
        content: reply,
      });
      setSidebarScrollOffset(0);
      setActiveSidebar("command-output");
      setActiveFocus("chat");
    }

    setMessages((prev) => [
      ...prev,
      userMsg,
      {
        id: `agent-${Date.now()}`,
        role: "assistant",
        content: reply,
      },
    ]);
    updateInputAndCursor("", 0);
    setStatusText("Ready");
    if (rawCmd !== "/top" && rawCmd !== "top" && rawCmd !== "/scroll top") {
      setChatScrollOffset(0);
    }
  }

  async function handleSend(prompt: string) {
    setShowFirstRunWelcome(false);
    const userMsg: DisplayMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: prompt,
    };

    setMessages((prev) => [...prev, userMsg]);
    updateInputAndCursor("", 0);
    setIsThinking(true);
    setStatusText("Analyzing context & generating response...");

    try {
      const currentCohort = getActiveCohort();
      const planStatus = currentCohort?.isPaid
        ? "Paid / Pro Plan (Unlimited Automated Evaluations)"
        : `Free Trial Tier (${currentCohort?.tasksSubmittedCount || 0}/5 evaluations used, unpaid)`;

      const systemPrompt = `You are Lil-Zila, the official autonomous AI pair programming mentor in the Zigex Engineering Ecosystem, created by Fonyuy Gita (Founder & Chief Architect) and the Zigex Core Engineering Team for the SEED 50 Days of Code Bootcamp.

Your Architecture & Capabilities:
- Role: Autonomous technical mentor, code auditor, and pair programmer for intern engineers.
- Zero Sycophancy Mission: You provide honest, rigorous feedback. You grade strictly between 0.0 and 1.0 (Points of Truth) based on actual code evidence, AST syntax analysis, and supervisor rubrics. You NEVER flatter or inflate scores.
- AST Rubric Verification: You analyze Abstract Syntax Trees of student tasks to verify logic, imports, algorithms, and structural integrity.
- Contributor Ledger: You audit daily progress into the local engineering logbook (diffs, test execution, commit hash integrity).
- Evaluation Quota: Daily quota of 2 GitHub PR evaluations per day for fair resource allocation.
- Opportunity Radar: You integrate Tavily search to match intern skills with verified internships, bounties, and hackathons.
- Code Workspace & Editor: You provide the /code command to open the supervisor's cloned repository and files directly in the right panel so interns can inspect exercise prompts, edit code in-terminal or launch desktop editors (VS Code, Cursor), and trigger /submit-task.
- Chat History: All conversations are persisted locally in ~/.zila/history/ and synced with the Neon Postgres backend.

Current Workspace & Student Context:
- Active Cohort: ${workspaceContext?.cohortName || "General Engineering Bootcamp"}
- Supervisor: ${currentCohort?.supervisorName || "Assigned Engineering Supervisor"}
- Domain / Track: ${(workspaceContext?.domain || "Software Engineering").toUpperCase()}
- Plan & Tuition: ${planStatus}
- Git Branch: ${workspaceContext?.gitBranch || "local"}
- Recent Commits: ${workspaceContext?.recentCommits.join(", ") || "none"}
${workspaceContext?.exerciseFile ? `- Active Exercise File (${workspaceContext.exerciseFile.path}):\n${workspaceContext.exerciseFile.content}` : ""}

CRITICAL STYLING & FORMATTING RULES:
1. NEVER output raw markdown symbols like double asterisks (**bold**), underscores, hashtag headers (### Header), or markdown backticks/fences.
2. Format headings cleanly using unicode bullets like ◈ or ›.
3. Write clean, readable terminal text with appropriate line breaks.
4. If asked about who made you or what you do, answer authoritatively and proudly about Zigex, Fonyuy Gita, and the anti-cheating zero-sycophancy mission.`;

      const chatHistory: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        ...messages
          .filter((m) => m.role !== "system")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user", content: prompt },
      ];

      const response = await generateChatResponse(chatHistory, { temperature: 0.6 });
      const cleanResponse = formatTerminalText(response);

      const assistantMsg: DisplayMessage = {
        id: `agent-${Date.now()}`,
        role: "assistant",
        content: cleanResponse,
      };

      setMessages((prev) => {
        const nextMsgs = [...prev, assistantMsg];

        // Persist session locally & sync to API
        try {
          const userTitle = prompt.length > 40 ? prompt.slice(0, 37) + "..." : prompt;
          const storedMsgs: StoredChatMessage[] = nextMsgs.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: new Date().toISOString(),
          }));
          const sessionToSave: LocalChatSession = {
            id: currentSessionId,
            title: userTitle,
            cohortId: currentCohort?.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: storedMsgs,
          };
          saveLocalChatSession(sessionToSave);
          syncChatSessionWithApi(sessionToSave).catch(() => {});
        } catch {
          // Ignore sync/save errors
        }

        return nextMsgs;
      });
      setStatusText("Ready");
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `✖ Error: ${err.message || String(err)}`,
        },
      ]);
      setStatusText("Error");
    } finally {
      setIsThinking(false);
    }
  }

  if (activeModal === "submit-report") {
    return (
      <SubmitReportScreen
        onComplete={() => {
          setActiveModal(null);
          setMessages((prev) => [
            ...prev,
            {
              id: `agent-${Date.now()}`,
              role: "assistant",
              content: "Report submission workflow finished. Type /logbook or /leaderboard to view updated records.",
            },
          ]);
        }}
      />
    );
  }

  if (activeModal === "submit-task") {
    return (
      <SubmitTaskScreen
        onComplete={() => {
          setActiveModal(null);
          setMessages((prev) => [
            ...prev,
            {
              id: `agent-${Date.now()}`,
              role: "assistant",
              content: "Automated task submission pipeline finished. Type /logbook or /leaderboard to view updated records.",
            },
          ]);
        }}
      />
    );
  }

  const modelBadge = config?.model || "gemini-2.5-flash";

  const mainContent = (
    <Box
      flexDirection="column"
      height={isSplitActive || showFirstRunWelcome ? fullHeight : undefined}
      justifyContent={isSplitActive ? "space-between" : undefined}
      paddingY={0}
    >
      <Box flexDirection="column">
        {/* Header */}
        <Box flexDirection="row" justifyContent="space-between" alignItems="center">
          <Box flexDirection="row" gap={1}>
            <Text color={theme.colors.retroBlue} bold>
              lil-agent
            </Text>
            <Text color={theme.colors.retroSlateDark}>›</Text>
            <Text color={theme.colors.white} bold>
              autonomous developer shell
            </Text>
            {isSplitActive && (
              <Text
                color={
                  activeFocus === "chat"
                    ? theme.colors.retroGreenBright
                    : theme.colors.retroSlateDark
                }
                bold={activeFocus === "chat"}
              >
                [{activeFocus === "chat" ? "FOCUSED" : "TAB"}]
              </Text>
            )}
          </Box>
          <Box flexDirection="row" gap={1}>
            <Text color={theme.colors.retroGreenBright}>●</Text>
            <Text color={theme.colors.white} bold>
              Zigex AI Engine (v2.5)
            </Text>
          </Box>
        </Box>

        {/* Workspace Context Bar */}
        <Box flexDirection="row" justifyContent="space-between">
          <Box flexDirection="row" gap={1}>
            <Text color={theme.colors.retroSlateDark}>Cohort:</Text>
            <Text color={theme.colors.retroCyanBright} bold>
              [{workspaceContext?.cohortName || "General"}]
            </Text>
            <Text color={theme.colors.retroSlateDark}>·</Text>
            <Text color={theme.colors.retroSlateDark}>Branch:</Text>
            <Text color={theme.colors.retroSlate}>
              {workspaceContext?.gitBranch || "local"}
            </Text>
          </Box>
          <Text color={theme.colors.retroSlateDark}>esc to exit</Text>
        </Box>

        {/* Divider / Scrolled History Indicator */}
        {currentOffset > 0 ? (
          <Box flexDirection="row" justifyContent="space-between">
            <Text color={theme.colors.retroAmberBright} bold wrap="truncate">
              ── ↑ SCROLLED [lines {startIndex + 1}–{endIndex} of {totalLines}] ──
            </Text>
            <Text color={theme.colors.retroSlateDark} wrap="truncate">
              PgDn / ↓ or Esc for latest
            </Text>
          </Box>
        ) : (
          <Text color={theme.colors.retroBlue}>{"─".repeat(activeLineWidth)}</Text>
        )}

        {/* Messages Stream with Scrollbar */}
        <Box
          flexDirection="row"
          height={isSplitActive || showFirstRunWelcome ? chatViewportHeight : undefined}
          width="100%"
          overflow="hidden"
        >
          <Box
            flexDirection="column"
            flexGrow={1}
            justifyContent={showFirstRunWelcome ? "center" : undefined}
            alignItems={showFirstRunWelcome ? "center" : undefined}
            overflow="hidden"
          >
            {showFirstRunWelcome ? (
              <Box flexDirection="column" alignItems="center" justifyContent="center" width="100%">
                {/* Little ASCII llama mascot in blue */}
                <Box flexDirection="column" alignItems="center">
                  {LLAMA_ART.map((line, i) => (
                    <Text key={i} color={theme.colors.retroBlue} bold>
                      {line}
                    </Text>
                  ))}
                </Box>

                <Box marginTop={1}>
                  <Text color={theme.colors.retroCyanBright} bold>Hi, I’m Lil-Zila.</Text>
                </Box>

                <Box
                  marginTop={1}
                  borderStyle="round"
                  borderColor={theme.colors.retroBlue}
                  paddingX={2}
                  paddingY={0}
                >
                  <Text color={theme.colors.white}>
                    I am here to monitor and make sure you do the writing...{"\n"}
                    Together, we can say no to cheating the right way:{"\n"}
                    <Text color={theme.colors.retroBlueBright} bold>
                      That’s the aim of Lil-Zila.
                    </Text>
                  </Text>
                </Box>

                <Box marginTop={1}>
                  <Text color={theme.colors.retroSlateDark}>
                    Start by asking me about your code or task.
                  </Text>
                </Box>
              </Box>
            ) : visibleLines.map((line) => {
              if (line.role === "blank") {
                return (
                  <Box key={line.id} height={1}>
                    <Text> </Text>
                  </Box>
                );
              }
              if (line.role === "system") {
                return (
                  <Box key={line.id} height={1}>
                    <Text color={theme.colors.retroSlateDark} wrap="truncate">
                      {line.text}
                    </Text>
                  </Box>
                );
              }
              if (line.role === "user") {
                if (line.isHeader) {
                  return (
                    <Box key={line.id} height={1} flexDirection="row">
                      <Text color={theme.colors.retroCyanBright} bold>
                        ❯ Intern:{" "}
                      </Text>
                      <Text color={theme.colors.white} wrap="truncate">
                        {line.text}
                      </Text>
                    </Box>
                  );
                }
                return (
                  <Box key={line.id} height={1} paddingLeft={10}>
                    <Text color={theme.colors.white} wrap="truncate">
                      {line.text}
                    </Text>
                  </Box>
                );
              }
              // Assistant / Lil-Zila
              if (line.isHeader) {
                return (
                  <Box key={line.id} height={1} flexDirection="row" gap={1}>
                    <Text color={theme.colors.retroBlueBright} bold>
                      🤖 Lil-Zila:
                    </Text>
                  </Box>
                );
              }
              return (
                <Box key={line.id} height={1} paddingLeft={3}>
                  <Text color={theme.colors.retroWhite} wrap="truncate">
                    {line.text}
                  </Text>
                </Box>
              );
            })}

            {isThinking && (
              <Box height={1} paddingLeft={3}>
                <ZigexLoader suffix="analyzing workspace & reasoning" />
              </Box>
            )}
          </Box>

          {!showFirstRunWelcome && chatScrollbar && (
            <Box flexDirection="column" width={1} alignItems="flex-end">
              {Array.from({ length: chatViewportHeight }).map((_, rIdx) => {
                const isThumb =
                  rIdx >= chatScrollbar.thumbStart &&
                  rIdx < chatScrollbar.thumbStart + chatScrollbar.thumbSize;
                return (
                  <Text
                    key={rIdx}
                    color={isThumb ? theme.colors.retroCyanBright : theme.colors.retroSlateDark}
                  >
                    {isThumb ? "█" : "│"}
                  </Text>
                );
              })}
            </Box>
          )}
        </Box>
      </Box>

    {/* Bottom Input Area */}
    <Box flexDirection="column" flexShrink={0} marginTop={isSplitActive ? 0 : 1}>
      {/* Claude Code Style Autocomplete Popup */}
      {isSlashActive && matchingSlashCommands.length > 0 && (
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor={theme.colors.retroBlueBright}
          paddingX={1}
          paddingY={0}
          marginBottom={1}
          flexShrink={0}
        >
          <Box flexDirection="row" justifyContent="space-between" marginBottom={0}>
            <Text color={theme.colors.retroCyanBright} bold>
              COMMANDS
            </Text>
            <Text color={theme.colors.retroSlateDark}>
              ↑/↓ to navigate · Tab to complete · Enter to run
            </Text>
          </Box>
          {matchingSlashCommands.map((item, idx) => {
            const isSelected = idx === selectedSlashIndex;
            return (
              <Box key={item.cmd} flexDirection="row" gap={1}>
                <Box width={15}>
                  <Text
                    color={
                      isSelected
                        ? theme.colors.retroCyanBright
                        : theme.colors.retroWhite
                    }
                    bold={isSelected}
                  >
                    {isSelected ? "❯ " : "  "}
                    {item.cmd}
                  </Text>
                </Box>
                <Text
                  color={
                    isSelected
                      ? theme.colors.white
                      : theme.colors.retroSlateDark
                  }
                >
                  {item.desc}
                </Text>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Claude Code Style Input Container */}
      <Box
        flexDirection="column"
        borderStyle="round"
        height={3}
        flexShrink={0}
        borderColor={
          isSlashActive
            ? theme.colors.retroCyanBright
            : theme.colors.retroBlueBright
        }
        paddingX={1}
        paddingY={0}
      >
        <Box flexDirection="row" alignItems="center" height={1} flexShrink={0}>
          <Text color={theme.colors.retroCyanBright} bold>
            ❯{" "}
          </Text>
          {cursorIndex >= inputText.length ? (
            <>
              <Text color={theme.colors.white}>{inputText}</Text>
              <Text color={theme.colors.retroCyanBright} bold>
                █
              </Text>
            </>
          ) : (
            <>
              <Text color={theme.colors.white}>{inputText.slice(0, cursorIndex)}</Text>
              <Text backgroundColor={theme.colors.retroCyanBright} color="#000000" bold>
                {inputText[cursorIndex]}
              </Text>
              <Text color={theme.colors.white}>{inputText.slice(cursorIndex + 1)}</Text>
            </>
          )}
        </Box>
      </Box>

      {/* Status Bar */}
      <Box flexDirection="row" justifyContent="space-between" marginTop={1} paddingX={1} height={1} flexShrink={0}>
        <Text color={theme.colors.retroSlateDark}>
          {isSplitActive
            ? (activeFocus === "chat"
                ? "FOCUS: CHAT · Tab sidebar · PgUp/PgDn / ↑ / ↓ scroll chat · /close hide"
                : "FOCUS: SIDEBAR · Tab chat · PgUp/PgDn / ↑ / ↓ scroll sidebar · /close hide")
            : "type /help · /leaderboard · /group · /plan · PgUp/PgDn / ↑ / ↓ scroll chat · esc exit"}
        </Text>
        <Box flexDirection="row" gap={1}>
          {currentOffset > 0 && (
            <Text color={theme.colors.retroAmberBright} bold>
              ↑ Scrolled ({currentOffset}L)
            </Text>
          )}
          <Text color={statusText === "Error" ? theme.colors.error : theme.colors.retroGreenBright}>
            {statusText === "Ready" ? "● Ready" : statusText}
          </Text>
        </Box>
      </Box>
    </Box>
  </Box>
  );

  if (isSplitActive) {
    return (
      <Box flexDirection="row" width="100%" height={fullHeight}>
        <Box
          flexDirection="column"
          width={splitLeftWidth}
          marginRight={1}
          height={fullHeight}
        >
          {mainContent}
        </Box>
        {activeSidebar === "logbook" && (
          <LogbookSidebar width={splitRightWidth} height={fullHeight} isFocused={activeFocus === "sidebar"} />
        )}
        {activeSidebar === "leaderboard" && (
          <LeaderboardSidebar width={splitRightWidth} height={fullHeight} isFocused={activeFocus === "sidebar"} />
        )}
        {activeSidebar === "group" && (
          <GroupSidebar width={splitRightWidth} height={fullHeight} isFocused={activeFocus === "sidebar"} />
        )}
        {activeSidebar === "cohorts" && (
          <CohortsSidebar width={splitRightWidth} height={fullHeight} isFocused={activeFocus === "sidebar"} />
        )}
        {activeSidebar === "submit-task" && (
          <Box
            flexDirection="column"
            width={splitRightWidth}
            height={fullHeight}
            borderStyle="single"
            borderColor={activeFocus === "sidebar" ? theme.colors.retroBlueBright : theme.colors.retroSlateDark}
            paddingX={1}
            overflow="hidden"
          >
            <SubmitTaskScreen
              width={splitRightWidth - 4}
              isFocused={activeFocus === "sidebar"}
              onComplete={() => {
                setActiveSidebar(null);
                setActiveFocus("chat");
              }}
            />
          </Box>
        )}
        {activeSidebar === "submit-report" && (
          <Box
            flexDirection="column"
            width={splitRightWidth}
            height={fullHeight}
            borderStyle="single"
            borderColor={activeFocus === "sidebar" ? theme.colors.retroBlueBright : theme.colors.retroSlateDark}
            paddingX={1}
            overflow="hidden"
          >
            <SubmitReportScreen
              width={splitRightWidth - 4}
              isFocused={activeFocus === "sidebar"}
              onComplete={() => {
                setActiveSidebar(null);
                setActiveFocus("chat");
              }}
            />
          </Box>
        )}
        {activeSidebar === "search" && (
          <OpportunitiesSidebar
            initialQuery={searchQuery}
            width={splitRightWidth}
            height={fullHeight}
            isFocused={activeFocus === "sidebar"}
            onClose={() => {
              setActiveSidebar(null);
              setActiveFocus("chat");
            }}
          />
        )}
        {activeSidebar === "history" && (
          <HistorySidebar
            width={splitRightWidth}
            height={fullHeight}
            isFocused={activeFocus === "sidebar"}
            currentSessionId={currentSessionId}
            onSelectSession={(session) => {
              setCurrentSessionId(session.id);
              const restoredMsgs: DisplayMessage[] = session.messages.map((m) => ({
                id: m.id,
                role: m.role,
                content: m.content,
              }));
              setMessages(
                restoredMsgs.length > 0
                  ? restoredMsgs
                  : [
                      {
                        id: "msg-0",
                        role: "system",
                        content: `Loaded session "${session.title}". Resuming conversation with Lil-Zila.`,
                      },
                    ],
              );
              setActiveSidebar(null);
              setActiveFocus("chat");
            }}
            onClose={() => {
              setActiveSidebar(null);
              setActiveFocus("chat");
            }}
          />
        )}
        {activeSidebar === "editor" && (
          <WorkspaceEditorSidebar
            width={splitRightWidth}
            height={fullHeight}
            isFocused={activeFocus === "sidebar"}
            onOpenSubmitTask={() => {
              setActiveSidebar("submit-task");
              setActiveFocus("sidebar");
            }}
            onClose={() => {
              setActiveSidebar(null);
              setActiveFocus("chat");
            }}
          />
        )}
        {activeSidebar === "command-output" && commandPanelData && (
          <CommandOutputSidebar
            title={commandPanelData.title}
            command={commandPanelData.command}
            content={commandPanelData.content}
            width={splitRightWidth}
            height={fullHeight}
            isFocused={activeFocus === "sidebar"}
            scrollOffset={sidebarScrollOffset}
            onClose={() => {
              setActiveSidebar(null);
              setActiveFocus("chat");
            }}
          />
        )}
      </Box>
    );
  }

  return mainContent;
};
