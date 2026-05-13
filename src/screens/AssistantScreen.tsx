import React, { useState, useEffect, useCallback, useRef } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { Spinner } from "../ui/Spinner.js";
import { Divider } from "../ui/Divider.js";
import { loadWorkspace } from "../utils/workspace.js";
import { isGitRepo, getRepoName, getRepoStats } from "../assistant/gatherer.js";
import { initClient } from "../assistant/config.js";
import { runAgent, type AgentEvent } from "../assistant/agent.js";

// Types 

type Phase =
  | "booting"      // loading workspace + validating repo
  | "ready"        // waiting for user input
  | "thinking"     // agent is running
  | "error"        // fatal setup error
  | "done";        // user typed 'back'

interface ConversationEntry {
  id: string;
  question: string;
  events: AgentEvent[];
  complete: boolean;
}

interface RepoMeta {
  name: string;
  path: string;
  branch: string;
  commitCount: string;
  lastCommit: string;
}

let _uid = 0;
const uid = () => `e${++_uid}`;

// ─── Sub-components 

const Header: React.FC<{ repo: RepoMeta | null; phase: Phase }> = ({ repo, phase }) => (
  <Box flexDirection="column" marginBottom={1}>
    <Box flexDirection="row" justifyContent="space-between">
      <Box flexDirection="row" gap={1}>
        <Text color={theme.colors.primary} bold>ZILA</Text>
        <Text color={theme.colors.dim}>assistant</Text>
        {repo && (
          <>
            <Text color={theme.colors.border}>•</Text>
            <Text color={theme.colors.secondary} bold>{repo.name}</Text>
            <Text color={theme.colors.dim}>@</Text>
            <Text color={theme.colors.accent}>{repo.branch}</Text>
          </>
        )}
      </Box>
      <Box flexDirection="row" gap={1}>
        {phase === "thinking" && (
          <>
            <Spinner color={theme.colors.primary} />
            <Text color={theme.colors.dim}>thinking</Text>
          </>
        )}
        {phase === "ready" && (
          <Text color={theme.colors.successDim}>ready</Text>
        )}
      </Box>
    </Box>
    {repo && (
      <Box flexDirection="row" gap={2} marginTop={0}>
        <Text color={theme.colors.dim}>{repo.commitCount} commits</Text>
        <Text color={theme.colors.dim}>last commit {repo.lastCommit}</Text>
        <Text color={theme.colors.dim}>{repo.path}</Text>
      </Box>
    )}
    <Divider width={72} />
  </Box>
);

const ThoughtBlock: React.FC<{ text: string }> = ({ text }) => (
  <Box flexDirection="column" marginBottom={1}>
    <Box flexDirection="row" gap={1}>
      <Text color={theme.colors.accent}>◈</Text>
      <Text color={theme.colors.accent} bold>Thinking</Text>
    </Box>
    <Box marginLeft={2}>
      <Text color={theme.colors.muted} wrap="wrap">{text}</Text>
    </Box>
  </Box>
);

const ActionBlock: React.FC<{ tool: string; args: Record<string, string> }> = ({ tool, args }) => {
  const argsStr = Object.keys(args).length
    ? Object.entries(args).map(([k, v]) => `${k}="${v}"`).join(" ")
    : "";
  return (
    <Box flexDirection="row" gap={1} marginBottom={1} marginLeft={1}>
      <Text color={theme.colors.dim}>↳</Text>
      <Text color={theme.colors.info} bold>{tool}</Text>
      {argsStr && <Text color={theme.colors.dim}>{argsStr}</Text>}
    </Box>
  );
};

const ObservationBlock: React.FC<{ tool: string; preview: string }> = ({ tool, preview }) => (
  <Box flexDirection="column" marginBottom={1} marginLeft={1}>
    <Box flexDirection="row" gap={1}>
      <Text color={theme.colors.successDim}>✦</Text>
      <Text color={theme.colors.successDim}>Observation</Text>
      <Text color={theme.colors.dim}>from {tool}</Text>
    </Box>
    <Box
      marginLeft={2}
      marginTop={0}
      borderStyle="single"
      borderColor={theme.colors.border}
      paddingX={1}
    >
      <Text color={theme.colors.dim} wrap="wrap">{preview}</Text>
    </Box>
  </Box>
);

const AnswerBlock: React.FC<{ text: string }> = ({ text }) => (
  <Box flexDirection="column" marginBottom={1}>
    <Divider label="answer" width={60} />
    <Box
      marginTop={1}
      borderStyle="round"
      borderColor={theme.colors.primary}
      paddingX={2}
      paddingY={1}
    >
      <Text color={theme.colors.white} wrap="wrap">{text}</Text>
    </Box>
  </Box>
);

const WarnBlock: React.FC<{ text: string }> = ({ text }) => (
  <Box flexDirection="row" gap={1} marginBottom={1}>
    <Text color={theme.colors.warning}>{theme.symbols.warning}</Text>
    <Text color={theme.colors.warning} wrap="wrap">{text}</Text>
  </Box>
);

