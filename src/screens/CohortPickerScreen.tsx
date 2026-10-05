import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { Spinner } from "../ui/Spinner.js";
import { zilaApi } from "../utils/auth.js";

export interface CohortOption {
  id: string;
  name: string;
  department?: string;
  level?: string;
  enrollmentStatus?: string;
  supervisorName?: string;
  supervisorEmail?: string;
  githubRepoUrl?: string;
}

interface CohortsResponse {
  cohorts?: CohortOption[];
}

export type CohortPickerMode = "group" | "leaderboard" | "select";

type CohortRequest = <T = unknown>(endpoint: string) => Promise<T>;

export async function fetchCohortOptions(
  request: CohortRequest = zilaApi,
): Promise<CohortOption[]> {
  const response = await request<CohortsResponse>("/cohorts/my-cohorts");
  return response.cohorts ?? [];
}

interface CohortPickerScreenProps {
  mode: CohortPickerMode;
  onSelect: (cohort: CohortOption) => void;
  onClose: () => void;
}

export const CohortPickerScreen: React.FC<CohortPickerScreenProps> = ({
  mode,
  onSelect,
  onClose,
}) => {
  const [cohorts, setCohorts] = useState<CohortOption[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchCohortOptions()
      .then((items) => {
        if (active) setCohorts(items);
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

  useInput((_input, key) => {
    if (key.escape || _input === "q") {
      onClose();
      return;
    }
    if (loading || cohorts.length === 0) return;
    if (key.upArrow) {
      setSelectedIndex((index) => (index - 1 + cohorts.length) % cohorts.length);
    } else if (key.downArrow) {
      setSelectedIndex((index) => (index + 1) % cohorts.length);
    } else if (key.return) {
      onSelect(cohorts[selectedIndex]!);
    }
  });

  const title =
    mode === "group"
      ? "Choose a cohort team"
      : mode === "leaderboard"
        ? "Choose a cohort leaderboard"
        : "Navigate into a cohort context";

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box flexDirection="row" gap={1}>
        <Text color={theme.colors.retroBlue} bold>lil-zila</Text>
        <Text color={theme.colors.retroSlateDark}>›</Text>
        <Text color={theme.colors.white} bold>{title}</Text>
      </Box>
      <Text color={theme.colors.retroSlateDark}>Select with ↑/↓, choose with enter, cancel with esc.</Text>

      {loading ? (
        <Box flexDirection="row" gap={1} marginTop={1}>
          <Spinner style="classic" color={theme.colors.retroBlueBright} />
          <Text color={theme.colors.retroSlateDark}>Loading your enrolled cohorts...</Text>
        </Box>
      ) : error ? (
        <Text color={theme.colors.error}>{`Unable to load cohorts: ${error}`}</Text>
      ) : cohorts.length === 0 ? (
        <Text color={theme.colors.retroSlateDark}>No enrolled cohorts were found.</Text>
      ) : (
        <Box flexDirection="column" marginTop={1}>
          {cohorts.map((cohort, index) => {
            const selected = index === selectedIndex;
            return (
              <Box key={cohort.id} flexDirection="column" marginBottom={1}>
                <Box flexDirection="row" gap={1}>
                  <Text color={selected ? theme.colors.retroGreenBright : theme.colors.white} bold={selected}>
                    {`${selected ? "›" : " "} ${cohort.name}`}
                  </Text>
                  {cohort.level && (
                    <Text color={theme.colors.retroBlueBright}>
                      {`[${cohort.level.toUpperCase()}]`}
                    </Text>
                  )}
                </Box>
                <Text color={theme.colors.retroSlateDark}>
                  {`    Domain: ${cohort.department || "General"}${cohort.supervisorName ? ` · Supervisor: ${cohort.supervisorName}` : ""}${cohort.githubRepoUrl ? " · Repo: linked" : ""}`}
                </Text>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

