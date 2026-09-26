import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { Cursor } from "../ui/Cursor.js";

interface SubmitReportScreenProps {
  onComplete: () => void;
}

const statuses = ["Draft", "Ready", "Review"] as const;

export const SubmitReportScreen: React.FC<SubmitReportScreenProps> = ({ onComplete }) => {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [activeField, setActiveField] = useState(0);
  const [cursorOn, setCursorOn] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<typeof statuses[number]>(statuses[0]);

  useEffect(() => {
    if (submitted) return;
    setCursorOn(true);
    const interval = setInterval(() => setCursorOn((v) => !v), 500);
    return () => clearInterval(interval);
  }, [submitted, activeField]);

  useInput((char, key) => {
    if (submitted) {
      if (key.escape || char === "q" || key.return) onComplete();
      return;
    }

    if (key.escape) {
      onComplete();
      return;
    }

    if (key.tab) {
      setActiveField((prev) => (prev + 1) % 4);
      return;
    }

    if (key.upArrow) {
      setActiveField((prev) => (prev > 0 ? prev - 1 : 3));
      return;
    }

    if (key.downArrow) {
      setActiveField((prev) => (prev < 3 ? prev + 1 : 0));
      return;
    }

    if (key.return) {
      if (activeField < 3) {
        setActiveField((prev) => prev + 1);
      } else if (title.trim().length > 0) {
        setSubmitted(true);
      }
      return;
    }

    if (activeField === 0) {
      if (key.backspace || key.delete) {
        setTitle((prev) => prev.slice(0, -1));
      } else if (char) {
        setTitle((prev) => prev + char);
        setCursorOn(true);
      }
      return;
    }

    if (activeField === 1) {
      if (key.backspace || key.delete) {
        setSummary((prev) => prev.slice(0, -1));
      } else if (char) {
        setSummary((prev) => prev + char);
        setCursorOn(true);
      }
      return;
    }

    if (activeField === 2) {
      if (key.backspace || key.delete) {
        setNotes((prev) => prev.slice(0, -1));
      } else if (char) {
        setNotes((prev) => prev + char);
        setCursorOn(true);
      }
      return;
    }

    if (activeField === 3) {
      if (key.leftArrow || key.upArrow) {
        setStatus((prev) => {
          const index = statuses.indexOf(prev);
          const nextIndex = ((index === -1 ? 0 : index) + statuses.length - 1) % statuses.length;
          return statuses[nextIndex]!;
        });
      }
      if (key.rightArrow || key.downArrow) {
        setStatus((prev) => {
          const index = statuses.indexOf(prev);
          const nextIndex = ((index === -1 ? 0 : index) + 1) % statuses.length;
          return statuses[nextIndex]!;
        });
      }
    }
  });

  const fieldBox = (label: string, value: string, active: boolean, hint: string) => (
    <Box flexDirection="column" borderStyle="single" borderColor={active ? theme.colors.primary : theme.colors.border} paddingX={1} paddingY={1} marginBottom={1}>
      <Box flexDirection="row" alignItems="center" gap={1}>
        <Text color={active ? theme.colors.primary : theme.colors.dim}>{active ? theme.symbols.pointer : " "}</Text>
        <Text color={active ? theme.colors.white : theme.colors.muted} bold>{label}</Text>
      </Box>
      <Box marginTop={1}>
        <Text color={active ? theme.colors.white : theme.colors.text}>{value || hint}</Text>
      </Box>
      {active && <Text color={theme.colors.dim}>{hint}</Text>}
    </Box>
  );

  const activeHint = activeField === 3 ? "Use ←/→ to change status, ↑/↓ to move fields." : "Use ↑/↓ to move between fields and type to edit.";

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1} borderStyle="round" borderColor={theme.colors.accent}>
      <Box flexDirection="row" marginBottom={1}>
        <Text color={theme.colors.logoColor} bold>lil-zila </Text>
        <Text color={theme.colors.muted}>submit-report</Text>
      </Box>

      {submitted ? (
        <Box flexDirection="column" borderStyle="single" borderColor={theme.colors.success} paddingX={2} paddingY={1}>
          <Text color={theme.colors.success} bold>Report submitted successfully.</Text>
          <Box marginTop={1}>
            <Text color={theme.colors.text}>Saved to the task log.</Text>
          </Box>
          <Box flexDirection="column" marginTop={1} gap={1}>
            <Text color={theme.colors.textBright}>Title: {title}</Text>
            <Text color={theme.colors.textBright}>Status: {status}</Text>
            <Text color={theme.colors.textBright}>Summary: {summary || "(no summary provided)"}</Text>
            <Text color={theme.colors.textBright}>Notes: {notes || "(none)"}</Text>
          </Box>
          <Box marginTop={1}>
            <Text color={theme.colors.dim}>Press any key to return to the hub.</Text>
          </Box>
        </Box>
      ) : (
        <>
          <Box flexDirection="column" width={80} marginBottom={1}>
            {fieldBox("Title", title, activeField === 0, "Enter a one-line report title.")}
            {fieldBox("Summary", summary, activeField === 1, "Describe progress, blockers, and next steps.")}
            {fieldBox("Notes", notes, activeField === 2, "Optional details, links, or attachments.")}
            <Box flexDirection="column" borderStyle="single" borderColor={activeField === 3 ? theme.colors.primary : theme.colors.border} paddingX={1} paddingY={1} marginBottom={1}>
              <Box flexDirection="row" alignItems="center" gap={1}>
                <Text color={activeField === 3 ? theme.colors.primary : theme.colors.dim}>{activeField === 3 ? theme.symbols.pointer : " "}</Text>
                <Text color={activeField === 3 ? theme.colors.textBright : theme.colors.muted} bold>Status</Text>
              </Box>
              <Box flexDirection="row" alignItems="center" gap={1} marginTop={1}>
                <Text color={theme.colors.text}>{status}</Text>
                {activeField === 3 && <Cursor on={cursorOn} />}
              </Box>
              {activeField === 3 && <Text color={theme.colors.dim}>Use ←/→ to change state.</Text>}
            </Box>
          </Box>

          <Box flexDirection="column" borderStyle="single" borderColor={theme.colors.border} paddingX={1} paddingY={1}>
            <Text color={theme.colors.accent} bold>Preview</Text>
            <Box flexDirection="column" marginTop={1} gap={1}>
              <Box>
                <Text color={theme.colors.info}>Title:</Text>
                <Text color={theme.colors.textBright}> {title || "(waiting for title)"}</Text>
              </Box>
              <Box>
                <Text color={theme.colors.info}>Summary:</Text>
                <Text color={theme.colors.textBright}> {summary || "(waiting for summary)"}</Text>
              </Box>
              <Box>
                <Text color={theme.colors.info}>Notes:</Text>
                <Text color={theme.colors.white}> {notes || "(no notes)"}</Text>
              </Box>
            </Box>
          </Box>

          <Box flexDirection="column" marginTop={1}>
            <Text color={theme.colors.dim}>{activeHint}</Text>
            <Text color={theme.colors.dim}>Tab: switch fields · Enter: next/submit · Esc: cancel</Text>
          </Box>
        </>
      )}
    </Box>
  );
};
