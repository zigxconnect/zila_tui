import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";

interface StatsScreenProps {
  onClose: () => void;
}

interface StatsData {
  totalPoints: number;
  rank: number;
  totalStudents: number;
  pointsBreakdown: Record<string, number>;
  weeklyScores: Array<{ week: number; score: number }>;
  achievements: Array<{
    id: string;
    name: string;
    earnedAt: string;
  }>;
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
      "Peer Help": 80,
      "Streak Bonus": 40,
    },
    weeklyScores: [
      { week: 1, score: 75 },
      { week: 2, score: 82 },
      { week: 3, score: 90 },
      { week: 4, score: 88 },
    ],
    achievements: [
      { id: "1", name: "First Task Complete", earnedAt: "2024-01-15" },
      { id: "2", name: "PR Champion", earnedAt: "2024-01-20" },
      { id: "3", name: "Clean Code Vanguard", earnedAt: "2024-01-28" },
    ],
  });

  useInput((input, key) => {
    if (key.escape || input === "q" || key.return) {
      onClose();
    }
  });

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.colors.primaryBright}>
          ================================================================================
        </Text>
        <Text bold color={theme.colors.primaryBright}>
          STUDENT PROGRESS & PERFORMANCE METRICS
        </Text>
        <Text bold color={theme.colors.primaryBright}>
          ================================================================================
        </Text>
      </Box>

      {/* Overview Cards */}
      <Box flexDirection="row" marginBottom={1}>
        <Box borderStyle="round" borderColor={theme.colors.primary} paddingX={2} marginRight={2}>
          <Box flexDirection="column">
            <Text color={theme.colors.muted}>Total Points</Text>
            <Text bold color={theme.colors.primaryBright}>{data.totalPoints} pts</Text>
          </Box>
        </Box>

        <Box borderStyle="round" borderColor={theme.colors.accent} paddingX={2} marginRight={2}>
          <Box flexDirection="column">
            <Text color={theme.colors.muted}>Cohort Rank</Text>
            <Text bold color={theme.colors.accentBright}>#{data.rank} of {data.totalStudents}</Text>
          </Box>
        </Box>

        <Box borderStyle="round" borderColor={theme.colors.success} paddingX={2}>
          <Box flexDirection="column">
            <Text color={theme.colors.muted}>Latest Score</Text>
            <Text bold color={theme.colors.successBright}>
              {data.weeklyScores[data.weeklyScores.length - 1]?.score || 0}%
            </Text>
          </Box>
        </Box>
      </Box>

      {/* Points breakdown */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.colors.accentBright}>
          POINTS BREAKDOWN:
        </Text>
        {Object.entries(data.pointsBreakdown).map(([category, pts]) => (
          <Box key={category} paddingLeft={2}>
            <Text color={theme.colors.textBright}>{category.padEnd(25)}</Text>
            <Text color={theme.colors.muted}>: {pts} pts</Text>
          </Box>
        ))}
      </Box>

      {/* Unlocked Badges */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.colors.accentBright}>
          UNLOCKED ACHIEVEMENTS:
        </Text>
        {data.achievements.map((ach) => (
          <Box key={ach.id} paddingLeft={2}>
            <Text color={theme.colors.success}>[UNLOCKED] </Text>
            <Text bold color={theme.colors.textBright}>{ach.name.padEnd(25)}</Text>
            <Text color={theme.colors.dim}>Earned: {ach.earnedAt}</Text>
          </Box>
        ))}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color={theme.colors.dim}>
          --------------------------------------------------------------------------------
        </Text>
        <Text color={theme.colors.dim}>
          Press [ESC], [ENTER], or [q] to return to the interactive prompt.
        </Text>
      </Box>
    </Box>
  );
};
