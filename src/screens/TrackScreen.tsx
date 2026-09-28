import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";

interface Track {
  id: string;
  name: string;
  department: string;
  supervisor: string;
  duration: string;
  capacity: string;
}

const TRACKS: Track[] = [
  {
    id: "TRK-01",
    name: "Machine Learning / AI",
    department: "SEED Summer Internship Program",
    supervisor: "Leonhard Hopeful <leonhardkwahle@gmail.com>",
    duration: "12 Weeks (Summer 2026)",
    capacity: "15 Interns",
  },
  {
    id: "TRK-02",
    name: "Full-Stack Web & Distributed Systems",
    department: "Cloud Engineering Division",
    supervisor: "Engineering Core <core@zigex.com>",
    duration: "12 Weeks (Summer 2026)",
    capacity: "20 Interns",
  },
  {
    id: "TRK-03",
    name: "Embedded Systems & IoT Firmware",
    department: "Hardware & Robotics Lab",
    supervisor: "Systems Lead <firmware@zigex.com>",
    duration: "10 Weeks (Summer 2026)",
    capacity: "8 Interns",
  },
  {
    id: "TRK-04",
    name: "Cybersecurity & Cryptographic Protocols",
    department: "Security Architecture",
    supervisor: "SecOps Lead <sec@zigex.com>",
    duration: "10 Weeks (Summer 2026)",
    capacity: "10 Interns",
  },
];

interface TrackScreenProps {
  onClose: () => void;
  onSelect?: (track: Track) => void;
}

export const TrackScreen: React.FC<TrackScreenProps> = ({ onClose, onSelect }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((char, key) => {
    if (key.escape || char === "q") {
      onClose();
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : TRACKS.length - 1));
      return;
    }

    if (key.downArrow) {
      setSelectedIndex((prev) => (prev < TRACKS.length - 1 ? prev + 1 : 0));
      return;
    }

    if (key.return) {
      const selected = TRACKS[selectedIndex];
      if (selected && onSelect) {
        onSelect(selected);
      }
      onClose();
    }
  });

  const current = TRACKS[selectedIndex]!;

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Top rule */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.retroBlue} bold>{"lil-zila"}</Text>
          <Text color={theme.colors.retroSlateDark}>{"›"}</Text>
          <Text color={theme.colors.white} bold>{"specialization tracks"}</Text>
        </Box>
        <Text color={theme.colors.retroSlateDark}>{`track ${selectedIndex + 1} of ${TRACKS.length}`}</Text>
      </Box>

      {/* Divider */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {/* Track List */}
      <Box flexDirection="column" marginBottom={1}>
        {TRACKS.map((t, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <Box key={t.id} flexDirection="row" alignItems="center" gap={1}>
              <Text color={isSelected ? theme.colors.retroBlueBright : theme.colors.retroSlateDark} bold>
                {isSelected ? "›" : " "}
              </Text>
              <Box width={10}>
                <Text color={isSelected ? theme.colors.retroBlueBright : theme.colors.retroSlateDark}>
                  {t.id}
                </Text>
              </Box>
              <Box width={38}>
                <Text color={isSelected ? theme.colors.white : theme.colors.retroSlate} bold={isSelected}>
                  {t.name}
                </Text>
              </Box>
              <Text color={theme.colors.retroSlateDark}>{t.capacity}</Text>
            </Box>
          );
        })}
      </Box>

      {/* Selected Track Details */}
      <Box flexDirection="column" gap={0} marginBottom={1}>
        <Text color={theme.colors.retroBlueBright} bold>{"TRACK DETAILS"}</Text>
        <Box flexDirection="row" gap={2}>
          <Box width={14}>
            <Text color={theme.colors.retroSlateDark}>{"Department:"}</Text>
          </Box>
          <Text color={theme.colors.white}>{current.department}</Text>
        </Box>
        <Box flexDirection="row" gap={2}>
          <Box width={14}>
            <Text color={theme.colors.retroSlateDark}>{"Supervisor:"}</Text>
          </Box>
          <Text color={theme.colors.white} bold>{current.supervisor}</Text>
        </Box>
        <Box flexDirection="row" gap={2}>
          <Box width={14}>
            <Text color={theme.colors.retroSlateDark}>{"Duration:"}</Text>
          </Box>
          <Text color={theme.colors.white}>{current.duration}</Text>
        </Box>
      </Box>

      {/* Bottom rule */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {/* Footer */}
      <Box flexDirection="row" justifyContent="space-between">
        <Text color={theme.colors.retroSlateDark}>{"↑/↓ select · enter confirm · esc close"}</Text>
        <Text color={theme.colors.retroSlateDark}>{"Summer 2026 Program"}</Text>
      </Box>
    </Box>
  );
};