const ErrorBlock: React.FC<{ text: string }> = ({ text }) => (
  <Box
    flexDirection="column"
    borderStyle="round"
    borderColor={theme.colors.error}
    paddingX={2}
    paddingY={1}
    marginBottom={1}
  >
    <Box flexDirection="row" gap={1}>
      <Text color={theme.colors.error} bold>{theme.symbols.cross}</Text>
      <Text color={theme.colors.error} bold>Error</Text>
    </Box>
    <Text color={theme.colors.text} wrap="wrap">{text}</Text>
  </Box>
);

const StepIndicator: React.FC<{ iteration: number; max: number }> = ({ iteration, max }) => {
  const dots = Array.from({ length: max }, (_, i) => i < iteration ? "●" : "○").join(" ");
  return (
    <Box flexDirection="row" gap={2} marginBottom={1}>
      <Divider label={`step ${iteration} of ${max}`} width={40} />
      <Text color={theme.colors.dim}>{dots}</Text>
    </Box>
  );
};

const EventView: React.FC<{ event: AgentEvent }> = ({ event }) => {
  switch (event.type) {
    case "step":
      return <StepIndicator iteration={event.iteration} max={event.max} />;
    case "thought":
      return <ThoughtBlock text={event.text} />;
    case "action":
      return <ActionBlock tool={event.tool} args={event.args} />;
    case "observation":
      return <ObservationBlock tool={event.tool} preview={event.preview} />;
    case "answer":
      return <AnswerBlock text={event.text} />;
    case "warn":
      return <WarnBlock text={event.text} />;
    case "error":
      return <ErrorBlock text={event.text} />;
    case "max_steps":
      return (
        <Box flexDirection="row" gap={1} marginBottom={1}>
          <Text color={theme.colors.warning}>{theme.symbols.warning}</Text>
          <Text color={theme.colors.warning}>
            Reached maximum reasoning steps. Try a more specific question.
          </Text>
        </Box>
      );
    default:
      return null;
  }
};

const ConversationEntry: React.FC<{ entry: ConversationEntry; isLast: boolean }> = ({ entry, isLast }) => (
  <Box flexDirection="column" marginBottom={1}>
    {/* Question */}
    <Box flexDirection="row" gap={1} marginBottom={1}>
      <Text color={theme.colors.secondary} bold>you</Text>
      <Text color={theme.colors.secondary}>{theme.symbols.pointer}</Text>
      <Text color={theme.colors.white} bold wrap="wrap">{entry.question}</Text>
    </Box>
    {/* Events */}
    {entry.events.map((ev, i) => (
      <EventView key={i} event={ev} />
    ))}
    {/* Streaming indicator */}
    {isLast && !entry.complete && (
      <Box flexDirection="row" gap={1} marginLeft={2}>
        <Spinner color={theme.colors.accent} />
        <Text color={theme.colors.dim}>reasoning…</Text>
      </Box>
    )}
    {/* Separator between turns */}
    {entry.complete && <Box marginTop={1}><Divider width={48} /></Box>}
  </Box>
);

const HelpHint: React.FC = () => (
  <Box flexDirection="row" gap={3} marginTop={1}>
    <Text color={theme.colors.dim}>
      <Text color={theme.colors.muted}>back</Text>  return to shell
    </Text>
    <Text color={theme.colors.dim}>
      <Text color={theme.colors.muted}>clear</Text>  clear history
    </Text>
    <Text color={theme.colors.dim}>
      <Text color={theme.colors.muted}>Ctrl+C</Text>  exit
    </Text>
  </Box>
);

const InputBar: React.FC<{
  input: string;
  cursorOn: boolean;
  running: boolean;
  error: string;
}> = ({ input, cursorOn, running, error }) => (
  <Box flexDirection="column" marginTop={1}>
    {error && (
      <Box flexDirection="row" gap={1} marginBottom={1}>
        <Text color={theme.colors.error}>{theme.symbols.cross}</Text>
        <Text color={theme.colors.error}>{error}</Text>
      </Box>
    )}
    <Box flexDirection="row" gap={1}>
      <Text color={running ? theme.colors.dim : theme.colors.primary} bold>
        {running ? "…" : theme.symbols.pointer}
      </Text>
      <Text color={theme.colors.white}>{input}</Text>
      {!running && (
        <Text color={theme.colors.primary}>{cursorOn ? "▊" : " "}</Text>
      )}
    </Box>
    {!running && <HelpHint />}
  </Box>
);

// ─── Main screen 

interface AssistantScreenProps {
  onComplete: () => void;
  inkInstance: { unmount: () => void };
}

