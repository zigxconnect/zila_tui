import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { render } from "ink";
import { PassThrough } from "node:stream";
import { LeaderboardSidebar } from "../dist/screens/LeaderboardSidebar.js";
import { GroupSidebar } from "../dist/screens/GroupSidebar.js";
import { CohortsSidebar } from "../dist/screens/CohortsSidebar.js";
import { LogbookSidebar } from "../dist/screens/LogbookSidebar.js";
import { LilAgentShellScreen } from "../dist/screens/LilAgentShellScreen.js";

test("LeaderboardSidebar - renders header and table structure", () => {
  const stdout = new PassThrough() as NodeJS.WriteStream;
  stdout.columns = 120;
  stdout.rows = 30;
  let rendered = "";
  stdout.on("data", (chunk: Buffer) => { rendered += chunk.toString(); });

  const instance = render(React.createElement(LeaderboardSidebar, { width: 50, height: 20 }), {
    stdout,
    debug: true,
    patchConsole: false,
  });

  assert.ok(rendered.includes("LEADERBOARD"));
  assert.ok(rendered.includes("LIVE RANKINGS"));
  assert.ok(rendered.includes("RANK"));
  assert.ok(rendered.includes("POINTS"));
  assert.ok(rendered.includes("STATUS"));
  instance.unmount();
});

test("GroupSidebar - renders peer roster header and table structure", () => {
  const stdout = new PassThrough() as NodeJS.WriteStream;
  stdout.columns = 120;
  stdout.rows = 30;
  let rendered = "";
  stdout.on("data", (chunk: Buffer) => { rendered += chunk.toString(); });

  const instance = render(React.createElement(GroupSidebar, { width: 50, height: 20 }), {
    stdout,
    debug: true,
    patchConsole: false,
  });

  assert.ok(rendered.includes("COHORT TEAM"));
  assert.ok(rendered.includes("PEER ROSTER"));
  assert.ok(rendered.includes("INTERN"));
  assert.ok(rendered.includes("STATUS"));
  instance.unmount();
});

test("CohortsSidebar - renders enrolled programs header structure", () => {
  const stdout = new PassThrough() as NodeJS.WriteStream;
  stdout.columns = 120;
  stdout.rows = 30;
  let rendered = "";
  stdout.on("data", (chunk: Buffer) => { rendered += chunk.toString(); });

  const instance = render(React.createElement(CohortsSidebar, { width: 50, height: 20 }), {
    stdout,
    debug: true,
    patchConsole: false,
  });

  assert.ok(rendered.includes("ENROLLED PROGRAMS"));
  assert.ok(rendered.includes("SESSIONS"));
  instance.unmount();
});

test("LogbookSidebar - renders audit ledger header and lines structure", () => {
  const stdout = new PassThrough() as NodeJS.WriteStream;
  stdout.columns = 120;
  stdout.rows = 30;
  let rendered = "";
  stdout.on("data", (chunk: Buffer) => { rendered += chunk.toString(); });

  const instance = render(React.createElement(LogbookSidebar, { width: 50, height: 20, isFocused: true }), {
    stdout,
    debug: true,
    patchConsole: false,
  });

  assert.ok(rendered.includes("AUDIT LEDGER"));
  assert.ok(rendered.includes("Markdown"));
  instance.unmount();
});

test("LilAgentShellScreen - renders autonomous developer shell with chat navigation", () => {
  const stdout = new PassThrough() as NodeJS.WriteStream;
  stdout.columns = 120;
  stdout.rows = 30;
  let rendered = "";
  stdout.on("data", (chunk: Buffer) => { rendered += chunk.toString(); });

  const instance = render(React.createElement(LilAgentShellScreen, { onClose: () => {}, initialShowWelcome: false }), {
    stdout,
    debug: true,
    patchConsole: false,
  });

  assert.ok(rendered.includes("lil-agent"));
  assert.ok(rendered.includes("autonomous developer shell"));
  assert.ok(rendered.includes("Connected to Zigex Autonomous AI Agent"));
  instance.unmount();
});
