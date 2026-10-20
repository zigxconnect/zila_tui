import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";
import {
  SUPPORTED_PROVIDERS,
  saveAgentConfig,
  fetchProviderModels,
  type AIProvider,
  type ProviderMetadata,
  type ModelFamily,
} from "../utils/aiConfig.js";
import { validateProviderApiKey } from "../utils/aiValidation.js";

interface AgentSetupScreenProps {
  onClose: () => void;
}

type SetupStep =
  | "select_provider"
  | "enter_key"
  | "validating"
  | "select_family"
  | "select_model"
  | "success"
  | "error";

export const AgentSetupScreen: React.FC<AgentSetupScreenProps> = ({ onClose }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [step, setStep] = useState<SetupStep>("select_provider");
  const [apiKey, setApiKey] = useState("");
  const [validatedKey, setValidatedKey] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [families, setFamilies] = useState<ModelFamily[]>([]);
  const [selectedFamilyIndex, setSelectedFamilyIndex] = useState(0);
  const [selectedModelIndex, setSelectedModelIndex] = useState(0);

  const selectedProvider: ProviderMetadata = SUPPORTED_PROVIDERS[selectedIndex]!;
  const currentFamily: ModelFamily | undefined = families[selectedFamilyIndex];
  const currentModels = currentFamily?.models || [];

  useInput((input, key) => {
    if (key.escape) {
      if (step === "select_model") {
        setStep("select_family");
        return;
      }
      if (step === "select_family") {
        setStep("select_provider");
        return;
      }
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
    } else if (step === "select_family") {
      if (key.upArrow) {
        setSelectedFamilyIndex((prev) => (prev > 0 ? prev - 1 : families.length - 1));
      } else if (key.downArrow) {
        setSelectedFamilyIndex((prev) => (prev < families.length - 1 ? prev + 1 : 0));
      } else if (key.leftArrow) {
        setStep("select_provider");
      } else if (key.return) {
        setSelectedModelIndex(0);
        setStep("select_model");
      }
    } else if (step === "select_model") {
      if (key.upArrow) {
        setSelectedModelIndex((prev) => (prev > 0 ? prev - 1 : currentModels.length - 1));
      } else if (key.downArrow) {
        setSelectedModelIndex((prev) => (prev < currentModels.length - 1 ? prev + 1 : 0));
      } else if (key.leftArrow) {
        setStep("select_family");
      } else if (key.return) {
        confirmModelSelection();
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
      setValidatedKey(keyToTest);
      setStatusMessage(`Fetching model families from ${selectedProvider.name}...`);
      const fams = await fetchProviderModels(provider, keyToTest);
      setFamilies(fams);
      setSelectedFamilyIndex(0);
      setSelectedModelIndex(0);
      setStep("select_family");
    } else {
      setStep("error");
      setErrorMessage(result.message);
    }
  }

  function confirmModelSelection() {
    if (!currentFamily || !currentModels.length) return;
    const chosenModel = currentModels[selectedModelIndex] || currentModels[0]!;

    saveAgentConfig({
      provider: selectedProvider.id,
      apiKey: validatedKey,
      model: chosenModel.id,
      configuredAt: new Date().toISOString(),
    });

    setStep("success");
    setStatusMessage(
      `[✔] Credentials verified for ${selectedProvider.name}\n` +
      `[✔] Active model configured: ${currentFamily.name} › ${chosenModel.id}`
    );
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

      {step === "select_family" && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color={theme.colors.retroCyanBright} bold>
              {selectedProvider.name} › Select Model Family:
            </Text>
          </Box>
          <Box marginBottom={1}>
            <Text color={theme.colors.retroSlateDark}>
              ↑/↓ arrows to navigate, Enter to select family, Esc/← to back:
            </Text>
          </Box>
          {families.map((fam, idx) => {
            const isSelected = idx === selectedFamilyIndex;
            return (
              <Box key={fam.id} flexDirection="row" marginY={0}>
                <Text
                  color={isSelected ? theme.colors.retroCyanBright : theme.colors.retroSlateDark}
                  bold={isSelected}
                >
                  {isSelected ? "❯ " : "  "}
                  {`[${idx + 1}] `}
                  {fam.name}
                </Text>
                <Text color={theme.colors.retroSlateDark}>
                  {" "}
                  ({fam.models.length} {fam.models.length === 1 ? "model" : "models"}
                  {fam.models.length ? `: ${fam.models[0]?.name}` : ""})
                </Text>
              </Box>
            );
          })}
        </Box>
      )}

      {step === "select_model" && currentFamily && (
        <Box flexDirection="column">
          <Box marginBottom={1} flexDirection="row" gap={1}>
            <Text color={theme.colors.retroSlateDark}>{selectedProvider.name} ›</Text>
            <Text color={theme.colors.retroCyanBright} bold>
              {currentFamily.name} Models:
            </Text>
          </Box>
          <Box marginBottom={1}>
            <Text color={theme.colors.retroSlateDark}>
              ↑/↓ arrows to navigate, Enter to confirm, ← to back to families:
            </Text>
          </Box>
          {currentModels.map((m, idx) => {
            const isSelected = idx === selectedModelIndex;
            return (
              <Box key={m.id} flexDirection="row" marginY={0}>
                <Text
                  color={isSelected ? theme.colors.retroGreenBright : theme.colors.retroSlateDark}
                  bold={isSelected}
                >
                  {isSelected ? "❯ [✔] " : "    [ ] "}
                  {m.name}
                </Text>
                {m.recommended && (
                  <Text color={theme.colors.retroCyanBright} bold>
                    {" "}
                    (Recommended)
                  </Text>
                )}
                {m.description && (
                  <Text color={theme.colors.retroSlateDark}> — {m.description}</Text>
                )}
              </Box>
            );
          })}
        </Box>
      )}

      {step === "success" && (
        <Box flexDirection="column" marginY={1}>
          <Text color={theme.colors.retroGreenBright} bold>
            {statusMessage}
          </Text>
          <Box marginTop={1}>
            <Text color={theme.colors.white} bold>
              Agent Setup Completed: 100%
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text color={theme.colors.retroSlateDark}>
              Press Enter to return. Type 'lil-agent' at prompt to start chatting!
            </Text>
          </Box>
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
          {step === "select_family"
            ? "↑/↓ navigate families · enter pick · ← back to provider · esc exit"
            : step === "select_model"
            ? "↑/↓ navigate models · enter confirm · ← back to families · esc exit"
            : "esc cancel · enter confirm · ↑/↓ navigate providers"}
        </Text>
        <Text color={theme.colors.retroSlateDark}>
          Zigex Key Vault
        </Text>
      </Box>
    </Box>
  );
};
