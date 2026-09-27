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

// ─── Retro Primitives ──────────────────────────────────────────────────────────

// Heavy double-line rule for section separators
const HeavyRule: React.FC<{ dim?: boolean }> = ({ dim }) => (
  <Text color={dim ? theme.colors.retroPanel : theme.colors.retroCyan}>
    {"═".repeat(72)}
  </Text>
);

// Light single-line rule
const ThinRule: React.FC = () => (
  <Text color={theme.colors.retroPanel}>
    {"─".repeat(72)}
  </Text>
);

// Blinking block cursor — renders " " not "" when off to prevent layout shift
const Cursor: React.FC<{ on: boolean }> = ({ on }) => (
  <Text color={theme.colors.retroCyanBright}>{on ? "█" : " "}</Text>
);

// Phase status badge
const PhaseBadge: React.FC<{ phase: Phase; turnCount: number }> = ({ phase, turnCount }) => {
  if (phase === "thinking")
    return (
      <Box flexDirection="row" gap={1}>
        <Spinner style="radar" color={theme.colors.retroAmber} />
        <Text color={theme.colors.retroAmberBright} bold>{"[ PROCESSING ]"}</Text>
      </Box>
    );
  if (phase === "booting")
    return (
      <Box flexDirection="row" gap={1}>
        <Spinner style="classic" color={theme.colors.retroCyan} />
        <Text color={theme.colors.retroCyan}>{"[ BOOTING ]"}</Text>
      </Box>
    );
  if (phase === "ready" && turnCount === 0)
    return <Text color={theme.colors.retroGreenBright} bold>{"[ ONLINE ]"}</Text>;
  if (phase === "ready" && turnCount > 0)
    return <Text color={theme.colors.retroGreen}>{"[ READY ] "}<Text color={theme.colors.retroCyan}>{turnCount}</Text><Text color={theme.colors.retroSlate}>{" sessions"}</Text></Text>;
  return <Text color={theme.colors.error}>{"[ ERROR ]"}</Text>;
};

// ─── Header ────────────────────────────────────────────────────────────────────

const Header: React.FC<{ repo: RepoMeta | null; phase: Phase; turnCount: number }> = ({
  repo, phase, turnCount,
}) => (
  <Box flexDirection="column" marginBottom={1}>
    {/* ═══ TOP BAR ═══ */}
    <HeavyRule />
    <Box flexDirection="row" justifyContent="space-between" paddingX={1}>
      {/* Left: identity */}
      <Box flexDirection="row" gap={1}>
        <Text color={theme.colors.retroCyanBright} bold>{"▓▓"}</Text>
        <Text color={theme.colors.retroAmberBright} bold>{"LIL ZILA"}</Text>
        <Text color={theme.colors.retroCyan}>{"›"}</Text>
        <Text color={theme.colors.retroCyanBright} bold>{"AI ASSISTANT"}</Text>
        {repo && (
          <>
            <Text color={theme.colors.retroPanel}>{"║"}</Text>
            <Text color={theme.colors.retroGreen}>{"REPO:"}</Text>
            <Text color={theme.colors.retroGreenBright} bold>{repo.name.toUpperCase()}</Text>
            <Text color={theme.colors.retroSlate}>{"@"}</Text>
            <Text color={theme.colors.retroAmber}>{repo.branch}</Text>
          </>
        )}
      </Box>
      {/* Right: phase badge */}
      <PhaseBadge phase={phase} turnCount={turnCount} />
    </Box>
    <HeavyRule />

    {/* Repo telemetry sub-bar */}
    {repo && (
      <Box flexDirection="row" gap={3} paddingX={1} marginTop={0}>
        <Text color={theme.colors.retroSlate}>{"COMMITS:"}</Text>
        <Text color={theme.colors.retroCyan}>{repo.commitCount}</Text>
        <Text color={theme.colors.retroPanel}>{"·"}</Text>
        <Text color={theme.colors.retroSlate}>{"LAST:"}</Text>
        <Text color={theme.colors.retroCyan}>{repo.lastCommit}</Text>
        <Text color={theme.colors.retroPanel}>{"·"}</Text>
        <Text color={theme.colors.retroSlate}>{"PATH:"}</Text>
        <Text color={theme.colors.retroSlateDark}>{repo.path}</Text>
      </Box>
    )}
    {repo && <ThinRule />}
  </Box>
);

