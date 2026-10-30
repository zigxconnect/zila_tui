# Zila Agent QA and End-to-End Test Plan

Use this document to test a Zila agent change or release and record whether it is ready to ship. It is intentionally a checklist: check an item only after you have run it and inspected the result. Mark checks that need unavailable accounts or services as `N/A` or `BLOCKED`, and explain why in the evidence fields. Never mark an unrun test as passed.

This plan covers the `lil-zila` npm CLI/TUI. It does not certify the hosted Zigex API, third-party providers, curriculum repositories, or npm itself. Tests that contact those services must use authorized test accounts and non-production data.

## 1. Test Run Record

Complete this section for each run or release candidate.

| Field | Value |
|---|---|
| Tester | |
| Date and time, including timezone | |
| Git branch and commit | |
| Candidate version | |
| Operating system and version | |
| Terminal and version | |
| Node.js version (`node --version`) | |
| npm version (`npm --version`) | |
| Install source (working tree, tarball, npm registry) | |
| Package version tested | |
| API environment (mock, local, staging, production) | |
| Test account / cohort label (never enter password or token) | |
| Overall result (PASS / FAIL / BLOCKED) | |

### Result rules

- **PASS:** performed and met the expected result; include evidence for important checks.
- **FAIL:** performed and did not meet the expected result; file a defect and do not release until triaged.
- **BLOCKED:** could not run because a prerequisite, service, permission, or test account was unavailable; write the blocker and owner.
- **N/A:** genuinely does not apply to this change; explain why.

For all release-blocking sections, `BLOCKED` is not a pass. The release owner must explicitly decide whether to defer the release or accept the documented residual risk.

## 2. Scope and Safety

- [ ] Confirm the feature/change being tested and list the affected commands/screens.
- [ ] Confirm the tested build is from the intended commit and version.
- [ ] Use a disposable workspace and test user for destructive, clone, submit, or install actions.
- [ ] Use a staging API or test tenant for actions that create/update server data.
- [ ] Do not use real student records, production credentials, private keys, or personal data in test evidence.
- [ ] Confirm no test sends source code or prompts to an AI provider without the tester's knowledge and approval.
- [ ] Confirm tests that install curriculum dependencies use a trusted disposable repository or isolated environment.
- [ ] Record unavailable integrations and mark their checks accurately instead of assuming they work.

Notes / exclusions:

```text
Scope:
Excluded or blocked:
Reason and owner:
```

## 3. Developer Environment and Clean Build

Run from the `zila-agent` repository root.

```bash
cd /path/to/zigex/zila-agent
node --version
npm --version
git status --short
npm ci
```

- [ ] Node.js is `20.19.0` or newer.
- [ ] `npm ci` completes successfully from the committed lockfile.
- [ ] No package installation errors or unexpected dependency changes occur.
- [ ] `git status --short` shows only expected local files before test-generated files are considered.
- [ ] The working tree does not contain real `.env` files, tokens, auth state, or test output intended to be committed.
- [ ] TypeScript compiles successfully:

  ```bash
  npm run build
  ```

- [ ] Full automated suite passes:

  ```bash
  npm test
  ```

- [ ] Record the test summary, pass/fail counts, and any skipped tests below.

Automated test summary:

```text
Command:
Result:
Passed / failed / skipped:
Relevant output or log location:
```

## 4. Automated Regression Coverage

The repository's test files currently cover the areas below. `npm test` builds first and runs `tests/*.test.ts` using Node's test runner with concurrency set to one.

- [ ] Cohort selection, persistence, slug generation, and department/level mapping.
- [ ] Command registration and expected aliases.
- [ ] Cohort picker and active cohort state.
- [ ] Leaderboard data, isolation, statuses, and UI behavior.
- [ ] Authentication helpers, API base validation, token persistence, and logout/clear behavior.
- [ ] AI configuration, provider models, and validation rules.
- [ ] Config and credential file permissions on the test OS.
- [ ] Billing/quota guards and relevant edge cases.
- [ ] Dependency detection and setup behavior.
- [ ] GitHub authorization helpers and identity/profile behavior.
- [ ] Task listing, task submission, PR automation, and report/task workflows.
- [ ] Logbook enrichment and supervisor instruction extraction.
- [ ] Pipeline integration and plan command behavior.
- [ ] Terminal UI, output history, scrolling, clear-screen, and status presentation.
- [ ] Security checks for repository traversal, symlink escape, secret-file access, secret redaction, shell metacharacters, HTTPS API requirements, repository URL validation, and private file permissions.
- [ ] CLI `--help`, `-h`, `--version`, and `-v` work in a non-interactive process.
- [ ] Each new or changed behavior has a regression test that fails if the behavior regresses.

