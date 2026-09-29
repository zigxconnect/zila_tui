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
  pointsBreakdown: Array<{ category: string; points: number; share: string; status: string }>;
  weeklyScores: Array<{ week: number; score: number; rating: string }>;
}

export const StatsScreen: React.FC<StatsScreenProps> = ({ onClose }) => {
  const [data] = useState<StatsData>({
    totalPoints: 1250,
    rank: 3,
    totalStudents: 45,
    pointsBreakdown: [
      { category: "Task Completion", points: 750, share: "60.0%", status: "Core Deliverables" },
      { category: "Early Submission", points: 200, share: "16.0%", status: "Punctuality Bonus" },
      { category: "Code Quality", points: 180, share: "14.4%", status: "PR Review Merits" },
      { category: "Peer Assistance", points: 80, share: "6.4%", status: "Community Help" },
      { category: "Daily Streak", points: 40, share: "3.2%", status: "7-Day Consecutive" },
    ],
    weeklyScores: [
      { week: 1, score: 75, rating: "Proficient" },
      { week: 2, score: 82, rating: "Very Good" },
      { week: 3, score: 90, rating: "Exemplary" },
      { week: 4, score: 88, rating: "Exemplary" },
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
          <Text color={theme.colors.white} bold>{"intern performance & stats"}</Text>
        </Box>
        <Text color={theme.colors.retroGreenBright}>
          {`rank #${data.rank} of ${data.totalStudents} (top 7%)`}
        </Text>
      </Box>

      {/* Divider */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {/* Metric Cards Row */}
      <Box flexDirection="row" marginBottom={0}>
        <Box width={18}>
          <Text color={theme.colors.retroSlateDark}>{"POINTS: "}</Text>
          <Text color={theme.colors.white} bold>{`${data.totalPoints} pts`}</Text>
        </Box>
        <Box width={18}>
          <Text color={theme.colors.retroSlateDark}>{"STANDING: "}</Text>
          <Text color={theme.colors.retroGreenBright} bold>{"Top 7%"}</Text>
        </Box>
        <Box width={18}>
          <Text color={theme.colors.retroSlateDark}>{"LATEST: "}</Text>
          <Text color={theme.colors.retroBlueBright} bold>{"88% score"}</Text>
        </Box>
        <Box>
          <Text color={theme.colors.retroSlateDark}>{"STREAK: "}</Text>
          <Text color={theme.colors.white} bold>{"7 Days"}</Text>
        </Box>
      </Box>

      {/* Divider */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {/* Weekly Evaluations Header */}
      <Box flexDirection="row" marginBottom={0}>
        <Box width={12}>
          <Text color={theme.colors.retroBlueBright} bold>{"PERIOD"}</Text>
        </Box>
        <Box width={10}>
          <Text color={theme.colors.retroBlueBright} bold>{"SCORE"}</Text>
        </Box>
        <Box width={32}>
          <Text color={theme.colors.retroSlateDark}>{"PROGRESS GAUGE"}</Text>
        </Box>
        <Box>
          <Text color={theme.colors.retroSlateDark}>{"RATING"}</Text>
        </Box>
      </Box>

      {/* Weekly Evaluations Rows */}
      {data.weeklyScores.map((ws) => (
        <Box key={ws.week} flexDirection="row" alignItems="center">
          <Box width={12}>
            <Text color={theme.colors.white} bold>{`Week 0${ws.week}`}</Text>
          </Box>
          <Box width={10}>
            <Text color={ws.score >= 85 ? theme.colors.retroGreenBright : theme.colors.retroBlueBright} bold>
              {`${ws.score}%`}
            </Text>
          </Box>
          <Box width={32}>
            <RetroMeter
              value={ws.score}
              max={100}
              width={22}
              style="blocks"
              color={ws.score >= 85 ? "retroGreenBright" : "retroBlueBright"}
              showPercent={false}
            />
          </Box>
          <Box>
            <Text color={theme.colors.text}>{ws.rating}</Text>
          </Box>
        </Box>
      ))}

      {/* Divider */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {/* Credit Breakdown Header */}
      <Box flexDirection="row" marginBottom={0}>
        <Box width={22}>
          <Text color={theme.colors.retroBlueBright} bold>{"CREDIT CATEGORY"}</Text>
        </Box>
        <Box width={12}>
          <Text color={theme.colors.retroBlueBright} bold>{"POINTS"}</Text>
        </Box>
        <Box width={12}>
          <Text color={theme.colors.retroSlateDark}>{"SHARE"}</Text>
        </Box>
        <Box>
          <Text color={theme.colors.retroSlateDark}>{"ALLOCATION TYPE"}</Text>
        </Box>
      </Box>

      {/* Credit Breakdown Rows */}
      {data.pointsBreakdown.map((item) => (
        <Box key={item.category} flexDirection="row">
          <Box width={22}>
            <Text color={theme.colors.white} bold>{item.category}</Text>
          </Box>
          <Box width={12}>
            <Text color={theme.colors.retroGreenBright}>{`${item.points} pts`}</Text>
          </Box>
          <Box width={12}>
            <Text color={theme.colors.retroSlateDark}>{item.share}</Text>
          </Box>
          <Box>
            <Text color={theme.colors.text}>{item.status}</Text>
          </Box>
        </Box>
      ))}

      {/* Bottom rule */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {/* Footer */}
      <Box flexDirection="row" justifyContent="space-between">
        <Text color={theme.colors.retroSlateDark}>{"esc / q / enter to close"}</Text>
        <Text color={theme.colors.retroSlateDark}>{"type leaderboard or achievements at prompt"}</Text>
      </Box>
    </Box>
  );
};
