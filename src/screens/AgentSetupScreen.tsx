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
  onConfigured: () => void;
}

type SetupStep =
  | "select_provider"
  | "enter_key"
  | "validating"
  | "error";

export async function validateAndConfigureAgent(
  provider: AIProvider,
  apiKey: string,
  onConfigured: () => void,
): Promise<string | null> {
  const result = await validateProviderApiKey(provider, apiKey);
  if (!result.valid) return result.message;

  const defaultModel = SUPPORTED_PROVIDERS.find((item) => item.id === provider)!.defaultModel;
  saveAgentConfig({
    provider,
    apiKey,
    model: defaultModel,
    configuredAt: new Date().toISOString(),
  });
  onConfigured();
  return null;
}

export const AgentSetupScreen: React.FC<AgentSetupScreenProps> = ({ onClose, onConfigured }) => {
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
    } else if (step === "error") {
      if (key.return) {
        setStep("enter_key");
        setErrorMessage("");
      }
    }
  });

  async function submitApiKey(provider: AIProvider, keyToTest: string) {
    setStep("validating");
    setStatusMessage(`Testing API Key handshake with ${selectedProvider.name}...`);

    const error = await validateAndConfigureAgent(provider, keyToTest, onConfigured);

    if (error) {
      setStep("error");
      setErrorMessage(error);
    }
  }

  const maskedKey = apiKey.length > 0 ? "*".repeat(Math.min(apiKey.length, 36)) : "";

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Top rule */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(78)}</Text>

      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.retroBlue} bold>
            agent
          </Text>
          <Text color={theme.colors.retroSlateDark}>›</Text>
          <Text color={theme.colors.white} bold>
            configure intelligence engine
          </Text>
        </Box>
        <Text color={theme.colors.retroSlateDark}>esc to exit</Text>
      </Box>

      {/* Divider */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(78)}</Text>

      {step === "select_provider" && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color={theme.colors.retroSlateDark}>
              Select provider (↑/↓ arrows, Enter to select, Esc to cancel):
            </Text>
          </Box>

          {SUPPORTED_PROVIDERS.map((prov, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <Box key={prov.id} flexDirection="row" marginY={0}>
                <Text color={isSelected ? theme.colors.retroCyanBright : theme.colors.retroSlateDark} bold={isSelected}>
                  {isSelected ? "❯ " : "  "}
                  {`[${idx + 1}] `}
                  {prov.name}
                </Text>
                {prov.recommended && (
                  <Text color={theme.colors.retroGreenBright} bold>
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
            <Text color={theme.colors.retroSlate}>
              Configuring <Text bold color={theme.colors.white}>{selectedProvider.name}</Text>:
            </Text>
          </Box>
          <Box marginBottom={1}>
            <Text color={theme.colors.retroSlateDark}>
              Paste your API key below and press Enter (masked for security):
            </Text>
          </Box>
          <Box flexDirection="row">
            <Text color={theme.colors.retroBlueBright} bold>
              ❯{" "}
            </Text>
            <Text color={theme.colors.retroAmberBright}>{maskedKey || "..."}</Text>
            <Text color={theme.colors.retroCyanBright} bold>
              █
            </Text>
          </Box>
          {errorMessage && (
            <Box marginTop={1}>
              <Text color={theme.colors.error} bold>
                ✖ {errorMessage}
              </Text>
            </Box>
          )}
        </Box>
      )}

      {step === "validating" && (
        <Box flexDirection="column" marginY={1}>
          <Text color={theme.colors.retroAmberBright} bold>
            ⏳ {statusMessage}
          </Text>
        </Box>
      )}

      {step === "error" && (
        <Box flexDirection="column" marginY={1}>
          <Text color={theme.colors.error} bold>
            ✖ Validation Failed: {errorMessage}
          </Text>
          <Box marginTop={1}>
            <Text color={theme.colors.retroSlateDark}>
              Press Enter to try entering your key again, or Esc to exit.
            </Text>
          </Box>
        </Box>
      )}

      {/* Bottom rule */}
      <Box marginTop={1}>
        <Text color={theme.colors.retroBlue}>{"─".repeat(78)}</Text>
      </Box>

      {/* Footer */}
      <Box flexDirection="row" justifyContent="space-between">
        <Text color={theme.colors.retroSlateDark}>
          {step === "enter_key"
            ? "esc cancel · enter validate key and start Lil Agent"
            : "esc cancel · enter confirm · ↑/↓ navigate providers"}
        </Text>
        <Text color={theme.colors.retroSlateDark}>
          Zigex Key Vault
        </Text>
      </Box>
    </Box>
  );
};