// ─── Completed Turn ─────────────────────────────────────────────────────────

const CompletedTurn: React.FC<{ turn: Turn }> = ({ turn }) => {
  const answerEvent = [...turn.events].reverse().find((e) => e.type === "answer");
  const errorEvent  = [...turn.events].reverse().find((e) => e.type === "error");
  const toolsUsed   = [...new Set(
    turn.events.filter((e) => e.type === "action").map((e) => (e as { type: "action"; tool: string }).tool),
  )];

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Question row */}
      <Box flexDirection="row" gap={1}>
        <Text color={theme.colors.retroAmberBright} bold>{"[Q]"}</Text>
        <Text color={theme.colors.retroAmber} bold wrap="wrap">{turn.question}</Text>
      </Box>

      {/* Meta row */}
      <Box flexDirection="row" gap={2} marginLeft={4} marginTop={0} marginBottom={1}>
        <Text color={theme.colors.retroSlateDark}>{"TIME:"}</Text>
        <Text color={theme.colors.retroSlate}>{turn.elapsedS}s</Text>
        {toolsUsed.length > 0 && (
          <>
            <Text color={theme.colors.retroPanel}>{"·"}</Text>
            <Text color={theme.colors.retroSlateDark}>{"TOOLS:"}</Text>
            <Text color={theme.colors.retroSlate}>{toolsUsed.join(", ")}</Text>
          </>
        )}
      </Box>

      {/* Answer box */}
      {answerEvent?.type === "answer" && (
        <Box flexDirection="column" marginLeft={0} marginBottom={1}>
          <Box flexDirection="row" gap={1} marginBottom={0}>
            <Text color={theme.colors.retroCyanBright} bold>{"[A]"}</Text>
            <Text color={theme.colors.retroGreen}>{"─────────────────────────────────────────────────────────"}</Text>
          </Box>
          <Box
            flexDirection="column"
            borderStyle="single"
            borderColor={theme.colors.retroCyan}
            paddingX={2}
            paddingY={1}
            marginLeft={0}
          >
            <Text color={theme.colors.white} wrap="wrap">{answerEvent.text}</Text>
          </Box>
        </Box>
      )}

      {/* Error box */}
      {!answerEvent && errorEvent?.type === "error" && (
        <Box flexDirection="column" borderStyle="single" borderColor={theme.colors.error} paddingX={2} paddingY={1}>
          <Box flexDirection="row" gap={1} marginBottom={1}>
            <Text color={theme.colors.error} bold>{"[FAIL]"}</Text>
            <Text color={theme.colors.error} bold>{"AGENT ERROR"}</Text>
          </Box>
          <Text color={theme.colors.text} wrap="wrap">{errorEvent.text}</Text>
        </Box>
      )}

      {/* No answer */}
      {!answerEvent && !errorEvent && (
        <Box paddingX={2}>
          <Text color={theme.colors.retroAmber}>{"[WARN]"}</Text>
          <Text color={theme.colors.warning}>{" No answer was produced. Try rephrasing."}</Text>
        </Box>
      )}

      <Box marginTop={1}><ThinRule /></Box>
    </Box>
  );
};

// ─── Live Feed ───────────────────────────────────────────────────────────────

