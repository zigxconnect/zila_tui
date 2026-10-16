import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { render } from "ink";
import { PassThrough } from "node:stream";
import { ZigexLoader, DEFAULT_ZIGEX_VERBS } from "../dist/ui/Spinner.js";

test("ZigexLoader - DEFAULT_ZIGEX_VERBS contains requested zigging rotating verbs", () => {
  assert.ok(DEFAULT_ZIGEX_VERBS.includes("zigging"));
  assert.ok(DEFAULT_ZIGEX_VERBS.includes("zigxing"));
  assert.ok(DEFAULT_ZIGEX_VERBS.includes("zigexxing"));
  assert.ok(DEFAULT_ZIGEX_VERBS.includes("zixin"));
  assert.ok(DEFAULT_ZIGEX_VERBS.includes("zagging"));
  assert.ok(DEFAULT_ZIGEX_VERBS.includes("pondering"));
  assert.ok(DEFAULT_ZIGEX_VERBS.includes("synthesizing"));
  assert.ok(DEFAULT_ZIGEX_VERBS.includes("reasoning"));
});

test("ZigexLoader - renders current rotating verb and suffix", () => {
  const stdout = new PassThrough() as NodeJS.WriteStream;
  stdout.columns = 120;
  stdout.rows = 30;
  let rendered = "";
  stdout.on("data", (chunk: Buffer) => { rendered += chunk.toString(); });

  const instance = render(React.createElement(ZigexLoader, { suffix: "analyzing code" }), {
    stdout,
    debug: true,
    patchConsole: false,
  });

  assert.ok(rendered.includes("zigging"));
  assert.ok(rendered.includes("analyzing code"));
  instance.unmount();
});

test("ZigexLoader - accepts custom verb list", () => {
  const stdout = new PassThrough() as NodeJS.WriteStream;
  stdout.columns = 120;
  stdout.rows = 30;
  let rendered = "";
  stdout.on("data", (chunk: Buffer) => { rendered += chunk.toString(); });

  const instance = render(React.createElement(ZigexLoader, { verbs: ["custom_zig"], suffix: "testing" }), {
    stdout,
    debug: true,
    patchConsole: false,
  });

  assert.ok(rendered.includes("custom_zig"));
  assert.ok(rendered.includes("testing"));
  instance.unmount();
});
