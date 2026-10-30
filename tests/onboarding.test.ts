import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import React from "react";
import { render } from "ink";
import { PassThrough } from "node:stream";
import { LilAgentShellScreen } from "../dist/screens/LilAgentShellScreen.js";
import { hasSeenLilAgentWelcome, markLilAgentWelcomeSeen } from "../dist/utils/onboarding.js";

test("Lil Agent first run shows centered welcome and remembers it", async () => {
  const configDir = fs.mkdtempSync(path.join(os.tmpdir(), "zila-onboarding-"));
  const previousConfigDir = process.env.ZILA_CONFIG_DIR;
  process.env.ZILA_CONFIG_DIR = configDir;

  const stdout = new PassThrough() as NodeJS.WriteStream;
  stdout.columns = 100;
  stdout.rows = 32;
  let rendered = "";
  stdout.on("data", (chunk: Buffer) => { rendered += chunk.toString(); });

  try {
    assert.equal(hasSeenLilAgentWelcome(), false);
    const instance = render(React.createElement(LilAgentShellScreen, { onClose: () => {} }), {
      stdout,
      debug: true,
      patchConsole: false,
    });

    assert.match(rendered, /Hi, I’m Lil-Zila\./);
    assert.match(rendered, /I am here to monitor and make sure you do the writing/);
    assert.match(rendered, /Together, we can say no to cheating the right way/);
    assert.match(rendered, /That’s the aim of Lil-Zila\./);
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(hasSeenLilAgentWelcome(), true);
    instance.unmount();
  } finally {
    if (previousConfigDir === undefined) delete process.env.ZILA_CONFIG_DIR;
    else process.env.ZILA_CONFIG_DIR = previousConfigDir;
    fs.rmSync(configDir, { recursive: true, force: true });
  }
});

test("Lil Agent welcome state can be recorded without chat data", () => {
  const configDir = fs.mkdtempSync(path.join(os.tmpdir(), "zila-onboarding-"));
  const previousConfigDir = process.env.ZILA_CONFIG_DIR;
  process.env.ZILA_CONFIG_DIR = configDir;
  try {
    markLilAgentWelcomeSeen();
    assert.equal(hasSeenLilAgentWelcome(), true);
    assert.deepEqual(fs.readdirSync(configDir), ["lil_agent_welcome_seen"]);
  } finally {
    if (previousConfigDir === undefined) delete process.env.ZILA_CONFIG_DIR;
    else process.env.ZILA_CONFIG_DIR = previousConfigDir;
    fs.rmSync(configDir, { recursive: true, force: true });
  }
});