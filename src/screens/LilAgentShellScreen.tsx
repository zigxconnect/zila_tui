import React, { useState, useEffect } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import { theme } from "../ui/theme.js";
import { loadAgentConfig } from "../utils/aiConfig.js";
import { generateChatResponse, type ChatMessage } from "../utils/aiClient.js";
import { extractWorkspaceContext, type WorkspaceContext } from "../utils/contextExtractor.js";
import { formatPlanOverview } from "../commands/plan.js";
import { getActiveCohort } from "../utils/activeCohort.js";
import { checkDailyPrQuota } from "../utils/githubPrAutomation.js";

import { LogbookSidebar } from "./LogbookSidebar.js";
import { LeaderboardSidebar } from "./LeaderboardSidebar.js";
import { GroupSidebar } from "./GroupSidebar.js";
import { CohortsSidebar } from "./CohortsSidebar.js";
import { SubmitReportScreen } from "./SubmitReportScreen.js";
import { SubmitTaskScreen } from "./SubmitTaskScreen.js";
import { ZigexLoader } from "../ui/Spinner.js";

interface LilAgentShellScreenProps {
  onClose: () => void;
}

interface DisplayMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

interface SlashCommandItem {
  cmd: string;
  desc: string;
}

type SidebarMode = "logbook" | "leaderboard" | "group" | "cohorts" | null;
type ModalMode = "submit-report" | "submit-task" | null;

const AVAILABLE_SLASH_COMMANDS: SlashCommandItem[] = [
  { cmd: "/help", desc: "Display interactive command directory & tips" },
  { cmd: "/leaderboard", desc: "Open cohort rankings & PR evaluation leaderboard on the right" },
  { cmd: "/group", desc: "Open cohort team & fellow interns roster on the right" },
  { cmd: "/cohorts", desc: "Browse enrolled programs and cohort workspaces on the right" },
  { cmd: "/logbook", desc: "Toggle right-hand Contributor Audit Ledger logbook sidebar" },
  { cmd: "/submit-report", desc: "Open interactive daily sprint engineering report modal" },
  { cmd: "/submit-task", desc: "Launch automated task submission & PR evaluation pipeline" },
  { cmd: "/plan", desc: "View program enrollment, tuition plan & evaluation quota" },
  { cmd: "/quota", desc: "Check daily GitHub PR & tuition submission quota" },
  { cmd: "/top", desc: "Jump to the very beginning of the chat transcript" },
  { cmd: "/bottom", desc: "Jump to the latest live messages at the bottom" },
  { cmd: "/about", desc: "System telemetry, architecture & pair mentor profile" },
  { cmd: "/status", desc: "Check engine connection, git branch & active cohort" },
  { cmd: "/clear", desc: "Wipe terminal conversation history" },
  { cmd: "/close", desc: "Close any active right-hand sidebar" },
  { cmd: "/exit", desc: "Return to the primary Zigex workstation shell" },
];

