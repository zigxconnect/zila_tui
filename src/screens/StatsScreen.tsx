import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";
import {
  Header,
  Card,
  ProgressBar,
  Badge,
  Divider,
  StatItem,
  ScoreCircle,
  EmptyState,
} from "../ui/Components.js";

interface StatsScreenProps {
  onClose: () => void;
}

// Mock data structure - replace with actual API calls
interface StatsData {
  totalPoints: number;
  rank: number;
  totalStudents: number;
  pointsBreakdown: Record<string, number>;
  weeklyScores: Array<{ week: number; score: number }>;
  achievements: Array<{
    id: string;
    name: string;
    icon: string;
    earnedAt: string;
  }>;
  recentActivity: Array<{
    type: string;
    points: number;
    description: string;
    date: string;
  }>;
}

export const StatsScreen: React.FC<StatsScreenProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StatsData | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "achievements" | "activity">("overview");

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setData({
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
          { week: 3, score: 88 },
          { week: 4, score: 92 },
        ],
        achievements: [
          { id: "1", name: "First Steps", icon: "🎯", earnedAt: "2024-01-15" },
          { id: "2", name: "Early Bird", icon: "🌅", earnedAt: "2024-01-20" },
          { id: "3", name: "Code Master", icon: "💎", earnedAt: "2024-02-01" },
          { id: "4", name: "Team Player", icon: "🤝", earnedAt: "2024-02-05" },
        ],
        recentActivity: [
          { type: "task_completion", points: 85, description: "Completed 'Build Todo App'", date: "2 hours ago" },
          { type: "early_submission", points: 10, description: "Early submission bonus", date: "2 hours ago" },
          { type: "code_quality", points: 15, description: "High quality code review", date: "1 day ago" },
          { type: "peer_help", points: 10, description: "Helped Sarah with React hooks", date: "2 days ago" },
        ],
      });
      setLoading(false);
    }, 800);
  }, []);

  useInput((char, key) => {
    if (key.escape || char === "q") {
      onClose();
    } else if (char === "1") {
      setActiveTab("overview");
    } else if (char === "2") {
      setActiveTab("achievements");
    } else if (char === "3") {
      setActiveTab("activity");
    }
  });

  if (loading) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Header title="Your Stats" icon="📊" />
        <Box flexDirection="column" alignItems="center" paddingY={3}>
          <Text color={theme.colors.primary}>
            {theme.spinners.pulse.frames[0]} Loading your stats...
          </Text>
        </Box>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Header title="Your Stats" icon="📊" />
        <EmptyState
          icon="❌"
          title="Failed to load stats"
          message="Please try again later"
          action="Press ESC to go back"
        />
      </Box>
    );
  }

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return "🏅";
  };

  const getRankColor = (rank: number): keyof typeof theme.colors => {
    if (rank === 1) return "gold";
    if (rank === 2) return "silver";
    if (rank === 3) return "bronze";
    return "muted";
  };

  return (
    <Box flexDirection="column" paddingY={1}>
      <Header
        title="Your Progress Dashboard"
        subtitle="Track your performance, points, and achievements"
        icon="📊"
      />

      {/* Tab navigation */}
      <Box marginBottom={2}>
        <Box marginRight={1}>
          {activeTab === "overview" ? (
            <Badge variant="primary">1. Overview</Badge>
          ) : (
            <Text color={theme.colors.muted}>1. Overview</Text>
          )}
        </Box>
        <Box marginRight={1}>
          {activeTab === "achievements" ? (
            <Badge variant="primary">2. Achievements</Badge>
          ) : (
            <Text color={theme.colors.muted}>2. Achievements</Text>
          )}
        </Box>
        <Box>
          {activeTab === "activity" ? (
            <Badge variant="primary">3. Activity</Badge>
          ) : (
            <Text color={theme.colors.muted}>3. Activity</Text>
          )}
        </Box>
      </Box>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <Box flexDirection="column">
          {/* Top stats row */}
          <Box>
            <Box width="50%" marginRight={2}>
              <Card title="Total Points" borderColor="primary">
                <Box flexDirection="column" alignItems="center" paddingY={1}>
                  <Text color={theme.colors.primaryBright} bold>
                    <Text>⭐ </Text>
                    <Text>{data.totalPoints}</Text>
                  </Text>
                  <Box marginTop={1}>
                    <ProgressBar
                      current={data.totalPoints}
                      max={2000}
                      width={25}
                      color="primary"
                    />
                  </Box>
                </Box>
              </Card>
            </Box>

            <Box width="50%">
              <Card title="Your Rank" borderColor="accent">
                <Box flexDirection="column" alignItems="center" paddingY={1}>
                  <Text color={theme.colors[getRankColor(data.rank)]} bold>
                    {getRankEmoji(data.rank)} #{data.rank}
                  </Text>
                  <Box marginTop={1}>
                    <Text color={theme.colors.muted}>
                      out of {data.totalStudents} students
                    </Text>
                  </Box>
                </Box>
              </Card>
            </Box>
          </Box>

          {/* Points breakdown */}
          <Card title="Points Breakdown" borderColor="success" marginTop={1}>
            {Object.entries(data.pointsBreakdown).map(([type, points]) => {
              const icons: Record<string, string> = {
                "Task Completion": "✅",
                "Early Submission": "⚡",
                "Code Quality": "💎",
                "Peer Help": "🤝",
                "Streak Bonus": "🔥",
              };

              return (
                <Box key={type} flexDirection="column" marginY={1}>
                  <StatItem
                    label={type}
                    value={`${points} pts`}
                    icon={icons[type]}
                    color="success"
                  />
                  <Box marginTop={0} marginLeft={3}>
                    <ProgressBar
                      current={points}
                      max={data.totalPoints}
                      width={30}
                      showPercentage={false}
                      color="success"
                    />
                  </Box>
                </Box>
              );
            })}
          </Card>

          {/* Weekly scores trend */}
          <Card title="Weekly Performance" borderColor="info" marginTop={1}>
            <Box flexDirection="column">
              {data.weeklyScores.map((score) => (
                <Box key={score.week} flexDirection="column" marginY={1}>
                  <Box justifyContent="space-between">
                    <Text color={theme.colors.text}>Week {score.week}</Text>
                    <ScoreCircle score={score.score} size="small" />
                  </Box>
                  <Box marginTop={0}>
                    <ProgressBar
                      current={score.score}
                      max={100}
                      width={35}
                      showPercentage={false}
                      color="info"
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          </Card>
        </Box>
      )}

      {/* Achievements Tab */}
      {activeTab === "achievements" && (
        <Box flexDirection="column">
          <Card title={`Unlocked Achievements (${data.achievements.length})`} borderColor="warning">
            {data.achievements.length === 0 ? (
              <EmptyState
                icon="🏆"
                title="No achievements yet"
                message="Complete tasks and earn points to unlock achievements"
                action=""
              />
            ) : (
              <Box flexDirection="column">
                {data.achievements.map((achievement) => (
                  <Box key={achievement.id} marginY={1} flexDirection="column">
                    <Box>
                      <Text>{achievement.icon} </Text>
                      <Text bold color={theme.colors.warning}>
                        {achievement.name}
                      </Text>
                    </Box>
                    <Box marginLeft={3}>
                      <Text color={theme.colors.muted} dimColor>
                        Earned on {new Date(achievement.earnedAt).toLocaleDateString()}
                      </Text>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Card>

          <Box marginTop={2}>
            <Text color={theme.colors.info}>
              💡 Use <Text bold>zila achievements</Text> to see all available achievements
            </Text>
          </Box>
        </Box>
      )}

      {/* Activity Tab */}
      {activeTab === "activity" && (
        <Box flexDirection="column">
          <Card title="Recent Activity" borderColor="accent">
            {data.recentActivity.map((activity, index) => (
              <Box key={index} flexDirection="column" marginY={1}>
                <Box justifyContent="space-between">
                  <Box>
                    <Text color={theme.colors.text}>{activity.description}</Text>
                  </Box>
                  <Box>
                    <Text color={theme.colors.success} bold>
                      +{activity.points}
                    </Text>
                  </Box>
                </Box>
                <Box marginTop={0}>
                  <Text color={theme.colors.dimmer} dimColor>
                    {activity.date}
                  </Text>
                </Box>
              </Box>
            ))}
          </Card>
        </Box>
      )}

      <Divider />

      {/* Footer */}
      <Box flexDirection="column" marginTop={1}>
        <Text color={theme.colors.muted}>
          <Text color={theme.colors.primary} bold>ESC</Text> Close  •  {" "}
          <Text color={theme.colors.primary} bold>1-3</Text> Switch tabs
        </Text>
        <Box marginTop={1}>
          <Text color={theme.colors.dimmer} dimColor>
            🔥 Keep up the great work! You're on track to reach 2000 points
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