const LiveFeed: React.FC<{ question: string; events: AgentEvent[] }> = ({ question, events }) => {
  const visible = events.slice(-6);
  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Question */}
      <Box flexDirection="row" gap={1} marginBottom={1}>
        <Text color={theme.colors.retroAmberBright} bold>{"[Q]"}</Text>
        <Text color={theme.colors.retroAmber} bold wrap="wrap">{question}</Text>
      </Box>

      {/* Event stream */}
      <Box flexDirection="column" marginLeft={4}>
        {visible.map((ev, i) => {
          if (ev.type === "step") {
            const filled = "▪".repeat(ev.iteration);
            const empty  = "▫".repeat(Math.max(0, ev.max - ev.iteration));
            return (
              <Box key={i} flexDirection="row" gap={2} marginBottom={0}>
                <Text color={theme.colors.retroCyan}>{filled}</Text>
                <Text color={theme.colors.retroSlateDark}>{empty}</Text>
                <Text color={theme.colors.retroSlate}>{"step "}{ev.iteration}{" / "}{ev.max}</Text>
              </Box>
            );
          }
          if (ev.type === "thought")
            return (
              <Box key={i} flexDirection="row" gap={1}>
                <Text color={theme.colors.retroMagenta}>{"◈"}</Text>
                <Text color={theme.colors.retroSlate} wrap="wrap">
                  {ev.text.slice(0, 110)}{ev.text.length > 110 ? "…" : ""}
                </Text>
              </Box>
            );
          if (ev.type === "action") {
            const argsStr = Object.entries(ev.args).map(([k, v]) => `${k}=${String(v).slice(0, 28)}`).join(" ");
            return (
              <Box key={i} flexDirection="row" gap={1} marginLeft={2}>
                <Text color={theme.colors.retroCyan}>{"↳"}</Text>
                <Text color={theme.colors.retroCyanBright} bold>{ev.tool}</Text>
                {argsStr && <Text color={theme.colors.retroSlateDark}>{argsStr}</Text>}
              </Box>
            );
          }
          if (ev.type === "observation")
            return (
              <Box key={i} flexDirection="row" gap={1} marginLeft={2}>
                <Text color={theme.colors.retroGreen}>{"✦"}</Text>
                <Text color={theme.colors.retroSlate}>{ev.full.split("\n").length}{" lines ← "}{ev.tool}</Text>
              </Box>
            );
          if (ev.type === "warn")
            return (
              <Box key={i} flexDirection="row" gap={1}>
                <Text color={theme.colors.retroAmber}>{"[WARN]"}</Text>
                <Text color={theme.colors.retroAmber} wrap="wrap">{ev.text.slice(0, 90)}</Text>
              </Box>
            );
          if (ev.type === "error")
            return (
              <Box key={i} flexDirection="row" gap={1}>
                <Text color={theme.colors.error}>{"[FAIL]"}</Text>
                <Text color={theme.colors.error} wrap="wrap">{ev.text.slice(0, 110)}</Text>
              </Box>
            );
          return null;
        })}

        {/* Thinking animation */}
        <Box flexDirection="row" gap={1} marginTop={1}>
          <Spinner style="braille" color={theme.colors.retroCyan} />
          <Text color={theme.colors.retroSlate}>{"REASONING"}</Text>
          <Text color={theme.colors.retroSlateDark}>{"· · ·"}</Text>
        </Box>
      </Box>
    </Box>
  );
};

// ─── Empty State ─────────────────────────────────────────────────────────────

