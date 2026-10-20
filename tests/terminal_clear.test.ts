import test from "node:test";
import assert from "node:assert/strict";
import {
  clearTerminalScreen,
  enterAlternateScreen,
  leaveAlternateScreen,
} from "../dist/ui/terminal.js";

test("Terminal Buffer - clearTerminalScreen writes full ANSI viewport and scrollback purge sequence", () => {
  const originalStdoutWrite = process.stdout.write;
  const originalIsTTY = process.stdout.isTTY;
  let writtenData = "";

  try {
    process.stdout.isTTY = true;
    process.stdout.write = ((chunk: any) => {
      writtenData += chunk.toString();
      return true;
    }) as any;

    clearTerminalScreen();

    // Verify ANSI clear viewport \x1b[2J, scrollback purge \x1b[3J, and cursor home \x1b[H
    assert.ok(writtenData.includes("\x1b[2J"), "Should clear visible viewport");
    assert.ok(writtenData.includes("\x1b[3J"), "Should clear scrollback buffer");
    assert.ok(writtenData.includes("\x1b[H"), "Should reset cursor to top-left");
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stdout.isTTY = originalIsTTY;
  }
});

test("Terminal Buffer - enterAlternateScreen activates alternate buffer", () => {
  const originalStdoutWrite = process.stdout.write;
  const originalIsTTY = process.stdout.isTTY;
  let writtenData = "";

  try {
    process.stdout.isTTY = true;
    process.stdout.write = ((chunk: any) => {
      writtenData += chunk.toString();
      return true;
    }) as any;

    enterAlternateScreen();

    assert.ok(writtenData.includes("\x1b[?1049h"), "Should request alternate buffer entry");
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stdout.isTTY = originalIsTTY;
  }
});

test("Terminal Buffer - leaveAlternateScreen restores primary screen buffer", () => {
  const originalStdoutWrite = process.stdout.write;
  const originalIsTTY = process.stdout.isTTY;
  let writtenData = "";

  try {
    process.stdout.isTTY = true;
    process.stdout.write = ((chunk: any) => {
      writtenData += chunk.toString();
      return true;
    }) as any;

    leaveAlternateScreen();

    assert.ok(writtenData.includes("\x1b[?1049l"), "Should exit alternate screen buffer");
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stdout.isTTY = originalIsTTY;
  }
});

test("Terminal Buffer - clearTerminalScreen handles non-TTY environments gracefully", () => {
  const originalIsTTY = process.stdout.isTTY;
  const originalConsoleClear = console.clear;
  let consoleClearCalled = false;

  try {
    process.stdout.isTTY = false;
    console.clear = () => {
      consoleClearCalled = true;
    };

    clearTerminalScreen();

    assert.equal(consoleClearCalled, true, "Should fall back to console.clear() when not a TTY");
  } finally {
    process.stdout.isTTY = originalIsTTY;
    console.clear = originalConsoleClear;
  }
});

test("Terminal Buffer - exceptions in stdout.write do not crash application", () => {
  const originalStdoutWrite = process.stdout.write;
  const originalIsTTY = process.stdout.isTTY;
  const originalConsoleClear = console.clear;

  try {
    process.stdout.isTTY = true;
    process.stdout.write = (() => {
      throw new Error("Simulated stream error");
    }) as any;
    console.clear = () => {};

    assert.doesNotThrow(() => {
      clearTerminalScreen();
    }, "Should catch and safely swallow write stream errors");
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stdout.isTTY = originalIsTTY;
    console.clear = originalConsoleClear;
  }
});
