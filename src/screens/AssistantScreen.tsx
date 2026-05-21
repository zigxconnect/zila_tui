import React, { useState, useEffect, useCallback, useRef } from "react";
import { Box, Text, useInput, Static } from "ink";
import { theme } from "../ui/theme.js";
import { Spinner } from "../ui/Spinner.js";
import { loadWorkspace } from "../utils/workspace.js";
import { isGitRepo, getRepoName, getRepoStats } from "../assistant/gatherer.js";
import { initClient } from "../assistant/config.js";
import { runAgent, type AgentEvent } from "../assistant/agent.js";

// Types 

type Phase = "booting" | "ready" | "thinking" | "error";

interface Turn {
  id: string;
  question: string;
  events: AgentEvent[];
  complete: boolean;
  stepSummary: string;
  elapsedS: string;
}

interface RepoMeta {
  name: string;
  path: string;
  branch: string;
  commitCount: string;
  lastCommit: string;
}

let _uid = 0;
const uid = () => `t${++_uid}`;

function buildStepSummary(events: AgentEvent[]): string {
  const steps = events.filter((e) => e.type === "step").length;
  const tools = [...new Set(
    events.filter((e) => e.type === "action").map((e) => (e as { type: "action"; tool: string }).tool),
  )];
  return `${steps} step${steps !== 1 ? "s" : ""} · ${tools.join(", ") || "no tools"}`;
}

// Primitives

const Rule: React.FC<{ dim?: boolean }> = ({ dim }) => (
  <Text color={dim ? theme.colors.border : theme.colors.borderActive}>{"".repeat(64)}</Text>
);

// Fixed: render " " not "" when cursor is off — prevents blink-induced layout shift
const Cursor: React.FC<{ on: boolean }> = ({ on }) => (
  <Text color={theme.colors.primary}>{on ? "▊" : " "}</Text>
);

// Header

const Header: React.FC<{ repo: RepoMeta | null; phase: Phase; turnCount: number }> = ({
  repo, phase, turnCount,
}) => (
  <Box flexDirection="column" marginBottom={1}>
    <Box flexDirection="row" justifyContent="space-between">
      <Box flexDirection="row" gap={1}>
        <Text color={theme.colors.primary} bold>ZILA</Text>
        <Text color={theme.colors.dim}>›</Text>
        <Text color={theme.colors.muted}>assistant</Text>
        {repo && (
          <>
            <Text color={theme.colors.border}> │ </Text>
            <Text color={theme.colors.secondary} bold>{repo.name}</Text>
            <Text color={theme.colors.dim}> on </Text>
            <Text color={theme.colors.accent}>{repo.branch}</Text>
          </>
        )}
      </Box>
      <Box flexDirection="row" gap={1}>
        {phase === "thinking" && <><Spinner color={theme.colors.accent} /><Text color={theme.colors.accent}>thinking</Text></>}
        {phase === "ready" && turnCount === 0 && <Text color={theme.colors.successDim}>ready</Text>}
        {phase === "ready" && turnCount > 0 && <Text color={theme.colors.dim}>{turnCount} answered</Text>}
        {phase === "booting" && <><Spinner color={theme.colors.dim} /><Text color={theme.colors.dim}>starting</Text></>}
      </Box>
    </Box>
    {repo && (
      <Text color={theme.colors.dim}>
        {"      "}{repo.commitCount} commits · last {repo.lastCommit} · {repo.path}
      </Text>
    )}
    <Box marginTop={1}><Rule dim /></Box>
  </Box>
);

// Completed turn (Static — rendered once, never redrawn)

