import React, { useState, useEffect } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import { theme } from "../ui/theme.js";
import {
  searchOpportunities,
  saveTavilyApiKey,
  getTavilyApiKey,
  type OpportunityItem,
} from "../utils/tavilySearch.js";
import {
  SidebarContainer,
  SidebarTwoColumnRow,
  SidebarDivider,
  SidebarLine,
  SidebarLoadingRow,
  SidebarEmptyRows,
} from "../ui/sidebarLayout.js";
import { getActiveCohort } from "../utils/activeCohort.js";

interface OpportunitiesSidebarProps {
  initialQuery?: string;
  width?: number;
  height?: number;
  isFocused?: boolean;
  onClose?: () => void;
}

export const OpportunitiesSidebar: React.FC<OpportunitiesSidebarProps> = ({
  initialQuery = "",
  width,
  height,
  isFocused = false,
  onClose,
}) => {
  const { stdout } = useStdout();
  const termCols = stdout?.columns || process.stdout.columns || 120;
  const termRows = stdout?.rows || process.stdout.rows || 36;

  const effectiveWidth = width ?? Math.max(40, Math.floor(termCols * 0.48));
  const effectiveHeight = height ?? Math.max(18, termRows - 6);
  const innerWidth = Math.max(20, effectiveWidth - 2);

  const [hasKey, setHasKey] = useState<boolean>(() => Boolean(getTavilyApiKey()));
  const [apiKeyInput, setApiKeyInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(Boolean(getTavilyApiKey()));
  const [items, setItems] = useState<OpportunityItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scrollOffset, setScrollOffset] = useState<number>(0);

  const activeCohort = getActiveCohort();

  const runSearch = async (queryStr?: string) => {
    setLoading(true);
    setErrorMsg(null);
    const res = await searchOpportunities(queryStr, {
      domain: activeCohort?.department || "Software Engineering",
      level: activeCohort?.level || "Junior Intern",
    });

    if (res.needsKey) {
      setHasKey(false);
      setLoading(false);
      return;
    }

    if (!res.success) {
      setErrorMsg(res.error || "Search failed");
      setLoading(false);
      return;
    }

    setItems(res.results);
    setLoading(false);
  };

  useEffect(() => {
    if (hasKey) {
      runSearch(initialQuery);
    }
  }, [hasKey, initialQuery]);

  useInput((input, key) => {
    if (!isFocused) return;

    if (!hasKey) {
      if (key.return) {
        if (apiKeyInput.trim().length > 0) {
          saveTavilyApiKey(apiKeyInput.trim());
          setHasKey(true);
          runSearch(initialQuery);
        }
        return;
      }
      if (key.backspace || key.delete || input === "\x7f" || input === "\b") {
        setApiKeyInput((prev) => prev.slice(0, -1));
        return;
      }
      if (input && !key.ctrl && !key.meta && input !== "\r" && input !== "\n") {
        setApiKeyInput((prev) => prev + input);
        return;
      }
      return;
    }

    if (key.upArrow) {
      setScrollOffset((prev) => Math.max(0, prev - 1));
      return;
    }
    if (key.downArrow) {
      setScrollOffset((prev) => prev + 1);
      return;
    }
    if (key.pageUp) {
      setScrollOffset((prev) => Math.max(0, prev - 5));
      return;
    }
    if (key.pageDown) {
      setScrollOffset((prev) => prev + 5);
      return;
    }
  });

  if (!hasKey) {
    return (
      <SidebarContainer width={effectiveWidth} height={effectiveHeight} isFocused={isFocused}>
        <SidebarTwoColumnRow
          left={{ text: "🔍 TAVILY OPPORTUNITIES", color: theme.colors.retroCyanBright, bold: true }}
          right={{ text: "SETUP KEY", color: theme.colors.retroAmberBright, bold: true }}
          width={innerWidth}
        />
        <SidebarDivider width={innerWidth} />

        <SidebarLine
          text="Tavily AI Search requires an API key."
          width={innerWidth}
          color={theme.colors.white}
          bold
        />
        <SidebarLine
          text="Get a free key at: https://tavily.com"
          width={innerWidth}
          color={theme.colors.retroCyanBright}
        />
        <SidebarDivider width={innerWidth} />

        <SidebarLine
          text="Paste your Tavily API Key below:"
          width={innerWidth}
          color={theme.colors.retroSlate}
        />

        <Box
          flexDirection="row"
          borderStyle="single"
          borderColor={theme.colors.retroBlueBright}
          paddingX={1}
          marginX={1}
          marginTop={1}
          height={3}
        >
          <Text color={theme.colors.retroCyanBright} bold>
            Key:{" "}
          </Text>
          <Text color={theme.colors.white}>
            {apiKeyInput.length > 0 ? apiKeyInput : "(paste tvly-... and press Enter)"}
          </Text>
          <Text color={theme.colors.retroCyanBright} bold>
            █
          </Text>
        </Box>

        <SidebarLine
          text="Press Enter to save · Esc to close"
          width={innerWidth}
          color={theme.colors.retroSlateDark}
        />
        <SidebarEmptyRows count={Math.max(0, effectiveHeight - 12)} width={innerWidth} />
      </SidebarContainer>
    );
  }

  // Format opportunities items into lines
  const allLines: Array<{ text: string; color?: string; bold?: boolean }> = [];
  items.forEach((item, idx) => {
    allLines.push({ text: `${idx + 1}. ${item.title}`, color: theme.colors.white, bold: true });
    if (item.url) {
      allLines.push({ text: `   ${item.url}`, color: theme.colors.retroCyanBright });
    }
    if (item.content) {
      const snippet = item.content.replace(/\s+/g, " ").slice(0, 160);
      allLines.push({ text: `   ${snippet}...`, color: theme.colors.retroSlate });
    }
    allLines.push({ text: " ", color: theme.colors.sidebarDivider });
  });

  const viewportHeight = Math.max(5, effectiveHeight - 7);
  const maxScroll = Math.max(0, allLines.length - viewportHeight);
  const clampedOffset = Math.min(scrollOffset, maxScroll);
  const visibleLines = allLines.slice(clampedOffset, clampedOffset + viewportHeight);
  const emptyRows = Math.max(0, viewportHeight - visibleLines.length);

  return (
    <SidebarContainer width={effectiveWidth} height={effectiveHeight} isFocused={isFocused}>
      <SidebarTwoColumnRow
        left={{ text: "🔍 TECH OPPORTUNITIES", color: theme.colors.retroCyanBright, bold: true }}
        right={{ text: `● ${items.length} FOUND`, color: theme.colors.retroGreenBright, bold: true }}
        width={innerWidth}
      />
      <SidebarTwoColumnRow
        left={{ text: `Track: ${activeCohort?.name || "General Tech"}`, color: theme.colors.retroSlateDark }}
        right={{ text: "via Tavily", color: theme.colors.retroSlateDark }}
        width={innerWidth}
      />
      <SidebarDivider width={innerWidth} />

      {loading && <SidebarLoadingRow suffix="live opportunities" width={innerWidth} />}

      {!loading && errorMsg && (
        <SidebarLine text={`Error: ${errorMsg}`} width={innerWidth} color={theme.colors.error} />
      )}

      {!loading && !errorMsg && items.length === 0 && (
        <SidebarLine
          text="No opportunities found matching criteria."
          width={innerWidth}
          color={theme.colors.retroSlate}
        />
      )}

      {!loading &&
        visibleLines.map((line, idx) => (
          <SidebarLine
            key={idx}
            text={line.text}
            width={innerWidth}
            color={line.color}
            bold={line.bold}
          />
        ))}

      {!loading && <SidebarEmptyRows count={emptyRows} width={innerWidth} />}

      <SidebarDivider width={innerWidth} />
      <SidebarTwoColumnRow
        left={{
          text: `Showing ${items.length > 0 ? clampedOffset + 1 : 0}-${Math.min(clampedOffset + viewportHeight, allLines.length)}`,
          color: theme.colors.retroSlateDark,
        }}
        right={{ text: "Tab chat · ↑/↓ scroll · Esc close", color: theme.colors.retroCyanBright }}
        width={innerWidth}
      />
    </SidebarContainer>
  );
};
