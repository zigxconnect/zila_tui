import React, { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { SplashScreen } from "../screens/SplashScreen.js";
import { ExitScreen } from "../screens/ExitScreen.js";
import { HelpScreen } from "../screens/HelpScreen.js";
import { InitScreen } from "../screens/InitScreen.js";
import { AuthScreen } from "../screens/AuthScreen.js";
import { AssistantScreen } from "../screens/AssistantScreen.js";
import { AboutScreen } from "../screens/AboutScreen.js";
import { InfoScreen } from "../screens/InfoScreen.js";
import { SubmitReportScreen } from "../screens/SubmitReportScreen.js";
import { SubmitTaskScreen } from "../screens/SubmitTaskScreen.js";
import { StatsScreen } from "../screens/StatsScreen.js";
import { LeaderboardScreen } from "../screens/LeaderboardScreen.js";
import { CohortPickerScreen, type CohortPickerMode } from "../screens/CohortPickerScreen.js";
import { AchievementsScreen } from "../screens/AchievementsScreen.js";
import { LilZilaBanner } from "../ui/LilZilaBanner.js";
import { RetroStatusBar } from "../ui/RetroStatusBar.js";
import { RetroKeyboardLegend } from "../ui/RetroKeyboardLegend.js";
import { OutputHistory, type OutputLine } from "./OutputHistory.js";
import { InputPrompt } from "./InputPrompt.js";
import {
  findCommand,
  getRegisteredCommands,
  type ShellContext,
} from "../commands/registry.js";
import { registerAllCommands } from "../commands/index.js";
import { levenshtein } from "../utils/string.js";
import {
  getActiveCohort,
  setActiveCohort,
  type ActiveCohort,
} from "../utils/activeCohort.js";

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
  const [showSubmitReport, setShowSubmitReport] = useState(false);
  const [showSubmitTask, setShowSubmitTask] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [cohortPickerMode, setCohortPickerMode] = useState<CohortPickerMode | null>(null);
  const [activeCohort, setActiveCohortState] = useState<ActiveCohort | null>(() => getActiveCohort());

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
    exit: (msg?) => {
      setExitMessage(msg);
      setIsExiting(true);
    },
    executeCommand: async (cmd) => {
      await handleCommand(cmd, false);
    },
    showHelp: () => setShowHelp(true),
    startInit: () => setShowInit(true),
    startAuth: () => setShowAuth(true),
    startAssistant: () => setShowAssistant(true),
    startAbout: () => setShowAbout(true),
    startInfo: () => setShowInfo(true),
    startSubmitReport: () => setShowSubmitReport(true),
    startSubmitTask: () => setShowSubmitTask(true),
    startStats: () => setShowStats(true),
    startAchievements: () => setShowAchievements(true),
    startLeaderboard: () => setShowLeaderboard(true),
    startCohortPicker: (mode) => setCohortPickerMode(mode),
    clearHistory: () => setHistory([]),
  };

  async function handleCommand(rawInput: string, echo: boolean) {
    if (!rawInput) return;
    const currentCohort = getActiveCohort();
    const promptPrefix = currentCohort ? `lil-zila/${currentCohort.slug}` : "lil-zila";
    if (echo) pushLine(`${promptPrefix} > ${rawInput}`, "dim");

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
          pushLine(
            `Error running "${cmdName}": ${err instanceof Error ? err.message : String(err)}`,
            "error",
          );
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
    setActiveCohortState(getActiveCohort());
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
        !showInfo &&
        !showSubmitReport &&
        !showSubmitTask &&
        !showStats &&
        !showAchievements &&
        !showLeaderboard &&
        !cohortPickerMode,
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
      <RetroStatusBar
        version="v0.3.0"
        currentScreen={running ? "BUSY" : "READY"}
        network="online"
      />
      <Box marginTop={1} flexDirection="column">
        <OutputHistory history={history} />
      </Box>

      {showHelp ? (
        <HelpScreen
          onClose={() => setShowHelp(false)}
          onSelect={(name) => {
            setShowHelp(false);
            handleCommand(name, true);
          }}
          clearHistory={() => setHistory([])}
        />
      ) : showSubmitReport ? (
        <SubmitReportScreen onComplete={() => setShowSubmitReport(false)} />
      ) : showSubmitTask ? (
        <SubmitTaskScreen onComplete={() => setShowSubmitTask(false)} />
      ) : showInit ? (
        <InitScreen
          onComplete={() => setShowInit(false)}
          // After init succeeds, open help so the user sees all commands
          onShowHelp={() => {
            setShowInit(false);
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
            pushLine("Welcome back to lil-zila.", "success");
          }}
        />
      ) : showStats ? (
        <StatsScreen
          onClose={() => {
            setShowStats(false);
            pushLine("Welcome back to lil-zila.", "success");
          }}
        />
      ) : showAchievements ? (
        <AchievementsScreen
          onClose={() => {
            setShowAchievements(false);
            pushLine("Welcome back to lil-zila.", "success");
          }}
        />
      ) : cohortPickerMode ? (
        <CohortPickerScreen
          mode={cohortPickerMode}
          onClose={() => setCohortPickerMode(null)}
          onSelect={(cohort) => {
            const mode = cohortPickerMode;
            setCohortPickerMode(null);
            if (mode === "select") {
              const activated = setActiveCohort({
                id: cohort.id,
                name: cohort.name,
                department: cohort.department,
                level: cohort.level,
                supervisorName: cohort.supervisorName,
                supervisorEmail: cohort.supervisorEmail,
                githubRepoUrl: cohort.githubRepoUrl,
              });
              setActiveCohortState(activated);
              pushLine(`Entered cohort context: ${activated.name}`, "success");
              pushLine(`Prompt updated: lil-zila/${activated.slug} ›`, "default");
              pushLine(`Domain: [${activated.domainKey.toUpperCase()}], Level: [${activated.level.toUpperCase()}]`, "dim");
              pushLine(`All tasks and PR submissions will automatically use this cohort.`, "dim");
            } else {
              pushLine(`Selected cohort: ${cohort.name}`, "success");
              void handleCommand(
                mode === "group"
                  ? `group --cohort ${cohort.id}`
                  : `leaderboard --text ${cohort.id}`,
                false,
              );
            }
          }}
        />
      ) : showLeaderboard ? (
        <LeaderboardScreen
          onClose={() => {
            setShowLeaderboard(false);
            pushLine("Welcome back to lil-zila.", "success");
          }}
        />
      ) : (
        <>
          {history.length === 0 && <LilZilaBanner />}
          <InputPrompt
            running={running}
            cohortSlug={activeCohort?.slug}
            onSubmit={(input) => handleCommand(input, true)}
          />
          <Box marginTop={0} flexDirection="row" gap={2}>
            <Text color={theme.colors.retroSlateDark}>{"help · select · group · tasks · docs · stats · exit"}</Text>
          </Box>
        </>
      )}
    </Box>
  );
};
