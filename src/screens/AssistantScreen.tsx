import React, { useState, useEffect, useCallback, useRef } from "react";
import { Box, Text, useInput } from "ink";
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

// Primitives

const Rule: React.FC<{ label?: string; color?: string }> = ({
  label,
  color = theme.colors.border,
}) => {
  if (!label) return <Text color={color}>{"─".repeat(64)}</Text>;
  const pad = "─".repeat(3);
  return (
    <Box flexDirection="row">
      <Text color={color}>{pad} </Text>
      <Text color={theme.colors.dim}>{label}</Text>
      <Text color={color}> {"─".repeat(Math.max(0, 57 - label.length))}</Text>
    </Box>
  );
};

/** Blinking cursor block */
const Cursor: React.FC<{ on: boolean }> = ({ on }) => (
  <Text color={theme.colors.primary}>{on ? "▊" : ""}</Text>
);

// Header

const Header: React.FC<{ repo: RepoMeta | null; phase: Phase; turnCount: number }> = ({
  repo,
  phase,
  turnCount,
}) => (
  <Box flexDirection="column" marginBottom={1}>
    {/* Top bar */}
    <Box flexDirection="row" justifyContent="space-between">
      {/* Left: branding + repo */}
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
      {/* Right: live status badge */}
      <Box flexDirection="row" gap={1}>
        {phase === "thinking" && (
          <Box flexDirection="row" gap={1}>
            <Spinner color={theme.colors.accent} />
            <Text color={theme.colors.accent}>thinking</Text>
          </Box>
        )}
        {phase === "ready" && turnCount === 0 && (
          <Text color={theme.colors.successDim}>ready</Text>
        )}
        {phase === "ready" && turnCount > 0 && (
          <Text color={theme.colors.dim}>
            {turnCount} {turnCount === 1 ? "question" : "questions"} answered
          </Text>
        )}
        {phase === "booting" && (
          <Box flexDirection="row" gap={1}>
            <Spinner color={theme.colors.dim} />
            <Text color={theme.colors.dim}>starting</Text>
          </Box>
        )}
      </Box>
    </Box>
    {/* Subtitle: repo meta */}
    {repo && (
      <Text color={theme.colors.dim}>
        {"     "}
        {repo.commitCount} commits · last {repo.lastCommit} · {repo.path}
      </Text>
    )}
    <Box marginTop={1}>
      <Rule color={theme.colors.border} />
    </Box>
  </Box>
);

// components

/** Show when no questions have been asked yet */
const EmptyState: React.FC = () => (
  <Box flexDirection="column" gap={1} paddingY={1}>
    <Text color={theme.colors.muted}>Ask anything about this repository. Try:</Text>
    <Box flexDirection="column" marginLeft={2}>
      {[
        "What has been worked on recently?",
        "What does this project do?",
        "Who contributed the most?",
        "What did the last commit change?",
        "Find all uses of the authenticate function",
      ].map((ex) => (
        <Text key={ex} color={theme.colors.dim}>
          <Text color={theme.colors.border}>› </Text>
          {ex}
        </Text>
      ))}
    </Box>
    <Box marginTop={1}>
      <Text color={theme.colors.dim}>
        Type <Text color={theme.colors.muted}>back</Text> to return · <Text color={theme.colors.muted}>clear</Text> to reset
      </Text>
    </Box>
  </Box>
);

const TurnGhost: React.FC<{ turn: Turn }> = ({ turn }) => (
  <Box flexDirection="row" gap={1} marginBottom={0}>
    <Text color={theme.colors.border}>·</Text>
    <Text color={theme.colors.dim}>{turn.question.slice(0, 55)}{turn.question.length > 55 ? "…" : ""}</Text>
    <Text color={theme.colors.border}>  {turn.stepSummary}</Text>
  </Box>
);