Record gaps in coverage:

```text
Untested behavior:
Why it is not automated:
Manual test or follow-up issue:
```

## 5. Static, Dependency, and Secret Checks

- [ ] Run the production dependency audit:

  ```bash
  npm audit --omit=dev
  ```

- [ ] Review all reported advisories; no unresolved high/critical production issue is accepted without explicit release-owner approval and mitigation.
- [ ] If full audit is used, distinguish production dependencies from development-only findings:

  ```bash
  npm audit
  ```

- [ ] Check the diff for accidentally committed secrets, local config, generated credentials, and debug logs.
- [ ] Confirm `.env` is ignored and only safe placeholder configuration is tracked.
- [ ] Confirm API credentials, AI keys, and GitHub tokens are never printed in normal output or error messages.
- [ ] Confirm diagnostic output does not contain credentials or private source data.
- [ ] Confirm any new network destination, AI provider, data collection, or permission is documented and approved.
- [ ] Confirm user-provided strings are handled as data, not shell syntax or executable code.
- [ ] Confirm file operations remain scoped to the intended workspace and reject unsafe traversal/symlinks where applicable.

Audit result / exception approval:

```text
Command and date:
Findings:
Mitigation or approved exception (owner and date):
```

## 6. Package Contents and Local Tarball Test

Build and inspect the package without publishing:

```bash
npm pack --dry-run
npm pack
```

- [ ] Package name and version are the intended release values (`lil-zila` and the candidate semver).
- [ ] Package includes `bin/zila.js`, `dist/cli.js`, required compiled runtime files, `package.json`, and `README.md`.
- [ ] Package does not include `.env`, auth tokens, local Zila config, source-only test fixtures, unrelated projects, or credentials.
- [ ] The `bin` metadata declares both `zila` and `lil-zila` and points to the packaged launcher.
- [ ] The launcher is executable / npm creates runnable command shims on the target operating system.
- [ ] Package `engines.node` agrees with the actual runtime requirement (`>=20.19.0`).
- [ ] Install the generated tarball into an isolated temporary prefix, not over a user's existing global package:

  ```bash
  install_dir=$(mktemp -d)
  npm install --prefix "$install_dir" --global ./lil-zila-VERSION.tgz
  "$install_dir/bin/zila" --version
  "$install_dir/bin/zila" --help
  "$install_dir/bin/lil-zila" --help
  ```

  Replace `VERSION` with the actual package version and run the commands from the directory containing the tarball.

- [ ] The tarball install reports the expected version and usage, exits successfully, and prints no uncaught exception.
- [ ] Remove the temporary test directory after evidence is captured; ensure the path is the temporary directory created for this test:

  ```bash
  rm -rf "$install_dir"
  ```

> Do not run that cleanup command with an unset or manually substituted path. Confirm `printf '%s\n' "$install_dir"` shows the temporary test folder first.

Package preview / tarball evidence:

```text
Tarball filename:
Package name and version:
Unexpected files (if any):
Smoke-test result:
```

## 7. CLI Startup and Terminal Compatibility

Test each supported target environment and terminal that matters to the release.

- [ ] `zila --version` prints the installed package version and exits with status zero.
- [ ] `zila -v` behaves the same as `zila --version`.
- [ ] `zila --help` prints usage and exits with status zero.
- [ ] `zila -h` behaves the same as `zila --help`.
- [ ] `lil-zila --version` and `lil-zila --help` also work.
- [ ] Running without a TTY exits with help text rather than hanging.
- [ ] Running interactively displays the startup/splash experience and reaches the prompt.
- [ ] Prompt accepts ordinary text, commands, spaces, and Unicode input without corrupting the UI.
- [ ] Terminal resize does not crash or permanently overlap the panels.
- [ ] Narrow terminal width remains usable; text does not hide the prompt or critical status.
- [ ] Ctrl+C exits cleanly and restores terminal input/echo state.
- [ ] `exit` or the supported quit key exits cleanly and restores terminal state.
- [ ] `clear` clears terminal output without corrupting the prompt.
- [ ] Unknown commands show an actionable error/help hint and do not crash the process.
- [ ] Close/escape/back keys work in overlays and return to the expected view.
- [ ] No repeated React warnings, duplicate-key warnings, unhandled promise rejections, or uncaught exceptions appear during normal navigation.
- [ ] Accessibility: color is not the only signal for success/error/warning; labels remain readable in supported terminal color modes.

