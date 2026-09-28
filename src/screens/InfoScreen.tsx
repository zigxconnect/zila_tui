import React from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { RetroMeter } from "../ui/RetroMeter.js";

interface InfoScreenProps {
  onComplete: () => void;
}

export const InfoScreen: React.FC<InfoScreenProps> = ({ onComplete }) => {
  useInput((char, key) => {
    if (key.escape || char === "q" || key.return) {
      onComplete();
    }
  });

  const nodeVersion = process.version;
  const platform = process.platform;
  const arch = process.arch;
  const memoryUsage = process.memoryUsage();
  const heapMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const totalHeapMB = Math.round(memoryUsage.heapTotal / 1024 / 1024) || 64;
  const uptimeMinutes = Math.floor(process.uptime() / 60);

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Top rule */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.retroBlue} bold>{"lil-zila"}</Text>
          <Text color={theme.colors.retroSlateDark}>{"›"}</Text>
          <Text color={theme.colors.white} bold>{"system diagnostics"}</Text>
        </Box>
        <Text color={theme.colors.retroGreenBright}>{"nominal"}</Text>
      </Box>

      {/* Divider */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {/* Runtime Environment */}
      <Box flexDirection="column" gap={0} marginBottom={1}>
        <Text color={theme.colors.retroBlueBright} bold>{"ENVIRONMENT"}</Text>
        <Box flexDirection="row" gap={2}>
          <Box width={18}>
            <Text color={theme.colors.retroSlateDark}>{"Client"}</Text>
          </Box>
          <Text color={theme.colors.white} bold>{"lil-zila v0.3.0"}</Text>
        </Box>
        <Box flexDirection="row" gap={2}>
          <Box width={18}>
            <Text color={theme.colors.retroSlateDark}>{"Node Runtime"}</Text>
          </Box>
          <Text color={theme.colors.white}>{nodeVersion}</Text>
        </Box>
        <Box flexDirection="row" gap={2}>
          <Box width={18}>
            <Text color={theme.colors.retroSlateDark}>{"Platform / Arch"}</Text>
          </Box>
          <Text color={theme.colors.white}>{platform} / {arch}</Text>
        </Box>
        <Box flexDirection="row" gap={2}>
          <Box width={18}>
            <Text color={theme.colors.retroSlateDark}>{"Session Uptime"}</Text>
          </Box>
          <Text color={theme.colors.white}>{uptimeMinutes}m (PID: {process.pid})</Text>
        </Box>
      </Box>

      {/* Memory Allocation */}
      <Box flexDirection="column" gap={0} marginBottom={1}>
        <Text color={theme.colors.retroBlueBright} bold>{"MEMORY"}</Text>
        <Box flexDirection="row" alignItems="center" gap={2}>
          <Text color={theme.colors.retroSlateDark}>
            {`Heap: ${heapMB}MB / ${totalHeapMB}MB`}
          </Text>
          <RetroMeter
            value={heapMB}
            max={totalHeapMB}
            width={24}
            style="blocks"
            color="retroBlueBright"
            showPercent={true}
          />
        </Box>
      </Box>

      {/* Subsystem State */}
      <Box flexDirection="column" gap={0}>
        <Text color={theme.colors.retroBlueBright} bold>{"SUBSYSTEMS"}</Text>
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.retroGreenBright}>{"✓"}</Text>
          <Text color={theme.colors.white}>{"Client Cache (~/.zila/cache.json)"}</Text>
        </Box>
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.retroGreenBright}>{"✓"}</Text>
          <Text color={theme.colors.white}>{"Bluetooth LE Protocol Engine ready"}</Text>
        </Box>
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.retroGreenBright}>{"✓"}</Text>
          <Text color={theme.colors.white}>{"GitHub API OAuth integration active"}</Text>
        </Box>
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.retroGreenBright}>{"✓"}</Text>
          <Text color={theme.colors.white}>{"Zigex REST Sync Daemon connected"}</Text>
        </Box>
      </Box>

      {/* Bottom rule */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {/* Footer */}
      <Box flexDirection="row" justifyContent="space-between">
        <Text color={theme.colors.retroSlateDark}>{"esc / q / enter to close"}</Text>
        <Text color={theme.colors.retroSlateDark}>{"Zigex Workstation Environment"}</Text>
      </Box>
    </Box>
  );
};
