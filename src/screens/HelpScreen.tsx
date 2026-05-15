import React, { useState, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { Divider } from "../ui/Divider.js";
import { getRegisteredCommands, type ZilaCommand } from "../commands/registry.js";

const CATEGORIES: Array<{ key: ZilaCommand["category"]; label: string }> = [
  { key: "setup",  label: "Setup" },
  { key: "info",   label: "Info" },
  { key: "search", label: "Search" },
  { key: "agent",  label: "Agent" },
];

interface HelpScreenProps {
  onClose: () => void;
  onSelect: (commandName: string) => void;
  clearHistory?: () => void;
}

export const HelpScreen: React.FC<HelpScreenProps> = ({ onClose, onSelect }) => {
  const allCommands = useMemo(() => getRegisteredCommands(), []);
  const selectableCmds = useMemo(() => allCommands.filter((c) => c.available), [allCommands]);
  
  const [activeIdx, setActiveIdx] = useState(0);

  useInput((char, key) => {
    if (key.escape || char === "q") {
      onClose();
      return;
    }
    // Handle clear command globally
    if (char === "c" && key.ctrl) { // Ctrl+C is already handled by shell for exit, so use a different combo
      // Actually, let's check for typed "clear" command
      return;
    }
    if (key.return) {
      const cmd = selectableCmds[activeIdx];
      if (cmd) onSelect(cmd.name);
      return;
    }
    if (key.upArrow) {
      setActiveIdx((prev) => (prev > 0 ? prev - 1 : selectableCmds.length - 1));
      return;
    }
    if (key.downArrow) {
      setActiveIdx((prev) => (prev < selectableCmds.length - 1 ? prev + 1 : 0));
      return;
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.colors.border}
      paddingX={2}
      paddingY={1}
      marginTop={1}
    >
      <Box marginBottom={1} flexDirection="row" gap={2}>
        <Text bold color={theme.colors.primary}>ZILA</Text>
        <Text color={theme.colors.muted}>Command Reference</Text>
      </Box>

      <Divider width={40} />

      {CATEGORIES.map(({ key, label }) => {
        const cmds = allCommands.filter((c) => c.category === key);
        if (cmds.length === 0) return null;

        const allUnavailable = cmds.every((c) => !c.available);

        return (
          <Box flexDirection="column" marginTop={1} key={key}>
            <Box flexDirection="row" gap={1} marginBottom={1}>
              <Text bold color={theme.colors.muted}>{label.toUpperCase()}</Text>
              {allUnavailable && <Text color={theme.colors.accent} dimColor>(coming soon)</Text>}
            </Box>

            {cmds.map((cmd) => {
              const isSelected = cmd.available && selectableCmds[activeIdx]?.name === cmd.name;

              return (
                <Box flexDirection="row" key={cmd.name} paddingLeft={1}>
                  <Box width={3} flexShrink={0}>
                    {cmd.available ? (
                      <Text color={isSelected ? theme.colors.primary : theme.colors.dim}>
                        {isSelected ? "❯" : " "}
                      </Text>
                    ) : (
                      <Text color={theme.colors.border}>·</Text>
                    )}
                  </Box>

                  <Box width={16} flexShrink={0}>
                    <Text
                      color={!cmd.available ? theme.colors.dim : isSelected ? theme.colors.white : theme.colors.info}
                      bold={isSelected}
                    >
                      {cmd.name}
                    </Text>
                  </Box>

                  <Box width={24} flexShrink={0}>
                    <Text color={isSelected ? theme.colors.text : theme.colors.dim}>
                      {cmd.usage}
                    </Text>
                  </Box>

                  <Box flexShrink={1}>
                    <Text color={cmd.available ? (isSelected ? theme.colors.text : theme.colors.muted) : theme.colors.border}>
                      {cmd.description}
                    </Text>
                  </Box>
                </Box>
              );
            })}
          </Box>
        );
      })}

      <Box marginTop={2} paddingTop={1} borderStyle="single" borderTop borderColor={theme.colors.border} borderBottom={false} borderLeft={false} borderRight={false}>
        <Text color={theme.colors.dim}>
          <Text color={theme.colors.text}>↑/↓</Text> navigate   <Text color={theme.colors.text}>Enter</Text> select   <Text color={theme.colors.text}>Esc/Q</Text> close
        </Text>
      </Box>
    </Box>
  );
};