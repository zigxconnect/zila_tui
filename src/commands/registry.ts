import type { OutputLine } from "../shell/OutputHistory.js";
export type OutputCallback = (text: string, type?: OutputLine["type"]) => void;

export interface ShellContext {
  exit: (customMessage?: string) => void;
  executeCommand: (command: string) => Promise<void>;
  showHelp: () => void;
  startInit: () => void;
  /** Launch the Python assistant (TTY handoff) */
  startAssistant: () => void;
  startAuth: () => void;
  startAbout: () => void;
  startInfo: () => void;
  clearHistory: () => void;
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
  category: "setup" | "search" | "agent" | "info" | "workflow" 
  handler: CommandHandler;
  available: boolean;
}

const _registry: Map<string, ZilaCommand> = new Map();

export function registerCommand(command: ZilaCommand): void {
  _registry.set(command.name, command);
  command.aliases?.forEach((alias) => _registry.set(alias, command));
}

export function findCommand(name: string): ZilaCommand | undefined {
  return _registry.get(name);
}

export function getRegisteredCommands(): ZilaCommand[] {
  return Array.from(new Set(_registry.values()));
}
