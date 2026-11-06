/**
 * Utilities to sanitize terminal standard input, completely filtering out
 * stray SGR mouse tracking escape sequences (e.g. \x1b[<32;127;13M, [<32;127;13M, 126;13M)
 * and control codes so they never contaminate input text or editor buffers.
 */

const MOUSE_SGR_FULL_REGEX = /\x1b\[<(\d+);(\d+);(\d+)([Mm])/g;
const MOUSE_SGR_FRAG_REGEX = /\[<(\d+);(\d+);(\d+)([Mm])/g;
const MOUSE_COORD_FRAG_REGEX = /^\d+;\d+[Mm]$/;
const MOUSE_PARTIAL_CHUNK_REGEX = /(?:\[<|\x1b\[<)?\d+;\d+;\d+[Mm]/g;
const ANSI_ESCAPE_REGEX = /\x1b\[[0-9;?]*[a-zA-Z]/g;
const OSC_REGEX = /\x1b\][^\x07\x1b]*(\x07|\x1b\\)?|\]\d+;[^\x07\x1b]*(\x07|\x1b\\)?/g;

/**
 * Checks whether an incoming input string is or starts with a mouse event
 * or raw terminal escape sequence.
 */
export function isMouseOrControlSequence(input: string): boolean {
  if (!input) return false;

  // Exact or contains SGR mouse escape
  if (input.includes("\x1b[<") || input.includes("[<")) {
    return true;
  }

  // Fragment like "126;13M" or "32;127;13M"
  if (MOUSE_COORD_FRAG_REGEX.test(input.trim())) {
    return true;
  }

  // Chunk with semicolon coordinates ending with M or m (motion/click codes)
  if (/\b\d+;\d+;\d+[Mm]\b/.test(input) || /^\d+;\d+[Mm]/.test(input)) {
    return true;
  }

  // Mouse mode enable/disable sequences (e.g. \x1b[?1000h, \x1b[?1002h)
  if (input.startsWith("\x1b[?") || input.startsWith("[?")) {
    return true;
  }

  // Operating System Command (OSC) title/palette injection
  if (input.includes("\x1b]") || input.startsWith("]0;")) {
    return true;
  }

  // Control characters except newline, tab, carriage return, backspace
  if (/^[\x00-\x07\x0b\x0c\x0e-\x1f]/.test(input)) {
    return true;
  }

  return false;
}

/**
 * Cleans user typed input by stripping out any stray mouse escape sequences
 * and unprintable control characters, preserving valid text, spaces, and punctuation.
 */
export function cleanTypedInput(input: string): string {
  if (!input) return "";

  if (isMouseOrControlSequence(input)) {
    // Strip all mouse sequences, OSC codes, and ANSI escape codes
    let cleaned = input
      .replace(OSC_REGEX, "")
      .replace(MOUSE_SGR_FULL_REGEX, "")
      .replace(MOUSE_SGR_FRAG_REGEX, "")
      .replace(MOUSE_PARTIAL_CHUNK_REGEX, "")
      .replace(ANSI_ESCAPE_REGEX, "")
      .replace(/\d+;\d+[Mm]/g, "")
      .replace(/\[<[0-9;]+[Mm]/g, "");

    // Also remove unprintable control codes
    cleaned = cleaned.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");

    // If only leftover semicolons or numbers from mouse flood remain, discard
    if (/^[0-9;Mm]+$/.test(cleaned.trim())) {
      return "";
    }

    return cleaned;
  }

  // Strip unprintable control characters
  return input.replace(OSC_REGEX, "").replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");
}
