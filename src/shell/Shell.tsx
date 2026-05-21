import React, { useState, useCallback, useEffect } from "react";
import { Box, useInput, Text } from "ink";
import { SplashScreen } from "../screens/SplashScreen.js";
import { ExitScreen } from "../screens/ExitScreen.js";
import { HelpScreen } from "../screens/HelpScreen.js";
import { InitScreen } from "../screens/InitScreen.js";
import { AuthScreen } from "../screens/AuthScreen.js";
import { AssistantScreen } from "../screens/AssistantScreen.js";
import { AboutScreen } from "../screens/AboutScreen.js";
import { InfoScreen } from "../screens/InfoScreen.js";
import { OutputHistory, type OutputLine } from "./OutputHistory.js";
import { InputPrompt } from "./InputPrompt.js";
import {
  findCommand,
  getRegisteredCommands,
  type ShellContext,
} from "../commands/registry.js";
import { registerAllCommands } from "../commands/index.js";
import { levenshtein } from "../utils/string.js";
import { theme } from "../ui/theme.js";
import { loadWorkspace } from "../utils/workspace.js";
import { isMonitorRunning } from "../utils/monitor.js";

registerAllCommands();

let _id = 0;
const nextId = () => `l${++_id}`;

export interface ShellProps {
  inkInstance: { unmount: () => void };
}

export const Shell: React.FC<ShellProps> = ({ inkInstance }) => {
  const [splashDone, setSplashDone] = useState(false);
  const [history, setHistory] = useState<OutputLine[]>([]);
  const [running, setRunning] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [exitMessage, setExitMessage] = useState<string | undefined>();
  const [showHelp, setShowHelp] = useState(false);
  const [showInit, setShowInit] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [monitorActive, setMonitorActive] = useState(false);
  const [hasWs, setHasWs] = useState(false);

  useEffect(() => {
    let active = true;
    async function checkStatus() {
      const ws = await loadWorkspace();
      if (!active) return;
      if (ws) {
        setHasWs(true);
        setMonitorActive(isMonitorRunning(ws.workspacePath));
      } else {
        setHasWs(false);
        setMonitorActive(false);
      }
    }
    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [running]);

  const pushLine = useCallback(
    (text: string, type: OutputLine["type"] = "default") => {
      setHistory((prev) => {
        const updated = [...prev, { id: nextId(), text, type }];
        return updated.length > 500 ? updated.slice(-500) : updated;
      });
    },
    [],
  );

  const shellContext: ShellContext = {
    exit: (msg?: string) => {
      setExitMessage(msg);
      setIsExiting(true);
    },
    executeCommand: async (command: string) => {
      await handleCommand(command, false);
    },
    showHelp: () => setShowHelp(true),
    startInit: () => setShowInit(true),
    startAuth: () => setShowAuth(true),
    startAssistant: () => setShowAssistant(true),
    startAbout: () => setShowAbout(true),
    startInfo: () => setShowInfo(true),
    clearHistory: () => setHistory([]),
  };

  async function handleCommand(rawInput: string, echo: boolean) {
    if (!rawInput) return;
    if (echo) pushLine(`zila❯ ${rawInput}`, "dim");

    setRunning(true);
    const [cmdName = "", ...args] = rawInput.trim().split(/\s+/);
    const cmd = findCommand(cmdName);

    if (cmd) {
      if (!cmd.available) {
        pushLine(`"${cmdName}" is coming soon.`, "warning");
        pushLine("Type  help  to see what's ready.", "dim");
      } else {
        try {
          await cmd.handler(args, pushLine, shellContext);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          pushLine(`Error running "${cmdName}": ${msg}`, "error");
        }
      }
    } else {
      pushLine(`Unknown command: "${cmdName}"`, "error");
      const names = getRegisteredCommands().map((c) => c.name);
      let closest = "";
      let minDist = Infinity;
      for (const name of names) {
        const d = levenshtein(cmdName, name);
        if (d < minDist) {
          minDist = d;
          closest = name;
        }
      }
      if (minDist <= 2 && closest)
        pushLine(`Did you mean: ${closest}?`, "warning");
      pushLine("Type  help  to see all available commands.", "dim");
    }

    setRunning(false);
  }

  useInput(
    (char, key) => {
      if (key.ctrl && char === "\x03") setIsExiting(true);
    },
    {
      isActive:
        splashDone &&
        !isExiting &&
        !showHelp &&
        !showInit &&
        !showAuth &&
        !showAssistant &&
        !showAbout &&
        !showInfo,
    },
  );

  if (!splashDone) {
    return (
      <Box flexDirection="column" paddingX={1} paddingY={1}>
        <SplashScreen onComplete={() => setSplashDone(true)} />
      </Box>
    );
  }

  if (isExiting) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <ExitScreen message={exitMessage} onExited={() => process.exit(0)} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <OutputHistory history={history} />

      {showHelp ? (
        <HelpScreen
          onClose={() => setShowHelp(false)}
          onSelect={(name) => {
            setShowHelp(false);
            handleCommand(name, true);
          }}
          clearHistory={() => setHistory([])}
        />
      ) : showInit ? (
        <InitScreen
          onComplete={() => {
            setShowInit(false);
            pushLine(
              "Workspace ready. Type  monitor start  to begin tracking.",
              "success",
            );
            setShowHelp(true);
          }}
          clearHistory={() => setHistory([])}
        />
      ) : showAuth ? (
        <AuthScreen
          onComplete={(success) => {
            setShowAuth(false);
            if (success) pushLine("Authenticated successfully.", "success");
            else pushLine("Authentication cancelled.", "warning");
          }}
        />
      ) : showAssistant ? (
        <AssistantScreen
          inkInstance={inkInstance}
          onComplete={() => {
            setShowAssistant(false);
            pushLine("Welcome back to ZILA.", "success");
          }}
          clearHistory={() => setHistory([])}
        />
      ) : showAbout ? (
        <AboutScreen
          onComplete={() => {
            setShowAbout(false);
            pushLine("Welcome back to ZILA.", "success");
          }}
          clearHistory={() => setHistory([])}
        />
      ) : showInfo ? (
        <InfoScreen
          onComplete={() => {
            setShowInfo(false);
            pushLine("Welcome back to ZILA.", "success");
          }}
        />
      ) : (
        <Box flexDirection="column" gap={0}>
          {hasWs && (
            <Box marginBottom={1}>
              {monitorActive ? (
                <Text color={theme.colors.success} bold>
                  {theme.symbols.tick} TRACKING ACTIVE · Monitoring workspace
                  changes. Run 'monitor stop' to end session and save data.
                </Text>
              ) : (
                <Text color={theme.colors.warning} bold>
                  {theme.symbols.warning} TRACKING INACTIVE · Run 'monitor
                  start' before you begin coding to track progress.
                </Text>
              )}
            </Box>
          )}
          <InputPrompt
            running={running}
            onSubmit={(input) => handleCommand(input, true)}
          />
        </Box>
      )}
    </Box>
  );
};
