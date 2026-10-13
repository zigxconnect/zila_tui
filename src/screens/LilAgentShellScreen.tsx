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

      handleSend(trimmed);
    } else if (key.backspace || key.delete) {
      setInputText((prev) => prev.slice(0, -1));
    } else if (input && !key.ctrl && !key.meta) {
      setInputText((prev) => prev + input);
    }
  });

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
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.colors.retroBlue}
      paddingX={2}
      paddingY={1}
      width={100}
      height={30}
    >
      {/* Zigex Header */}
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        borderStyle="single"
        borderColor={theme.colors.retroBlueBright}
        paddingX={2}
        marginBottom={1}
      >
        <Box flexDirection="row" alignItems="center">
          <Text color={theme.colors.retroBlueBright} bold>
            ◈ ZIGEX LIL-AGENT
          </Text>
          <Text color={theme.colors.retroSlateDark}> │ </Text>
          <Text color={theme.colors.retroCyan} bold>
            Autonomous Developer Shell
          </Text>
        </Box>
        <Box flexDirection="row" alignItems="center">
          <Text color={theme.colors.retroGreen} bold>
            ● Connected:{" "}
          </Text>
          <Text color={theme.colors.retroWhite} bold>
            Zigex AI Engine (v2.5)
          </Text>
        </Box>
      </Box>

      {/* Messages Stream */}
      <Box flexDirection="column" flexGrow={1} overflow="hidden" paddingY={0}>
        {messages.slice(-10).map((m) => {
          if (m.role === "system") {
            return (
              <Box key={m.id} marginY={0} paddingX={1} borderStyle="single" borderColor={theme.colors.retroSlateDark}>
                <Text color={theme.colors.retroCyan} italic>
                  ℹ {m.content}
                </Text>
              </Box>
            );
          }
          if (m.role === "user") {
            return (
              <Box key={m.id} marginTop={1} flexDirection="row">
                <Text color={theme.colors.retroBlueBright} bold>
                  ❯ Intern:{" "}
                </Text>
                <Text color={theme.colors.retroWhite}>{m.content}</Text>
              </Box>
            );
          }
          return (
            <Box key={m.id} marginTop={1} flexDirection="column">
              <Text color={theme.colors.retroGreen} bold>
                🤖 Zigex Agent:
              </Text>
              <Text color={theme.colors.retroSlate}>{m.content}</Text>
            </Box>
          );
        })}

        {isThinking && (
          <Box marginTop={1}>
            <Text color={theme.colors.retroAmber} bold>
              ⏳ Zigex Agent is analyzing code and generating response...
            </Text>
          </Box>
        )}
      </Box>

      {/* Input Prompt */}
      <Box
        flexDirection="row"
        alignItems="center"
        borderStyle="round"
        borderColor={theme.colors.retroBlueBright}
        paddingX={1}
        marginTop={1}
      >
        <Text color={theme.colors.retroBlueBright} bold>
          ❯{" "}
        </Text>
        <Text color={theme.colors.retroWhite}>
          {inputText}
        </Text>
        <Text color={theme.colors.retroBlueBright} bold>
          █
        </Text>
      </Box>

      {/* Status Bar */}
      <Box flexDirection="row" justifyContent="space-between" marginTop={0} paddingX={1}>
        <Text color={theme.colors.retroSlateDark} dimColor>
          esc or 'exit' to quit · 'clear' to reset chat · Zigex Developer Productivity Layer
        </Text>
        <Text color={theme.colors.retroSlateDark} dimColor>
          Status: {statusText}
        </Text>
      </Box>
    </Box>
  );
};