Terminal(s), dimensions, and notes:

```text
OS / terminal:
Approximate columns x rows:
Observed issues:
```

## 8. Interactive UI and Command Behavior

Use disposable data. Verify each command is present in `zila help` before testing. Some screens may require authentication or data from the staging API.

### General shell behavior

- [ ] `help` opens the command reference and can be closed using its displayed close controls.
- [ ] Help rows do not produce duplicate React keys or omit commands.
- [ ] Command names, descriptions, categories, and aliases match actual registered behavior.
- [ ] A near-miss command provides a useful suggestion when appropriate.
- [ ] An unavailable/coming-soon command is clearly identified and does not appear to succeed.
- [ ] Long output can be navigated/cleared as intended; history stays responsive at a large output count.
- [ ] Repeated commands do not duplicate stale rows, overlays, or status state.

### Setup and authentication

- [ ] `init` opens the expected setup workflow.
- [ ] Missing required Git/Node/Python dependencies are reported accurately and safely.
- [ ] Declining or cancelling setup leaves the workspace in a recoverable state.
- [ ] Invalid email, OTP, login, or API responses show safe actionable errors.
- [ ] Successful authentication stores the expected account identity without printing the token.
- [ ] Reopening the CLI uses valid saved auth as designed.
- [ ] Logout/clear-auth removes the correct saved credential and does not remove unrelated user files.
- [ ] API base rejects plain HTTP remote endpoints and allows HTTPS; localhost development behavior is limited to the intended local case.
- [ ] Expired/revoked token behavior is understandable and gives the user a recovery path.

### Cohorts, group, leaderboard, achievements

- [ ] Cohort picker displays available test cohorts and handles an empty response.
- [ ] Selecting a cohort updates the active cohort indicator and relevant data.
- [ ] Switching cohorts does not leak leaderboard/group/task data across cohorts.
- [ ] Cancel/back leaves the previous cohort unchanged.
- [ ] `cohorts`, `group`, and `leaderboard` commands follow their displayed usage and options.
- [ ] Empty, malformed, unauthorized, and server-error responses render clear states rather than a blank or crashed screen.
- [ ] Achievements screen renders earned and empty states correctly.
- [ ] Long names, missing avatars, special characters, and large ranking lists remain readable.

### Tasks, reports, pull requests

- [ ] `tasks` loads tasks for the intended cohort/account and displays empty/loading/error states.
- [ ] Task filters and details use the selected task and preserve state when returning.
- [ ] Submit-task flow validates required inputs before creating a PR or submission.
- [ ] Submit-report flow validates required fields and shows a review/confirmation step before sending, where implemented.
- [ ] Cancelled submissions do not create remote changes.
- [ ] Successful staging submission appears exactly once and links to the correct task/repository.
- [ ] Retry after a network failure does not create duplicate submissions.
- [ ] Permission-denied, rate-limited, invalid repository, and offline responses are reported without exposing secrets.
- [ ] GitHub auth/device flow displays instructions; test approval and denial with a test account.
- [ ] GitHub token storage uses restrictive file permissions and is not embedded in clone URLs or logged.

### Monitoring and logbook

- [ ] Monitor starts for the selected disposable workspace.
- [ ] Create, modify, rename, and delete test files; check that expected activity is captured.
- [ ] Monitor status reports accurate running/stopped state.
- [ ] Stop monitor and confirm it no longer records changes.
- [ ] Restart behavior does not duplicate or corrupt monitor state.
- [ ] Excluded files and secret-like files are not unintentionally exposed or uploaded.
- [ ] Logbook generation handles a workspace with commits and changes.
- [ ] Empty history, malformed dates, unusual commit text, and missing metadata are handled gracefully.
- [ ] Generated file is saved in the documented workspace location and does not overwrite unrelated user content without warning.
- [ ] Generated entries, dates, task references, and summaries match the disposable test data.

### AI assistant and provider configuration

