# Publishing and Managing Zila on npm

This guide explains how the Zila maintainers build, publish, verify, and maintain the `lil-zila` npm package. It assumes you are working in the `zila-agent` directory and have permission to publish under the npm account that owns the package.

## Current release

As of 2026-10-29, npm reports `lil-zila@0.2.0` as the `latest` release. The registry briefly showed an automatically-created `0.0.0-stage` placeholder while npm processed the first operational release; it later listed `0.2.0` as `latest`. Always check the registry rather than assuming a publish is immediately available.

Package page: <https://www.npmjs.com/package/lil-zila>

## What is being published

The package name is `lil-zila`. The package exposes two terminal command names, `zila` and `lil-zila`, both routed to `bin/zila.js`. That launcher loads the compiled application from `dist/cli.js`.

The `files` field in `package.json` limits the npm package to `bin/`, `dist/`, and `README.md`. Runtime dependencies are installed by npm from the package manifest. TypeScript source and development dependencies are not needed by users at runtime.

The project requires Node.js `>=20.19.0`. Check `node --version` on a user's machine if installation or execution fails.

## One-time setup

1. Install Node.js 20.19.0 or newer and npm. Check both versions:

   ```bash
   node --version
   npm --version
   ```

2. Sign in to the npm account that owns `lil-zila`:

   ```bash
   npm login --auth-type=web
   npm whoami
   ```

   The login command prints a one-time npm URL. Complete sign-in in the browser, then confirm `npm whoami` prints the expected npm username. Do not paste passwords, recovery codes, one-time codes, or access tokens into chat or source files.

3. Enable two-factor authentication for publishing in npm account security settings. When npm asks for a one-time code during publishing, enter it only in the terminal prompt. An organization may instead use a narrowly scoped granular access token with publish permission and the required 2FA bypass policy; store it in a secure secret manager, never in the repository.

## Routine release procedure

Run these steps from the repository root, not from the parent `zigex` directory.

1. Check that you are in the correct project and inspect local changes:

   ```bash
   cd /path/to/zigex/zila-agent
   git status --short
   ```

   Review and commit intended source changes first. Do not run `npm version` with unrelated or unreviewed changes in the working tree; npm may create a release commit and tag.

2. Install exactly the dependencies recorded in the lockfile and run the project's checks:

   ```bash
   npm ci
   npm test
   ```

   `npm test` builds TypeScript and runs the test suite. Fix failures before continuing.

3. Review the files that would go into the package:

   ```bash
   npm pack --dry-run
   ```

   Confirm the output includes `bin/zila.js`, `dist/cli.js`, the other required `dist/` files, and `README.md`. Stop if it lists `.env`, credentials, local data, or other unintended files.

4. Choose the next semantic version:

   - `npm version patch` for backward-compatible fixes, such as `0.2.0` to `0.2.1`.
   - `npm version minor` for backward-compatible features, such as `0.2.0` to `0.3.0`.
   - `npm version major` for breaking changes, such as `0.2.0` to `1.0.0`.

   `npm version` updates both `package.json` and `package-lock.json`, then normally creates a Git commit and matching `v` tag. Review the output and the resulting commit/tag. Do not reuse a version that has already been published; npm versions are immutable.

5. Run the tests and package preview again after the version bump:

   ```bash
   npm test
   npm pack --dry-run
   ```

6. Push the release commit and tag to the project's Git remote:

   ```bash
   git push origin HEAD
   git push origin --tags
   ```

   If your branch has a different upstream or your team uses pull requests, follow that repository's release policy and make sure the tagged commit is the reviewed release commit.

7. Publish the package publicly:

   ```bash
   npm whoami
   npm publish --access public
   ```

   `prepack` runs `npm run build` automatically during packing. Enter an npm 2FA code in the terminal if prompted. Publishing is an irreversible public release in normal workflows: do not publish until the package preview and version are correct.

