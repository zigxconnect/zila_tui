import React, { useState, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";
import {
  getRegisteredCommands,
  type ZilaCommand,
} from "../commands/registry.js";

// Category definitions

const CATEGORIES: Array<{
  key: ZilaCommand["category"];
  label: string;
  icon: string;
}> = [
  { key: "setup", label: "Setup", icon: "⚙" },
  { key: "workflow", label: "Workflow", icon: "◈" },
  { key: "info", label: "Info", icon: "ℹ" },
  { key: "search", label: "Search", icon: "⌕" },
  { key: "agent", label: "Agent", icon: "✦" },
];

interface HelpScreenProps {
  onClose: () => void;
  onSelect: (commandName: string) => void;
  clearHistory?: () => void;
}

export const HelpScreen: React.FC<HelpScreenProps> = ({
  onClose,
  onSelect,
}) => {
  const allCommands = useMemo(() => getRegisteredCommands(), []);
  const selectableCmds = useMemo(
    () => allCommands.filter((c) => c.available),
    [allCommands],
  );
  const [activeIdx, setActiveIdx] = useState(0);

  useInput((char, key) => {
    if (key.escape || char === "q") {
      onClose();
      return;
    }
    if (key.return) {
      const cmd = selectableCmds[activeIdx];
      if (cmd) onSelect(cmd.name);
      return;
    }
    if (key.upArrow) {
      setActiveIdx((p) => (p > 0 ? p - 1 : selectableCmds.length - 1));
      return;
    }
    if (key.downArrow) {
      setActiveIdx((p) => (p < selectableCmds.length - 1 ? p + 1 : 0));
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
      {/* Title */}
      <Box marginBottom={1} flexDirection="row" gap={2}>
        <Text bold color={theme.colors.primary}>
          ZILA
        </Text>
        <Text color={theme.colors.muted}>Command Reference</Text>
      </Box>

      <Text color={theme.colors.border}>{"─".repeat(58)}</Text>

      {/* Command groups */}
      {CATEGORIES.map(({ key, label, icon }) => {
        const cmds = allCommands.filter((c) => c.category === key);
        if (cmds.length === 0) return null;

        return (
          <Box flexDirection="column" marginTop={1} key={key}>
            {/* Category header */}
            <Box flexDirection="row" gap={1} marginBottom={1}>
              <Text color={theme.colors.muted}>{icon}</Text>
              <Text bold color={theme.colors.muted}>
                {label.toUpperCase()}
              </Text>
            </Box>

            {cmds.map((cmd) => {
              const isSelected =
                cmd.available && selectableCmds[activeIdx]?.name === cmd.name;

              return (
                <Box flexDirection="row" key={cmd.name} paddingLeft={1}>
                  {/* Selection indicator */}
                  <Box width={3} flexShrink={0}>
                    {cmd.available ? (
                      <Text
                        color={
                          isSelected ? theme.colors.primary : theme.colors.dim
                        }
                      >
                        {isSelected ? "❯" : " "}
                      </Text>
                    ) : (
                      <Text color={theme.colors.border}>·</Text>
                    )}
                  </Box>

                  {/* Command name */}
                  <Box width={18} flexShrink={0}>
                    <Text
                      color={
                        !cmd.available
                          ? theme.colors.dim
                          : isSelected
                            ? theme.colors.white
                            : theme.colors.info
                      }
                      bold={isSelected}
                    >
                      {cmd.name}
                    </Text>
                  </Box>

                  {/* Usage */}
                  <Box width={26} flexShrink={0}>
                    <Text
                      color={isSelected ? theme.colors.text : theme.colors.dim}
                    >
                      {cmd.usage}
                    </Text>
                  </Box>

                  {/* Description */}
                  <Text
                    color={
                      cmd.available
                        ? isSelected
                          ? theme.colors.text
                          : theme.colors.muted
                        : theme.colors.border
                    }
                  >
                    {cmd.description}
                    {!cmd.available ? "  (coming soon)" : ""}
                  </Text>
                </Box>
              );
            })}
          </Box>
        );
      })}

      {/* Footer */}
      <Box marginTop={1}>
        <Text color={theme.colors.border}>{"─".repeat(58)}</Text>
      </Box>
      <Box marginTop={0}>
        <Text color={theme.colors.dim}>
          <Text color={theme.colors.text}>↑/↓</Text> navigate{"   "}
          <Text color={theme.colors.text}>Enter</Text> run command{"   "}
          <Text color={theme.colors.text}>Esc / Q</Text> close
        </Text>
      </Box>
    </Box>
  );
};
