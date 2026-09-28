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

  const activeHint = activeField === 3 ? "use ←/→ to toggle status" : "tab to switch fields";

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Top rule */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.retroBlue} bold>{"lil-zila"}</Text>
          <Text color={theme.colors.retroSlateDark}>{"›"}</Text>
          <Text color={theme.colors.white} bold>{"engineering progress report"}</Text>
        </Box>
        <Text color={theme.colors.retroSlateDark}>{"sprint log"}</Text>
      </Box>

      {/* Divider */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {submitted ? (
        <Box flexDirection="column" paddingY={1}>
          <Box flexDirection="row" gap={1} marginBottom={1}>
            <Text color={theme.colors.retroGreenBright}>{"✓"}</Text>
            <Text color={theme.colors.white} bold>{"Progress report archived to supervisor dispatch queue."}</Text>
          </Box>
          <Box flexDirection="row" gap={2}>
            <Box width={16}>
              <Text color={theme.colors.retroSlateDark}>{"Title:"}</Text>
            </Box>
            <Text color={theme.colors.white} bold>{title}</Text>
          </Box>
          <Box flexDirection="row" gap={2}>
            <Box width={16}>
              <Text color={theme.colors.retroSlateDark}>{"Status:"}</Text>
            </Box>
            <Text color={theme.colors.retroGreenBright} bold>{status}</Text>
          </Box>
          <Box flexDirection="row" gap={2}>
            <Box width={16}>
              <Text color={theme.colors.retroSlateDark}>{"Summary:"}</Text>
            </Box>
            <Text color={theme.colors.white}>{summary || "(no summary)"}</Text>
          </Box>
          <Box flexDirection="row" gap={2}>
            <Box width={16}>
              <Text color={theme.colors.retroSlateDark}>{"PR & Notes:"}</Text>
            </Box>
            <Text color={theme.colors.retroSlate}>{notes || "(none)"}</Text>
          </Box>
          <Box marginTop={1}>
            <Text color={theme.colors.retroSlateDark}>{"press any key to return"}</Text>
          </Box>
        </Box>
      ) : (
        <>
          {/* Field 0: Title */}
          <Box flexDirection="column" marginBottom={1}>
            <Box flexDirection="row" gap={1} alignItems="center">
              <Box width={18}>
                <Text color={activeField === 0 ? theme.colors.retroBlueBright : theme.colors.retroSlateDark} bold>
                  {activeField === 0 ? "› Title:" : "  Title:"}
                </Text>
              </Box>
              <Text color={theme.colors.white}>
                {title || (activeField === 0 ? "" : "(e.g., Sprint Day 4: Cache Layer)")}
              </Text>
              {activeField === 0 && <Cursor on={cursorOn} />}
            </Box>
          </Box>

          {/* Field 1: Summary */}
          <Box flexDirection="column" marginBottom={1}>
            <Box flexDirection="row" gap={1} alignItems="center">
              <Box width={18}>
                <Text color={activeField === 1 ? theme.colors.retroBlueBright : theme.colors.retroSlateDark} bold>
                  {activeField === 1 ? "› Summary:" : "  Summary:"}
                </Text>
              </Box>
              <Text color={theme.colors.white}>
                {summary || (activeField === 1 ? "" : "(Accomplishments, benchmarks, blockers)")}
              </Text>
              {activeField === 1 && <Cursor on={cursorOn} />}
            </Box>
          </Box>

          {/* Field 2: Notes / PR */}
          <Box flexDirection="column" marginBottom={1}>
            <Box flexDirection="row" gap={1} alignItems="center">
              <Box width={18}>
                <Text color={activeField === 2 ? theme.colors.retroBlueBright : theme.colors.retroSlateDark} bold>
                  {activeField === 2 ? "› PR / Commits:" : "  PR / Commits:"}
                </Text>
              </Box>
              <Text color={theme.colors.white}>
                {notes || (activeField === 2 ? "" : "(Optional GitHub commit hashes or PR URLs)")}
              </Text>
              {activeField === 2 && <Cursor on={cursorOn} />}
            </Box>
          </Box>

          {/* Field 3: Status */}
          <Box flexDirection="column" marginBottom={1}>
            <Box flexDirection="row" gap={1} alignItems="center">
              <Box width={18}>
                <Text color={activeField === 3 ? theme.colors.retroBlueBright : theme.colors.retroSlateDark} bold>
                  {activeField === 3 ? "› Status:" : "  Status:"}
                </Text>
              </Box>
              <Text color={theme.colors.retroGreenBright} bold>{status}</Text>
              {activeField === 3 && (
                <Text color={theme.colors.retroSlateDark}>{" (←/→ to toggle)"}</Text>
              )}
            </Box>
          </Box>

          {/* Preview Panel */}
          <Box flexDirection="column" marginTop={0} marginBottom={1}>
            <Text color={theme.colors.retroBlueBright} bold>{"PREVIEW"}</Text>
            <Box flexDirection="row" gap={2}>
              <Box width={14}>
                <Text color={theme.colors.retroSlateDark}>{"Title:"}</Text>
              </Box>
              <Text color={theme.colors.white}>{title || "—"}</Text>
            </Box>
            <Box flexDirection="row" gap={2}>
              <Box width={14}>
                <Text color={theme.colors.retroSlateDark}>{"Summary:"}</Text>
              </Box>
              <Text color={theme.colors.white}>{summary || "—"}</Text>
            </Box>
            <Box flexDirection="row" gap={2}>
              <Box width={14}>
                <Text color={theme.colors.retroSlateDark}>{"Status:"}</Text>
              </Box>
              <Text color={theme.colors.retroGreenBright}>{status}</Text>
            </Box>
          </Box>

          {/* Bottom rule */}
          <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

          {/* Footer */}
          <Box flexDirection="row" justifyContent="space-between">
            <Text color={theme.colors.retroSlateDark}>{"tab next · enter submit · esc cancel"}</Text>
            <Text color={theme.colors.retroSlateDark}>{activeHint}</Text>
          </Box>
        </>
      )}
    </Box>
  );
};
