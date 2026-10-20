/**
 * Terminal Screen Buffer Utilities.
 * Handles clean canvas erasure, scrollback buffer purges, and alternate buffer switches
 * so that transitioning between split-views or exiting full-screen tools leaves zero ghost lines.
 */

/**
 * Completely erases the visible viewport and terminal scrollback buffer,
 * resetting the cursor to home (1,1).
 */
export function clearTerminalScreen(): void {
  try {
    if (process.stdout && process.stdout.isTTY) {
      // \x1b[2J: clear entire visible screen
      // \x1b[3J: clear scrollback buffer (prevents ghost lines from scrolling up)
      // \x1b[H:  move cursor to row 1, col 1
      process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
    } else {
      console.clear();
    }
  } catch {
    // Fallback if write fails
    try {
      console.clear();
    } catch {
      // Ignore
    }
  }
}

/**
 * Switch into the terminal's alternate screen buffer (like vim, nano, or claude-code).
 */
export function enterAlternateScreen(): void {
  try {
    if (process.stdout && process.stdout.isTTY) {
      process.stdout.write("\x1b[?1049h\x1b[H");
    }
  } catch {
    // Ignore
  }
}

/**
 * Exit the alternate screen buffer, restoring the user's previous shell output
 * and completely wiping any TUI remnants from view.
 */
export function leaveAlternateScreen(): void {
  try {
    if (process.stdout && process.stdout.isTTY) {
      process.stdout.write("\x1b[?1049l");
    }
  } catch {
    // Ignore
  }
}
