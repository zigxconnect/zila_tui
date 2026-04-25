import React, { useEffect, useState } from "react";
import { Box } from "ink";
import { SplashScreen } from "../screens/SplashScreen.js";
import { OutputHistory, type OutputLine } from "./OutputHistory.js";
import { InputPrompt } from "./InputPrompt.js";
import {
  commandRegistry,
  getRegisteredCommands,
  type ShellContext,
} from "../commands/registry.js";
import { levenshtein } from "../utils/string.js";

import { registerCommand } from "../commands/registry.js";
import { exitCommand as exitCmd } from "../commands/exit.js";
import { ExitScreen } from "../screens/ExitScreen.js";
import { registerAllCommands } from "../commands/index.js";
import { HelpScreen } from "../screens/HelpScreen.js";
import { InitScreen } from "../screens/InitScreen.js";
// Pre register the exit command
registerCommand(exitCmd);

export const Shell: React.FC = () => {
  const [history, setHistory] = useState<OutputLine[]>([]);
  const [exitMessage, setExitMessage] = useState<string | undefined>();
  const [isExiting, setIsExiting] = useState(false);
  const [running, setRunning] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [isShowingHelp, setIsShowingHelp] = useState(false);
  const [isShowingInit, setIsShowingInit] = useState(false);

  // Register All commands when shell boots
  useEffect(() => {
    registerAllCommands();
  }, []);
  
  const pushHistory = (text: string, type: OutputLine["type"] = "default") => {
    setHistory((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2, 11),
        text,
        ...(type !== undefined ? { type } : {}),
      },
    ]);
  };

  const shellContext: ShellContext = {
    exit: (msg?: string) => {
      setExitMessage(msg);
      setIsExiting(true);
    },
    executeCommand: async (command: string) => {
      await handleCommand(command);
    },
    showHelp: () => setIsShowingHelp(true),
    startInit: () => setIsShowingInit(true),
  };

  const handleCommand = async (input: string, echo = true) => {
    if (!input) return;
    if (echo) pushHistory(`zila> ${input}`, "dim");

    setRunning(true);

    const [cmdName, ...args] = input.split(" ");
    const command = commandRegistry.get(cmdName!);

    if (command) {
      if (!command.available) {
        pushHistory(
          `Command "${cmdName}" is not available in this version of ZILA.`,
          "warning",
        );
      } else {
        try {
          await command.handler(args, pushHistory, shellContext);
        } catch (error) {
          pushHistory(
            `Error occurred while executing command "${cmdName}": ${error}`,
            "error",
          );
        }
      }
    } else {
      pushHistory(`Unknown Command "${cmdName}"`, "error");
      const commands = getRegisteredCommands().map((c) => c.name);

      let closestMatch = "";
      let lowestDistance = Infinity;

      for (const name of commands) {
        const dist = levenshtein(cmdName!, name);
        if (dist < lowestDistance) {
          lowestDistance = dist;
          closestMatch = name;
        }
      }
      if (lowestDistance <= 2 && closestMatch) {
        pushHistory(`Did you mean "${closestMatch}"?`, "warning");
      }
      pushHistory(`Type "help" to see a list of available commands.`, "dim");
    }
    setRunning(false);
  };

  if (isExiting) {
    return <ExitScreen onExited={() => process.exit(0)} />;
  }

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      {!splashDone && <SplashScreen onComplete={() => setSplashDone(true)} />}
      {splashDone && (
  <>
    <OutputHistory history={history} />
    
    {isShowingHelp ? (
      <HelpScreen onClose={() => setIsShowingHelp(false)} onSelect={(cmd) => { setIsShowingHelp(false); handleCommand(cmd, true); }} />
    ) : isShowingInit ? (
      <InitScreen onComplete={() => setIsShowingInit(false)} /> // <-- Render InitScreen
    ) : (
      <InputPrompt running={running} onSubmit={(input) => handleCommand(input, true)} />
    )}
  </>
)}
    </Box>
  );
};