8. Verify the registry reports the exact version and command mappings:

   ```bash
   npm view lil-zila dist-tags versions --json
   npm view lil-zila@VERSION version dist.tarball bin --json
   ```

   Replace `VERSION` with the version just released, for example `0.2.1`. The first command should show the version under `latest` for a normal release. A publish can take a short time to appear. If the registry temporarily shows a `0.0.0-stage` placeholder or says the release is being reviewed, wait and check again; do not keep republishing the same version.

9. Test the public install on a clean shell or another machine:

   ```bash
   npm install --global lil-zila@VERSION
   zila --version
   zila --help
   lil-zila --help
   ```

   Replace `VERSION` with the released version. `zila` and `lil-zila` should both start the CLI. This catches problems that a local TypeScript build alone cannot detect.

## Installing as a user

Install the current stable release globally:

```bash
npm install --global lil-zila
zila --help
```

To install a specific release, use `npm install --global lil-zila@0.2.0`. To update an existing global install, run `npm update --global lil-zila` or install the desired explicit version. If the shell cannot find `zila`, check `npm prefix --global` and make sure that npm's global `bin` directory is on the system `PATH`.

## Version tags and prereleases

Normal releases use the `latest` dist-tag. For a prerelease that should not become the default installation, use a prerelease version and a separate tag, for example:

```bash
npm version prerelease --preid=beta
npm publish --access public --tag beta
npm install --global lil-zila@beta
```

Only publish to `beta` after checking the version and tarball. Promote an already-published version to `latest` only when it is ready for general use:

```bash
npm dist-tag add lil-zila@VERSION latest
```

Inspect tags with `npm view lil-zila dist-tags --json`. A tag selects an existing version; it does not rebuild or change that version.

## Troubleshooting

| Symptom | Meaning and next check |
|---|---|
| `ENEEDAUTH` | This terminal is not authenticated. Run `npm login --auth-type=web`, finish the browser flow, and check `npm whoami`. |
| `E403` mentioning 2FA | Complete npm's publishing 2FA flow, or configure an authorized granular token under your team's security policy. Do not disable account security to work around it. |
| npm says the package is being processed, but `npm view` returns 404 | The publish may be in npm's staged-release review. Check the package page and `npm view lil-zila dist-tags versions --json` again later. Publish the same version only if npm confirms it was not accepted. |
| `E409` or version already exists | Choose a new patch, minor, or major version. Published versions cannot be overwritten. |
| `zila: command not found` | Confirm global install succeeded and npm's global `bin` directory is on `PATH`; also try `npx --yes lil-zila --help` to separate PATH problems from package problems. |
| CLI fails with a Node engine warning or syntax/runtime error | Check `node --version`; this project requires Node.js 20.19.0 or newer. Then reinstall the intended package version. |
| Publish output warns that npm corrected `bin` names | Verify the published metadata with `npm view lil-zila@VERSION bin --json` and test both commands. Fix package metadata in a future release if the aliases are not as intended. |

## Fixing or withdrawing a bad release

Do not try to overwrite a published version. For a normal bug fix, update the source, run all release checks, publish a new patch version, then move `latest` to it if necessary. To warn users about a version while a fix is prepared, deprecate that version:

```bash
npm deprecate lil-zila@VERSION "Short explanation and recommended version"
```

Unpublishing is restricted by npm and can break existing users and dependency trees. Use it only when npm policy allows it and the package owner has deliberately decided it is necessary. For compromised credentials, revoke the npm token/session immediately, secure the account, and publish a clean replacement release.

## Release checklist

- [ ] Changes reviewed and working tree understood.
- [ ] `npm ci` and `npm test` pass.
- [ ] `npm pack --dry-run` contains the expected files and no secrets.
- [ ] `package.json` and `package-lock.json` have the intended new version.
- [ ] Release commit and tag are pushed to the correct Git remote.
- [ ] `npm whoami` is the package owner/publisher account.
- [ ] `npm publish --access public` succeeds with any required 2FA.
- [ ] npm registry metadata lists the new version and expected `latest` tag.
- [ ] A clean global install runs `zila --version`, `zila --help`, and `lil-zila --help`.