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
    capacity: "15 Active Interns",
  },
  {
    id: "TRK-02",
    name: "Full-Stack Web & Distributed Systems",
    department: "Cloud Engineering Division",
    supervisor: "Engineering Core <core@zigex.com>",
    duration: "12 Weeks (Summer 2026)",
    capacity: "20 Active Interns",
  },
  {
    id: "TRK-03",
    name: "Embedded Systems & IoT Firmware",
    department: "Hardware & Robotics Lab",
    supervisor: "Systems Lead <firmware@zigex.com>",
    duration: "10 Weeks (Summer 2026)",
    capacity: "8 Active Interns",
  },
  {
    id: "TRK-04",
    name: "Cybersecurity & Cryptographic Protocols",
    department: "Security Architecture",
    supervisor: "SecOps Lead <sec@zigex.com>",
    duration: "10 Weeks (Summer 2026)",
    capacity: "10 Active Interns",
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
      {/* 90s Track Selection Frame */}
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
              [ COHORT SPECIALIZATION TRACK SELECTOR ]
            </Text>
          </Box>
          <Box flexDirection="row">
            <Text color={theme.colors.retroGreen} bold>[SUMMER 2026]</Text>
          </Box>
        </Box>

        {/* Tracks List */}
        <Box flexDirection="column" marginBottom={1}>
          {TRACKS.map((t, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <Box
                key={t.id}
                flexDirection="row"
                borderStyle="single"
                borderColor={isSelected ? theme.colors.retroCyanBright : theme.colors.border}
                paddingX={1}
                marginBottom={0}
              >
                <Text color={isSelected ? theme.colors.retroCyanBright : theme.colors.dim} bold>
                  {isSelected ? "› " : "  "}
                </Text>
                <Box width={10}>
                  <Text color={isSelected ? theme.colors.retroAmberBright : theme.colors.muted} bold>
                    {t.id}
                  </Text>
                </Box>
                <Box width={36}>
                  <Text color={isSelected ? theme.colors.textBright : theme.colors.text} bold={isSelected}>
                    {t.name}
                  </Text>
                </Box>
                <Text color={theme.colors.retroGreen}>
                  [{t.capacity}]
                </Text>
              </Box>
            );
          })}
        </Box>

        {/* Track Detail Inspection Card */}
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor={theme.colors.border}
          paddingX={1}
          paddingY={0}
        >
          <Text color={theme.colors.accent} bold>TRACK DOSSIER INSPECTOR:</Text>
          <Box flexDirection="row">
            <Text color={theme.colors.muted}>Track Title:   </Text>
            <Text color={theme.colors.textBright} bold>{current.name}</Text>
          </Box>
          <Box flexDirection="row">
            <Text color={theme.colors.muted}>Department:    </Text>
            <Text color={theme.colors.text}>{current.department}</Text>
          </Box>
          <Box flexDirection="row">
            <Text color={theme.colors.muted}>Supervisor:    </Text>
            <Text color={theme.colors.retroGreenBright} bold>{current.supervisor}</Text>
          </Box>
          <Box flexDirection="row">
            <Text color={theme.colors.muted}>Program Terms: </Text>
            <Text color={theme.colors.text}>{current.duration}</Text>
          </Box>
        </Box>

        {/* Footer */}
        <Box marginTop={1} flexDirection="row" justifyContent="space-between">
          <Text color={theme.colors.dim}>[↑/↓: SELECT TRACK] [ENTER: CONFIRM] [ESC: RETURN]</Text>
          <Text color={theme.colors.retroSlateDark}>TRACK {selectedIndex + 1} OF {TRACKS.length}</Text>
        </Box>
      </Box>
    </Box>
  );
};
