# Lil-Zila Continuation Guide

This is a short handoff for the current state of the package and the next work that should continue from here.

## Current project state

- Package name: `lil-zila`
- CLI aliases: `zila` and `lil-zila`
- Published version at the time of this handoff: `0.2.1`
- Runtime requirement: Node `>=20.19.0`
- Stack: TypeScript + Ink + React CLI shell + Zigex API + AI provider integrations
- Primary entrypoint: `src/cli.ts` with compiled output under `dist/`

## What is already working

- Global CLI install works for both command names.
- `--help` and `--version` work in non-interactive mode.
- AI setup flow accepts provider + API key and saves configuration to the user config directory.
- The setup path auto-opens the Lil Agent screen after a successful key save.
- Gemini model list includes the requested flash options, including `gemini-2.5-flash` and `gemini-3.8-flash`.
- First-run onboarding is active for the Lil Agent and is stored in the user config directory with a one-time flag.
- The welcome screen is intentionally a small, centered mission message with a blue ASCII mascot and anti-cheating reminder.

## Important files

- `src/cli.ts` — CLI bootstrap entrypoint
- `src/shell/Shell.tsx` — top-level shell state and startup routing
- `src/screens/AgentSetupScreen.tsx` — provider + API key onboarding flow
- `src/screens/LilAgentShellScreen.tsx` — Lil Agent UI and first-run welcome state
- `src/utils/aiConfig.ts` — provider/model metadata and config persistence
- `src/utils/onboarding.ts` — first-run marker storage for the welcome screen
- `NPM_RELEASE_GUIDE.md` — npm release and publishing notes
- `QA_TEST_PLAN.md` — release validation checklist

## Local verification commands

Run these from the project root:

```bash
cd /home/gita/Desktop/PROJECTS/zigex/zila-agent
npm ci
npm run build
npm test
```

Optional smoke checks:

```bash
node dist/cli.js --help
node dist/cli.js --version
npm pack --dry-run
```

## Local install and manual smoke test

```bash
npm install -g ./lil-zila-VERSION.tgz
zila --help
zila --version
lil-zila --help
```

> Do not publish a release until the QA checklist and package tarball smoke tests are complete.

## First-run onboarding behavior & ASCII Mascot

The Lil Agent welcome state is intentionally one-time only when opening the agent interface for the first time. The screen displays a centered child companion in Zila retro cyan and blue ASCII art (`retroCyanBright` and `retroBlueBright`), paired with an enclosed speech bubble containing the official anti-cheating mission:

```text
          .-----.
        .' -   - '.
       /   o   o   \
      |      ^      |
       \   '---'   /
       .-'-------'-.
      /  .-------.  \
     |  /  ZILA   \  |
     |  \_________/  |
      \___/     \___/
         /|     |\
        (_|     |_)

        Hi, I’m Lil-Zila.

╭────────────────────────────────────────────────────────────╮
│ I am here to monitor and make sure you do the writing...   │
│ Together, we can say no to cheating the right way:         │
│ That’s the aim of Lil-Zila.                                │
╰────────────────────────────────────────────────────────────╯
```

Key onboarding mechanisms:
1. **Persistence Flag**: Stored at `~/.zila/lil_agent_welcome_seen`. When present, normal chat session begins immediately.
2. **Re-invoking Anytime**: Users can view the mascot and mission statement anytime during an active session by typing the `/welcome` slash command.
3. **Automated Test Validation**: Covered in `tests/onboarding.test.ts` (106/106 tests passing).

## Release / publish workflow

Before publishing:

1. Update semver in `package.json`.
2. Make sure build passes.
3. Run the full test suite.
4. Validate `npm pack --dry-run` for included files.
5. Confirm `bin` shims are correct and package metadata is right.
6. Run `npm login` with the correct npm account if needed.
7. Publish with `npm publish`.

Example:

```bash
npm version patch
npm run build
npm test
npm publish
```

## Deployment notes

The separate API project under the sibling `zila-api` folder is a distinct deployment target. If that service is deployed to a VPS or container host, it should be isolated behind its own HTTP port and should avoid conflicting with already-running applications. The package here is the CLI/TUI client, not the host API service itself.

## Recommended next actions

1. Keep the `zila-agent` CLI stable and avoid changing command names unless required.
2. Validate fresh npm installs in a clean environment before each release.
3. Recheck the live Gemini catalog before shipping a version that depends on a new model ID.
4. If the API is re-deployed on a VPS, keep the host port mapping explicit and non-conflicting.
5. Continue to test the onboarding flow under a clean config directory to ensure the first-run message appears once and only once.
