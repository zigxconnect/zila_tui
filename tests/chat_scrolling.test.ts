import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { render } from "ink";
import { PassThrough } from "node:stream";
import {
  wrapTextToLines,
  buildChatVisualLines,
  LilAgentShellScreen,
  type DisplayMessage,
} from "../dist/screens/LilAgentShellScreen.js";

test("Chat Scrolling - wrapTextToLines splits on newlines and wraps long paragraphs", () => {
  const text = "First line of text\nSecond line with several words that should wrap nicely";
  const wrapped = wrapTextToLines(text, 25);

  assert.ok(wrapped.length >= 3, `Expected at least 3 wrapped lines, got ${wrapped.length}`);
  assert.equal(wrapped[0], "First line of text");
  for (const line of wrapped) {
    assert.ok(line.length <= 25, `Line exceeded maxWidth: "${line}"`);
  }
});

test("Chat Scrolling - wrapTextToLines handles long unbroken words", () => {
  const longToken = "https://github.com/zigxconnect/zila_tui/commit/abcdef1234567890abcdef1234567890";
  const wrapped = wrapTextToLines(longToken, 20);

  assert.ok(wrapped.length >= 3);
  for (const chunk of wrapped) {
    assert.ok(chunk.length <= 20, `Chunk exceeded maxWidth: "${chunk}"`);
  }
});

test("Chat Scrolling - buildChatVisualLines converts multi-line messages to line-by-line format", () => {
  const messages: DisplayMessage[] = [
    {
      id: "msg-1",
      role: "system",
      content: "System initialized and ready.",
    },
    {
      id: "msg-2",
      role: "user",
      content: "Explain architecture principles.",
    },
    {
      id: "msg-3",
      role: "assistant",
      content: "1. Modularity\n2. Separation of concerns\n3. Robust error boundaries.",
    },
  ];

  const lines = buildChatVisualLines(messages, 50);

  // Verify structure:
  // - System message has 'ℹ'
  const systemLine = lines.find((l) => l.role === "system");
  assert.ok(systemLine, "Should include system line");
  assert.ok(systemLine?.text.includes("ℹ System initialized and ready."));

  // - User message has header
  const userLine = lines.find((l) => l.role === "user");
  assert.ok(userLine, "Should include user line");
  assert.equal(userLine?.text, "Explain architecture principles.");

  // - Assistant message has header line followed by body lines
  const assistantHeader = lines.find((l) => l.role === "assistant" && l.isHeader);
  assert.ok(assistantHeader, "Should include assistant header");
  assert.equal(assistantHeader?.text, "🤖 Lil-Zila:");

  const assistantBody = lines.filter((l) => l.role === "assistant" && !l.isHeader);
  assert.ok(assistantBody.length >= 3, "Should include all numbered points as separate lines");

  // - Gaps between messages
  const gaps = lines.filter((l) => l.role === "blank");
  assert.equal(gaps.length, 2, "Should place blank line between the 3 messages");
});

test("Chat Scrolling - viewport line calculation accurately clamps and bounds scroll offset", () => {
  const messages: DisplayMessage[] = [
    {
      id: "msg-1",
      role: "assistant",
      content: Array.from({ length: 40 }, (_, i) => `Log line ${i + 1}`).join("\n"),
    },
  ];

  const allLines = buildChatVisualLines(messages, 60);
  const viewportHeight = 15;
  const totalLines = allLines.length;

  assert.ok(totalLines >= 41, `Expected at least 41 visual lines (header + 40 items), got ${totalLines}`);
  const maxScroll = totalLines - viewportHeight;
  assert.ok(maxScroll > 20, "Should have scrollable range");

  // At bottom (offset 0):
  const offsetBottom = 0;
  const endBottom = totalLines - offsetBottom;
  const startBottom = Math.max(0, endBottom - viewportHeight);
  const visibleBottom = allLines.slice(startBottom, endBottom);
  assert.equal(visibleBottom.length, viewportHeight);
  assert.ok(visibleBottom[visibleBottom.length - 1]?.text.includes("Log line 40"), "Bottom should show latest line");

  // At top (offset maxScroll):
  const offsetTop = maxScroll;
  const endTop = totalLines - offsetTop;
  const startTop = Math.max(0, endTop - viewportHeight);
  const visibleTop = allLines.slice(startTop, endTop);
  assert.equal(visibleTop.length, viewportHeight);
  assert.ok(visibleTop[0]?.text.includes("Lil-Zila:"), "Top should show first line/header");
});

test("Chat Scrolling - LilAgentShellScreen renders virtualized scrollable chat without overflowing", () => {
  const stdout = new PassThrough() as NodeJS.WriteStream;
  stdout.columns = 100;
  stdout.rows = 28;
  let rendered = "";
  stdout.on("data", (chunk: Buffer) => { rendered += chunk.toString(); });

  const instance = render(React.createElement(LilAgentShellScreen, { onClose: () => {} }), {
    stdout,
    debug: true,
    patchConsole: false,
  });

  assert.ok(rendered.includes("lil-agent"));
  assert.ok(rendered.includes("autonomous developer shell"));
  assert.ok(rendered.includes("Connected to Zigex Autonomous AI Agent"));
  assert.ok(rendered.includes("scroll chat"));
  instance.unmount();
});
