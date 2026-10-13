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

export const LilAgentShellScreen: React.FC<LilAgentShellScreenProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [statusText, setStatusText] = useState("Ready");
  const [workspaceContext, setWorkspaceContext] = useState<WorkspaceContext | null>(null);

  const config = loadAgentConfig();

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
      onClose();
      return;
    }

    if (isThinking) {
      return;
    }

    if (key.return) {
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

      {/* Claude Code Style Input Container */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={theme.colors.retroBlueBright}
        paddingX={2}
        paddingY={0}
        marginTop={1}
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
