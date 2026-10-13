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

    const welcomeMsg = config
      ? `Welcome to lil-agent! Connected to ${config.provider.toUpperCase()} (${config.model}).\nAsk questions about your code, debugging, or task instructions.`
      : "No AI provider configured yet. Type 'exit' and run 'agent --setup' to connect Gemini, Groq, Claude or OpenAI.";

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
      const systemPrompt = `You are Lil-Zila, an expert autonomous AI pair programmer mentoring a student engineer.
Current Workspace Context:
- Active Cohort: ${workspaceContext?.cohortName || "General Curriculum"}
- Domain: ${workspaceContext?.domain || "Engineering"}
- Git Branch: ${workspaceContext?.gitBranch || "local"}
- Recent Commits: ${workspaceContext?.recentCommits.join(", ") || "none"}
${workspaceContext?.exerciseFile ? `- Active Exercise File (${workspaceContext.exerciseFile.path}):\n${workspaceContext.exerciseFile.content}` : ""}

Behavior Guidelines:
1. Act as a Socratic mentor: explain principles, identify bugs, and provide hints.
2. Be concise, direct and encouraging.
3. Keep terminal output clean and formatted.`;

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

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.colors.retroBlueBright}
      paddingX={1}
      paddingY={1}
      width={80}
      height={24}
    >
      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between" borderStyle="single" borderColor={theme.colors.retroSlateDark} paddingX={1}>
        <Text color={theme.colors.retroBlueBright} bold>
          lil-agent · Claude Code-Style Interactive Shell
        </Text>
        <Text color={theme.colors.retroSlateLight}>
          {config ? `[${config.provider.toUpperCase()}]` : "[UNCONFIGURED]"}
        </Text>
      </Box>

      {/* Messages Stream */}
      <Box flexDirection="column" flexGrow={1} overflow="hidden" paddingY={1}>
        {messages.slice(-8).map((m) => {
          if (m.role === "system") {
            return (
              <Box key={m.id} marginY={0}>
                <Text color={theme.colors.retroSlateDark} italic>
                  {m.content}
                </Text>
              </Box>
            );
          }
          if (m.role === "user") {
            return (
              <Box key={m.id} marginTop={1}>
                <Text color={theme.colors.retroBlueBright} bold>
                  ❯ You:{" "}
                </Text>
                <Text color={theme.colors.retroWhite}>{m.content}</Text>
              </Box>
            );
          }
          return (
            <Box key={m.id} marginTop={1} flexDirection="column">
              <Text color={theme.colors.retroGreen} bold>
                🤖 Lil-Agent:
              </Text>
              <Text color={theme.colors.retroSlateLight}>{m.content}</Text>
            </Box>
          );
        })}

        {isThinking && (
          <Box marginTop={1}>
            <Text color={theme.colors.retroYellow} bold>
              ⏳ Lil-Agent is thinking...
            </Text>
          </Box>
        )}
      </Box>

      {/* Input Prompt */}
      <Box flexDirection="row" alignItems="center" borderStyle="single" borderColor={theme.colors.retroSlateDark} paddingX={1}>
        <Text color={theme.colors.retroBlueBright} bold>
          ❯{" "}
        </Text>
        <Text color={theme.colors.retroWhite}>
          {inputText}
        </Text>
        <Text color={theme.colors.retroBlueBright} bold>
          _
        </Text>
      </Box>

      {/* Status Bar */}
      <Box flexDirection="row" justifyContent="space-between" marginTop={0}>
        <Text color={theme.colors.retroSlateDark} dimColor>
          esc / 'exit' to quit · 'clear' to reset chat
        </Text>
        <Text color={theme.colors.retroSlateDark} dimColor>
          Status: {statusText}
        </Text>
      </Box>
    </Box>
  );
};