/** shown only while thinking */
const LiveFeed: React.FC<{ events: AgentEvent[] }> = ({ events }) => {
  // Only show the last N events to keep it tight
  const visible = events.slice(-6);
  return (
    <Box flexDirection="column" gap={0} paddingLeft={1}>
      {visible.map((ev, i) => {
        if (ev.type === "step") {
          const dots = Array.from({ length: ev.max }, (_, j) =>
            j < ev.iteration ? "●" : "○"
          ).join("");
          return (
            <Box key={i} flexDirection="row" gap={1} marginBottom={1}>
              <Text color={theme.colors.dim}>{dots}</Text>
              <Text color={theme.colors.dim}>step {ev.iteration} of {ev.max}</Text>
            </Box>
          );
        }
        if (ev.type === "thought") {
          return (
            <Box key={i} flexDirection="row" gap={1} marginBottom={0}>
              <Text color={theme.colors.accent}>◈</Text>
              <Text color={theme.colors.muted} wrap="wrap">
                {ev.text.slice(0, 120)}{ev.text.length > 120 ? "…" : ""}
              </Text>
            </Box>
          );
        }
        if (ev.type === "action") {
          const argsStr = Object.entries(ev.args)
            .map(([k, v]) => `${k}=${v}`)
            .join(" ");
          return (
            <Box key={i} flexDirection="row" gap={1} marginLeft={2} marginBottom={0}>
              <Text color={theme.colors.dim}>↳</Text>
              <Text color={theme.colors.info}>{ev.tool}</Text>
              {argsStr && <Text color={theme.colors.dim}>{argsStr.slice(0, 60)}</Text>}
            </Box>
          );
        }
        if (ev.type === "observation") {
          return (
            <Box key={i} flexDirection="row" gap={1} marginLeft={2} marginBottom={0}>
              <Text color={theme.colors.successDim}>✦</Text>
              <Text color={theme.colors.dim}>
                got {ev.full.split("\n").length} lines from {ev.tool}
              </Text>
            </Box>
          );
        }
        if (ev.type === "warn") {
          return (
            <Box key={i} flexDirection="row" gap={1} marginBottom={0}>
              <Text color={theme.colors.warning}>{theme.symbols.warning}</Text>
              <Text color={theme.colors.warning} wrap="wrap">{ev.text.slice(0, 100)}</Text>
            </Box>
          );
        }
        if (ev.type === "error") {
          return (
            <Box key={i} flexDirection="row" gap={1} marginBottom={0}>
              <Text color={theme.colors.error}>{theme.symbols.cross}</Text>
              <Text color={theme.colors.error} wrap="wrap">{ev.text.slice(0, 120)}</Text>
            </Box>
          );
        }
        return null;
      })}
    </Box>
  );
};

/** The answer section */
const AnswerCard: React.FC<{ turn: Turn }> = ({ turn }) => {
  const answerEvent = [...turn.events].reverse().find((e) => e.type === "answer");
  const errorEvent = [...turn.events].reverse().find((e) => e.type === "error");

  // Step summary pill
  const toolsUsed = turn.events
    .filter((e) => e.type === "action")
    .map((e) => (e as { type: "action"; tool: string }).tool);
  const uniqueTools = [...new Set(toolsUsed)];

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Question line */}
      <Box flexDirection="row" gap={1} marginBottom={1}>
        <Text color={theme.colors.secondary} bold>›</Text>
        <Text color={theme.colors.white} bold wrap="wrap">{turn.question}</Text>
      </Box>

      {/* Step summary pill */}
      {uniqueTools.length > 0 && (
        <Box flexDirection="row" gap={1} marginLeft={2} marginBottom={1}>
          <Text color={theme.colors.dim}>checked</Text>
          {uniqueTools.map((t, i) => (
            <React.Fragment key={t}>
              <Text color={theme.colors.border}>{t}</Text>
              {i < uniqueTools.length - 1 && <Text color={theme.colors.dim}>·</Text>}
            </React.Fragment>
          ))}
          <Text color={theme.colors.dim}>in {turn.stepSummary}</Text>
        </Box>
      )}

      {/* Answer or error */}
      {answerEvent && answerEvent.type === "answer" && (
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.colors.primary}
          paddingX={2}
          paddingY={1}
        >
          <Text color={theme.colors.white} wrap="wrap">{answerEvent.text}</Text>
        </Box>
      )}
      {!answerEvent && errorEvent && errorEvent.type === "error" && (
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.colors.error}
          paddingX={2}
          paddingY={1}
        >
          <Box flexDirection="row" gap={1} marginBottom={1}>
            <Text color={theme.colors.error} bold>{theme.symbols.cross}</Text>
            <Text color={theme.colors.error} bold>Failed</Text>
          </Box>
          <Text color={theme.colors.text} wrap="wrap">{errorEvent.text}</Text>
        </Box>
      )}
      {!answerEvent && !errorEvent && (
        <Box paddingX={2}>
          <Text color={theme.colors.warning}>
            {theme.symbols.warning} No answer was produced. Try rephrasing.
          </Text>
        </Box>
      )}
    </Box>
  );
};

// Input bar

