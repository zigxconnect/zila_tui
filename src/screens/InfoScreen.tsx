import React from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { RetroMeter } from "../ui/RetroMeter.js";

interface InfoScreenProps {
  onComplete: () => void;
}

interface DiagnosticItem {
  component: string;
  subsystem: string;
  status: string;
  highlight?: boolean;
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

  const DIAGNOSTIC_ITEMS: DiagnosticItem[] = [
    { component: "Client Agent", subsystem: "Runtime", status: "lil-zila v0.3.0 (TUI Shell)" },
    { component: "Node.js Engine", subsystem: "Runtime", status: `${nodeVersion} (${platform}/${arch})` },
    { component: "Session Process", subsystem: "Host OS", status: `PID ${process.pid} · Uptime ${uptimeMinutes}m` },
    { component: "CacheService (API)", subsystem: "Memory Cache", status: "120s TTL · 0.8ms sub-ms latency (560x)", highlight: true },
    { component: "Client Cache", subsystem: "Local Store", status: "~/.zila/cache.json [Persistent]" },
    { component: "Polyglot Database", subsystem: "Backend", status: "Supabase (Truth) + Neon DB (Prisma)" },
    { component: "BLE Mesh Service", subsystem: "Bluetooth", status: "0000FE26 · P2P Mesh ready (512B MTU)" },
    { component: "GitHub OAuth", subsystem: "Integration", status: "zigxconnect personal access tokens" },
    { component: "PR Automation", subsystem: "GitHub Pipeline", status: "sample_repo_zila · 1-2 PR/day quota · 100% rubric", highlight: true },
    { component: "Swagger OpenAPI", subsystem: "Docs Spec", status: "http://localhost:5000/docs [v3.0.0]" },
  ];

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Top rule */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.retroBlue} bold>{"lil-zila"}</Text>
          <Text color={theme.colors.retroSlateDark}>{"›"}</Text>
          <Text color={theme.colors.white} bold>{"system diagnostics & cache"}</Text>
        </Box>
        <Text color={theme.colors.retroGreenBright}>{"nominal · all systems active"}</Text>
      </Box>

      {/* Divider */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {/* Column Headers */}
      <Box flexDirection="row" marginBottom={0}>
        <Box width={20}>
          <Text color={theme.colors.retroBlueBright} bold>{"COMPONENT"}</Text>
        </Box>
        <Box width={16}>
          <Text color={theme.colors.retroSlateDark}>{"SUBSYSTEM"}</Text>
        </Box>
        <Box>
          <Text color={theme.colors.retroSlateDark}>{"STATUS / CONFIGURATION"}</Text>
        </Box>
      </Box>

      {/* Diagnostic Items */}
      {DIAGNOSTIC_ITEMS.map((item) => (
        <Box key={item.component} flexDirection="row" paddingY={0}>
          <Box width={20}>
            <Text color={item.highlight ? theme.colors.retroGreenBright : theme.colors.white} bold={item.highlight}>
              {item.component}
            </Text>
          </Box>
          <Box width={16}>
            <Text color={theme.colors.retroSlateDark}>{item.subsystem}</Text>
          </Box>
          <Box>
            <Text color={item.highlight ? theme.colors.white : theme.colors.text}>
              {item.status}
            </Text>
          </Box>
        </Box>
      ))}

      {/* Memory Utilization Gauge */}
      <Box flexDirection="row" marginTop={1} alignItems="center">
        <Box width={20}>
          <Text color={theme.colors.white} bold>{"Memory Allocation"}</Text>
        </Box>
        <Box width={16}>
          <Text color={theme.colors.retroSlateDark}>{"RAM Heap"}</Text>
        </Box>
        <Box flexDirection="row" alignItems="center" gap={1}>
          <RetroMeter
            value={heapMB}
            max={totalHeapMB}
            width={18}
            style="blocks"
            color="retroBlueBright"
            showPercent={false}
          />
          <Text color={theme.colors.white}>{`${heapMB}MB / ${totalHeapMB}MB`}</Text>
        </Box>
      </Box>

      {/* Bottom rule */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {/* Footer */}
      <Box flexDirection="row" justifyContent="space-between">
        <Text color={theme.colors.retroSlateDark}>{"esc / q / enter to close"}</Text>
        <Text color={theme.colors.retroSlateDark}>{"type cache or stats at prompt"}</Text>
      </Box>
    </Box>
  );
};
