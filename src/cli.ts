import "dotenv/config";
import React from "react";
import { render } from "ink";
import { Shell } from "./shell/Shell.js";
import { registerAllCommands } from "./commands/index.js";
import { findCommand } from "./commands/registry.js";

const cliArgs = process.argv.slice(2);

if (cliArgs.length > 0) {
  registerAllCommands();
  const cmdName = cliArgs[0]!;
  const cmd = findCommand(cmdName);
  if (cmd) {
    const output = (text: string) => console.log(text);
    const mockContext = {
      startSubmitTask: () => {},
      startSubmitReport: () => {},
      startGroup: () => {},
      startCohorts: () => {},
      startTasks: () => {},
      startHelp: () => {},
      startDocs: () => {},
      startStats: () => {},
      startAchievements: () => {},
      startLeaderboard: () => {},
      startAbout: () => {},
      startInfo: () => {},
      startChatGroup: () => {},
      startPeers: () => {},
      startCohortPicker: () => {},
    };
    void cmd.handler(cliArgs.slice(1), output, mockContext as any);
  } else {
    process.stderr.write(`Unknown command: ${cmdName}\n`);
    process.exit(1);
  }
} else {
  const inkInstance = render(
    React.createElement(Shell, { inkInstance: { unmount: () => inkInstance.unmount() } }),
  );

  process.on("uncaughtException", (err) => {
    inkInstance.unmount();
    process.stderr.write(`\nUnhandled error: ${err.message}\n`);
    process.exit(1);
  });
}
