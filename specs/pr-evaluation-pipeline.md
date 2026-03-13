# PR Evaluation Pipeline

## Goal

Turn each upstream pull request into an auditable fork decision:

1. Reject.
2. Rework and integrate on fork `dev`.
3. Integrate with minimal change on fork `dev`.
4. Defer until upstream or fork context changes.

The pipeline should not ask a model for a gut feeling on a raw diff. It should gather evidence first, then let models judge that evidence, then let the fork implement the accepted idea in the shape that best fits the current codebase.

Detailed CI, release, and smoke-test planning lives in [`ci-verification-plan.md`](./ci-verification-plan.md).

## Operating Principles

- Evidence before opinion.
- Separate the implementer from the judge.
- Evaluate candidate PRs against the fork's current `dev`, not against stale upstream state.
- Prefer repo-native rewrites over mechanically merging code that fights the current architecture.
- Promote through `dev`, then `beta`, then `production` only after progressively broader verification.

## Agent Roles

### Intake agent

- Pull PR metadata, labels, review state, changed files, target branch, linked issues, and mergeability.
- Classify the affected surface area: CLI/core, app/web, desktop, infra, docs, SDK, or mixed.
- Produce a candidate score so we process high-value, low-risk PRs first.

### Replay agent

- Start from current fork `dev`.
- Create a disposable worktree or branch for the candidate PR.
- Reapply the PR diff or replay the change manually when the original branch is unavailable.
- Run the first layers of objective checks and capture logs.

### Judge agent

- Review the diff, the replay result, the quality-check logs, and the local architectural context.
- Output a structured verdict with risks, confidence, and required rework.
- Never approve a change on style or enthusiasm alone.

### Agent-user runner

- Test the changed behavior from the outside in using scripted user journeys and task prompts.
- Focus on observable behavior, regressions, and UX friction instead of internal implementation details.
- Record pass or fail results plus short notes about unexpected behavior.

### Integration agent

- Convert an accepted candidate into a fork-native implementation brief.
- Keep the useful idea, drop the parts that fight the codebase, and add the tests and guardrails implied by the earlier evidence.
- Land the result on fork `dev`, not directly on `beta` or `production`.

### Prioritizer agent

- Take the pool of accepted or rework-worthy candidates and decide what should be implemented next.
- Optimize for user value, dependency order, release fit, shared context, and conflict avoidance.
- Produce an implementation queue, not a quality verdict.

## Pipeline

### Level 0: Intake and ranking

Every upstream PR should be normalized into a small fact record:

- PR number and URL
- base branch
- title, body, labels, and author
- age and last update time
- changed files and touched packages
- draft state
- conflict state
- linked issue state if present

Initial ranking should bias toward:

- bug fixes, crash fixes, and security fixes
- small diffs with clear tests
- changes that touch one surface area
- PRs that align with existing upstream direction

Initial ranking should downrank:

- large speculative feature work
- sweeping refactors without a clear problem statement
- changes that are already superseded by upstream `dev`
- PRs with unclear intent or missing reproduction details

### Level 1: Objective quality gates

Do not ask a judge model to rescue a change that already fails basic evidence checks.

#### Universal gates

- patch applies cleanly to fork `dev`, or the conflict is obviously mechanical
- no obvious secret, credential, or generated-artifact problems
- diff size and touched areas are recorded
- test and build commands for the touched surface area are identified

#### Package-targeted gates

Use the smallest useful set of checks first, then widen if the change survives.

- CLI and core changes:
  - run `bun typecheck` in `packages/opencode`
  - run `bun test` in `packages/opencode`
- app, web, console, or UI changes:
  - run `bun typecheck` in `packages/app`
  - run `bun run test:unit` in `packages/app`
  - run `bun run test:e2e` in `packages/app` when end-user flows change
- desktop changes:
  - run `bun typecheck` in `packages/desktop`
  - run `bun run build` in `packages/desktop`
- SDK changes:
  - regenerate the JavaScript SDK with `./packages/sdk/js/script/build.ts`
  - run the affected package type checks
- workflow and automation changes:
  - run `actionlint`
  - run the smallest relevant script or workflow dry run

Broader follow-up checks should happen after a candidate survives the first pass.

### Level 2: Judge pass

The judge should only run after Level 1 evidence exists.

Judge input should include:

- the PR metadata record
- a summary of the touched packages
- the replay branch diff
- Level 1 logs
- relevant docs, such as `specs/fork-mission.md`
- relevant local code excerpts for the touched subsystem

Judge output should be structured and machine-readable:

- `verdict`: `integrate`, `rework`, `reject`, or `defer`
- `confidence`: low, medium, or high
- `why`: short explanation grounded in evidence
- `risks`: specific technical or product risks
- `fit`: how well the change matches current architecture
- `tests_missing`: what evidence is still absent
- `rewrite_notes`: what to keep, what to change, what to drop

Preferred setup:

- Codex or another coding model for replay and implementation
- a separate judge context for evaluation
- ideally a different model family or at least an isolated judge prompt so the evaluator is not grading its own work