const CompletedTurn: React.FC<{ turn: Turn }> = ({ turn }) => {
  const answerEvent = [...turn.events].reverse().find((e) => e.type === "answer");
  const errorEvent  = [...turn.events].reverse().find((e) => e.type === "error");
  const toolsUsed   = [...new Set(
    turn.events.filter((e) => e.type === "action").map((e) => (e as { type: "action"; tool: string }).tool),
  )];

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box flexDirection="row" gap={1}>
        <Text color={theme.colors.secondary} bold>›</Text>
        <Text color={theme.colors.white} bold wrap="wrap">{turn.question}</Text>
      </Box>
      <Box flexDirection="row" gap={1} marginLeft={2} marginTop={0} marginBottom={1}>
        <Text color={theme.colors.dim}>{turn.elapsedS}s</Text>
        {toolsUsed.length > 0 && (
          <><Text color={theme.colors.border}>·</Text><Text color={theme.colors.dim}>checked {toolsUsed.join(", ")}</Text></>
        )}
      </Box>

      {answerEvent?.type === "answer" && (
        <Box flexDirection="column" borderStyle="round" borderColor={theme.colors.primary} paddingX={2} paddingY={1}>
          <Text color={theme.colors.white} wrap="wrap">{answerEvent.text}</Text>
        </Box>
      )}
      {!answerEvent && errorEvent?.type === "error" && (
        <Box flexDirection="column" borderStyle="round" borderColor={theme.colors.error} paddingX={2} paddingY={1}>
          <Box flexDirection="row" gap={1} marginBottom={1}>
            <Text color={theme.colors.error} bold>{theme.symbols.cross} Error</Text>
          </Box>
          <Text color={theme.colors.text} wrap="wrap">{errorEvent.text}</Text>
        </Box>
      )}
      {!answerEvent && !errorEvent && (
        <Box paddingX={2}>
          <Text color={theme.colors.warning}>{theme.symbols.warning} No answer was produced. Try rephrasing.</Text>
        </Box>
      )}

      <Box marginTop={1}><Rule dim /></Box>
    </Box>
  );
};

// Live feed

const LiveFeed: React.FC<{ question: string; events: AgentEvent[] }> = ({ question, events }) => {
  const visible = events.slice(-5);
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box flexDirection="row" gap={1} marginBottom={1}>
        <Text color={theme.colors.secondary} bold>›</Text>
        <Text color={theme.colors.white} bold wrap="wrap">{question}</Text>
      </Box>
      <Box flexDirection="column" marginLeft={2}>
        {visible.map((ev, i) => {
          if (ev.type === "step") {
            const dots = Array.from({ length: ev.max }, (_, j) => j < ev.iteration ? "●" : "○").join(" ");
            return <Box key={i} flexDirection="row" gap={2} marginBottom={1}><Text color={theme.colors.dim}>{dots}</Text><Text color={theme.colors.dim}>step {ev.iteration} of {ev.max}</Text></Box>;
          }
          if (ev.type === "thought")
            return <Box key={i} flexDirection="row" gap={1}><Text color={theme.colors.accent}>◈</Text><Text color={theme.colors.muted} wrap="wrap">{ev.text.slice(0, 110)}{ev.text.length > 110 ? "…" : ""}</Text></Box>;
          if (ev.type === "action") {
            const argsStr = Object.entries(ev.args).map(([k, v]) => `${k}=${String(v).slice(0, 30)}`).join(" ");
            return <Box key={i} flexDirection="row" gap={1} marginLeft={2}><Text color={theme.colors.dim}>↳</Text><Text color={theme.colors.info}>{ev.tool}</Text>{argsStr && <Text color={theme.colors.dim}>{argsStr}</Text>}</Box>;
          }
          if (ev.type === "observation")
            return <Box key={i} flexDirection="row" gap={1} marginLeft={2}><Text color={theme.colors.successDim}>✦</Text><Text color={theme.colors.dim}>{ev.full.split("\n").length} lines from {ev.tool}</Text></Box>;
          if (ev.type === "warn")
            return <Box key={i} flexDirection="row" gap={1}><Text color={theme.colors.warning}>{theme.symbols.warning}</Text><Text color={theme.colors.warning} wrap="wrap">{ev.text.slice(0, 90)}</Text></Box>;
          if (ev.type === "error")
            return <Box key={i} flexDirection="row" gap={1}><Text color={theme.colors.error}>{theme.symbols.cross}</Text><Text color={theme.colors.error} wrap="wrap">{ev.text.slice(0, 110)}</Text></Box>;
          return null;
        })}
        <Box flexDirection="row" gap={1} marginTop={1}>
          <Spinner color={theme.colors.accent} />
          <Text color={theme.colors.dim}>reasoning…</Text>
        </Box>
      </Box>
    </Box>
  );
};

