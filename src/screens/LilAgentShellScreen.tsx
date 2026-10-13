import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { loadAgentConfig } from "../utils/aiConfig.js";
import { generateChatResponse, type ChatMessage } from "../utils/aiClient.js";
import { extractWorkspaceContext, type WorkspaceContext } from "../utils/contextExtractor.js";

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

  function handleSlashCommand(commandStr: string) {
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
        "  /about    — System telemetry, architecture & pair mentor profile",
        "  /status   — Check engine connection, git context & active cohort",
        "  /clear    — Wipe terminal conversation history",
        "  /exit     — Return to the primary Zigex workstation shell",
        "",
        "💡 Tip: You can ask anything naturally without slashes, e.g.:",
        "   'explain this error', 'how do I structure day 3 task?', 'review my commit'",
      ].join("\n");
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
      reply = [
        "◈ Lil-Agent Runtime Status:",
        `  AI Engine:     Connected & Ready (v2.5)`,
        `  Active Cohort: ${workspaceContext?.cohortName || "None selected"}`,
        `  Domain:        ${(workspaceContext?.domain || "general").toUpperCase()}`,
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
      const systemPrompt = `You are Lil-Zila, the official Zigex autonomous AI pair programming mentor for intern engineers.
Current Workspace Context:
- Active Cohort: ${workspaceContext?.cohortName || "General Curriculum"}
- Domain: ${workspaceContext?.domain || "Engineering"}
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

  const modelBadge = config?.model || "gemini-2.5-flash";

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Top rule */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(78)}</Text>

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
      <Text color={theme.colors.retroBlue}>{"─".repeat(78)}</Text>

      {/* Messages Stream */}
      <Box flexDirection="column" paddingY={0}>
        {messages.slice(-8).map((m) => {
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
          type /help for commands · /about info · /status context · esc exit
        </Text>
        <Text color={statusText === "Error" ? theme.colors.error : theme.colors.retroGreenBright}>
          {statusText === "Ready" ? "● Ready" : statusText}
        </Text>
      </Box>
    </Box>
  );
};
