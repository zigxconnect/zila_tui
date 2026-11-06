/**
 * Syntax highlighter for terminal code viewing & editing,
 * modeled faithfully after VS Code Dark+ theme colors.
 */

export interface CodeToken {
  text: string;
  color: string;
  bold?: boolean;
  dim?: boolean;
}

// VS Code Dark+ Color Palette
export const VSCODE_DARK = {
  editorBg: "#1E1E1E",
  editorActiveLineBg: "#2A2D2E",
  gutterBg: "#1E1E1E",
  gutterFg: "#6E7681",
  activeLineGutterFg: "#FFFFFF",
  statusBarBg: "#007ACC",
  statusBarFg: "#FFFFFF",
  tabActiveBg: "#1E1E1E",
  tabInactiveBg: "#252526",
  cursor: "#00E5FF",

  // Syntax tokens
  keyword: "#C586C0",       // def, class, import, return, const, let, if, else
  control: "#C586C0",
  type: "#4EC9B0",          // int, str, bool, list, dict, Promise, Array
  builtin: "#4EC9B0",       // self, None, True, False, null, undefined, true, false
  string: "#CE9178",        // "...", '...'
  number: "#B5CEA8",        // 123, 0.45
  comment: "#6A9955",       // #..., //...
  fnCall: "#DCDCAA",        // my_func()
  variable: "#9CDCFE",      // identifier
  operator: "#D4D4D4",      // =, +, -, *
  punctuation: "#808080",   // (, ), [, ], {, }, :, ,
  plain: "#D4D4D4",         // standard text

  // Markdown specific
  mdHeading: "#569CD6",
  mdBullet: "#D7BA7D",
  mdCode: "#CE9178",
  mdQuote: "#6A9955",
};

const PYTHON_KEYWORDS = new Set([
  "and", "as", "assert", "async", "await", "break", "class", "continue", "def",
  "del", "elif", "else", "except", "finally", "for", "from", "global", "if",
  "import", "in", "is", "lambda", "nonlocal", "not", "or", "pass", "raise",
  "return", "try", "while", "with", "yield",
]);

const JS_KEYWORDS = new Set([
  "async", "await", "break", "case", "catch", "class", "const", "continue",
  "debugger", "default", "delete", "do", "else", "export", "extends", "finally",
  "for", "function", "if", "import", "in", "instanceof", "let", "new", "return",
  "super", "switch", "this", "throw", "try", "typeof", "var", "void", "while",
  "with", "yield", "interface", "type", "enum", "implements", "public", "private",
]);

const BUILTINS = new Set([
  "self", "cls", "None", "True", "False", "null", "undefined", "true", "false",
  "int", "float", "str", "bool", "list", "dict", "set", "tuple", "len", "range",
  "print", "open", "type", "id", "input", "sum", "min", "max", "enumerate", "zip",
  "console", "Promise", "Array", "Object", "String", "Number", "Boolean",
]);

/**
 * Tokenizes a single line of code into colored VS Code Dark+ styled segments.
 */
