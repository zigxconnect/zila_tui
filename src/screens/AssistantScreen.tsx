// Shown briefly when the assistant is launching and TTY handoff is in progress
import fs from "node:fs";
import path from "node:path";
import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { Spinner } from "../ui/Spinner.js";
import { Banner } from "../ui/Banner.js";
import { Divider } from "../ui/Divider.js";
import { StatusLine } from "../ui/StatusLine.js";
import { loadWorkspace } from "../utils/workspace.js";
import { launchAssistant } from "../utils/assistantLauncher.js";

const LOG_FILE = path.join(process.cwd(), "zila-assistant-debug.log");
function logToFile(msg: string) {
  fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
}

type Phase = "checking" | "launching" | "error" | "done";

interface AssistantScreenProps {
  onComplete: () => void;

  inkInstance: {
    unmount: () => void;
  };
}

export const AssistantScreen: React.FC<AssistantScreenProps> = ({
    onComplete,
    inkInstance,
}) => {
    const [phase, setPhase] = useState<Phase>("checking");
    const [errorMsg, setErrorMsg] = useState<string>("");

    useEffect(() => {
    let cancelled = false;

    async function launch() {
      const ws = await loadWorkspace();

      if (cancelled) return;

      if (!ws) {
        logToFile("ERROR: No workspace config found");
        setErrorMsg(
          "No workspace found. Run  zila init  first to set up your\n" +
          "curriculum and assistant.",
        );
        setPhase("error");
        return;
      }

      logToFile("Workspace config loaded:");
      logToFile(`  workspacePath: ${ws.workspacePath}`);
      logToFile(`  curriculumPath: ${ws.curriculumPath}`);
      logToFile(`  assistantPath: ${ws.assistantPath}`);

      setPhase("launching");
      await new Promise((r) => setTimeout(r, 600));
      if (cancelled) return;

      // Hand off to Python (Ink unmounts here)
      const result = await launchAssistant(
        ws.assistantPath,
        ws.curriculumPath,
        () => inkInstance.unmount(),
      );

      // Python has exited — handle result
      logToFile(`launchAssistant returned: ${JSON.stringify(result)}`);
      if (result.ok) {
        logToFile("Assistant launched successfully");
        onComplete();
      } else {
        logToFile(`Assistant launch failed: ${result.error}`);
        if (!cancelled) {
          setErrorMsg(result.error ?? "Unknown error launching assistant.");
          setPhase("error");
          onComplete();
        }
      }
    }

    launch().catch((err: unknown) => {
      if (!cancelled) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMsg(msg);
        setPhase("error");
      }
    });

    return () => { cancelled = true; };
  }, [inkInstance, onComplete]);

  useInput(() => {
    if (phase === "error" || phase === "done") {
      onComplete();
    }
  });

    if (phase === "checking") {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Divider label="assistant" width={40} />
        <Box marginTop={1} flexDirection="row" gap={1}>
          <Spinner />
          <Text color={theme.colors.text}>Loading workspace…</Text>
        </Box>
      </Box>
    );
  }

  if (phase === "launching") {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Divider label="assistant" width={40} />
        <Box marginTop={1} flexDirection="column" gap={1}>
          <StatusLine
            status="loading"
            label="Starting assistant"
            detail="Handing off to Python…"
          />
          <Box marginLeft={3}>
            <Text color={theme.colors.dim}>
              The terminal will switch to the AI companion.
            </Text>
          </Box>
          <Box marginLeft={3}>
            <Text color={theme.colors.dim}>
              Type{" "}
              <Text color={theme.colors.primary} bold>back</Text>
              {" "}inside the assistant to return here.
            </Text>
          </Box>
        </Box>
      </Box>
    );
  }

  if (phase === "error") {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Divider label="assistant" width={40} />
        <Banner type="error" title="Could not launch assistant">
          <Text color={theme.colors.text}>{errorMsg}</Text>
          <Box marginTop={1}>
            <Text color={theme.colors.border}>
              Press any key to return to the shell…
            </Text>
          </Box>
        </Banner>
      </Box>
    );
  }

   return (
    <Box flexDirection="column" paddingY={1}>
      <Divider label="assistant" width={40} />
      <Box marginTop={1} flexDirection="row" gap={1}>
        <Text color={theme.colors.success}>{theme.symbols.tick}</Text>
        <Text color={theme.colors.muted}>Returned to ZILA shell</Text>
      </Box>
    </Box>
  );
}
