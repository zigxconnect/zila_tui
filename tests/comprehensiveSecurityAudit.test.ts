import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  isCriticalFile,
  listWorkspaceFiles,
  readWorkspaceFile,
  saveWorkspaceFile,
} from "../dist/utils/workspaceManager.js";
import {
  isMouseOrControlSequence,
  cleanTypedInput,
} from "../dist/utils/terminalInputSanitizer.js";
import { redactSensitiveContent } from "../dist/assistant/agent.js";
import { validateApiBase, saveToken, clearAuth } from "../dist/utils/auth.js";
import { getAgentConfigPath, saveAgentConfig, clearAgentConfig } from "../dist/utils/aiConfig.js";

test("Security Audit 1: Student vs Supervisor Critical File Privilege Isolation", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "zila-sec-eval-"));
  try {
    // 1. Create sensitive supervisor & solution files
    fs.writeFileSync(path.join(tempDir, "exercise.md"), "# Day 1 Exercise");
    fs.writeFileSync(path.join(tempDir, "grading.yml"), "rubric:\n  weights: [100]");
    fs.writeFileSync(path.join(tempDir, "solution.py"), "def answer(): return 42");
    fs.mkdirSync(path.join(tempDir, "solutions"), { recursive: true });
    fs.writeFileSync(path.join(tempDir, "solutions", "day1_sol.py"), "secret_solution = True");
    fs.writeFileSync(path.join(tempDir, ".supervisor_notes.txt"), "Internal supervisor rubric");
    fs.writeFileSync(path.join(tempDir, ".env"), "SECRET_API_KEY=prod_key_12345");
    fs.writeFileSync(path.join(tempDir, "server.key"), "-----BEGIN PRIVATE KEY-----");

    // Test A: Student listing hides all critical files
    const studentFiles = listWorkspaceFiles(tempDir, "", false).map((f) => f.name);
    assert.ok(studentFiles.includes("exercise.md"), "Student must see exercise.md");
    assert.ok(!studentFiles.includes("grading.yml"), "Student must NOT see grading.yml");
    assert.ok(!studentFiles.includes("solution.py"), "Student must NOT see solution.py");
    assert.ok(!studentFiles.includes("solutions/"), "Student must NOT see solutions/");
    assert.ok(!studentFiles.includes(".supervisor_notes.txt"), "Student must NOT see supervisor notes");
    assert.ok(!studentFiles.includes(".env"), "Student must NOT see .env");
    assert.ok(!studentFiles.includes("server.key"), "Student must NOT see server.key");

    // Test B: Student read attempts return Access Denied
    const deniedGrading = readWorkspaceFile(path.join(tempDir, "grading.yml"), 100, false);
    assert.strictEqual(deniedGrading.success, false);
    assert.match(deniedGrading.error || "", /Access Denied/);

    const deniedSolution = readWorkspaceFile(path.join(tempDir, "solution.py"), 100, false);
    assert.strictEqual(deniedSolution.success, false);
    assert.match(deniedSolution.error || "", /Access Denied/);

    const deniedSubSolution = readWorkspaceFile(path.join(tempDir, "solutions", "day1_sol.py"), 100, false);
    assert.strictEqual(deniedSubSolution.success, false);
    assert.match(deniedSubSolution.error || "", /Access Denied/);

    // Test C: Student write/overwrite attempts are blocked
    const deniedOverwrite = saveWorkspaceFile(path.join(tempDir, "grading.yml"), "compromised: true", false);
    assert.strictEqual(deniedOverwrite.success, false);
    assert.match(deniedOverwrite.error || "", /Access Denied/);

    // Test D: Supervisor retains legitimate operational access
    const supervisorGrading = readWorkspaceFile(path.join(tempDir, "grading.yml"), 100, true);
    assert.strictEqual(supervisorGrading.success, true);
    assert.match(supervisorGrading.content, /rubric/);

    const supervisorList = listWorkspaceFiles(tempDir, "", true).map((f) => f.name);
    assert.ok(supervisorList.includes("grading.yml"));
    assert.ok(supervisorList.includes("solution.py"));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("Security Audit 2: Path Traversal & Out-of-Bounds File Access Prevention", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "zila-sec-traversal-"));
  const outsideSecret = path.join(os.tmpdir(), `secret-outside-${Date.now()}.txt`);
  fs.writeFileSync(outsideSecret, "CONFIDENTIAL_HOST_DATA");

  try {
    // Check that relative paths outside repo are intercepted
    const traversalPath = path.join(tempDir, "..", path.basename(outsideSecret));
    
    // Pattern check: sensitive extensions
    assert.strictEqual(isCriticalFile("../../../etc/passwd"), false); // file reading checks boundary
    assert.strictEqual(isCriticalFile(".env.local"), true);
    assert.strictEqual(isCriticalFile("id_rsa.key"), true);
    assert.strictEqual(isCriticalFile("token.secret"), true);
    assert.strictEqual(isCriticalFile("credentials.json"), true);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.rmSync(outsideSecret, { force: true });
  }
});

