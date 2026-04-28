import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { Divider } from "../ui/Divider.js";
import {
  getRegisteredCommands,
  type ZilaCommand,
} from "../commands/registry.js";

const CATEGORIES: Array<{ key: ZilaCommand["category"]; label: string }> = [
  { key: "setup",  label: "Setup" },
  { key: "info",   label: "Info" },
  { key: "search", label: "Search" },
  { key: "agent",  label: "Agent" },
];

interface HelpScreenProps {
  onClose: () => void;
  onSelect: (commandName: string) => void;
}

export const HelpScreen: React.FC<HelpScreenProps> = ({
  onClose,
  onSelect,
}) => {
  const allCommands        = getRegisteredCommands();
  const selectableCmds     = allCommands.filter((c) => c.available);
  const [activeIdx, setIdx] = useState(0);

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
      setIdx((prev) => (prev > 0 ? prev - 1 : selectableCmds.length - 1));
      return;
    }
    if (key.downArrow) {
      setIdx((prev) => (prev < selectableCmds.length - 1 ? prev + 1 : 0));
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
      {/* Header */}
      <Box marginBottom={1} flexDirection="row" gap={2}>
        <Text bold color={theme.colors.primary}>ZILA</Text>
        <Text color={theme.colors.muted}>Command Reference</Text>
      </Box>

      <Divider width={36} />

      {/* Command groups */}
      {CATEGORIES.map(({ key, label }) => {
        const cmds = allCommands.filter((c) => c.category === key);
        if (cmds.length === 0) return null;

        const allUnavailable = cmds.every((c) => !c.available);

        return (
          <Box flexDirection="column" marginTop={1} key={key}>
            {/* Category header */}
            <Box flexDirection="row" gap={1}>
              <Text bold color={theme.colors.muted}>
                {label.toUpperCase()}
              </Text>
              {allUnavailable && (
                <Text color={theme.colors.accent}>coming soon</Text>
              )}
            </Box>

            {/* Commands in category */}
            {cmds.map((cmd) => {
              const isSelected =
                cmd.available &&
                selectableCmds[activeIdx]?.name === cmd.name;

              return (
                <Box flexDirection="row" key={cmd.name} marginLeft={1}>
                  {/* Cursor / bullet */}
                  <Box width={3}>
                    {cmd.available ? (
                      <Text color={isSelected ? theme.colors.primary : ""}>
                        {isSelected ? theme.symbols.pointer : " "}
                      </Text>
                    ) : (
                      <Text color={theme.colors.border}>{"···"}</Text>
                    )}
                  </Box>

                  {/* Command name */}
                  <Box width={14}>
                    <Text
                      color={
                        !cmd.available
                          ? theme.colors.dim
                          : isSelected
                          ? theme.colors.white
                          : theme.colors.text
                      }
                      bold={isSelected}
                    >
                      {cmd.name}
                    </Text>
                  </Box>

                  {/* Usage */}
                  <Box width={20}>
                    <Text color={theme.colors.dim}>{cmd.usage}</Text>
                  </Box>

                  {/* Description */}
                  <Text
                    color={cmd.available ? theme.colors.muted : theme.colors.border}
                  >
                    {cmd.description}
                  </Text>
                </Box>
              );
            })}
          </Box>
        );
      })}

      {/* Keyboard hint */}
      <Box marginTop={2}>
        <Text color={theme.colors.border}>
          {"↑↓ navigate   Enter select   Esc / q close"}
        </Text>
      </Box>
    </Box>
  );
};
