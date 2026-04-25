// src/screens/HelpScreen.tsx
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { theme } from '../ui/theme.js';
import { getRegisteredCommands, type ZilaCommand } from '../commands/registry.js';

interface HelpScreenProps {
  onClose: () => void;
  onSelect: (commandName: string) => void;
}

export const HelpScreen: React.FC<HelpScreenProps> = ({ onClose, onSelect }) => {
  const allCommands = getRegisteredCommands();
  
  // Create an array of only selectable commands for our index logic
  const selectableCommands = allCommands.filter(c => c.available);
  const [activeIndex, setActiveIndex] = useState(0);

  // Group commands by category for rendering
  const categories = ['setup', 'info', 'search', 'agent'] as const;
  
  useInput((char, key) => {
    if (key.escape || char === 'q') {
      onClose();
    } else if (key.return) {
      onSelect(selectableCommands[activeIndex]!.name);
    } else if (key.upArrow) {
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : selectableCommands.length - 1));
    } else if (key.downArrow) {
      setActiveIndex((prev) => (prev < selectableCommands.length - 1 ? prev + 1 : 0));
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.colors.border} paddingX={2} paddingY={1}>
      <Text bold color={theme.colors.primary}>ZILA Help</Text>
      
      {categories.map((category) => {
        const catCommands = allCommands.filter((c) => c.category === category);
        if (catCommands.length === 0) return null;

        const allUnavailable = catCommands.every(c => !c.available);

        return (
          <Box flexDirection="column" marginTop={1} key={category}>
            <Box flexDirection="row">
              <Text bold color={theme.colors.white}>{category.toUpperCase()}</Text>
              {allUnavailable && <Text color={theme.colors.muted}>  (coming soon)</Text>}
            </Box>
            
            {catCommands.map((cmd) => {
              const isSelected = cmd.available && selectableCommands[activeIndex] === cmd;
              const cursor = isSelected ? theme.symbols.pointer : ' ';
              const cursorColor = isSelected ? theme.colors.primary : theme.colors.dim;

              return (
                <Box flexDirection="row" key={cmd.name}>
                  <Box width={3}>
                    <Text color={cursorColor}>
                      {cmd.available ? ` ${cursor}` : ` ${theme.symbols.bullet.repeat(3)}`}
                    </Text>
                  </Box>
                  <Box width={15}>
                    <Text color={cmd.available ? theme.colors.white : theme.colors.muted}>
                      {cmd.name}
                    </Text>
                  </Box>
                  <Text color={cmd.available ? theme.colors.dim : theme.colors.border}>
                    {cmd.description}
                  </Text>
                </Box>
              );
            })}
          </Box>
        );
      })}

      <Box marginTop={2}>
        <Text color={theme.colors.muted}>
          ↑ ↓ navigate   Enter select   Esc/q close
        </Text>
      </Box>
    </Box>
  );
};