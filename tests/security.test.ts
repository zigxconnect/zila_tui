import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { getFileContent, searchCode } from "../dist/assistant/gatherer.js";
import { redactSensitiveContent } from "../dist/assistant/agent.js";
import { validateApiBase, saveToken, clearAuth } from "../dist/utils/auth.js";
import { getAgentConfigPath, saveAgentConfig, clearAgentConfig } from "../dist/utils/aiConfig.js";
import { spawnSync } from "node:child_process";
import { validateRepositoryUrl } from "../dist/commands/init/cloner.js";

test("assistant file reader blocks traversal and secret files", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "zila-repo-"));
  const outside = path.join(path.dirname(root), `${path.basename(root)}-secret`);
  fs.writeFileSync(outside, "outside-secret");
  fs.writeFileSync(path.join(root, ".env"), "TOKEN=example-secret");
  fs.writeFileSync(path.join(root, ".env.example"), "TOKEN=placeholder");
  fs.writeFileSync(path.join(root, "README.md"), "safe readme");
  try {
    assert.match(getFileContent(root, `../${path.basename(outside)}`), /outside the repository/);
    assert.match(getFileContent(root, ".env"), /sensitive/);
    assert.match(getFileContent(root, ".env.example"), /placeholder/);
    assert.match(getFileContent(root, "README.md"), /safe readme/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(outside, { force: true });
  }
});

test("assistant file reader blocks symlinks escaping the repository", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "zila-repo-"));
  const outside = path.join(os.tmpdir(), `zila-outside-${Date.now()}`);
  fs.writeFileSync(outside, "sensitive external content");
  fs.symlinkSync(outside, path.join(root, "external.txt"));
  try {
    assert.match(getFileContent(root, "external.txt"), /outside the repository/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(outside, { force: true });
  }
});

test("assistant git search treats pattern as data, not shell syntax", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "zila-git-"));
  const marker = path.join(root, "command-ran");
  execFileSync("git", ["init", "-q", root]);
  fs.writeFileSync(path.join(root, "README.md"), "plain text\n");
  try {
    searchCode(root, `"; touch ${marker}; #`);
    assert.equal(fs.existsSync(marker), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("assistant observations redact common secret formats", () => {
  const redacted = redactSensitiveContent([
    "OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz123456",
    "Authorization: Bearer abcdefghijklmnopqrstuvwxyz0123456789",
    "token: ghp_abcdefghijklmnopqrstuvwxyz0123456789",
    "-----BEGIN PRIVATE KEY-----\nsecret-material\n-----END PRIVATE KEY-----",
  ].join("\n"));

  assert.doesNotMatch(redacted, /sk-abcdefghijklmnopqrstuvwxyz/);
  assert.doesNotMatch(redacted, /Bearer abcdefgh/);
  assert.doesNotMatch(redacted, /ghp_abcdefghijklmnopqrstuvwxyz/);
  assert.doesNotMatch(redacted, /secret-material/);
});

test("API base allows HTTPS and localhost development only", () => {
  assert.equal(validateApiBase("https://api.example.test"), "https://api.example.test/api");
  assert.equal(validateApiBase("http://localhost:5000/api"), "http://localhost:5000/api");
  assert.throws(() => validateApiBase("http://api.example.test"), /must use HTTPS/);
  assert.throws(() => validateApiBase("https://user:pass@api.example.test"), /must not contain credentials/);
});

test("curriculum clone URLs require HTTPS and reject embedded credentials", () => {
  assert.equal(validateRepositoryUrl("https://github.com/org/curriculum.git").hostname, "github.com");
  assert.throws(() => validateRepositoryUrl("http://github.com/org/curriculum.git"), /must use HTTPS/);
  assert.throws(() => validateRepositoryUrl("https://user:token@github.com/org/curriculum.git"), /must not contain credentials/);
});

test("auth and AI credentials are stored with owner-only permissions", () => {
  const configDir = fs.mkdtempSync(path.join(os.tmpdir(), "zila-config-"));
  const previousConfigDir = process.env.ZILA_CONFIG_DIR;
  process.env.ZILA_CONFIG_DIR = configDir;
  try {
    saveToken("test-token", "test@example.test");
    saveAgentConfig({ provider: "openai", apiKey: "test-api-key", model: "gpt-4o", configuredAt: new Date().toISOString() });
    const authPath = path.join(configDir, "auth.json");
    assert.equal(fs.statSync(authPath).mode & 0o777, 0o600);
    assert.equal(fs.statSync(getAgentConfigPath()).mode & 0o777, 0o600);
    assert.equal(fs.statSync(configDir).mode & 0o777, 0o700);
  } finally {
    clearAuth();
    clearAgentConfig();
    if (previousConfigDir === undefined) delete process.env.ZILA_CONFIG_DIR;
    else process.env.ZILA_CONFIG_DIR = previousConfigDir;
    fs.rmSync(configDir, { recursive: true, force: true });
  }
});

test("CLI supports non-interactive help and version flags", () => {
  const cliPath = path.resolve("dist/cli.js");
  const help = spawnSync(process.execPath, [cliPath, "--help"], { encoding: "utf8" });
  const version = spawnSync(process.execPath, [cliPath, "--version"], { encoding: "utf8" });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage: lil-zila/);
  assert.equal(version.status, 0);
  assert.match(version.stdout.trim(), /(?:^|\n)\d+\.\d+\.\d+$/);
});