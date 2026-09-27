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
    const id = setInterval(() => setCursorOn((v) => !v), 450);
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
      {/* 90s Cryptographic Login Box */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={theme.colors.accent}
        paddingX={2}
        paddingY={1}
      >
        <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
          <Box flexDirection="row">
            <Text color={theme.colors.retroCyanBright} bold>
              [ CRYPTOGRAPHIC IDENTITY AUTHENTICATION GATEWAY ]
            </Text>
          </Box>
          <Box flexDirection="row">
            <Text color={theme.colors.retroGreen} bold>[SECURE: TLS]</Text>
          </Box>
        </Box>

        {/* Instructions */}
        <Box flexDirection="column" marginBottom={1}>
          <Text color={theme.colors.muted}>
            Connect your Zigex intern identity to synchronize cohorts and submissions.
          </Text>
        </Box>

        {/* Email Field Frame */}
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor={step === "email" ? theme.colors.retroCyanBright : theme.colors.border}
          paddingX={1}
          marginBottom={1}
        >
          <Box flexDirection="row">
            <Text color={step === "email" ? theme.colors.retroCyanBright : theme.colors.muted} bold>
              {step === "email" ? "› " : "  "}STUDENT ACCOUNT EMAIL:
            </Text>
          </Box>
          <Box flexDirection="row" alignItems="center">
            <Text color={theme.colors.textBright}>{email || (step === "email" ? "" : "(e.g., student@zigex.com)")}</Text>
            {step === "email" && cursorOn && (
              <Text color={theme.colors.accentBright} bold>█</Text>
            )}
          </Box>
        </Box>

        {/* OTP Field Frame */}
        {(step === "otp" || step === "verifying" || step === "done") && (
          <Box
            flexDirection="column"
            borderStyle="single"
            borderColor={step === "otp" ? theme.colors.retroCyanBright : theme.colors.border}
            paddingX={1}
            marginBottom={1}
          >
            <Box flexDirection="row" justifyContent="space-between">
              <Text color={step === "otp" ? theme.colors.retroCyanBright : theme.colors.muted} bold>
                {step === "otp" ? "› " : "  "}6-DIGIT VERIFICATION TOKEN:
              </Text>
              <Text color={theme.colors.dim}>[DISPATCHED TO EMAIL]</Text>
            </Box>
            <Box flexDirection="row" alignItems="center">
              <Text color={theme.colors.retroGreenBright} bold>
                {otp.split("").join("  ") || "(waiting for code)"}
              </Text>
              {step === "otp" && cursorOn && (
                <Text color={theme.colors.accentBright} bold> █</Text>
              )}
            </Box>
          </Box>
        )}

        {/* Spinner */}
        {isLoading && (
          <Box flexDirection="row" marginBottom={1} alignItems="center">
            <Spinner
              style="radar"
              color={theme.colors.accent}
              label={step === "requesting" ? "Dispatching OTP challenge packet..." : "Verifying token against Zigex auth authority..."}
            />
          </Box>
        )}

        {/* Success */}
        {step === "done" && (
          <Box flexDirection="row" marginBottom={1}>
            <Text color={theme.colors.successBright} bold>[OK] Authentication verified. Bearer token saved.</Text>
          </Box>
        )}

        {/* Error */}
        {errorMsg !== "" && (
          <Box flexDirection="row" marginBottom={1}>
            <Text color={theme.colors.errorBright} bold>[FAIL] </Text>
            <Text color={theme.colors.error}>{errorMsg}</Text>
          </Box>
        )}

        {/* Footer */}
        <Box marginTop={1} flexDirection="row" justifyContent="space-between">
          <Text color={theme.colors.dim}>[ENTER: ADVANCE] [ESC: ABORT LOGIN]</Text>
          <Text color={theme.colors.retroSlateDark}>TOKEN VAULT: ~/.zila/auth.json</Text>
        </Box>
      </Box>
    </Box>
  );
};