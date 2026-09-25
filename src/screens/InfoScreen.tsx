import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { Header, Card, StatItem, Divider, Badge } from "../ui/Components.js";

interface InfoScreenProps {
  onComplete: () => void;
}

export const InfoScreen: React.FC<InfoScreenProps> = ({ onComplete }) => {
  const [animationFrame, setAnimationFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame((prev) => (prev + 1) % theme.spinners.pulse.frames.length);
    }, 150);
    return () => clearInterval(interval);
  }, []);

  useInput((char, key) => {
    if (key.escape || char === "q" || key.return) {
      onComplete();
    }
  });

  // Get system info
  const nodeVersion = process.version;
  const platform = process.platform;
  const arch = process.arch;
  const memoryUsage = process.memoryUsage();
  const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const uptime = process.uptime();
  const uptimeMinutes = Math.floor(uptime / 60);

  return (
    <Box flexDirection="column" paddingY={1}>
      <Header
        title="Zila System Information"
        subtitle="Terminal-first developer productivity for Zigex"
        icon="ℹ️"
      />

      {/* App info */}
      <Card title="Application" borderColor="primary">
        <Box flexDirection="column">
          <StatItem label="Name" value="Zila Agent" icon="🚀" />
          <StatItem label="Version" value="v0.2.0" icon="📦" />
          <StatItem label="Description" value="Zigex Intelligent Layer for Agents" />
          <StatItem label="Status" value="Active" icon={theme.spinners.pulse.frames[animationFrame]} color="success" />
        </Box>
      </Card>

      {/* System info */}
      <Card title="System" borderColor="info" marginTop={1}>
        <Box flexDirection="column">
          <StatItem label="Node.js" value={nodeVersion} icon="⚡" />
          <StatItem label="Platform" value={platform} icon="💻" />
          <StatItem label="Architecture" value={arch} icon="🔧" />
          <StatItem label="Memory Usage" value={`${memoryMB} MB`} icon="🧠" />
          <StatItem label="Uptime" value={`${uptimeMinutes} minutes`} icon="⏱️" />
        </Box>
      </Card>

      {/* Features */}
      <Card title="Features" borderColor="success" marginTop={1}>
        <Box flexDirection="column">
          <Box marginY={0}>
            <Text color={theme.colors.success}>✓</Text>
            <Text color={theme.colors.text}> Cohort Management</Text>
          </Box>
          <Box marginY={0}>
            <Text color={theme.colors.success}>✓</Text>
            <Text color={theme.colors.text}> Task Submission & Tracking</Text>
          </Box>
          <Box marginY={0}>
            <Text color={theme.colors.success}>✓</Text>
            <Text color={theme.colors.text}> Peer Collaboration</Text>
          </Box>
          <Box marginY={0}>
            <Text color={theme.colors.success}>✓</Text>
            <Text color={theme.colors.text}> Gamification & Leaderboards</Text>
          </Box>
          <Box marginY={0}>
            <Text color={theme.colors.success}>✓</Text>
            <Text color={theme.colors.text}> Learning Resources</Text>
          </Box>
          <Box marginY={0}>
            <Text color={theme.colors.success}>✓</Text>
            <Text color={theme.colors.text}> GitHub Integration</Text>
          </Box>
          <Box marginY={0}>
            <Text color={theme.colors.success}>✓</Text>
            <Text color={theme.colors.text}> Weekly Performance Reports</Text>
          </Box>
        </Box>
      </Card>

      {/* Links */}
      <Card title="Resources" borderColor="accent" marginTop={1}>
        <Box flexDirection="column">
          <Box marginY={0}>
            <Text color={theme.colors.link}>🌐 Website:    </Text>
            <Text color={theme.colors.muted}>https://zigex.com</Text>
          </Box>
          <Box marginY={0}>
            <Text color={theme.colors.link}>📚 Docs:       </Text>
            <Text color={theme.colors.muted}>https://docs.zigex.com</Text>
          </Box>
          <Box marginY={0}>
            <Text color={theme.colors.link}>💬 Support:    </Text>
            <Text color={theme.colors.muted}>support@zigex.com</Text>
          </Box>
          <Box marginY={0}>
            <Text color={theme.colors.link}>🐙 GitHub:     </Text>
            <Text color={theme.colors.muted}>github.com/zigex/zila-agent</Text>
          </Box>
        </Box>
      </Card>

      <Divider />

      {/* Footer */}
      <Box flexDirection="column" marginTop={1}>
        <Text color={theme.colors.muted}>
          <Text color={theme.colors.primary} bold>ESC</Text> or <Text color={theme.colors.primary} bold>Q</Text> to close
        </Text>
        <Box marginTop={1}>
          <Text color={theme.colors.dimmer} dimColor>
            Built with ❤️ by the Zigex Team
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
