import React, { useState, useEffect } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import { theme } from "../ui/theme.js";
import { loadAgentConfig } from "../utils/aiConfig.js";
import { generateChatResponse, type ChatMessage } from "../utils/aiClient.js";
import { extractWorkspaceContext, type WorkspaceContext } from "../utils/contextExtractor.js";
import { formatPlanOverview } from "../commands/plan.js";
import { getActiveCohort } from "../utils/activeCohort.js";

import { LogbookSidebar } from "./LogbookSidebar.js";

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

const AVAILABLE_SLASH_COMMANDS: SlashCommandItem[] = [
  { cmd: "/help", desc: "Display interactive command directory & tips" },
  { cmd: "/plan", desc: "View program enrollment, tuition plan & evaluation quota" },
  { cmd: "/logbook", desc: "Toggle right-hand Contributor Audit Ledger logbook sidebar" },
  { cmd: "/about", desc: "System telemetry, architecture & pair mentor profile" },
  { cmd: "/status", desc: "Check engine connection, git branch & active cohort" },
  { cmd: "/clear", desc: "Wipe terminal conversation history" },
  { cmd: "/exit", desc: "Return to the primary Zigex workstation shell" },
];

export const LilAgentShellScreen: React.FC<LilAgentShellScreenProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [statusText, setStatusText] = useState("Ready");
  const [workspaceContext, setWorkspaceContext] = useState<WorkspaceContext | null>(null);
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);
  const [showLogbookSidebar, setShowLogbookSidebar] = useState(false);

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

    const welcomeMsg = `Connected to Zigex Autonomous AI Agent · Engine: Active\nAsk questions about your code, debugging, or task instructions.`;

    setMessages([
      {
        id: "msg-0",
        role: "system",
        content: welcomeMsg,
      },
    ]);
  }, []);

  useInput((input, key) => {
    if (key.escape) {
      if (isSlashActive) {
        setInputText("");
        return;
      }
      onClose();
      return;
    }

    if (isThinking) {
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
      if (
        lowerTrimmed === "close logbook" ||
        lowerTrimmed === "close-logbook" ||
        lowerTrimmed === "hide logbook"
      ) {
        setShowLogbookSidebar(false);
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
            content: "Closed Contributor Audit Ledger logbook sidebar.",
          },
        ]);
        setInputText("");
        return;
      }

      if (
        lowerTrimmed === "logbook --view" ||
        lowerTrimmed === "logbook -v" ||
        lowerTrimmed === "logbook view" ||
        lowerTrimmed === "view logbook" ||
        lowerTrimmed === "view --logbook" ||
        lowerTrimmed === "open logbook" ||
        lowerTrimmed === "show logbook"
      ) {
        setShowLogbookSidebar(true);
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
            content: "Opened Contributor Audit Ledger logbook sidebar on the right. Type 'close logbook' to hide.",
          },
        ]);
        setInputText("");
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
        "  /help     — Display this interactive help directory",
        "  /plan     — View program enrollment, tuition plan & evaluation quota",
        "  /logbook  — Toggle right-hand Contributor Audit Ledger logbook sidebar",
        "  /about    — System telemetry, architecture & pair mentor profile",
        "  /status   — Check engine connection, git context & active cohort",
        "  /clear    — Wipe terminal conversation history",
        "  /exit     — Return to the primary Zigex workstation shell",
        "",
        "💡 Tip: You can ask anything naturally without slashes, e.g.:",
        "   'explain this error', 'how do I structure day 3 task?', 'review my commit'",
      ].join("\n");
    } else if (rawCmd === "/plan" || rawCmd === "plan" || rawCmd === "my-plan") {
      setStatusText("Fetching program plan & tuition status...");
      reply = await formatPlanOverview();
    } else if (rawCmd === "/logbook") {
      setShowLogbookSidebar((prev) => !prev);
      reply = !showLogbookSidebar
        ? "Opened Contributor Audit Ledger logbook sidebar on the right. Type 'close logbook' to hide."
        : "Closed Contributor Audit Ledger logbook sidebar.";
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
        `  Git Branch:    ${workspaceContext?.gitBranch || "local"}`,
        `  Recent Commits: ${workspaceContext?.recentCommits.length ? workspaceContext.recentCommits[0] : "none"}`,
        `  Exercise File: ${workspaceContext?.exerciseFile ? workspaceContext.exerciseFile.path : "None detected in workspace"}`,
      ].join("\n");
    } else if (rawCmd === "/clear") {
      setMessages([]);
      setInputText("");
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

  const { stdout } = useStdout();
  const termCols = stdout?.columns || process.stdout.columns || 120;
  const termRows = stdout?.rows || process.stdout.rows || 36;
  const splitLeftWidth = Math.floor(termCols * 0.52);
  const splitRightWidth = termCols - splitLeftWidth - 2;
  const fullHeight = Math.max(20, termRows - 3);
  const activeLineWidth = Math.max(24, (showLogbookSidebar ? splitLeftWidth : termCols) - 4);

  const modelBadge = config?.model || "gemini-2.5-flash";

  const mainContent = (
    <Box
      flexDirection="column"
      height={showLogbookSidebar ? fullHeight : undefined}
      justifyContent={showLogbookSidebar ? "space-between" : undefined}
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

        {/* Messages Stream */}
        <Box flexDirection="column" paddingY={0}>
          {messages.slice(showLogbookSidebar ? -5 : -8).map((m) => {
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
            <Text color={theme.colors.retroAmberBright}>
              ⏳ Lil-Zila is thinking and analyzing code...
            </Text>
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
                <Box width={12}>
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
          type /help for commands · /logbook toggle ledger · esc exit
        </Text>
        <Text color={statusText === "Error" ? theme.colors.error : theme.colors.retroGreenBright}>
          {statusText === "Ready" ? "● Ready" : statusText}
        </Text>
      </Box>
    </Box>
  </Box>
  );

  if (showLogbookSidebar) {
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
        <LogbookSidebar width={splitRightWidth} height={fullHeight} />
      </Box>
    );
  }

  return mainContent;
};
