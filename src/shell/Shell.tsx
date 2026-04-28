import React, { useState, useEffect, useCallback } from "react";
import { Box, useInput } from "ink";
import { SplashScreen } from "../screens/SplashScreen.js";
import { ExitScreen } from "../screens/ExitScreen.js";
import { HelpScreen } from "../screens/HelpScreen.js";
import { InitScreen } from "../screens/InitScreen.js";
import { OutputHistory, type OutputLine } from "./OutputHistory.js";
import { InputPrompt } from "./InputPrompt.js";
import {
  findCommand,
  getRegisteredCommands,
  type ShellContext,
} from "../commands/registry.js";
import { registerAllCommands } from "../commands/index.js";
import { levenshtein } from "../utils/string.js";

registerAllCommands();

let _idCounter = 0;
const nextId = () => `line-${++_idCounter}`;

export const Shell: React.FC = () => {
  const [splashDone, setSplashDone] = useState(false);
  const [history, setHistory] = useState<OutputLine[]>([]);
  const [running, setRunning] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [exitMessage, setExitMessage] = useState<string | undefined>();
  const [showHelp, setShowHelp] = useState(false);
  const [showInit, setShowInit] = useState(false);

  const pushLine = useCallback(
    (text: string, type: OutputLine["type"] = "default") => {
      setHistory((prev) => [...prev, { id: nextId(), text, type }]);
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
  };

  async function handleCommand(rawInput: string, echo: boolean) {
    if (!rawInput) return;

    // Echo the typed command into history
    if (echo) {
      pushLine(`zila ${theme_pointer} ${rawInput}`, "dim");
    }

    setRunning(true);

    const [cmdName = "", ...args] = rawInput.trim().split(/\s+/);
    const cmd = findCommand(cmdName);

    if (cmd) {
      if (!cmd.available) {
        pushLine(
          `"${cmdName}" is planned but not yet available in this version.`,
          "warning",
        );
        pushLine(`Check back soon, or type  help  to see what's ready.`, "dim");
      } else {
        try {
          await cmd.handler(args, pushLine, shellContext);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          pushLine(`Error in "${cmdName}": ${msg}`, "error");
        }
      }
    } else {
      // Unknown command — suggest nearest match
      pushLine(`Unknown command: "${cmdName}"`, "error");

      const allNames = getRegisteredCommands().map((c) => c.name);
      let closest = "";
      let minDist = Infinity;
      for (const name of allNames) {
        const d = levenshtein(cmdName, name);
        if (d < minDist) {
          minDist = d;
          closest = name;
        }
      }
      if (minDist <= 2 && closest) {
        pushLine(`Did you mean: ${closest}?`, "warning");
      }
      pushLine(`Type  help  to see all available commands.`, "dim");
    }

    setRunning(false);
  }

  useInput(
    (char, key) => {
      // Ctrl+C — char will be '\x03' (ETX)
      if (key.ctrl && char === "\x03") {
        setIsExiting(true);
      }
    },
    { isActive: splashDone && !isExiting && !showHelp && !showInit },
  );

  // 1. Splash (before anything else)
  if (!splashDone) {
    return (
      <Box flexDirection="column" paddingX={1} paddingY={1}>
        <SplashScreen onComplete={() => setSplashDone(true)} />
      </Box>
    );
  }

  // 2. Exit screen
  if (isExiting) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <ExitScreen message={exitMessage} onExited={() => process.exit(0)} />
      </Box>
    );
  }

  // 3. Normal shell
  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      {/* Past command output */}
      <OutputHistory history={history} />

      {/* Overlay screens (replace the prompt while active) */}
      {showHelp ? (
        <HelpScreen
          onClose={() => setShowHelp(false)}
          onSelect={(name) => {
            setShowHelp(false);
            handleCommand(name, true);
          }}
        />
      ) : showInit ? (
        <InitScreen onComplete={() => setShowInit(false)} />
      ) : (
        <InputPrompt
          running={running}
          onSubmit={(input) => handleCommand(input, true)}
        />
      )}
    </Box>
  );
};

// Local constant to avoid importing theme into Shell (Shell is pure logic)
const theme_pointer = "❯";