// Empty state

const EmptyState: React.FC = () => (
  <Box flexDirection="column" gap={1} paddingY={1} marginBottom={1}>
    <Text color={theme.colors.muted}>Ask anything about this repository:</Text>
    <Box flexDirection="column" marginLeft={2}>
      {[
        "What has been worked on recently?",
        "What does this project do?",
        "Who contributed the most?",
        "What did the last commit change?",
        "Find all uses of the authenticate function",
      ].map((ex) => (
        <Text key={ex} color={theme.colors.dim}><Text color={theme.colors.border}>› </Text>{ex}</Text>
      ))}
    </Box>
  </Box>
);

// Input bar

const InputBar: React.FC<{
  input: string; cursorOn: boolean; phase: Phase; inputError: string;
}> = ({ input, cursorOn, phase, inputError }) => {
  const disabled = phase === "thinking" || phase === "booting";
  return (
    <Box flexDirection="column" marginTop={1}>
      <Rule dim={disabled} />
      {inputError && (
        <Box marginTop={1}>
          <Text color={theme.colors.warning}>{theme.symbols.warning} {inputError}</Text>
        </Box>
      )}
      <Box flexDirection="row" gap={1} marginTop={1}>
        {disabled
          ? <Text color={theme.colors.dim}>…</Text>
          : <Text color={theme.colors.primary} bold>{theme.symbols.pointer}</Text>
        }
        <Text color={disabled ? theme.colors.dim : theme.colors.white}>
          {disabled ? (phase === "thinking" ? "thinking…" : "starting…") : input}
        </Text>
        {!disabled && <Cursor on={cursorOn} />}
      </Box>
      {!disabled && (
        <Box marginTop={1}>
          <Text color={theme.colors.dim}>
            <Text color={theme.colors.border}>back</Text>{" return  ·  "}
            <Text color={theme.colors.border}>clear</Text>{" reset  ·  "}
            <Text color={theme.colors.border}>↵</Text>{" ask"}
          </Text>
        </Box>
      )}
    </Box>
  );
};

// Main screen

interface AssistantScreenProps {
  onComplete: () => void;
  inkInstance?: { unmount: () => void };
  clearHistory?: () => void;
}