export const LilAgentShellScreen: React.FC<LilAgentShellScreenProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: "msg-0",
      role: "system",
      content: `Connected to Zigex Autonomous AI Agent · Engine: Active\nAsk questions about your code, debugging, or task instructions.`,
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [statusText, setStatusText] = useState("Ready");
  const [workspaceContext, setWorkspaceContext] = useState<WorkspaceContext | null>(null);
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);
  const [activeSidebar, setActiveSidebar] = useState<SidebarMode>(null);
  const [activeModal, setActiveModal] = useState<ModalMode>(null);
  const [chatScrollOffset, setChatScrollOffset] = useState<number>(0);
  const [activeFocus, setActiveFocus] = useState<"chat" | "sidebar">("chat");

  const config = loadAgentConfig();

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

  useInput((input, key) => {
    if (key.escape) {
      if (isSlashActive) {
        setInputText("");
        return;
      }
      if (chatScrollOffset > 0) {
        setChatScrollOffset(0);
        return;
      }
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
    const isSplitActive = activeSidebar !== null;
    if (key.pageUp && (!isSplitActive || activeFocus === "chat")) {
      setChatScrollOffset((prev) => Math.min(Math.max(0, messages.length - 1), prev + 3));
      return;
    }
    if (key.pageDown && (!isSplitActive || activeFocus === "chat")) {
      setChatScrollOffset((prev) => Math.max(0, prev - 3));
      return;
    }

    // Ctrl+U / Ctrl+D scrolling
    if (key.ctrl && input === "u" && (!isSplitActive || activeFocus === "chat")) {
      setChatScrollOffset((prev) => Math.min(Math.max(0, messages.length - 1), prev + 4));
      return;
    }
    if (key.ctrl && input === "d" && (!isSplitActive || activeFocus === "chat")) {
      setChatScrollOffset((prev) => Math.max(0, prev - 4));
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
          setInputText(picked.cmd);
        }
        return;
      }
    }

    // When not typing, Up/Down arrows scroll chat
    if (key.upArrow && !isSlashActive && inputText === "" && (!isSplitActive || activeFocus === "chat")) {
      setChatScrollOffset((prev) => Math.min(Math.max(0, messages.length - 1), prev + 1));
      return;
    }
    if (key.downArrow && !isSlashActive && inputText === "" && (!isSplitActive || activeFocus === "chat")) {
      setChatScrollOffset((prev) => Math.max(0, prev - 1));
      return;
    }

    // Typing any character or backspace immediately returns focus to chat
    if (activeFocus === "sidebar" && (input || key.backspace || key.delete)) {
      setActiveFocus("chat");
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

      if (trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "quit") {
        onClose();
        return;
      }

      if (trimmed.toLowerCase() === "clear") {
        setMessages([]);
        setInputText("");
        return;
      }

      const lowerTrimmed = trimmed.toLowerCase();

      // Interactive modal triggers
      if (
        lowerTrimmed === "/submit-report" ||
        lowerTrimmed === "submit-report" ||
        lowerTrimmed === "/report" ||
        lowerTrimmed === "report"
      ) {
        setActiveModal("submit-report");
        setInputText("");
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
        setActiveModal("submit-task");
        setInputText("");
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
        lowerTrimmed === "close cohorts"
      ) {
        setActiveSidebar(null);
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
        setInputText("");
        return;
      }

      // Direct shortcuts for sidebars
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

      handleSend(trimmed);
    } else if (key.backspace || key.delete) {
      setInputText((prev) => prev.slice(0, -1));
    } else if (input && !key.ctrl && !key.meta) {
      setInputText((prev) => prev + input);
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
        "  /leaderboard   — Open cohort rankings & PR evaluation leaderboard on the right",
        "  /group         — Open cohort team & fellow interns roster on the right",
        "  /cohorts       — Browse enrolled programs and cohort workspaces on the right",
        "  /logbook       — Toggle right-hand Contributor Audit Ledger logbook sidebar",
        "  /submit-report — Open interactive daily sprint engineering report modal",
        "  /submit-task   — Launch automated task submission & PR evaluation pipeline",
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
    } else if (rawCmd === "/leaderboard" || rawCmd === "leaderboard" || rawCmd === "rankings" || rawCmd === "/rankings") {
      setActiveSidebar((prev) => (prev === "leaderboard" ? null : "leaderboard"));
      reply = activeSidebar !== "leaderboard"
        ? "Opened Cohort Leaderboard on the right. Type 'close' or /leaderboard to toggle."
        : "Closed Cohort Leaderboard.";
    } else if (rawCmd === "/group" || rawCmd === "group" || rawCmd === "peers" || rawCmd === "/peers") {
      setActiveSidebar((prev) => (prev === "group" ? null : "group"));
      reply = activeSidebar !== "group"
        ? "Opened Cohort Team & Intern Roster on the right. Type 'close' or /group to toggle."
        : "Closed Cohort Team Roster.";
    } else if (rawCmd === "/cohorts" || rawCmd === "cohorts" || rawCmd === "programs" || rawCmd === "/programs") {
      setActiveSidebar((prev) => (prev === "cohorts" ? null : "cohorts"));
      reply = activeSidebar !== "cohorts"
        ? "Opened Enrolled Programs & Cohorts on the right. Type 'close' or /cohorts to toggle."
        : "Closed Enrolled Programs & Cohorts.";
    } else if (rawCmd === "/logbook" || rawCmd === "logbook" || rawCmd === "ledger") {
      setActiveSidebar((prev) => (prev === "logbook" ? null : "logbook"));
      reply = activeSidebar !== "logbook"
        ? "Opened Contributor Audit Ledger logbook sidebar on the right. Type 'close' to hide."
        : "Closed Contributor Audit Ledger logbook sidebar.";
    } else if (rawCmd === "/submit-report" || rawCmd === "submit-report" || rawCmd === "/report" || rawCmd === "report") {
      setActiveModal("submit-report");
      setInputText("");
      return;
    } else if (rawCmd === "/submit-task" || rawCmd === "submit-task" || rawCmd === "/submit" || rawCmd === "submit" || rawCmd === "zila-submit" || rawCmd === "/zila-submit") {
      setActiveModal("submit-task");
      setInputText("");
      return;
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
        "  Ecosystem:   SEED 50 Days of Code Bootcamp & Founder Program",
        "  Features:    Context-aware diff analysis, supervisor rubric extraction,",
        "               truthful evaluation & contributor logbook automation.",
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
    } else if (rawCmd === "/top" || rawCmd === "top" || rawCmd === "/scroll top") {
      setChatScrollOffset(Math.max(0, messages.length - 1));
      reply = "Scrolled to the top of the chat transcript. Press PgDn, ↓, or Esc to return.";
    } else if (rawCmd === "/bottom" || rawCmd === "bottom" || rawCmd === "/scroll bottom") {
      setChatScrollOffset(0);
      reply = "Returned to the latest live messages at the bottom.";
    } else if (rawCmd === "/clear") {
      setMessages([]);
      setInputText("");
      setChatScrollOffset(0);
      return;
    } else if (rawCmd === "/exit" || rawCmd === "/quit") {
      onClose();
      return;
    } else {
      reply = `Unknown command '${commandStr}'. Type /help to see all available agent commands.`;
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
    setInputText("");
    setStatusText("Ready");
    setChatScrollOffset(0);
    setActiveFocus("chat");
  }

  async function handleSend(prompt: string) {
    const userMsg: DisplayMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: prompt,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsThinking(true);
    setStatusText("Analyzing context & generating response...");

    try {
      const currentCohort = getActiveCohort();
      const planStatus = currentCohort?.isPaid
        ? "Paid / Pro Plan (Unlimited Automated Evaluations)"
        : `Free Trial Tier (${currentCohort?.tasksSubmittedCount || 0}/5 evaluations used, unpaid)`;

      const systemPrompt = `You are Lil-Zila, the official Zigex autonomous AI pair programming mentor for intern engineers.
Current Workspace Context:
- Active Cohort: ${workspaceContext?.cohortName || "General Curriculum"}
- Domain: ${workspaceContext?.domain || "Engineering"}
- Plan & Tuition: ${planStatus}
- Git Branch: ${workspaceContext?.gitBranch || "local"}
- Recent Commits: ${workspaceContext?.recentCommits.join(", ") || "none"}
${workspaceContext?.exerciseFile ? `- Active Exercise File (${workspaceContext.exerciseFile.path}):\n${workspaceContext.exerciseFile.content}` : ""}

Behavior Guidelines:
1. Act as a patient Zigex technical mentor: explain engineering principles, identify bugs, and provide hints.
2. Be concise, direct, professional, and encouraging.
3. Keep terminal output clean, well-formatted, and aligned with Zigex engineering standards.`;

      const chatHistory: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        ...messages
          .filter((m) => m.role !== "system")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user", content: prompt },
      ];

      const response = await generateChatResponse(chatHistory, { temperature: 0.6 });

      const assistantMsg: DisplayMessage = {
        id: `agent-${Date.now()}`,
        role: "assistant",
        content: response,
      };

      setMessages((prev) => [...prev, assistantMsg]);
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

  const { stdout } = useStdout();
  const termCols = stdout?.columns || process.stdout.columns || 120;
  const termRows = stdout?.rows || process.stdout.rows || 36;
  const isSplitActive = activeSidebar !== null;
  const splitLeftWidth = Math.floor(termCols * 0.52);
  const splitRightWidth = termCols - splitLeftWidth - 2;
  const fullHeight = Math.max(20, termRows - 3);
  const activeLineWidth = Math.max(24, (isSplitActive ? splitLeftWidth : termCols) - 4);

  const modelBadge = config?.model || "gemini-2.5-flash";

  // Chat scrolling viewport calculations
  const visibleMsgCapacity = isSplitActive ? 6 : 9;
  const maxScroll = Math.max(0, messages.length - 1);
  const currentOffset = Math.min(chatScrollOffset, maxScroll);
  const endIndex = Math.max(1, messages.length - currentOffset);
  const startIndex = Math.max(0, endIndex - visibleMsgCapacity);
  const visibleMessages = messages.slice(startIndex, endIndex);

  const mainContent = (
    <Box
      flexDirection="column"
      height={isSplitActive ? fullHeight : undefined}
      justifyContent={isSplitActive ? "space-between" : undefined}
      paddingY={0}
    >
      <Box flexDirection="column">
        {/* Top rule */}
        <Text color={theme.colors.retroBlue}>{"─".repeat(activeLineWidth)}</Text>

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

        {/* Divider */}
        <Text color={theme.colors.retroBlue}>{"─".repeat(activeLineWidth)}</Text>

        {/* Scrolled History Alert Banner */}
        {currentOffset > 0 && (
          <Box
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            paddingX={1}
            borderStyle="single"
            borderColor={theme.colors.retroAmberBright}
            marginBottom={1}
          >
            <Text color={theme.colors.retroAmberBright} bold>
              ↑ SCROLLED HISTORY (Viewing past messages {startIndex + 1}–{endIndex} of {messages.length})
            </Text>
            <Text color={theme.colors.retroSlateDark}>
              PgDn / ↓ or Esc for latest
            </Text>
          </Box>
        )}

        {/* Messages Stream */}
        <Box flexDirection="column" paddingY={0}>
          {visibleMessages.map((m) => {
          if (m.role === "system") {
            return (
              <Box key={m.id} marginY={0}>
                <Text color={theme.colors.retroSlateDark}>
                  ℹ {m.content}
                </Text>
              </Box>
            );
          }
          if (m.role === "user") {
            return (
              <Box key={m.id} marginTop={1} flexDirection="row">
                <Text color={theme.colors.retroCyanBright} bold>
                  ❯ Intern:{" "}
                </Text>
                <Text color={theme.colors.white}>{m.content}</Text>
              </Box>
            );
          }
          return (
            <Box key={m.id} marginTop={1} flexDirection="column">
              <Box flexDirection="row" gap={1}>
                <Text color={theme.colors.retroBlueBright} bold>
                  🤖 Lil-Zila:
                </Text>
              </Box>
              <Box paddingLeft={3}>
                <Text color={theme.colors.retroWhite}>{m.content}</Text>
              </Box>
            </Box>
          );
        })}

        {isThinking && (
          <Box marginTop={1} paddingLeft={3}>
            <ZigexLoader suffix="analyzing workspace & reasoning" />
          </Box>
        )}
      </Box>
    </Box>

    {/* Bottom Input Area */}
    <Box flexDirection="column">
      {/* Claude Code Style Autocomplete Popup */}
      {isSlashActive && matchingSlashCommands.length > 0 && (
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor={theme.colors.retroBlueBright}
          paddingX={1}
          paddingY={0}
          marginTop={1}
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
        borderColor={
          isSlashActive
            ? theme.colors.retroCyanBright
            : theme.colors.retroBlueBright
        }
        paddingX={2}
        paddingY={0}
        marginTop={isSlashActive && matchingSlashCommands.length > 0 ? 0 : 1}
      >
        <Box flexDirection="row" alignItems="center">
          <Text color={theme.colors.retroCyanBright} bold>
            ❯{" "}
          </Text>
          <Text color={theme.colors.white}>
            {inputText}
          </Text>
          <Text color={theme.colors.retroCyanBright} bold>
            █
          </Text>
        </Box>
      </Box>

      {/* Status Bar */}
      <Box flexDirection="row" justifyContent="space-between" marginTop={1} paddingX={1}>
        <Text color={theme.colors.retroSlateDark}>
          {isSplitActive
            ? (activeFocus === "chat"
                ? "FOCUS: CHAT · Tab switch to sidebar · PgUp/PgDn scroll chat · /close hide"
                : "FOCUS: SIDEBAR · Tab switch to chat · PgUp/PgDn scroll sidebar · /close hide")
            : "type /help · /leaderboard · /group · /plan · PgUp/PgDn scroll chat · esc exit"}
        </Text>
        <Box flexDirection="row" gap={1}>
          {currentOffset > 0 && (
            <Text color={theme.colors.retroAmberBright} bold>
              ↑ Scrolled ({currentOffset})
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
      </Box>
    );
  }

  return mainContent;
};
