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
      {/* 90s Performance Diagnostics Frame */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={theme.colors.accent}
        paddingX={2}
        paddingY={1}
      >
        <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
          <Box flexDirection="row">
            <Text color={theme.colors.retroCyanBright} bold>
              [ INTERN PERFORMANCE & WORKSTATION METRICS ]
            </Text>
          </Box>
          <Box flexDirection="row">
            <Text color={theme.colors.retroGreen} bold>[RANK #{data.rank} OF {data.totalStudents}]</Text>
          </Box>
        </Box>

        {/* Overview Row */}
        <Box flexDirection="row" marginBottom={1}>
          <Box borderStyle="single" borderColor={theme.colors.border} paddingX={1} marginRight={2}>
            <Text color={theme.colors.muted}>TOTAL POINTS: </Text>
            <Text color={theme.colors.retroAmberBright} bold>{data.totalPoints} PTS</Text>
          </Box>
          <Box borderStyle="single" borderColor={theme.colors.border} paddingX={1} marginRight={2}>
            <Text color={theme.colors.muted}>COHORT STANDING: </Text>
            <Text color={theme.colors.retroCyanBright} bold>TOP 7%</Text>
          </Box>
          <Box borderStyle="single" borderColor={theme.colors.border} paddingX={1}>
            <Text color={theme.colors.muted}>LATEST SCORE: </Text>
            <Text color={theme.colors.retroGreenBright} bold>88%</Text>
          </Box>
        </Box>

        {/* Weekly Progression ASCII Histogram */}
        <Box flexDirection="column" marginTop={1}>
          <Text color={theme.colors.accent} bold>WEEKLY PERFORMANCE HISTOGRAM:</Text>
          {data.weeklyScores.map((ws) => (
            <Box key={ws.week} marginY={0}>
              <RetroMeter
                label={`Sprint Week 0${ws.week}`}
                value={ws.score}
                max={100}
                width={26}
                style="blocks"
                color={ws.score >= 85 ? "retroGreen" : "retroCyan"}
              />
            </Box>
          ))}
        </Box>

        {/* Points Breakdown with Dotted Leaders */}
        <Box flexDirection="column" marginTop={1}>
          <Text color={theme.colors.accent} bold>CREDIT ALLOCATION BREAKDOWN:</Text>
          {Object.entries(data.pointsBreakdown).map(([category, pts]) => {
            const dots = Math.max(2, 45 - category.length - String(pts).length);
            return (
              <Box key={category} flexDirection="row" alignItems="center">
                <Text color={theme.colors.muted}>{category}</Text>
                <Text color={theme.colors.retroSlateDark}> {"·".repeat(dots)} </Text>
                <Text color={theme.colors.textBright} bold>{pts} PTS</Text>
              </Box>
            );
          })}
        </Box>

        {/* Footer */}
        <Box marginTop={1} flexDirection="row" justifyContent="space-between">
          <Text color={theme.colors.dim}>[ESC / ENTER / q: RETURN]</Text>
          <Text color={theme.colors.retroSlateDark}>ZIGEX EVALUATION MATRIX v1.2</Text>
        </Box>
      </Box>
    </Box>
  );
};
