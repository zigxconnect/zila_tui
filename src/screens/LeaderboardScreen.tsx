import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { loadAuth, zilaApi } from "../utils/auth.js";

interface LeaderboardScreenProps {
  onClose: () => void;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  studentId: string;
  studentEmail: string;
  points: number;
  latestScore: number;
}

interface GroupResponse {
  cohort?: { id: string; name: string } | null;
  peers?: unknown[];
  chatContext?: {
    cohortId?: string;
    cohortName?: string;
    members?: unknown[];
  };
}

interface LeaderboardResponse {
  leaderboard: Array<{
    rank: number;
    studentId: string;
    studentName: string;
    studentEmail: string;
    totalPoints: number;
    latestScore: number;
  }>;
}

interface ProfileResponse {
  profile?: {
    user_id?: string;
    full_name?: string;
    email?: string;
  };
}

interface LeaderboardData {
  cohortName: string | null;
  currentStudentId: string | null;
  currentStudentName: string | null;
  currentStudentEmail: string;
  profileMatchesAccount: boolean;
  entries: LeaderboardEntry[];
}

type ApiRequest = <T = unknown>(endpoint: string) => Promise<T>;

export async function fetchLeaderboardData(
  request: ApiRequest = zilaApi,
  authenticatedEmail = loadAuth()?.email ?? "",
): Promise<LeaderboardData> {
  const group = await request<GroupResponse>("/cohorts/group");
  const cohortId = group.cohort?.id ?? group.chatContext?.cohortId;
  const cohortName = group.cohort?.name ?? group.chatContext?.cohortName ?? null;

  if (!cohortId) {
    return {
      cohortName: null,
      currentStudentId: null,
      currentStudentName: null,
      currentStudentEmail: authenticatedEmail,
      profileMatchesAccount: true,
      entries: [],
    };
  }

  const peers = group.peers ?? group.chatContext?.members ?? [];
  const limit = Math.max(peers.length + 1, 1);
  const [response, profileResponse] = await Promise.all([
    request<LeaderboardResponse>(
      `/gamification/leaderboard/${encodeURIComponent(cohortId)}?limit=${limit}`,
    ),
    request<ProfileResponse>("/profile/me").catch(() => null),
  ]);
  const profile = profileResponse?.profile;
  const currentStudentId = profile?.user_id ?? null;
  const currentStudentEmail = authenticatedEmail.trim() || profile?.email?.trim() || "";
  const currentStudentName = profile?.full_name?.trim() || null;
  const normalizedCurrentEmail = currentStudentEmail.toLowerCase();
  const profileMatchesAccount = !profile?.email
    || profile.email.trim().toLowerCase() === normalizedCurrentEmail;

  return {
    cohortName,
    currentStudentId,
    currentStudentName,
    currentStudentEmail,
    profileMatchesAccount,
    entries: (response.leaderboard ?? []).map((entry) => ({
      rank: entry.rank,
      name: profileMatchesAccount
        && normalizedCurrentEmail !== ""
        && entry.studentEmail.trim().toLowerCase() === normalizedCurrentEmail
        && currentStudentName
        ? currentStudentName
        : entry.studentName,
      studentId: entry.studentId,
      studentEmail: entry.studentEmail,
      points: entry.totalPoints,
      latestScore: entry.latestScore,
    })),
  };
}

function rankBadge(rank: number): string {
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3rd";
  return `${rank}th`;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ onClose }) => {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spinnerFrame, setSpinnerFrame] = useState(0);

  useEffect(() => {
    let active = true;
    fetchLeaderboardData()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : String(loadError));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!loading) return;
    const timer = setInterval(() => {
      setSpinnerFrame((frame) => (frame + 1) % theme.spinner.frames.length);
    }, theme.spinner.intervalMs);
    return () => clearInterval(timer);
  }, [loading]);

  useInput((input, key) => {
    if (key.escape || input === "q" || key.return) {
      onClose();
    }
  });

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.retroBlue} bold>{"lil-zila"}</Text>
          <Text color={theme.colors.retroSlateDark}>{"›"}</Text>
          <Text color={theme.colors.white} bold>{"leaderboard"}</Text>
        </Box>
        <Text color={theme.colors.retroSlateDark}>
          {loading ? "loading" : `${data?.entries.length ?? 0} students`}
        </Text>
      </Box>

      <Text color={theme.colors.retroSlateDark}>
        {data?.cohortName ?? (loading ? "Loading your group..." : "No active cohort")}
      </Text>

      {error ? (
        <Text color={theme.colors.retroGreenBright}>{`Unable to load leaderboard: ${error}`}</Text>
      ) : loading ? (
        <Text color={theme.colors.retroBlueBright}>
          {`${theme.spinner.frames[spinnerFrame]} Fetching your cohort leaderboard...`}
        </Text>
      ) : data?.cohortName === null ? (
        <Text color={theme.colors.retroSlateDark}>
          Join an active cohort to see its leaderboard.
        </Text>
      ) : data?.entries.length === 0 ? (
        <Text color={theme.colors.retroSlateDark}>
          No active students found in this cohort.
        </Text>
      ) : (
        <>
          <Box flexDirection="row" gap={0} marginBottom={0}>
            <Box width={6}>
              <Text color={theme.colors.retroBlueBright} bold>{"RANK"}</Text>
            </Box>
            <Box width={26}>
              <Text color={theme.colors.retroBlueBright} bold>{"NAME"}</Text>
            </Box>
            <Box width={10}>
              <Text color={theme.colors.retroBlueBright} bold>{"POINTS"}</Text>
            </Box>
            <Box width={12}>
              <Text color={theme.colors.retroBlueBright} bold>{"LATEST"}</Text>
            </Box>
          </Box>

          {data?.entries.map((entry) => {
            const currentEmail = data.currentStudentEmail.trim().toLowerCase();
            const isYou = currentEmail !== ""
              && data.profileMatchesAccount
              && entry.studentEmail.trim().toLowerCase() === currentEmail;
            const rankColor = entry.rank <= 3
              ? theme.colors.retroGreenBright
              : theme.colors.retroSlateDark;

            return (
              <Box key={entry.studentId || entry.studentEmail} flexDirection="row" gap={0}>
                <Box width={6}>
                  <Text color={rankColor} bold>{rankBadge(entry.rank).padEnd(4)}</Text>
                </Box>
                <Box width={26}>
                  <Text color={isYou ? theme.colors.retroGreenBright : theme.colors.white} bold={isYou}>
                    {isYou ? `› ${entry.name}` : `  ${entry.name}`}
                  </Text>
                </Box>
                <Box width={10}>
                  <Text color={isYou ? theme.colors.white : theme.colors.retroSlateDark}>
                    {`${entry.points} pts`}
                  </Text>
                </Box>
                <Box width={12}>
                  <Text color={theme.colors.retroSlateDark}>{`${entry.latestScore}%`}</Text>
                </Box>
              </Box>
            );
          })}
        </>
      )}

      <Box flexDirection="row" justifyContent="space-between">
        <Text color={theme.colors.retroSlateDark}>{"esc / q / enter to close"}</Text>
        <Text color={theme.colors.retroSlateDark}>{"Zigex Intern Evaluation"}</Text>
      </Box>
    </Box>
  );
};
