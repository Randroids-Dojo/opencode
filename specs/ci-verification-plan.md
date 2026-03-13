# CI Verification Plan

## Goal

Define a verification ladder that is fast enough for candidate PR triage, strong enough for fork `dev`, and strict enough for fork `beta` and `production`.

The fork should not trust a successful build alone. Every release candidate should prove:

- the changed code type-checks and tests cleanly
- the built artifact can actually start
- the installed artifact can actually run
- the deployed or packaged product still works from the outside in

## Current Baseline

As of 2026-03-13, the repo already has some useful verification:

- [`test.yml`](../.github/workflows/test.yml) runs `bun turbo test` on Linux and Windows.
- [`test.yml`](../.github/workflows/test.yml) also runs app Playwright e2e via `bun --cwd packages/app test:e2e:local`.
- [`typecheck.yml`](../.github/workflows/typecheck.yml) runs `bun typecheck`.
- [`publish.yml`](../.github/workflows/publish.yml) builds and publishes CLI, Tauri, and Electron artifacts.
- [`deploy.yml`](../.github/workflows/deploy.yml) deploys `dev` and `production`.

There are still important gaps:

- There is no first-class CI lint layer beyond type checking.
- There is no post-build artifact smoke test that proves the shipped CLI or desktop artifacts start successfully.
- There is no install-script smoke test for released CLI binaries.
- `packages/console/app`, `packages/console/core`, and `packages/enterprise` have test files but no package `test` scripts, so the current `bun turbo test` flow does not cover them.
- There is no post-deploy smoke test for fork `dev`, `beta`, or `production`.
- There is no complete outside-in feature coverage map yet.

## Verification Principles

- Fast gates should run before expensive ones.
- A judge model never overrides failing objective checks.
- Release verification must run against built artifacts, not only against the source tree.
- `dev` gets fast feedback, `beta` gets broader confidence, and `production` gets the strictest soak and smoke requirements.
- Agent-user runs complement deterministic tests. They do not replace them.

## CI Stages

### Stage 0: Change classification

Every candidate branch, replay branch, and fork branch push should start by classifying the touched surface area.

Changed areas should at least distinguish:

- `cli`: `packages/opencode`, `packages/plugin`, `packages/util`, `packages/sdk/js`
- `app`: `packages/app`, `packages/ui`, `packages/web`
- `desktop`: `packages/desktop`, `packages/desktop-electron`, `packages/desktop/src-tauri`
- `console`: `packages/console/*`, `packages/enterprise`
- `workflow`: `.github/workflows`, `.github/actions`, shell scripts, release scripts
- `infra`: `infra`, `sst.config.ts`, deployment scripts, container assets

This classification drives which checks run next.

### Stage 1: Fast static gates

Run these on:

- replay branches for candidate PR evaluation
- every push to fork `dev`
- every promotion candidate before `beta` or `production`

#### Global gates

- `bun typecheck` on fork-owned branches
- `bunx prettier --check` on changed files or on the full repo if the diff is small
- `actionlint` when workflows or composite actions change
- `shellcheck` when shell scripts or inline workflow shell steps change

#### Targeted static gates

- `./packages/sdk/js/script/build.ts && git diff --exit-code` when SDK or schema generation is touched
- `cargo fmt --check` in `packages/desktop/src-tauri` when Tauri Rust code changes
- `cargo check` in `packages/desktop/src-tauri` when Tauri Rust code changes
- `bash -n install` when the CLI installer changes

#### Notes

- This repo does not currently have a repo-wide ESLint, Biome, or Oxlint configuration for CI. The initial lint layer should stay pragmatic and use the tools the repo already supports.
- Type checking is the main static TypeScript guard until the repo adopts a stronger code linter.

### Stage 2: Targeted tests

Run only the smallest useful test set first.

#### CLI and core

- `bun --cwd packages/opencode test`
- `bun --cwd packages/opencode build --single --skip-install` when CLI packaging logic changes

#### App and UI

- `bun --cwd packages/app test:unit`
- `bun --cwd packages/app test:e2e:local -- packages/app/e2e/app/home.spec.ts packages/app/e2e/session/session.spec.ts packages/app/e2e/prompt/prompt.spec.ts packages/app/e2e/projects/workspaces.spec.ts packages/app/e2e/settings/settings.spec.ts packages/app/e2e/terminal/terminal-init.spec.ts`

The files above are the initial smoke pack because they cover home, session, prompt, workspace, settings, and terminal flows that already exist in the repo. Later these should become a tagged or sharded Playwright smoke suite instead of a hard-coded file list.

#### Desktop

- `bun --cwd packages/desktop typecheck`
- `bun --cwd packages/desktop build`
- `bun --cwd packages/desktop-electron build` when Electron packaging code changes

#### Console and enterprise

Current gap:

- test files exist under `packages/console/app/test`, `packages/console/core/test`, and `packages/enterprise/test`
- those packages do not currently declare `test` scripts

Plan:

- add package-local `test` scripts
- include them in this stage as soon as they exist

#### Workflow and release automation

- `actionlint`
- targeted script execution for touched release scripts such as `script/beta.ts`

### Stage 3: Judge and agent-user gates

Run these only after Stage 1 and Stage 2 are green enough to produce useful evidence.

#### Judge agent

Inputs:

- candidate metadata
- touched area classification
- diff
- logs from static gates and targeted tests
- current fork docs and local architectural context

Output:

- `integrate`
- `rework`
- `reject`
- `defer`

The judge can block acceptance or request rework. It cannot greenlight a red build.

#### Agent-user smoke pack

Run a fast outside-in pack against the candidate build:

- CLI:
  - run `opencode --version`
  - run `opencode --help`
  - start `opencode serve` and probe `/global/health`
