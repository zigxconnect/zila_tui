/**
 * Formats LLM responses into clean terminal text, removing raw markdown clutter
 * like **, ###, inline backticks, and unrendered delimiters.
 */
export function formatTerminalText(rawText: string): string {
  if (!rawText) return "";

  const lines = rawText.split("\n");
  const processedLines: string[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Handle code block fences
    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      // Skip the raw ``` fence line
      continue;
    }

    if (inCodeBlock) {
      // Indent code content cleanly
      processedLines.push(`  ${line}`);
      continue;
    }

    let clean = line;

    // Convert markdown headers: ### Header -> ◈ Header
    clean = clean.replace(/^(#{1,6})\s+(.*)$/, (_m, _hashes, content) => {
      return `◈ ${content.toUpperCase()}`;
    });

    // Convert markdown bullets (* or - or +) to ›
    clean = clean.replace(/^(\s*)[*\-+]\s+(.*)$/, (_m, indent, content) => {
      return `${indent}› ${content}`;
    });

    // Remove bold / italics markdown syntax: **text**, *text*, __text__, _text_
    clean = clean.replace(/\*\*([^*]+)\*\*/g, "$1");
    clean = clean.replace(/__([^_]+)__/g, "$1");
    clean = clean.replace(/(^|[^\w])\*([^*]+)\*([^\w]|$)/g, "$1$2$3");
    clean = clean.replace(/(^|[^\w])_([^_]+)_([^\w]|$)/g, "$1$2$3");

    // Remove inline backticks: `code` -> code
    clean = clean.replace(/`([^`]+)`/g, "$1");

    // Convert markdown links: [Title](https://...) -> Title (https://...)
    clean = clean.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");

    // Clean up blockquote markers: > quote -> │ quote
    clean = clean.replace(/^>\s?(.*)$/, "│ $1");

    processedLines.push(clean);
  }

  return processedLines.join("\n");
}
