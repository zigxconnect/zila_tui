import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { Spinner } from "../ui/Spinner.js";
import { zilaApi } from "../utils/auth.js";

export interface CohortOption {
  id: string;
  name: string;
  department?: string;
  enrollmentStatus?: string;
  supervisorName?: string;
}

interface CohortsResponse {
  cohorts?: CohortOption[];
}

export type CohortPickerMode = "group" | "leaderboard";

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

  const title = mode === "group" ? "Choose a cohort team" : "Choose a cohort leaderboard";

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box flexDirection="row" gap={1}>
        <Text color={theme.colors.retroBlue} bold>lil-zila</Text>
        <Text color={theme.colors.retroSlateDark}>›</Text>
        <Text color={theme.colors.white} bold>{title}</Text>
      </Box>
      <Text color={theme.colors.retroSlateDark}>Select with ↑/↓, open with enter, cancel with esc.</Text>

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
                <Text color={selected ? theme.colors.retroGreenBright : theme.colors.white} bold={selected}>
                  {`${selected ? "›" : " "} ${cohort.name}`}
                </Text>
                <Text color={theme.colors.retroSlateDark}>
                  {`  ${cohort.department || "General"}${cohort.supervisorName ? ` · ${cohort.supervisorName}` : ""}`}
                </Text>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};