export const AssistantScreen: React.FC<AssistantScreenProps> = ({
  onComplete,
  clearHistory,
}) => {
  const [phase,      setPhase]      = useState<Phase>("booting");
  const [errorMsg,   setErrorMsg]   = useState("");
  const [repo,       setRepo]       = useState<RepoMeta | null>(null);
  const [turns,      setTurns]      = useState<Turn[]>([]);
  const [activeTurn, setActiveTurn] = useState<Turn | null>(null);
  const [input,      setInput]      = useState("");
  const [cursorOn,   setCursorOn]   = useState(true);
  const [inputError, setInputError] = useState("");

  const repoPathRef = useRef<string>("");

  //  Boot 
  useEffect(() => {
    async function boot() {
      try {
        const ws = await loadWorkspace();
        if (!ws) { setErrorMsg("No workspace found. Run  zila init  first."); setPhase("error"); return; }
        repoPathRef.current = ws.curriculumPath;

        if (!isGitRepo(ws.curriculumPath)) {
          setErrorMsg(`Not a git repository:\n${ws.curriculumPath}`);
          setPhase("error"); return;
        }
        try {
          initClient(ws.assistantPath);
        } catch (e) {
          setErrorMsg(`AI setup failed: ${e instanceof Error ? e.message : String(e)}`);
          setPhase("error"); return;
        }
        const stats = getRepoStats(ws.curriculumPath);
        setRepo({ name: getRepoName(ws.curriculumPath), path: ws.curriculumPath, ...stats });
        setPhase("ready");
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : String(e));
        setPhase("error");
      }
    }
    boot();
  }, []);

  //  Cursor blink
  useEffect(() => {
    if (phase !== "ready") return;
    const id = setInterval(() => setCursorOn((v) => !v), 530);
    return () => clearInterval(id);
  }, [phase]);

  //  Submit
  // Fixed: clearHistory passed as param, not captured from outer scope
  const submit = useCallback(async (question: string, onClearHistory?: () => void) => {
    const q = question.trim();
    if (!q) return;

    const lower = q.toLowerCase();
    if (lower === "back" || lower === "exit" || lower === "quit") { onComplete(); return; }
    if (lower === "clear") { setTurns([]); onClearHistory?.(); return; }

    const turn: Turn = { id: uid(), question: q, events: [], complete: false, stepSummary: "", elapsedS: "0" };
    setActiveTurn(turn);
    setPhase("thinking");
    setInputError("");

    const startMs = Date.now();

    try {
      for await (const event of runAgent(q, repoPathRef.current)) {
        setActiveTurn((prev) => prev ? { ...prev, events: [...prev.events, event] } : prev);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setActiveTurn((prev) => prev ? { ...prev, events: [...prev.events, { type: "error", text: msg }] } : prev);
    }

    const elapsedS = ((Date.now() - startMs) / 1000).toFixed(1);

    setActiveTurn((prev) => {
      if (!prev) return prev;
      const completed: Turn = { ...prev, complete: true, elapsedS, stepSummary: buildStepSummary(prev.events) };
      setTurns((t) => [...t, completed]);
      return null;
    });

    setPhase("ready");
  }, [onComplete]);

  //  Keyboard
  useInput((char, key) => {
    // Error screen: any key exits
    if (phase === "error") { onComplete(); return; }
    if (phase === "booting" || phase === "thinking") return;

    if (key.return) {
      const q = input.trim();
      setInput("");
      if (!q) { setInputError("Type a question first."); return; }
      setInputError("");
      submit(q, clearHistory);
      return;
    }
    if (key.backspace || key.delete) { setInput((p) => p.slice(0, -1)); setInputError(""); return; }
    if (key.ctrl || key.meta) return;
    if (char) { setInput((p) => p + char); setInputError(""); }
  });

  // Error screen
  if (phase === "error") {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Header repo={null} phase="error" turnCount={0} />
        <Box flexDirection="column" borderStyle="round" borderColor={theme.colors.error} paddingX={2} paddingY={1}>
          <Box flexDirection="row" gap={1} marginBottom={1}>
            <Text color={theme.colors.error} bold>{theme.symbols.cross} Could not start</Text>
          </Box>
          <Text color={theme.colors.text} wrap="wrap">{errorMsg}</Text>
          <Box marginTop={1}>
            <Text color={theme.colors.dim}>Press any key to return…</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  // Normal render
  return (
    <Box flexDirection="column" paddingY={1}>
      <Header repo={repo} phase={phase} turnCount={turns.length} />

      {/*
        Static renders completed turns once and never redraws them.
        This prevents Ink's render cycle from scrolling the terminal to top.
      */}
      <Static items={turns}>
        {(turn) => <CompletedTurn key={turn.id} turn={turn} />}
      </Static>

      {turns.length === 0 && !activeTurn && <EmptyState />}

      {activeTurn && <LiveFeed question={activeTurn.question} events={activeTurn.events} />}

      <InputBar input={input} cursorOn={cursorOn} phase={phase} inputError={inputError} />
    </Box>
  );
};