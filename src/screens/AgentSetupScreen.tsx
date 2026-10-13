import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";
import {
  SUPPORTED_PROVIDERS,
  saveAgentConfig,
  type AIProvider,
  type ProviderMetadata,
} from "../utils/aiConfig.js";
import { validateProviderApiKey } from "../utils/aiValidation.js";

interface AgentSetupScreenProps {
  onClose: () => void;
}

type SetupStep = "select_provider" | "enter_key" | "validating" | "success" | "error";

export const AgentSetupScreen: React.FC<AgentSetupScreenProps> = ({ onClose }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [step, setStep] = useState<SetupStep>("select_provider");
  const [apiKey, setApiKey] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const selectedProvider: ProviderMetadata = SUPPORTED_PROVIDERS[selectedIndex]!;

  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }

    if (step === "select_provider") {
      if (key.upArrow) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : SUPPORTED_PROVIDERS.length - 1));
      } else if (key.downArrow) {
        setSelectedIndex((prev) => (prev < SUPPORTED_PROVIDERS.length - 1 ? prev + 1 : 0));
      } else if (key.return) {
        setStep("enter_key");
        setApiKey("");
        setErrorMessage("");
      }
    } else if (step === "enter_key") {
      if (key.return) {
        if (!apiKey.trim()) {
          setErrorMessage("API key cannot be empty.");
          return;
        }
        submitApiKey(selectedProvider.id, apiKey.trim());
      } else if (key.backspace || key.delete) {
        setApiKey((prev) => prev.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        setApiKey((prev) => prev + input);
      }
    } else if (step === "success" || step === "error") {
      if (key.return) {
        if (step === "success") {
          onClose();
        } else {
          setStep("enter_key");
          setErrorMessage("");
        }
      }
    }
  });

  async function submitApiKey(provider: AIProvider, keyToTest: string) {
    setStep("validating");
    setStatusMessage(`Testing API Key handshake with ${selectedProvider.name}...`);

    const result = await validateProviderApiKey(provider, keyToTest);

    if (result.valid) {
      saveAgentConfig({
        provider,
        apiKey: keyToTest,
        model: selectedProvider.defaultModel,
        configuredAt: new Date().toISOString(),
      });
      setStep("success");
      setStatusMessage(`[✔] ${result.message}\n[✔] Provider calibrated: ${selectedProvider.name} (${selectedProvider.defaultModel})`);
    } else {
      setStep("error");
      setErrorMessage(result.message);
    }
  }

  const maskedKey = apiKey.length > 0 ? "*".repeat(Math.min(apiKey.length, 36)) : "";

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.colors.retroBlueBright}
      paddingX={2}
      paddingY={1}
      width={78}
    >
      <Box marginBottom={1}>
        <Text color={theme.colors.retroBlueBright} bold>
          lil-zila › configure autonomous ai agent
        </Text>
      </Box>

      {step === "select_provider" && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color={theme.colors.retroSlateDark}>
              Select your preferred intelligence provider (↑/↓ arrows, Enter to select, Esc to exit):
            </Text>
          </Box>

          {SUPPORTED_PROVIDERS.map((prov, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <Box key={prov.id} flexDirection="row" marginY={0}>
                <Text color={isSelected ? theme.colors.retroBlueBright : theme.colors.retroSlateDark} bold={isSelected}>
                  {isSelected ? "❯ " : "  "}
                  {`[${idx + 1}] `}
                  {prov.name}
                </Text>
                {prov.recommended && (
                  <Text color={theme.colors.retroGreen} bold>
                    {" "}
                    (Recommended)
                  </Text>
                )}
                <Text color={theme.colors.retroSlateDark}> — {prov.description}</Text>
              </Box>
            );
          })}
        </Box>
      )}

      {step === "enter_key" && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color={theme.colors.retroSlateLight}>
              Configuring <Text bold color={theme.colors.retroBlueBright}>{selectedProvider.name}</Text>:
            </Text>
          </Box>
          <Box marginBottom={1}>
            <Text color={theme.colors.retroSlateDark}>
              Paste your API key below and press Enter (input is masked for security):
            </Text>
          </Box>
          <Box flexDirection="row">
            <Text color={theme.colors.retroBlueBright} bold>
              ❯{" "}
            </Text>
            <Text color={theme.colors.retroYellow}>{maskedKey || "..."}</Text>
          </Box>
          {errorMessage && (
            <Box marginTop={1}>
              <Text color={theme.colors.retroRed} bold>
                ✖ {errorMessage}
              </Text>
            </Box>
          )}
        </Box>
      )}

      {step === "validating" && (
        <Box flexDirection="column" marginY={1}>
          <Text color={theme.colors.retroYellow} bold>
            ⏳ {statusMessage}
          </Text>
        </Box>
      )}

      {step === "success" && (
        <Box flexDirection="column" marginY={1}>
          <Text color={theme.colors.retroGreen} bold>
            {statusMessage}
          </Text>
          <Box marginTop={1}>
            <Text color={theme.colors.retroBlueBright} bold>
              Agent Setup Completed: 100%
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text color={theme.colors.retroSlateLight}>
              Press Enter to return. Type 'lil-agent' in terminal to chat with your assistant!
            </Text>
          </Box>
        </Box>
      )}

      {step === "error" && (
        <Box flexDirection="column" marginY={1}>
          <Text color={theme.colors.retroRed} bold>
            ✖ Validation Failed: {errorMessage}
          </Text>
          <Box marginTop={1}>
            <Text color={theme.colors.retroSlateDark}>
              Press Enter to try entering your key again, or Esc to exit.
            </Text>
          </Box>
        </Box>
      )}

      <Box marginTop={1} borderStyle="single" borderColor={theme.colors.retroSlateDark} paddingX={1}>
        <Text color={theme.colors.retroSlateDark} dimColor>
          esc cancel · enter confirm · ↑/↓ navigate providers
        </Text>
      </Box>
    </Box>
  );
};