- [ ] Setup accepts only supported provider/model combinations and explains invalid input.
- [ ] Cancelled setup does not overwrite a working configuration.
- [ ] API key configuration is stored with owner-only permissions and is not echoed in terminal output.
- [ ] Assistant indicates which provider is configured and whether network access is needed.
- [ ] Prompt/context handling respects the intended workspace boundary.
- [ ] Traversal paths and symlink escapes are rejected.
- [ ] Common credentials/private-key patterns are redacted before context is sent; treat redaction as defense in depth, not a guarantee.
- [ ] Search input containing shell metacharacters remains literal data and does not execute commands.
- [ ] Provider timeout, invalid key, quota, offline, malformed response, and cancellation produce recoverable messages.
- [ ] User can tell when code/context may be sent to a third-party provider; only submit approved test code.

### Information, statistics, and utility screens

- [ ] `about`, `info`, `stats`, `cache`, `quota`, and related commands show accurate data or a clear unavailable state.
- [ ] Missing optional metrics do not crash the UI.
- [ ] `docs` and search commands handle empty results, special characters, and network errors.
- [ ] Output formatting remains readable with color disabled and with long values.

Interactive test accounts/environment (labels only; no secrets):

```text
Staging API:
Test cohort:
Test GitHub identity:
Test provider/model:
Test repository/workspace:
```

## 9. External Integration End-to-End Tests

Run only against explicitly authorized staging resources. Record service status and timestamps. Do not use production accounts unless the service owner authorizes a production smoke test.

### Zigex API

- [ ] DNS resolves to the intended staging API host.
- [ ] TLS certificate hostname and validity are correct.
- [ ] `API_BASE` points at the intended environment; it contains no credentials.
- [ ] Valid test login/auth completes and returns the expected test identity.
- [ ] Invalid credentials and expired sessions are rejected safely.
- [ ] Authorized cohort/profile/task reads return expected staging data.
- [ ] Unauthorized reads/writes are rejected by the server, not merely hidden by the CLI.
- [ ] A test submission/report can be created once and is visible in the staging system.
- [ ] Rate limits, timeouts, 5xx, and offline behavior are understandable and recoverable.
- [ ] Logout/token revocation works as the API contract specifies.

### GitHub

- [ ] OAuth app has device flow enabled and the configured client ID matches the intended app.
- [ ] Device authorization approval and denial paths both behave correctly.
- [ ] Token identity is the expected test user.
- [ ] Clone/PR workflow works in a disposable repository with required permissions.
- [ ] PR title/body/branch/base are correct and no duplicate PR is created on retry.
- [ ] Rate limit, revoked token, missing scope, private repository, and network failure paths are tested or explicitly blocked.

### AI provider

- [ ] Provider, model, quota, privacy notice, and data-processing expectations are approved.
- [ ] A minimal synthetic prompt succeeds with a test key.
- [ ] Invalid key, quota exceeded, timeout, malformed response, and provider error are exercised where safe.
- [ ] No real credentials, student data, or sensitive company source is submitted as test content.
- [ ] Logs and debug files do not contain the test key or full sensitive prompt content.

Blocked integration checks and owner:

```text
Integration:
Blocked check:
Reason:
Owner / follow-up issue:
```

## 10. Fresh Install and Upgrade Tests

Test the package that users will actually install, not only the repository working tree.

- [ ] Confirm package metadata and dist-tag:

  ```bash
  npm view lil-zila dist-tags versions --json
  npm view lil-zila@VERSION version bin engines dist.tarball --json
  ```

- [ ] Registry version and `latest` tag match the release decision.
- [ ] Fresh install succeeds in an isolated npm prefix:

  ```bash
  install_dir=$(mktemp -d)
  npm install --prefix "$install_dir" --global lil-zila@VERSION
  "$install_dir/bin/zila" --version
  "$install_dir/bin/zila" --help
  "$install_dir/bin/lil-zila" --help
  ```

- [ ] `zila` and `lil-zila` both map to the expected version.
- [ ] Test upgrade from the previous published version in a disposable environment.
- [ ] User configuration and auth survive a package update unless the release notes explicitly state otherwise.
- [ ] Uninstall removes npm command links/package files but does not erase `~/.zila` user configuration unexpectedly.
- [ ] Installation/update instructions use `npm install -g lil-zila`; do not tell users to `npm install -g zila` because `zila` is not the package name.
- [ ] Remove the temporary prefix after the test, after verifying the variable points to the temporary path.

Upgrade path tested:

```text
Previous version:
Candidate version:
Config persistence result:
Uninstall result:
```

## 11. Cross-Platform Matrix

Fill each row that is in the supported release scope. Do not claim platform support based only on a Linux run.

