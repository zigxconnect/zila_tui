import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { theme } from '../ui/theme.js';
import { StatusLine } from '../ui/StatusLine.js';
import { Banner } from '../ui/Banner.js';
import { checkGit, checkNode } from '../commands/init/checks.js';
import { probeNetwork } from '../utils/network.js';

interface InitScreenProps {
  onComplete: () => void;
}

type StepStatus = 'pending' | 'loading' | 'success' | 'error' | 'warning';

export const InitScreen: React.FC<InitScreenProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [statuses, setStatuses] = useState<StepStatus[]>(Array(6).fill('pending'));
  const [details, setDetails] = useState<string[]>(Array(6).fill(''));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // State for the network failure mini-prompt
  const [awaitingNetworkChoice, setAwaitingNetworkChoice] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const updateStep = (index: number, status: StepStatus, detail: string = '') => {
    setStatuses(prev => { const n = [...prev]; n[index] = status; return n; });
    setDetails(prev => { const n = [...prev]; n[index] = detail; return n; });
  };

  const runFlow = async (skipNetwork = false) => {
    setErrorMsg(null);
    setAwaitingNetworkChoice(false);

    try {
      // STEP 1: System Checks
      if (currentStep <= 1) {
        updateStep(0, 'loading', 'Checking git and node...');
        const git = await checkGit();
        if (!git.passed) throw new Error(git.error);
        const node = await checkNode();
        if (!node.passed) throw new Error(node.error);
        
        updateStep(0, 'success', `git (${git.version}), node (${node.version})`);
        setCurrentStep(2);
      }


      // STEP 2: Network Probe
      if (currentStep <= 2) {
        if (skipNetwork) {
          updateStep(1, 'warning', 'Skipped');
          setCurrentStep(3);
        } else {
          updateStep(1, 'loading', 'Pinging github.com...');
          try {
            await probeNetwork();
            updateStep(1, 'success', 'Connected');
            setCurrentStep(3);
          } catch (err: any) {
            updateStep(1, 'error', 'Offline');
            setAwaitingNetworkChoice(true);
            return; // Halt execution and wait for user input
          }
        }
      }

      // STEPS 3: Mocks for Cloner and Installer
      if (currentStep <= 3) {
        if(skipNetwork){
            updateStep(3, "warning", 'Skipped')
        }
      }

      if (currentStep <= 4) {
        updateStep(3, 'loading', 'Installing python deps...');
        await new Promise(r => setTimeout(r, 1200));
        updateStep(3, 'success', '12 packages installed');
        setCurrentStep(5);
      }

      if (currentStep <= 5) {
        updateStep(4, 'loading', 'Cloning assistant...');
        await new Promise(r => setTimeout(r, 600));
        updateStep(4, 'success', '.assistant/ (890 KB)');
        setCurrentStep(6);
      }

      if (currentStep <= 6) {
        updateStep(5, 'loading', 'Installing assistant deps...');
        await new Promise(r => setTimeout(r, 900));
        updateStep(5, 'success', '8 packages installed');
        setIsFinished(true);
      }

    } catch (err: any) {
      updateStep(currentStep - 1, 'error');
      setErrorMsg(err.message);
    }
  };

  useEffect(() => {
    runFlow();
  }, []); // Run once on mount

  // Handle mini-prompt input when network fails
  useInput((char, key) => {
    if (isFinished && (key.return || key.escape || char === 'q')) {
      onComplete();
    }

    if (awaitingNetworkChoice) {
      if (char === 'r') runFlow(false); // Retry
      if (char === 's') runFlow(true);  // Skip
      if (char === 'q') onComplete();   // Quit back to prompt
    }
  });

  const getDetail = (index: number): string => details[index] ?? "";

  return (
    <Box flexDirection="column" paddingY={1}>
      <StatusLine status={statuses[0] ?? 'pending'} label="[1/6] System requirements" detail={getDetail(0)} />
      <StatusLine status={statuses[1] ?? 'pending'} label="[2/6] Network connectivity" detail={getDetail(1)} />
      <StatusLine status={statuses[2] ?? 'pending'} label="[3/6] Curriculum workspace" detail={getDetail(2)} />
      <StatusLine status={statuses[3] ?? 'pending'} label="[4/6] Curriculum dependencies" detail={getDetail(3)} />
      <StatusLine status={statuses[4] ?? 'pending'} label="[5/6] Assistant workspace" detail={getDetail(4)} />
      <StatusLine status={statuses[5] ?? 'pending'} label="[6/6] Assistant dependencies" detail={getDetail(5)} />

      {/* Fatal Error Display */}
      {errorMsg && (
        <Box marginTop={1}>
          <Banner type="error" title="Setup Halted">
            <Text color={theme.colors.white}>{errorMsg}</Text>
            <Text color={theme.colors.dim}>Fix the issue above and run <Text color={theme.colors.primary}>zila init</Text> again.</Text>
          </Banner>
        </Box>
      )}

      {/* Network Recovery Prompt */}
      {awaitingNetworkChoice && (
        <Box marginTop={1}>
          <Banner type="error" title="Network Error">
            <Text color={theme.colors.white}>No network connection detected.</Text>
            <Box flexDirection="column" marginY={1}>
              <Text color={theme.colors.dim}>  <Text bold color={theme.colors.white}>r</Text>  Retry now</Text>
              <Text color={theme.colors.dim}>  <Text bold color={theme.colors.white}>s</Text>  Skip cloning</Text>
              <Text color={theme.colors.dim}>  <Text bold color={theme.colors.white}>q</Text>  Quit setup</Text>
            </Box>
            <Text color={theme.colors.primary}>{'> _'}</Text>
          </Banner>
        </Box>
      )}

      {/* Final Success Banner */}
      {isFinished && (
        <Box marginTop={1} flexDirection="column">
          <Banner type="success" title="ZILA is ready">
            <Text color={theme.colors.white}>🚀 Your workspace has been set up.</Text>
            <Box flexDirection="column" marginY={1}>
              <Text color={theme.colors.dim}>.curriculum/   <Text color={theme.colors.muted}>ML & AI beginner track content</Text></Text>
              <Text color={theme.colors.dim}>.assistant/    <Text color={theme.colors.muted}>Your AI progress companion</Text></Text>
            </Box>
            <Text color={theme.colors.white}>Next: type <Text color={theme.colors.primary}>assistant --agent</Text> to get started.</Text>
          </Banner>
          <Text color={theme.colors.muted}>Press Enter to return to shell...</Text>
        </Box>
      )}
    </Box>
  );
};