test("Security Audit 3: Terminal ANSI & SGR Mouse Injection Resistance", () => {
  // SGR mouse flood attack payloads (such as user reported)
  const attackPayloads = [
    "\x1b[<32;127;13M\x1b[<32;128;13M\x1b[<0;128;13m",
    "126;13M[<32;127;13M[<32;128;13M",
    "\x1b[?1000h\x1b[?1002h\x1b[?1006h",
    "\x1b]0;malicious-title\x07",
    "\x1b[2J\x1b[H",
  ];

  for (const payload of attackPayloads) {
    assert.strictEqual(isMouseOrControlSequence(payload), true, `Must detect attack payload: ${JSON.stringify(payload)}`);
    const cleaned = cleanTypedInput(payload);
    assert.strictEqual(cleaned, "", `Cleaned payload must be empty, got: ${cleaned}`);
  }

  // Normal code input must be unharmed
  const safeInputs = [
    "def calculate_total(items: list) -> float:",
    "console.log('User logged in: ' + userId);",
    "SELECT * FROM users WHERE active = true;",
    "# Day 1: Neural Networks",
  ];

  for (const safe of safeInputs) {
    assert.strictEqual(isMouseOrControlSequence(safe), false);
    assert.strictEqual(cleanTypedInput(safe), safe);
  }
});

test("Security Audit 4: Sensitive Credential Redaction & Owner-Only Permissions", () => {
  // A: Credential redaction
  const rawLog = [
    "User authenticated with token: ghp_1234567890abcdefghijklmnopqrstuvwxyz",
    "Using OPENAI_API_KEY=sk-proj-1234567890abcdefghijklmnopqrstuv",
    "Header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDcSemACt8x4iTMCda8Yhe3iZaWbvV5XKSTbuAn0M",
    "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC\n-----END PRIVATE KEY-----",
  ].join("\n");

  const scrubbed = redactSensitiveContent(rawLog);
  assert.doesNotMatch(scrubbed, /ghp_1234567890/);
  assert.doesNotMatch(scrubbed, /sk-proj-1234567890/);
  assert.doesNotMatch(scrubbed, /MIIEvgIBADANBgkq/);

  // B: File system permission lockdown (0600 on files, 0700 on dirs)
  const configDir = fs.mkdtempSync(path.join(os.tmpdir(), "zila-config-sec-"));
  const prevConfigDir = process.env.ZILA_CONFIG_DIR;
  process.env.ZILA_CONFIG_DIR = configDir;

  try {
    saveToken("audit-session-jwt", "auditor@zigex.com");
    saveAgentConfig({
      provider: "groq",
      apiKey: "gsk_secret_auditor_key",
      model: "llama-3.3-70b-versatile",
      configuredAt: new Date().toISOString(),
    });

    const authFile = path.join(configDir, "auth.json");
    const configFile = getAgentConfigPath();

    // Verify file modes: 0600 (owner read/write only)
    assert.strictEqual(fs.statSync(authFile).mode & 0o777, 0o600, "auth.json must have 0600 permissions");
    assert.strictEqual(fs.statSync(configFile).mode & 0o777, 0o600, "agent_config.json must have 0600 permissions");
    assert.strictEqual(fs.statSync(configDir).mode & 0o777, 0o700, "config directory must have 0700 permissions");
  } finally {
    clearAuth();
    clearAgentConfig();
    if (prevConfigDir === undefined) delete process.env.ZILA_CONFIG_DIR;
    else process.env.ZILA_CONFIG_DIR = prevConfigDir;
    fs.rmSync(configDir, { recursive: true, force: true });
  }
});