| Platform | Node version | Install method | Version/help | Interactive TUI | Core workflow | Result / evidence |
|---|---|---|---|---|---|---|
| Linux | | | [ ] | [ ] | [ ] | |
| macOS | | | [ ] | [ ] | [ ] | |
| Windows PowerShell | | | [ ] | [ ] | [ ] | |
| Windows CMD | | | [ ] | [ ] | [ ] | |
| WSL (if supported) | | | [ ] | [ ] | [ ] | |

Cross-platform checks:

- [ ] Paths with spaces and non-ASCII characters work where relevant.
- [ ] File permission assertions are platform-aware; POSIX permission checks are not assumed on Windows.
- [ ] Ctrl+C and terminal restore behavior tested for each platform in scope.
- [ ] Shell quoting in documented commands matches each target shell.
- [ ] No path separator, case sensitivity, or line-ending assumption breaks user data.

## 12. Performance, Reliability, and Recovery

- [ ] Startup time is reasonable on a supported developer machine; record baseline and candidate.
- [ ] Large command output/history does not make the TUI unusably slow.
- [ ] Repeated screen navigation does not cause steadily increasing memory use or duplicate listeners.
- [ ] Slow network and repeated API failures do not freeze the terminal indefinitely.
- [ ] Offline startup still offers local help/version behavior.
- [ ] Unexpected command errors are caught and presented; the terminal is restored after failure.
- [ ] Restart after interrupted setup leaves no corrupt auth/config/workspace state.
- [ ] Retry actions do not duplicate remote writes.
- [ ] User-owned files are not silently deleted or overwritten.
- [ ] Crash report/diagnostic location is documented and permissions are restrictive.

Performance measurements:

```text
Machine:
Cold startup:
Warm startup:
Large output scenario:
Observed memory/reliability issue:
```

## 13. Defect Reporting

For every failed check, create a defect before sign-off. Include:

- [ ] Short title and severity (Blocker / Critical / Major / Minor / Cosmetic).
- [ ] Exact version, OS, Node/npm versions, terminal, and install source.
- [ ] Minimal reproduction steps using disposable test data.
- [ ] Expected behavior and actual behavior.
- [ ] Sanitized output, screenshot, or log reference.
- [ ] Whether it reproduces on the previous released version.
- [ ] Security/privacy impact assessment when credentials, source, permissions, or network behavior are involved.
- [ ] No secrets, tokens, personal student information, or private source included in the issue.
- [ ] Regression test or follow-up coverage item linked to the defect.

Defect references:

```text
Issue IDs:
Release-blocking defects:
Accepted residual issues and approver:
```

## 14. Release Sign-Off

### Required release gates

- [ ] Correct release commit and intended version are selected.
- [ ] `npm ci` passes from the lockfile.
- [ ] `npm test` passes; failures and skips are explained.
- [ ] `npm audit --omit=dev` reviewed; no unapproved high/critical production vulnerability remains.
- [ ] `npm pack --dry-run` contents reviewed for missing files and secret leakage.
- [ ] Local tarball smoke test passes.
- [ ] Relevant UI/manual regression checks pass on the target platform(s).
- [ ] Required staging end-to-end integrations pass, or blocked checks have named owners and explicit release approval.
- [ ] Package name, semver, bin entries, engine requirement, README install instructions, and release notes are correct.
- [ ] npm account and publishing authorization are verified without sharing secrets.
- [ ] Release is published and registry metadata reports expected version and tag.
- [ ] Fresh registry install and both CLI aliases pass.
- [ ] No unresolved release-blocking defects remain.
- [ ] User-facing documentation and support notes are updated.
- [ ] Release commit/tag and test evidence are saved with the release record.

### Final decision

```text
Decision: PASS / FAIL / BLOCKED
Release version:
Commit / tag:
Automated test result:
Manual QA result:
Blocked checks and accepted risk:
Defect issues:
Tester name and date:
Release approver name and date:
Evidence location:
```

## 15. Post-Release Smoke Test

After npm reports the release as available:

- [ ] Re-query `npm view lil-zila dist-tags versions --json` and verify `latest`.
- [ ] Install the exact version in a clean environment.
- [ ] Run `zila --version`, `zila --help`, and `lil-zila --help`.
- [ ] Confirm users can find the package page and install command.
- [ ] Monitor npm support/issues and the staging/production API health for regressions.
- [ ] If a severe issue is found, stop recommending the affected version, inform maintainers, and publish a corrected new version; never assume a published version can be overwritten.

Post-release notes:

```text
Registry check time:
Installed version:
Smoke-test result:
Follow-up issue or incident:
```