- app:
  - run the Playwright smoke pack through `test:e2e:local`
- desktop:
  - for the first phase, run Linux startup smoke only
  - later expand to macOS and Windows packaged-launch smoke

This pack should stay small enough to run on most candidate evaluations.

### Stage 4: Fork `dev` verification

Run on every push to fork `dev`.

This is the first branch where the fork should prefer broad confidence over minimal runtime.

Required gates:

- `bun typecheck`
- `bun turbo test`
- full `packages/app` e2e matrix from [`test.yml`](../.github/workflows/test.yml)
- path-based `actionlint` and `shellcheck`
- path-based SDK regeneration checks
- judge output attached for candidate-derived changes
- agent-user smoke pack for changed deliverables

Recommended additions:

- fold the current `typecheck.yml` and `test.yml` results into one branch-protection view
- add missing console and enterprise package tests to the same gate family

### Stage 5: Release build verification

Run on promotion to `beta` or `production`, and on any release draft build from [`publish.yml`](../.github/workflows/publish.yml).

The critical rule is:

Smoke tests must run against downloaded workflow artifacts or draft-release assets, not against the source-tree build directory in the same job.

#### CLI artifact smoke

For each supported CLI target we ship:

1. Download the built artifact.
2. Extract it into a temp directory.
3. Run:
   - `opencode --version`
   - `opencode --help`
4. Start `opencode serve` with temp home and temp XDG paths.
5. Probe `http://127.0.0.1:<port>/global/health`.
6. Stop the process cleanly.

This should run on the same OS family as the artifact:

- Linux smoke on Linux runners
- Windows smoke on Windows runners
- macOS smoke on macOS runners

#### Installer smoke

The install path must be tested separately from the raw binary.

For each CLI artifact:

1. Use `./install --binary <path> --no-modify-path` with a temp `HOME`.
2. Verify the installed binary exists under `~/.opencode/bin`.
3. Run:
   - `~/.opencode/bin/opencode --version`
   - `~/.opencode/bin/opencode --help`
4. Repeat the `serve` plus `/global/health` probe through the installed path.

#### Container smoke

Reuse [`packages/opencode/Dockerfile`](../packages/opencode/Dockerfile):

- build the image from release artifacts
- run `opencode --version`
- add a later follow-up that starts `opencode serve` in the container and health-probes it

#### Desktop smoke

Initial phase:

- Linux packaged-launch smoke for Tauri and Electron
- start the packaged app under `xvfb-run` if needed
- assert the process starts, stays alive briefly, and does not exit with a fatal error

Second phase:

- macOS packaged-launch smoke
- Windows packaged-launch smoke
- verify the embedded sidecar or first-window readiness signal if available

#### Post-deploy smoke

After `deploy.yml` finishes for `dev`, `beta`, or `production`:

- run a tiny HTTP smoke against the deployed stage
- run a tiny browser smoke against the deployed stage if it exposes a user-facing surface

This verifies the real deployed environment, not just the packaged artifact.

## Promotion Rules

### Into `dev`

A change can land on fork `dev` when:

- fast static gates pass
- targeted tests pass
- judge verdict is `integrate` or `rework`
- candidate smoke pack passes for the touched surface area

### Into `beta`

Promote from fork `dev` to `beta` only when:

- the change has spent at least 24 hours on `dev`
- fork `dev` CI is green
- release build verification is green
- post-deploy smoke for the `beta` stage is green
- no high-severity regression is still open

### Into `production`

Promote from fork `beta` to `production` only when:

- the change has spent at least 72 hours on `beta`
- release build verification is green again on the exact promotion candidate
- scheduled smoke runs against the released `beta` artifact remain green during the soak
- the broader outside-in suite is green
- rollback steps are documented

## Outside-in Coverage Roadmap

### Phase 1: Smoke

Goal:

- prove the major deliverables start and basic user flows still work

Required coverage:

- CLI binary starts
- CLI installer works
- app home, session, prompt, workspace, settings, and terminal smoke flows
- desktop package launches on Linux

### Phase 2: Critical-path suite

Goal:

- cover the user journeys most likely to break real usage

Required coverage:

- session creation and resume
- prompt submission and tool output
- file tree and file viewer flows
- terminal reconnect and tab flows
- settings, providers, and model selection
- review and share flows where applicable

### Phase 3: Full outside-in coverage

Goal:

- every shipped feature has at least one deterministic outside-in scenario

Required work:

- create a feature inventory for CLI, app, desktop, console, release, and deploy surfaces
- map every feature to one or more outside-in scenarios
- track uncovered features explicitly in the repo
- run the full suite nightly and on promotion candidates

## Recommended Workflow Shape

Short term:

- keep the current `typecheck.yml`, `test.yml`, `publish.yml`, and `deploy.yml`
- add a new release-artifact smoke workflow
- add a new post-deploy smoke workflow

Medium term:

- consolidate branch verification into a single `verify.yml`
- call reusable jobs for static checks, targeted tests, artifact smoke, and post-deploy smoke
- make branch protection depend on the unified verify workflow instead of scattered independent jobs

## Immediate next steps

1. Add a formatter check with `prettier --check`.
2. Add `actionlint` and `shellcheck` to branch CI.
3. Add package `test` scripts for console and enterprise tests, then wire them into CI.
4. Add a release-artifact smoke workflow for CLI binaries.
5. Add installer smoke using `./install --binary`.
6. Add Linux packaged-launch smoke for desktop artifacts.
7. Add a small post-deploy smoke workflow for `dev`, `beta`, and `production`.
8. Turn the current app smoke file list into a named Playwright smoke project.
9. Build the full feature-to-scenario outside-in coverage map.
