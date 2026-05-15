import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { Spinner } from "../ui/Spinner.js";
import { Banner } from "../ui/Banner.js";
import { requestOtp, verifyOtp, saveToken } from "../utils/auth.js";

type Step = "email" | "otp" | "verifying" | "requesting" | "done" | "error";

interface AuthScreenProps {
  onComplete: (success: boolean) => void;
}

const Rule: React.FC = () => (
  <Text color={theme.colors.border}>{"─".repeat(52)}</Text>
);

const Field: React.FC<{
  label: string;
  value: string;
  cursorOn: boolean;
  active: boolean;
  masked?: boolean;
}> = ({ label, value, cursorOn, active, masked }) => (
  <Box flexDirection="column" marginBottom={1}>
    <Text color={active ? theme.colors.primary : theme.colors.muted} bold>
      {label}
    </Text>
    <Box flexDirection="row" gap={0} marginTop={0}>
      <Text color={theme.colors.border}>│ </Text>
      <Text color={theme.colors.white}>
        {masked ? "●".repeat(value.length) : value}
      </Text>
      {active && (
        <Text color={theme.colors.primary}>{cursorOn ? "▊" : " "}</Text>
      )}
    </Box>
  </Box>
);

export const AuthScreen: React.FC<AuthScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [cursorOn, setCursorOn] = useState(true);
 
  // Cursor blink — active during input steps
  useEffect(() => {
    if (step !== "email" && step !== "otp") return;
    const id = setInterval(() => setCursorOn((v) => !v), 530);
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
      setErrorMsg("The code is 6 digits. Check your email.");
      return;
    }
    setErrorMsg("");
    setStep("verifying");
    try {
      const token = await verifyOtp(email.trim(), code);
      saveToken(token, email.trim());
      setStep("done");
      setTimeout(() => onComplete(true), 1200);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setStep("otp");
      setOtp("");
    }
  }, [email, otp, onComplete]);
 
  useInput((char, key) => {
    if (step === "requesting" || step === "verifying" || step === "done") return;
 
    if (key.escape) { onComplete(false); return; }
 
    if (step === "email") {
      if (key.return) { handleRequestOtp(); return; }
      if (key.backspace || key.delete) { setEmail((p) => p.slice(0, -1)); setErrorMsg(""); return; }
      if (!key.ctrl && !key.meta && char) { setEmail((p) => p + char); setErrorMsg(""); }
    }
 
    if (step === "otp") {
      if (key.return) { handleVerifyOtp(); return; }
      if (key.backspace || key.delete) { setOtp((p) => p.slice(0, -1)); setErrorMsg(""); return; }
      // Only allow digits, max 6
      if (!key.ctrl && !key.meta && char && /^\d$/.test(char) && otp.length < 6) {
        setOtp((p) => p + char);
        setErrorMsg("");
      }
    }
  });
 
  const isLoading = step === "requesting" || step === "verifying";
 
  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Header */}
      <Box flexDirection="column" marginBottom={1}>
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.primary} bold>ZILA</Text>
          <Text color={theme.colors.dim}>›</Text>
          <Text color={theme.colors.muted}>authentication</Text>
        </Box>
        <Box marginTop={1}><Rule /></Box>
      </Box>
 
      {/* Context */}
      <Box flexDirection="column" marginBottom={2}>
        <Text color={theme.colors.text}>
          Sign in with your{" "}
          <Text color={theme.colors.secondary} bold>Zigex</Text>
          {" "}account to continue.
        </Text>
        <Text color={theme.colors.dim}>
          A one-time code will be sent to your email.
        </Text>
      </Box>
 
      {/* Step 1 — email */}
      <Field
        label="Email address"
        value={email}
        cursorOn={cursorOn}
        active={step === "email"}
      />
 
      {/* Step 2 — OTP (shown after email submitted) */}
      {(step === "otp" || step === "verifying" || step === "done") && (
        <Box flexDirection="column">
          <Field
            label="Verification code"
            value={otp}
            cursorOn={cursorOn}
            active={step === "otp"}
            masked
          />
          {step === "otp" && (
            <Box marginBottom={1}>
              <Text color={theme.colors.dim}>
                Check <Text color={theme.colors.muted}>{email}</Text> for a 6-digit code.
              </Text>
            </Box>
          )}
        </Box>
      )}
 
      {/* Loading */}
      {isLoading && (
        <Box flexDirection="row" gap={1} marginBottom={1}>
          <Spinner color={theme.colors.primary} />
          <Text color={theme.colors.dim}>
            {step === "requesting" ? "Sending code…" : "Verifying…"}
          </Text>
        </Box>
      )}
 
      {/* Success */}
      {step === "done" && (
        <Box flexDirection="row" gap={1} marginBottom={1}>
          <Text color={theme.colors.success} bold>{theme.symbols.tick}</Text>
          <Text color={theme.colors.success} bold>Authenticated. Welcome back.</Text>
        </Box>
      )}
 
      {/* Error */}
      {errorMsg !== "" && (
        <Box flexDirection="row" gap={1} marginBottom={1}>
          <Text color={theme.colors.error}>{theme.symbols.cross}</Text>
          <Text color={theme.colors.error} wrap="wrap">{errorMsg}</Text>
        </Box>
      )}
 
      {/* Hints */}
      {(step === "email" || step === "otp") && (
        <Box marginTop={1}>
          <Text color={theme.colors.dim}>
            <Text color={theme.colors.border}>↵</Text>
            {" "}continue  ·  <Text color={theme.colors.border}>Esc</Text>
            {" "}cancel
          </Text>
        </Box>
      )}
    </Box>
  );
};