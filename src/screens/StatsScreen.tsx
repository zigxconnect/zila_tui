import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { RetroMeter } from "../ui/RetroMeter.js";

interface StatsScreenProps {
  onClose: () => void;
}

interface StatsData {
  totalPoints: number;
  rank: number;
  totalStudents: number;
  pointsBreakdown: Record<string, number>;
  weeklyScores: Array<{ week: number; score: number }>;
}

export const StatsScreen: React.FC<StatsScreenProps> = ({ onClose }) => {
  const [data] = useState<StatsData>({
    totalPoints: 1250,
    rank: 3,
    totalStudents: 45,
    pointsBreakdown: {
      "Task Completion": 750,
      "Early Submission": 200,
      "Code Quality": 180,
      "Peer Assistance": 80,
      "Daily Streak": 40,
    },
    weeklyScores: [
      { week: 1, score: 75 },
      { week: 2, score: 82 },
      { week: 3, score: 90 },
      { week: 4, score: 88 },
    ],
  });

  useInput((input, key) => {
    if (key.escape || input === "q" || key.return) {
      onClose();
    }
  });

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Top rule */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.retroBlue} bold>{"lil-zila"}</Text>
          <Text color={theme.colors.retroSlateDark}>{"›"}</Text>
          <Text color={theme.colors.white} bold>{"intern performance"}</Text>
        </Box>
        <Text color={theme.colors.retroGreenBright}>{`rank #${data.rank} of ${data.totalStudents}`}</Text>
      </Box>

      {/* Divider */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {/* Highlights */}
      <Box flexDirection="row" gap={4} marginBottom={1}>
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.retroSlateDark}>{"Points:"}</Text>
          <Text color={theme.colors.white} bold>{data.totalPoints} pts</Text>
        </Box>
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.retroSlateDark}>{"Standing:"}</Text>
          <Text color={theme.colors.retroBlueBright} bold>{"Top 7%"}</Text>
        </Box>
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.retroSlateDark}>{"Latest Sprint:"}</Text>
          <Text color={theme.colors.retroGreenBright} bold>{"88%"}</Text>
        </Box>
      </Box>

      {/* Weekly Scores */}
      <Box flexDirection="column" gap={0} marginBottom={1}>
        <Text color={theme.colors.retroBlueBright} bold>{"WEEKLY SCORES"}</Text>
        {data.weeklyScores.map((ws) => (
          <Box key={ws.week} flexDirection="row" alignItems="center">
            <Box width={14}>
              <Text color={theme.colors.retroSlateDark}>{`Week 0${ws.week}`}</Text>
            </Box>
            <RetroMeter
              value={ws.score}
              max={100}
              width={24}
              style="blocks"
              color={ws.score >= 85 ? "retroGreenBright" : "retroBlueBright"}
              showPercent={true}
            />
          </Box>
        ))}
      </Box>

      {/* Breakdown */}
      <Box flexDirection="column" gap={0}>
        <Text color={theme.colors.retroBlueBright} bold>{"CREDIT BREAKDOWN"}</Text>
        {Object.entries(data.pointsBreakdown).map(([category, pts]) => (
          <Box key={category} flexDirection="row" justifyContent="space-between" width={48}>
            <Text color={theme.colors.retroSlateDark}>{category}</Text>
            <Text color={theme.colors.white} bold>{pts} pts</Text>
          </Box>
        ))}
      </Box>

      {/* Bottom rule */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {/* Footer */}
      <Box flexDirection="row" justifyContent="space-between">
        <Text color={theme.colors.retroSlateDark}>{"esc / q / enter to close"}</Text>
        <Text color={theme.colors.retroSlateDark}>{"Zigex Intern Evaluation"}</Text>
      </Box>
    </Box>
  );
};
