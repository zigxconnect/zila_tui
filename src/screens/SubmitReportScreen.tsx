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

  const activeHint = activeField === 3 ? "Use ←/→ to toggle status, TAB/ENTER to navigate." : "Type to enter text, TAB to switch fields.";

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* 90s Engineering Log Entry Frame */}
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
              [ DAILY ENGINEERING PROGRESS REPORT BUILDER ]
            </Text>
          </Box>
          <Box flexDirection="row">
            <Text color={theme.colors.retroGreen} bold>[SPRINT LOG]</Text>
          </Box>
        </Box>

        {submitted ? (
          <Box flexDirection="column" borderStyle="single" borderColor={theme.colors.success} paddingX={2} paddingY={1}>
            <Text color={theme.colors.successBright} bold>[OK] Progress report archived to supervisor dispatch queue.</Text>
            <Box marginTop={1} flexDirection="row">
              <Text color={theme.colors.muted}>Report Title: </Text>
              <Text color={theme.colors.textBright} bold>{title}</Text>
            </Box>
            <Box flexDirection="row">
              <Text color={theme.colors.muted}>Log Status:   </Text>
              <Text color={theme.colors.retroGreen} bold>{status}</Text>
            </Box>
            <Box flexDirection="row">
              <Text color={theme.colors.muted}>Executive Summary: </Text>
              <Text color={theme.colors.text}>{summary || "(no summary provided)"}</Text>
            </Box>
            <Box flexDirection="row">
              <Text color={theme.colors.muted}>Attachments & Notes: </Text>
              <Text color={theme.colors.text}>{notes || "(none)"}</Text>
            </Box>
            <Box marginTop={1}>
              <Text color={theme.colors.dim}>[ Press any key to return to terminal prompt ]</Text>
            </Box>
          </Box>
        ) : (
          <>
            {/* Input Form Fields */}
            <Box flexDirection="column">
              {/* Field 0: Title */}
              <Box
                flexDirection="column"
                borderStyle="single"
                borderColor={activeField === 0 ? theme.colors.retroCyanBright : theme.colors.border}
                paddingX={1}
                marginBottom={1}
              >
                <Box flexDirection="row" justifyContent="space-between">
                  <Text color={activeField === 0 ? theme.colors.retroCyanBright : theme.colors.muted} bold>
                    {activeField === 0 ? "› " : "  "}REPORT HEADLINE / TITLE:
                  </Text>
                  <Text color={theme.colors.dim}>[{title.length}/60 CHARS]</Text>
                </Box>
                <Box flexDirection="row" alignItems="center">
                  <Text color={theme.colors.textBright}>{title || (activeField === 0 ? "" : "(e.g., Sprint Day 4: Cache Layer Benchmarks)")}</Text>
                  {activeField === 0 && <Cursor on={cursorOn} />}
                </Box>
              </Box>

              {/* Field 1: Summary */}
              <Box
                flexDirection="column"
                borderStyle="single"
                borderColor={activeField === 1 ? theme.colors.retroCyanBright : theme.colors.border}
                paddingX={1}
                marginBottom={1}
              >
                <Box flexDirection="row" justifyContent="space-between">
                  <Text color={activeField === 1 ? theme.colors.retroCyanBright : theme.colors.muted} bold>
                    {activeField === 1 ? "› " : "  "}TECHNICAL SUMMARY & BLOCKERS:
                  </Text>
                  <Text color={theme.colors.dim}>[{summary.length} CHARS]</Text>
                </Box>
                <Box flexDirection="row" alignItems="center">
                  <Text color={theme.colors.textBright}>{summary || (activeField === 1 ? "" : "(Summarize accomplishments, test runs, and open questions)")}</Text>
                  {activeField === 1 && <Cursor on={cursorOn} />}
                </Box>
              </Box>

              {/* Field 2: Notes */}
              <Box
                flexDirection="column"
                borderStyle="single"
                borderColor={activeField === 2 ? theme.colors.retroCyanBright : theme.colors.border}
                paddingX={1}
                marginBottom={1}
              >
                <Box flexDirection="row">
                  <Text color={activeField === 2 ? theme.colors.retroCyanBright : theme.colors.muted} bold>
                    {activeField === 2 ? "› " : "  "}PR LINKS & COMMITS:
                  </Text>
                </Box>
                <Box flexDirection="row" alignItems="center">
                  <Text color={theme.colors.textBright}>{notes || (activeField === 2 ? "" : "(Optional GitHub commit hashes or PR URLs)")}</Text>
                  {activeField === 2 && <Cursor on={cursorOn} />}
                </Box>
              </Box>

              {/* Field 3: Status */}
              <Box
                flexDirection="column"
                borderStyle="single"
                borderColor={activeField === 3 ? theme.colors.retroCyanBright : theme.colors.border}
                paddingX={1}
                marginBottom={1}
              >
                <Box flexDirection="row">
                  <Text color={activeField === 3 ? theme.colors.retroCyanBright : theme.colors.muted} bold>
                    {activeField === 3 ? "› " : "  "}DISPATCH STATUS:
                  </Text>
                </Box>
                <Box flexDirection="row" alignItems="center">
                  <Text color={theme.colors.retroGreenBright} bold>{status}</Text>
                  {activeField === 3 && <Text color={theme.colors.dim}> (Use ← / → to change)</Text>}
                </Box>
              </Box>
            </Box>

            {/* Live Report Preview */}
            <Box
              flexDirection="column"
              borderStyle="single"
              borderColor={theme.colors.border}
              paddingX={1}
              paddingY={0}
            >
              <Text color={theme.colors.accent} bold>LOG SHEET PREVIEW:</Text>
              <Box flexDirection="row">
                <Text color={theme.colors.muted}>Title: </Text>
                <Text color={theme.colors.textBright}>{title || "(waiting for title)"}</Text>
              </Box>
              <Box flexDirection="row">
                <Text color={theme.colors.muted}>Summary: </Text>
                <Text color={theme.colors.textBright}>{summary || "(waiting for summary)"}</Text>
              </Box>
              <Box flexDirection="row">
                <Text color={theme.colors.muted}>Notes: </Text>
                <Text color={theme.colors.text}>{notes || "(no notes)"}</Text>
              </Box>
            </Box>

            {/* Footer */}
            <Box marginTop={1} flexDirection="row" justifyContent="space-between">
              <Text color={theme.colors.dim}>[TAB: NEXT FIELD] [ENTER: SUBMIT] [ESC: CANCEL]</Text>
              <Text color={theme.colors.retroSlateDark}>{activeHint}</Text>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};
