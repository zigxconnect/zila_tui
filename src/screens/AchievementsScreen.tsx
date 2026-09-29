import React from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";

interface AchievementsScreenProps {
  onClose: () => void;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  pointsRequired: number;
  unlocked: boolean;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-task",
    name: "First Blood",
    description: "Submit your very first assigned task",
    category: "Tasks",
    pointsRequired: 0,
    unlocked: true,
  },
  {
    id: "five-tasks",
    name: "On a Roll",
    description: "Complete 5 tasks in a single week",
    category: "Tasks",
    pointsRequired: 250,
    unlocked: true,
  },
  {
    id: "early-bird",
    name: "Early Bird",
    description: "Submit task 24 hours prior to deadline",
    category: "Punctuality",
    pointsRequired: 100,
    unlocked: true,
  },
  {
    id: "streak-7",
    name: "Seven Day Streak",
    description: "Daily active attendance for 7 straight days",
    category: "Consistency",
    pointsRequired: 200,
    unlocked: false,
  },
  {
    id: "top-10",
    name: "Top 10 Contender",
    description: "Reach top 10 on the cohort leaderboard",
    category: "Rankings",
    pointsRequired: 500,
    unlocked: false,
  },
  {
    id: "perfect-week",
    name: "Perfect Evaluation",
    description: "Achieve 100% score on weekly sprint review",
    category: "Excellence",
    pointsRequired: 1000,
    unlocked: false,
  },
  {
    id: "peer-helper",
    name: "Cohort Mentor",
    description: "Resolve questions for 3 fellow interns in chat",
    category: "Community",
    pointsRequired: 750,
    unlocked: false,
  },
  {
    id: "legend",
    name: "Zigex Legend",
    description: "Accumulate 5,000 total gamification points",
    category: "Excellence",
    pointsRequired: 5000,
    unlocked: false,
  },
];

export const AchievementsScreen: React.FC<AchievementsScreenProps> = ({ onClose }) => {
  const unlocked = ACHIEVEMENTS.filter((a) => a.unlocked);
  const total = ACHIEVEMENTS.length;
  const pct = Math.round((unlocked.length / total) * 100);

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
          <Text color={theme.colors.white} bold>{"achievements & badges"}</Text>
        </Box>
        <Text color={theme.colors.retroGreenBright}>
          {`${unlocked.length} / ${total} unlocked (${pct}%)`}
        </Text>
      </Box>

      {/* Divider */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {/* Column Headers */}
      <Box flexDirection="row" marginBottom={0}>
        <Box width={12}>
          <Text color={theme.colors.retroBlueBright} bold>{"STATUS"}</Text>
        </Box>
        <Box width={20}>
          <Text color={theme.colors.retroBlueBright} bold>{"BADGE"}</Text>
        </Box>
        <Box width={16}>
          <Text color={theme.colors.retroSlateDark}>{"CATEGORY"}</Text>
        </Box>
        <Box>
          <Text color={theme.colors.retroSlateDark}>{"CRITERIA / REQUIREMENT"}</Text>
        </Box>
      </Box>

      {/* Achievement Items */}
      {ACHIEVEMENTS.map((item) => {
        const statusColor = item.unlocked ? theme.colors.retroGreenBright : theme.colors.retroSlateDark;
        const nameColor = item.unlocked ? theme.colors.white : theme.colors.retroSlateDark;
        const statusLabel = item.unlocked ? "[UNLOCKED]" : "[LOCKED]";
        const criteriaLabel = item.unlocked
          ? item.description
          : `${item.description} (${item.pointsRequired} pts)`;

        return (
          <Box key={item.id} flexDirection="row" paddingY={0}>
            <Box width={12}>
              <Text color={statusColor} bold={item.unlocked}>
                {statusLabel}
              </Text>
            </Box>
            <Box width={20}>
              <Text color={nameColor} bold={item.unlocked}>
                {item.name}
              </Text>
            </Box>
            <Box width={16}>
              <Text color={theme.colors.retroSlateDark}>{item.category}</Text>
            </Box>
            <Box>
              <Text color={item.unlocked ? theme.colors.text : theme.colors.retroSlateDark}>
                {criteriaLabel}
              </Text>
            </Box>
          </Box>
        );
      })}

      {/* Bottom rule */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {/* Footer */}
      <Box flexDirection="row" justifyContent="space-between">
        <Text color={theme.colors.retroSlateDark}>{"esc / q / enter to close"}</Text>
        <Text color={theme.colors.retroSlateDark}>{"type stats or leaderboard at prompt"}</Text>
      </Box>
    </Box>
  );
};
