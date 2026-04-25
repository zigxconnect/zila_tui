import React from 'react';
import { Box, Text } from 'ink';
import { theme } from './theme.js';
import { Spinner } from './Spinner.js';

export interface StatusLineProps {
  status: 'pending' | 'loading' | 'success' | 'error' | 'warning';
  label: string;
  detail?: string;
}

export const StatusLine: React.FC<StatusLineProps> = ({ status, label, detail }) => {
  const renderIcon = () => {
    switch (status) {
      case 'loading': 
        return <Spinner />;
      case 'success': 
        return <Text color={theme.colors.success}>{theme.symbols.success}</Text>;
      case 'error':   
        return <Text color={theme.colors.error}>{theme.symbols.error}</Text>;
      case 'warning': 
        return <Text color={theme.colors.warning}>{theme.symbols.warning}</Text>;
      case 'pending': 
      default:
        return <Text color={theme.colors.muted}>{theme.symbols.bullet}</Text>;
    }
  };

  return (
    <Box flexDirection="row">
      <Box width={3}>{renderIcon()}</Box>
      <Text color={theme.colors.white}>{label}</Text>
      {/* Only render detail if it exists so we don't get awkward spacing */}
      {detail ? <Text color={theme.colors.muted}> {detail}</Text> : null}
    </Box>
  );
};