const EmptyState: React.FC = () => (
  <Box flexDirection="column" gap={1} paddingY={1} marginBottom={1}>
    {/* Prompt examples panel */}
    <Box flexDirection="row" gap={2}>
      <Text color={theme.colors.retroCyan} bold>{"┌─"}</Text>
      <Text color={theme.colors.retroCyanBright} bold>{"QUERY EXAMPLES"}</Text>
      <Text color={theme.colors.retroCyan} bold>{"──────────────────────────────────────────"}</Text>
    </Box>
    <Box flexDirection="column" marginLeft={4} gap={0}>
      {[
        { q: "What has been worked on recently?",       cat: "GIT  " },
        { q: "What does this project do?",              cat: "REPO " },
        { q: "Who contributed the most?",               cat: "STATS" },
        { q: "What did the last commit change?",        cat: "GIT  " },
        { q: "Find all uses of the authenticate fn",    cat: "CODE " },
        { q: "List all TODO comments in this codebase", cat: "SCAN " },
      ].map(({ q, cat }) => (
        <Box key={q} flexDirection="row" gap={2}>
          <Text color={theme.colors.retroPanel}>{"["}</Text>
          <Text color={theme.colors.retroGreen}>{cat}</Text>
          <Text color={theme.colors.retroPanel}>{"]"}</Text>
          <Text color={theme.colors.retroSlate}>{q}</Text>
        </Box>
      ))}
    </Box>
    <Box flexDirection="row" gap={2} marginTop={1}>
      <Text color={theme.colors.retroCyan} bold>{"└─"}</Text>
      <Text color={theme.colors.retroSlateDark}>{"Type a question and press ENTER to query the AI agent"}</Text>
    </Box>
  </Box>
);

// ─── Input Bar ────────────────────────────────────────────────────────────────

const InputBar: React.FC<{
  input: string; cursorOn: boolean; phase: Phase; inputError: string;
}> = ({ input, cursorOn, phase, inputError }) => {
  const disabled = phase === "thinking" || phase === "booting";
  return (
    <Box flexDirection="column" marginTop={1}>
      <HeavyRule dim={disabled} />

      {inputError && (
        <Box marginTop={0} flexDirection="row" gap={1}>
          <Text color={theme.colors.retroAmber} bold>{"[WARN]"}</Text>
          <Text color={theme.colors.retroAmber}>{inputError}</Text>
        </Box>
      )}

      <Box flexDirection="row" gap={1} marginTop={0}>
        {disabled
          ? <Text color={theme.colors.retroSlateDark}>{"……"}</Text>
          : <Text color={theme.colors.retroCyanBright} bold>{"›"}</Text>
        }
        <Text color={theme.colors.retroCyan} bold>{"QUERY"}</Text>
        <Text color={theme.colors.retroPanel}>{"▸"}</Text>
        <Text color={disabled ? theme.colors.retroSlateDark : theme.colors.white}>
          {disabled ? (phase === "thinking" ? "AGENT PROCESSING — PLEASE WAIT…" : "INITIALIZING…") : input}
        </Text>
        {!disabled && <Cursor on={cursorOn} />}
      </Box>

      {!disabled && (
        <Box flexDirection="row" gap={3} marginTop={0}>
          <Text color={theme.colors.retroSlateDark}>
            <Text color={theme.colors.retroCyan} bold>{"[ENTER]"}</Text>
            <Text color={theme.colors.retroSlate}>{" ask  "}</Text>
            <Text color={theme.colors.retroCyan} bold>{"[BSP]"}</Text>
            <Text color={theme.colors.retroSlate}>{" del  "}</Text>
            <Text color={theme.colors.retroCyan} bold>{"[back]"}</Text>
            <Text color={theme.colors.retroSlate}>{" exit  "}</Text>
            <Text color={theme.colors.retroCyan} bold>{"[clear]"}</Text>
            <Text color={theme.colors.retroSlate}>{" reset"}</Text>
          </Text>
        </Box>
      )}
    </Box>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

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
        <Box flexDirection="column" borderStyle="single" borderColor={theme.colors.error} paddingX={2} paddingY={1}>
          <Box flexDirection="row" gap={1} marginBottom={1}>
            <Text color={theme.colors.error} bold>{"[FATAL]"}</Text>
            <Text color={theme.colors.error} bold>{"COULD NOT START ASSISTANT"}</Text>
          </Box>
          <Text color={theme.colors.text} wrap="wrap">{errorMsg}</Text>
          <Box marginTop={1}>
            <Text color={theme.colors.retroSlateDark}>{"Press any key to return to shell…"}</Text>
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