export const AssistantScreen: React.FC<AssistantScreenProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<Phase>("booting");
  const [errorMsg, setErrorMsg] = useState("");
  const [repo, setRepo] = useState<RepoMeta | null>(null);
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [input, setInput] = useState("");
  const [cursorOn, setCursorOn] = useState(true);
  const [inputError, setInputError] = useState("");

  const repoPathRef = useRef<string>("");

  // ── Boot: load workspace, validate git repo, init AI client ────────────────
  useEffect(() => {
    async function boot() {
      try {
        const ws = await loadWorkspace();
        if (!ws) {
          setErrorMsg("No workspace found. Run  zila init  first.");
          setPhase("error");
          return;
        }

        const repoPath = ws.curriculumPath;
        repoPathRef.current = repoPath;

        if (!isGitRepo(repoPath)) {
          setErrorMsg(`Not a git repository:\n${repoPath}\n\nRun  zila init  to set up your workspace.`);
          setPhase("error");
          return;
        }

        try {
          initClient(ws.assistantPath);
        } catch (e) {
          setErrorMsg(`AI client setup failed: ${e instanceof Error ? e.message : String(e)}`);
          setPhase("error");
          return;
        }

        const stats = getRepoStats(repoPath);
        setRepo({
          name: getRepoName(repoPath),
          path: repoPath,
          ...stats,
        });

        setPhase("ready");
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : String(e));
        setPhase("error");
      }
    }
    boot();
  }, []);

  useEffect(() => {
    if (phase !== "ready") return;
    const id = setInterval(() => setCursorOn((v) => !v), 530);
    return () => clearInterval(id);
  }, [phase]);

  const submitQuestion = useCallback(async (question: string) => {
    if (!question.trim()) return;

    // Built-in commands
    if (question.trim().toLowerCase() === "back") { onComplete(); return; }
    if (question.trim().toLowerCase() === "clear") { setConversation([]); return; }

    const entry: ConversationEntry = {
      id: uid(),
      question: question.trim(),
      events: [],
      complete: false,
    };

    setConversation((prev) => [...prev, entry]);
    setPhase("thinking");
    setInputError("");

    const entryId = entry.id;

    try {
      for await (const event of runAgent(question.trim(), repoPathRef.current)) {
        setConversation((prev) =>
          prev.map((e) =>
            e.id === entryId ? { ...e, events: [...e.events, event] } : e,
          ),
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setConversation((prev) =>
        prev.map((e) =>
          e.id === entryId
            ? { ...e, events: [...e.events, { type: "error", text: msg }] }
            : e,
        ),
      );
    } finally {
      setConversation((prev) =>
        prev.map((e) =>
          e.id === entryId ? { ...e, complete: true } : e,
        ),
      );
      setPhase("ready");
    }
  }, [onComplete]);

  useInput(
    (char, key) => {
      if (phase === "error") { onComplete(); return; }
      if (phase === "booting" || phase === "thinking") return;

      if (key.return) {
        const q = input.trim();
        setInput("");
        if (!q) { setInputError("Please type a question first."); return; }
        setInputError("");
        submitQuestion(q);
        return;
      }
      if (key.backspace || key.delete) {
        setInput((prev) => prev.slice(0, -1));
        setInputError("");
        return;
      }
      if (key.ctrl || key.meta) return;
      if (char) {
        setInput((prev) => prev + char);
        setInputError("");
      }
    },
    { isActive: phase !== "done" },
  );

  if (phase === "booting") {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Header repo={null} phase="booting" />
        <Box flexDirection="row" gap={1} marginTop={1}>
          <Spinner />
          <Text color={theme.colors.text}>Loading workspace…</Text>
        </Box>
      </Box>
    );
  }

  if (phase === "error") {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Header repo={null} phase="error" />
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.colors.error}
          paddingX={2}
          paddingY={1}
          marginTop={1}
        >
          <Box flexDirection="row" gap={1} marginBottom={1}>
            <Text color={theme.colors.error} bold>{theme.symbols.cross}</Text>
            <Text color={theme.colors.error} bold>Could not start assistant</Text>
          </Box>
          <Text color={theme.colors.text} wrap="wrap">{errorMsg}</Text>
          <Box marginTop={1}>
            <Text color={theme.colors.dim}>Press any key to return to the shell…</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      <Header repo={repo} phase={phase} />

      {/* Empty state */}
      {conversation.length === 0 && phase === "ready" && (
        <Box flexDirection="column" gap={1} marginBottom={2}>
          <Text color={theme.colors.muted}>
            Ask anything about your repository. Examples:
          </Text>
          <Box marginLeft={2} flexDirection="column">
            <Text color={theme.colors.dim}>• What has been worked on recently?</Text>
            <Text color={theme.colors.dim}>• What does this project do?</Text>
            <Text color={theme.colors.dim}>• Who are the main contributors?</Text>
            <Text color={theme.colors.dim}>• What did the last commit change?</Text>
            <Text color={theme.colors.dim}>• Find all uses of the login function</Text>
          </Box>
        </Box>
      )}

      {/* Conversation history */}
      {conversation.map((entry, i) => (
        <ConversationEntry
          key={entry.id}
          entry={entry}
          isLast={i === conversation.length - 1}
        />
      ))}

      {/* Input */}
      <InputBar
        input={input}
        cursorOn={cursorOn}
        running={phase === "thinking"}
        error={inputError}
      />
    </Box>
  );
};