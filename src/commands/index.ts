import { registerCommand } from "./registry.js";
import { exitCommand }      from "./exit.js";
import { helpCommand }      from "./help.js";
import { initCommand }      from "./init/index.js";
import { assistantCommand } from "./assistant.js";
import { authCommand }      from "./auth.js";
import { infoCommand }      from "./info.js";
import { aboutCommand }     from "./about.js";
import { searchCommand }    from "./search.js";
import { evaluateCommand }  from "./evaluate.js";
import { clearCommand }     from "./clear.js";
import { monitorCommand }   from "./monitor/index.js";
import { logbookCommand }   from "./logbook.js";

export function registerAllCommands(): void {
  registerCommand(exitCommand);
  registerCommand(helpCommand);
  registerCommand(initCommand);
  registerCommand(assistantCommand);
  registerCommand(authCommand);
  registerCommand(infoCommand);
  registerCommand(aboutCommand);
  registerCommand(searchCommand);
  registerCommand(evaluateCommand);
  registerCommand(clearCommand);
  registerCommand(monitorCommand);
  registerCommand(logbookCommand);
}