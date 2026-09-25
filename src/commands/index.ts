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
import {
  zaskCommand,
  submitReportCommand,
  submitTaskCommand,
  complainCommand,
} from "./zask.js";
import {
  groupCommand,
  cohortsCommand,
  joinCohortCommand,
} from "./group.js";
import {
  tasksCommand,
  taskDetailsCommand,
  submitTaskCommand2,
} from "./tasks.js";
import {
  statsCommand,
  leaderboardCommand,
  achievementsCommand,
} from "./gamification.js";
import {
  docsCommand,
  searchCommand2,
  githubReposCommand,
} from "./docs.js";
import { statsScreenCommand } from "./stats-screen.js";

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
  registerCommand(zaskCommand);
  registerCommand(submitReportCommand);
  registerCommand(submitTaskCommand);
  registerCommand(complainCommand);

  // New commands for enhanced functionality
  registerCommand(groupCommand);
  registerCommand(cohortsCommand);
  registerCommand(joinCohortCommand);
  registerCommand(tasksCommand);
  registerCommand(taskDetailsCommand);
  registerCommand(submitTaskCommand2);
  registerCommand(statsCommand);
  registerCommand(leaderboardCommand);
  registerCommand(achievementsCommand);
  registerCommand(docsCommand);
  registerCommand(searchCommand2);
  registerCommand(githubReposCommand);
  registerCommand(statsScreenCommand);
}