const InputBar: React.FC<{
  input: string;
  cursorOn: boolean;
  phase: Phase;
  inputError: string;
}> = ({ input, cursorOn, phase, inputError }) => {
  const isThinking = phase === "thinking";
  const isBooting = phase === "booting";
  const disabled = isThinking || isBooting;

  return (
    <Box flexDirection="column" marginTop={1}>
      <Rule color={disabled ? theme.colors.border : theme.colors.borderActive} />

      {inputError && (
        <Box marginTop={1}>
          <Text color={theme.colors.warning}>
            {theme.symbols.warning} {inputError}
          </Text>
        </Box>
      )}

      <Box flexDirection="row" gap={1} marginTop={1}>
        {disabled ? (
          <Text color={theme.colors.dim}>…</Text>
        ) : (
          <Text color={theme.colors.primary} bold>{theme.symbols.pointer}</Text>
        )}
        <Text color={disabled ? theme.colors.dim : theme.colors.white}>
          {disabled ? (isThinking ? "thinking…" : "starting…") : input}
        </Text>
        {!disabled && <Cursor on={cursorOn} />}
      </Box>

      {!disabled && (
        <Box marginTop={1}>
          <Text color={theme.colors.dim}>
            <Text color={theme.colors.border}>back</Text> return  ·  <Text color={theme.colors.border}>clear</Text> reset  ·  <Text color={theme.colors.border}>↵</Text> ask
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
}

export const AssistantScreen: React.FC<AssistantScreenProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<Phase>("booting");
  const [errorMsg, setErrorMsg] = useState("");
  const [repo, setRepo] = useState<RepoMeta | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [activeTurn, setActiveTurn] = useState<Turn | null>(null);
  const [input, setInput] = useState("");
  const [cursorOn, setCursorOn] = useState(true);
  const [inputError, setInputError] = useState("");

  const repoPathRef = useRef<string>("");

  // Start
  useEffect(() => {
    async function boot() {
      try {
        const ws = await loadWorkspace();
        if (!ws) {
          setErrorMsg("No workspace found. Run  zila init  first.");
          setPhase("error");
          return;
        }
        repoPathRef.current = ws.curriculumPath;

        if (!isGitRepo(ws.curriculumPath)) {
          setErrorMsg(`Not a git repository:\n${ws.curriculumPath}`);
          setPhase("error");
          return;
        }
        try {
          initClient(ws.assistantPath);
        } catch (e) {
          setErrorMsg(`AI setup failed: ${e instanceof Error ? e.message : String(e)}`);
          setPhase("error");
          return;
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

  // Cursor blink
  useEffect(() => {
    if (phase !== "ready") return;
    const id = setInterval(() => setCursorOn((v) => !v), 530);
    return () => clearInterval(id);
  }, [phase]);

  const submit = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q) return;
      if (q.toLowerCase() === "back") { onComplete(); return; }
      if (q.toLowerCase() === "clear") { setTurns([]); return; }

      const turn: Turn = { id: uid(), question: q, events: [], complete: false, stepSummary: "" };
      setActiveTurn(turn);
      setPhase("thinking");
      setInputError("");

      const startMs = Date.now();

      try {
        for await (const event of runAgent(q, repoPathRef.current)) {
          setActiveTurn((prev) =>
            prev ? { ...prev, events: [...prev.events, event] } : prev
          );
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setActiveTurn((prev) =>
          prev ? { ...prev, events: [...prev.events, { type: "error", text: msg }] } : prev
        );
      }

      const elapsedS = ((Date.now() - startMs) / 1000).toFixed(1);

      setActiveTurn((prev) => {
        if (!prev) return prev;
        const steps = prev.events.filter((e) => e.type === "step").length;
        const completed: Turn = {
          ...prev,
          complete: true,
          stepSummary: `${steps}s / ${elapsedS}s`,
        };
        setTurns((t) => [...t, completed]);
        return null;
      });

      setPhase("ready");
    },
    [onComplete]
  );
  useInput(
    (char, key) => {
      if (phase === "error") { onComplete(); return; }
      if (phase === "booting" || phase === "thinking") return;

      if (key.return) {
        const q = input.trim();
        setInput("");
        if (!q) { setInputError("Type a question first."); return; }
        setInputError("");
        submit(q);
        return;
      }
      if (key.backspace || key.delete) {
        setInput((p) => p.slice(0, -1));
        setInputError("");
        return;
      }
      if (key.ctrl || key.meta) return;
      if (char) { setInput((p) => p + char); setInputError(""); }
    },
    { isActive: phase !== "booting" }
  );

  // Error screen
  if (phase === "error") {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Header repo={null} phase="error" turnCount={0} />
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.colors.error}
          paddingX={2}
          paddingY={1}
        >
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
  const ghosts = turns.slice(0, -1);
  // The latest completed turn gets the full answer card
  const lastTurn = turns.length > 0 ? turns[turns.length - 1] : null;

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Header */}
      <Header repo={repo} phase={phase} turnCount={turns.length} />

      {/* Zone 2: Work zone */}
      <Box flexDirection="column" flexGrow={1}>

        {/* Empty state */}
        {turns.length === 0 && !activeTurn && <EmptyState />}

        {/* History: collapsed to one line each */}
        {ghosts.length > 0 && (
          <Box flexDirection="column" marginBottom={1}>
            {ghosts.map((t) => <TurnGhost key={t.id} turn={t} />)}
            <Box marginTop={1} marginBottom={1}>
              <Rule color={theme.colors.border} />
            </Box>
          </Box>
        )}

        {/* Last completed answer — shown in full */}
        {lastTurn && !activeTurn && (
          <AnswerCard turn={lastTurn} />
        )}

        {/* Active turn: live feed while thinking */}
        {activeTurn && (
          <Box flexDirection="column">
            {/* Question */}
            <Box flexDirection="row" gap={1} marginBottom={1}>
              <Text color={theme.colors.secondary} bold>›</Text>
              <Text color={theme.colors.white} bold wrap="wrap">{activeTurn.question}</Text>
            </Box>
            {/* Live events */}
            <LiveFeed events={activeTurn.events} />
          </Box>
        )}
      </Box>

      {/* Zone 3: Input bar (always visible) */}
      <InputBar
        input={input}
        cursorOn={cursorOn}
        phase={phase}
        inputError={inputError}
      />
    </Box>
  );
};