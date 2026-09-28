import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { Spinner } from "../ui/Spinner.js";
import { requestOtp, verifyOtp, saveToken } from "../utils/auth.js";

type Step = "email" | "otp" | "verifying" | "requesting" | "done" | "error";

interface AuthScreenProps {
  onComplete: (success: boolean) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [cursorOn, setCursorOn] = useState(true);

  // Cursor blink
  useEffect(() => {
    if (step !== "email" && step !== "otp") return;
    const id = setInterval(() => setCursorOn((v) => !v), 500);
    return () => clearInterval(id);
  }, [step]);

  const handleRequestOtp = useCallback(async () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    setErrorMsg("");
    setStep("requesting");
    try {
      await requestOtp(trimmed);
      setStep("otp");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setStep("email");
    }
  }, [email]);

  const handleVerifyOtp = useCallback(async () => {
    const code = otp.trim();
    if (code.length !== 6) {
      setErrorMsg("Verification code must be 6 digits.");
      return;
    }
    setErrorMsg("");
    setStep("verifying");
    try {
      const token = await verifyOtp(email.trim(), code);
      saveToken(token, email.trim());
      setStep("done");
      setTimeout(() => onComplete(true), 1000);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setStep("otp");
      setOtp("");
    }
  }, [email, otp, onComplete]);

  useInput((char, key) => {
    if (step === "requesting" || step === "verifying" || step === "done") return;

    if (key.escape) {
      onComplete(false);
      return;
    }

    if (step === "email") {
      if (key.return) {
        handleRequestOtp();
        return;
      }
      if (key.backspace || key.delete) {
        setEmail((p) => p.slice(0, -1));
        setErrorMsg("");
        return;
      }
      if (!key.ctrl && !key.meta && char) {
        setEmail((p) => p + char);
        setErrorMsg("");
      }
    }

    if (step === "otp") {
      if (key.return) {
        handleVerifyOtp();
        return;
      }
      if (key.backspace || key.delete) {
        setOtp((p) => p.slice(0, -1));
        setErrorMsg("");
        return;
      }
      if (!key.ctrl && !key.meta && char && /^\d$/.test(char) && otp.length < 6) {
        setOtp((p) => p + char);
        setErrorMsg("");
      }
    }
  });

  const isLoading = step === "requesting" || step === "verifying";

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Top rule */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.retroBlue} bold>{"lil-zila"}</Text>
          <Text color={theme.colors.retroSlateDark}>{"›"}</Text>
          <Text color={theme.colors.white} bold>{"authentication"}</Text>
        </Box>
        <Text color={theme.colors.retroGreenBright}>{"tls secure"}</Text>
      </Box>

      {/* Divider */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {/* Subtitle / Instructions */}
      <Box marginBottom={1}>
        <Text color={theme.colors.retroSlateDark}>
          {"Connect your Zigex account to sync cohorts and tasks."}
        </Text>
      </Box>

      {/* Email input field */}
      <Box flexDirection="column" marginBottom={1}>
        <Box flexDirection="row" gap={1} alignItems="center">
          <Box width={16}>
            <Text color={step === "email" ? theme.colors.retroBlueBright : theme.colors.retroSlateDark} bold>
              {"Account Email:"}
            </Text>
          </Box>
          <Text color={theme.colors.white}>
            {email || (step === "email" ? "" : "student@zigex.com")}
          </Text>
          {step === "email" && (
            <Text color={theme.colors.retroBlueBright} bold>
              {cursorOn ? "█" : " "}
            </Text>
          )}
        </Box>
      </Box>

      {/* OTP input field */}
      {(step === "otp" || step === "verifying" || step === "done") && (
        <Box flexDirection="column" marginBottom={1}>
          <Box flexDirection="row" gap={1} alignItems="center">
            <Box width={16}>
              <Text color={step === "otp" ? theme.colors.retroBlueBright : theme.colors.retroSlateDark} bold>
                {"6-Digit Code:"}
              </Text>
            </Box>
            <Text color={theme.colors.white} bold>
              {otp ? otp.split("").join(" ") : ""}
            </Text>
            {step === "otp" && (
              <Text color={theme.colors.retroBlueBright} bold>
                {cursorOn ? "█" : " "}
              </Text>
            )}
            {!otp && step === "otp" && (
              <Text color={theme.colors.retroSlateDark}>{"(sent to your email)"}</Text>
            )}
          </Box>
        </Box>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <Box flexDirection="row" gap={1} marginBottom={1} alignItems="center">
          <Spinner style="classic" color={theme.colors.retroBlueBright} />
          <Text color={theme.colors.retroSlateDark}>
            {step === "requesting" ? "Requesting verification code..." : "Verifying credentials..."}
          </Text>
        </Box>
      )}

      {/* Success notification */}
      {step === "done" && (
        <Box flexDirection="row" gap={1} marginBottom={1}>
          <Text color={theme.colors.retroGreenBright}>{"✓"}</Text>
          <Text color={theme.colors.white} bold>{"Authenticated successfully. Token saved."}</Text>
        </Box>
      )}

      {/* Error notification */}
      {errorMsg !== "" && (
        <Box flexDirection="row" gap={1} marginBottom={1}>
          <Text color={theme.colors.error}>{"✗"}</Text>
          <Text color={theme.colors.error}>{errorMsg}</Text>
        </Box>
      )}

      {/* Bottom rule */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {/* Footer */}
      <Box flexDirection="row" justifyContent="space-between">
        <Text color={theme.colors.retroSlateDark}>{"enter to continue · esc to cancel"}</Text>
        <Text color={theme.colors.retroSlateDark}>{"~/.zila/auth.json"}</Text>
      </Box>
    </Box>
  );
};