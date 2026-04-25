import { type OutputLine } from "../shell/OutputHistory.js";

export type OutputCallback = (text: string, type?: OutputLine["type"]) => void;

export interface ShellContext {
  exit: (customMessage?: string) => void;
  executeCommand: (command: string) => Promise<void>;
  showHelp: () => void;
  startInit: () => void;
}

export type CommandHandler = (
  args: string[],
  output: OutputCallback,
  shell: ShellContext,
) => Promise<void>;

export interface ZilaCommand {
  name: string;
  aliases?: string[];
  description: string;
  usage: string;
  category: "setup" | "search" | "agent" | "info";
  handler: CommandHandler;
  available: boolean;
}

export const commandRegistry: Map<string, ZilaCommand> = new Map();

export function registerCommand(command: ZilaCommand) {
  commandRegistry.set(command.name, command);
  if (command.aliases) {
    command.aliases.forEach((alias) => commandRegistry.set(alias, command));
  }
}

export function getRegisteredCommands(): ZilaCommand[] {
    return Array.from(new Set(commandRegistry.values()));
}

