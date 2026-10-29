# Zila Agent Release Security Review

Review date: 2026-10-29
Target install: `npm install -g lil-zila`

## Findings and remediation status

| Severity | Finding | Status |
| --- | --- | --- |
| Blocker | Package identity did not match `lil-zila`; the published bin shim referenced a build file omitted from the tarball. | Fixed and verified with a clean temporary install. |
| High | Assistant search arguments reached a shell command, allowing shell metacharacter interpretation. | Fixed; regression test passes. |
| High | Assistant file reads did not constrain paths to the selected repository and could expose ignored secret files to the AI provider. | Fixed for traversal, symlink escape, and common credential paths; regression tests pass. |
| High | Assistant observations could send common credential formats to a third-party model provider. | Common key/token/private-key patterns are redacted; regression test passes. This is not a guarantee against every secret format. |
| High | GitHub access tokens were embedded in clone URLs, persisting in `.git/config`. | Fixed by using a transient Git extra-header and disabling shell mode; no dedicated network-mocked clone test yet. |
| High | Authenticated API requests could send bearer credentials over HTTP. | Shared API base now rejects non-HTTPS except localhost; regression test passes. |
| High | AI provider configuration and shared config directory did not consistently enforce owner-only permissions. | Fixed to directory mode `0700` and credential/config files `0600`; isolated regression test passes. |
| High | Production dependency audit reported a high-severity `ws` advisory. | Fixed; `npm audit --omit=dev` reports zero vulnerabilities. |
| Medium | Assistant diagnostics were written to the current working directory. | Fixed; diagnostics are in `~/.zila/assistant-debug.log` with owner-only permissions. |
| Medium | Install documentation and package identity were inconsistent. | Package metadata, lockfile, CLI help, and primary install instruction now use `lil-zila`. |
| Medium | Package claimed Node 18 support while `chokidar@5` requires Node 20.19 or newer. | Fixed by setting the package engine minimum to `>=20.19.0`. |

## Release checks

- [x] `npm test` (102 tests pass)
- [x] Full `npm audit` reports zero vulnerabilities.
- [x] npm tarball includes `dist/cli.js` and executable `bin/zila.js`, excludes source, tests, and environment files.
- [x] Clean temporary install of the tarball; `lil-zila --help` and `lil-zila --version` both run.
- [x] npm registry lookup returned 404 for `lil-zila` at review time; recheck immediately before publishing because availability can change.
- [ ] Confirm the deployed Zigex API endpoint is reachable over HTTPS and matches the configured production URL; this requires access to the deployment/environment.
- [ ] Publish from the release commit with npm provenance/2FA and verify the installed registry package.

## Scope and limitations

This is a source-level review, not a penetration test or a guarantee of security. Users should assume code and diffs intentionally supplied to the AI assistant are transmitted to the configured model provider. Secret scrubbing is defense in depth and cannot identify every proprietary or sensitive value; do not submit secrets or regulated data to an external provider.

## Remaining production decisions

- `zila init` installs dependencies declared by the downloaded curriculum. npm lifecycle scripts and Python package build backends may execute code as the user. Restrict curriculum repositories to trusted maintainers, show the selected repository and manifests before installation, and consider an explicit consent prompt or sandbox before enabling automatic installs.
- AI integrations transmit user-selected code/context to third-party providers. Clearly disclose the provider and data flow, provide a way to disable AI features, and never describe secret scrubbing as complete protection.
- Verify production API ownership, TLS certificate/hostname, authentication/session expiry and revocation behavior, and server-side authorization/rate limits in the Zigex API deployment; these cannot be proven from the client source review.
- Recheck package-name availability, use npm 2FA/provenance, and publish only from a reviewed release commit. The npm registry availability check is point-in-time.