### Level 3: Agent-user outside-in testing

Outside-in testing should answer a different question than the judge:

Does the change actually make the product behave better for a user?

Scenario suites should be selected from the touched areas:

- CLI/core:
  - install or build the CLI
  - start a session
  - run a simple coding task
  - verify common config or provider flows if touched
- app, web, and UI:
  - run focused end-user journeys with the existing app test harness
  - capture regressions in navigation, prompts, rendering, and task completion
- desktop:
  - verify launch, core interaction, and update-sensitive flows
- SDK or API:
  - run a tiny consumer example against the changed behavior

Agent-user output should include:

- scenario name
- expected outcome
- observed outcome
- pass or fail
- short notes

### Level 4: Decision

Combine the evidence into one of four outcomes.

#### Integrate

Use this when:

- the change solves a real problem
- the idea still fits the fork mission
- objective checks pass or only need minor cleanup
- judge confidence is acceptable
- critical user journeys pass

#### Rework

Use this when:

- the idea is good
- the implementation shape is wrong for the current architecture
- tests or user journeys reveal fixable issues
- the fork can produce a smaller or cleaner patch than the original PR

#### Reject

Use this when:

- the change is redundant with upstream
- the maintenance cost is too high for the value
- the implementation breaks core architectural boundaries
- the evidence shows poor reliability or unclear user value

#### Defer

Use this when:

- upstream is moving too quickly in the same area
- replay infrastructure is missing for the touched surface area
- evidence is still too incomplete to make a confident call

### Level 5: Prioritize the accepted queue

This is different from intake ranking.

- Intake ranking decides what to evaluate next.
- Prioritization decides what to implement next after a candidate is already accepted.

The prioritizer should score accepted candidates on:

- user value and severity
- dependency order
- overlap with in-flight fork work
- likelihood of upstream drift in the same area
- ability to batch related changes safely
- release-lane fit and rollback complexity

The prioritizer should output:

- an ordered queue
- suggested implementation batches
- reasons for hold, defer, or accelerate decisions
- any required prerequisites before implementation

## How to incorporate accepted PRs

Accepted PRs should not be merged blindly from the contributor branch. They should be translated into a fork-native change.

### Step 1: Pull the next candidate from the prioritized queue

Do not implement accepted PRs in random order. Work the prioritized queue so the fork can batch related changes and avoid unnecessary conflicts.

### Step 2: Write an integration brief

The brief should capture:

- upstream PR link and summary
- the user problem being solved
- the evidence from quality gates, judge output, and agent-user runs
- `keep`, `change`, and `drop` decisions
- the packages and modules to touch locally
- new tests or scenarios required before merge

### Step 3: Rebuild the change on fork `dev`

Implementation should start from current fork `dev`.

- reuse existing local primitives and boundaries
- align naming, APIs, and data flow with current repo conventions
- prefer smaller, easier-to-rebase patches
- add tests at the layer that exposed earlier failures
- use feature flags when the risk is real but manageable

### Step 4: Re-run the evidence stack

After the fork-native patch exists:

- rerun targeted Level 1 checks
- rerun the judge on the new patch, not the original PR
- rerun the relevant agent-user scenarios

Only then should the change land on fork `dev`.

## Promotion through fork release lanes

Accepted changes should widen their confidence gradually.

### `dev`

- targeted checks pass
- judge verdict is `integrate` or `rework`
- critical outside-in scenarios pass

### `beta`

- changes have soaked on `dev`
- broader scenario coverage passes
- no unresolved high-severity regressions remain

### `production`

- the change has stable `beta` evidence
- rollback is understood
- the benefit still justifies the maintenance burden

## Artifacts

Each evaluated PR should produce durable artifacts, even before we build a full database.

Minimum artifact set:

- metadata record
- replay log
- quality-check log
- judge output
- agent-user results
- integration brief
- final decision

The first version can live in workflow artifacts plus a lightweight index. Later it can move to a dedicated store.

## Initial rollout

### Phase 1: Manual batches with automation assistance

- ingest a small batch of upstream PRs
- replay them on fork `dev`
- run targeted checks
- collect judge and agent-user outputs
- make manual final decisions from the generated evidence

### Phase 2: Nightly ranking and replay

- refresh the upstream PR dataset nightly
- score and batch candidates automatically
- replay the best candidates in parallel
- persist the generated artifacts

### Phase 3: Fork-native implementation loop

- auto-generate integration briefs for accepted candidates
- let Codex produce a fork-native patch plan
- run the full evidence stack on the fork patch
- promote through `dev`, `beta`, and `production` on the fork's own cadence

## Immediate next steps

1. Finalize the ranking rubric and the machine-readable verdict schema.
2. Build the upstream PR metadata ingest job.
3. Build the disposable replay harness for fork `dev`.
4. Add the judge prompt and output schema.
5. Add the agent-user scenario catalog for CLI, app, and desktop flows.
6. Add the accepted-candidate prioritizer and implementation queue.
7. Add the integration brief template and decision log.