export function tokenizeCodeLine(line: string, filePath: string = ""): CodeToken[] {
  if (!line) return [];

  const lower = filePath.toLowerCase();
  const isPython = lower.endsWith(".py");
  const isJsTs = lower.endsWith(".js") || lower.endsWith(".ts") || lower.endsWith(".jsx") || lower.endsWith(".tsx");
  const isMarkdown = lower.endsWith(".md") || lower.endsWith(".markdown");
  const isYaml = lower.endsWith(".yml") || lower.endsWith(".yaml");
  const isJson = lower.endsWith(".json");

  // Markdown line handling
  if (isMarkdown) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith("#")) {
      return [{ text: line, color: VSCODE_DARK.mdHeading, bold: true }];
    }
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || /^\d+\.\s/.test(trimmed)) {
      const indent = line.length - trimmed.length;
      return [
        { text: line.slice(0, indent), color: VSCODE_DARK.plain },
        { text: trimmed.slice(0, 2), color: VSCODE_DARK.mdBullet, bold: true },
        { text: trimmed.slice(2), color: VSCODE_DARK.plain },
      ];
    }
    if (trimmed.startsWith("> ")) {
      return [{ text: line, color: VSCODE_DARK.mdQuote, dim: true }];
    }
    if (trimmed.startsWith("```")) {
      return [{ text: line, color: VSCODE_DARK.mdCode, bold: true }];
    }
  }

  // Comments check (Python # or JS //)
  const commentIndex = isPython || isYaml
    ? line.indexOf("#")
    : isJsTs
    ? line.indexOf("//")
    : -1;

  if (commentIndex === 0) {
    return [{ text: line, color: VSCODE_DARK.comment }];
  }

  const tokens: CodeToken[] = [];
  let remaining = commentIndex > 0 ? line.slice(0, commentIndex) : line;
  const trailingComment = commentIndex > 0 ? line.slice(commentIndex) : "";

  // Tokenize `remaining` with regex matching keywords, strings, numbers, identifiers, punctuation
  const tokenRegex = /(".*?"|'.*?'|`.*?`|\b\d+(?:\.\d+)?\b|[a-zA-Z_]\w*|[(){}\[\]:;,.]|[=+\-*\/%&|^<>!~]+|\s+)/g;
  let match: RegExpExecArray | null;
  let lastIndex = 0;

  while ((match = tokenRegex.exec(remaining)) !== null) {
    const matchedText = match[0];

    // Leading unmatched slice
    if (match.index > lastIndex) {
      tokens.push({
        text: remaining.slice(lastIndex, match.index),
        color: VSCODE_DARK.plain,
      });
    }
    lastIndex = tokenRegex.lastIndex;

    // Whitespace
    if (/^\s+$/.test(matchedText)) {
      tokens.push({ text: matchedText, color: VSCODE_DARK.plain });
      continue;
    }

    // String literals
    if (
      (matchedText.startsWith('"') && matchedText.endsWith('"')) ||
      (matchedText.startsWith("'") && matchedText.endsWith("'")) ||
      (matchedText.startsWith("`") && matchedText.endsWith("`"))
    ) {
      tokens.push({ text: matchedText, color: VSCODE_DARK.string });
      continue;
    }

    // Numbers
    if (/^\d+(?:\.\d+)?$/.test(matchedText)) {
      tokens.push({ text: matchedText, color: VSCODE_DARK.number });
      continue;
    }

    // Identifiers & keywords
    if (/^[a-zA-Z_]\w*$/.test(matchedText)) {
      if ((isPython && PYTHON_KEYWORDS.has(matchedText)) || (isJsTs && JS_KEYWORDS.has(matchedText))) {
        tokens.push({ text: matchedText, color: VSCODE_DARK.keyword, bold: true });
      } else if (BUILTINS.has(matchedText)) {
        tokens.push({ text: matchedText, color: VSCODE_DARK.builtin });
      } else {
        // Look ahead to check if followed by '(' -> function call
        const rest = remaining.slice(lastIndex);
        if (/^\s*\(/.test(rest)) {
          tokens.push({ text: matchedText, color: VSCODE_DARK.fnCall });
        } else {
          tokens.push({ text: matchedText, color: VSCODE_DARK.variable });
        }
      }
      continue;
    }

    // Punctuation
    if (/^[(){}\[\]:;,.]/.test(matchedText)) {
      tokens.push({ text: matchedText, color: VSCODE_DARK.punctuation });
      continue;
    }

    // Operators
    if (/^[=+\-*\/%&|^<>!~]+$/.test(matchedText)) {
      tokens.push({ text: matchedText, color: VSCODE_DARK.operator });
      continue;
    }

    tokens.push({ text: matchedText, color: VSCODE_DARK.plain });
  }

  // Append any trailing slice
  if (lastIndex < remaining.length) {
    tokens.push({
      text: remaining.slice(lastIndex),
      color: VSCODE_DARK.plain,
    });
  }

  // Append trailing comment
  if (trailingComment) {
    tokens.push({ text: trailingComment, color: VSCODE_DARK.comment });
  }

  return tokens;
}
