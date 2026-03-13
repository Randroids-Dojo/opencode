# Fork Mission

This fork exists to continuously and automatically reduce the review burden on `anomalyco/opencode` by turning upstream pull requests into one of three outcomes:

1. Ready to merge as-is.
2. Worth merging after rework to fit upstream architecture.
3. Not worth merging.

The fork should not become a vanity divergence. Its job is to stay close to upstream, absorb upstream improvements quickly, and do the expensive review, rework, and conflict-resolution work that maintainers do not have time to do manually at scale.

## Mission Statement

- Keep upstream mirror branches clean and exact.
- Maintain fork-owned `dev`, `beta`, and `production` release lanes, with `dev` continuously rebased onto upstream `dev`.
- Continuously triage upstream PRs, test them, rework the promising ones, and carry only the smallest possible delta ahead of upstream.
- Prefer upstream implementations when upstream has already solved the same problem.
- Treat the fork as a review-and-integration layer, not an alternate product direction.

## Why This Fork Exists

As of 2026-03-13, upstream `anomalyco/opencode` has a large open PR backlog.

- `1699` open pull requests total.
- `1692` open pull requests with `review:none`.
- `904` open pull requests created before 2026-02-12.
- `1251` open pull requests with no labels.
- `163` open pull requests labeled `needs:issue`.
- `52` open draft pull requests.
- `12` open pull requests labeled `Vouched`.

These numbers were collected from GitHub Search API queries against `anomalyco/opencode` on 2026-03-13.

The broader context matters too:

- GitHub now ships coding agents that can independently create issues and draft pull requests, which lowers submission cost and raises inbound review volume.
- GitHub maintainers are explicitly asking for controls to block or filter AI-generated issues and pull requests because they expect additional triage burden.
- Recent empirical studies suggest agentic PRs can be useful, but they still benefit from human review, project-specific rework, and architecture alignment.

The opportunity is not to reject agentic PRs outright. It is to build the missing integration layer between high-volume agentic contribution and maintainers' limited review capacity.

## Research Notes

### Upstream-specific signals

- Upstream backlog size alone justifies automated triage and integration work.
- The small number of `Vouched` PRs compared to the total open backlog suggests that manual trust filtering does not scale enough on its own.
- The large number of unlabeled and unreviewed PRs suggests maintainers need preprocessing more than raw submission volume.

### Broader ecosystem signals

- GitHub's own platform now supports assigning work to coding agents that return draft pull requests, which increases the chance that maintainers will receive more machine-assisted submissions over time.
- GitHub community maintainers are already asking for repo-level controls to block or limit Copilot-generated issues and PRs, which is a strong signal that review burden is a real operational problem.
- Research on agentic PRs is mixed but actionable: some agentic PRs merge cleanly, many merge after human changes, and review context matters heavily. That is exactly the gap this fork is meant to close.

## Branch Strategy

The fork should treat its own release lanes as primary and upstream sync as an input, not as the main product branch.

### Fork-owned branches

- `dev`
- `beta`
- `production`

These branches belong to the fork.

- `dev` is the main integration branch and should be the default branch.
- `beta` is promoted from `dev` after broader automated verification and tester-facing soak time.
- `production` is promoted from `beta` after the strictest checks and the slowest cadence.

These branches are where fork builds are produced. They should not be force-reset to upstream.

### Upstream mirror branches

- `upstream-dev`
- `upstream-beta`
- `upstream-production`

These branches should match upstream exactly and should never contain fork-only commits. They exist to make upstream diffs and rebases explicit and auditable.

### Sync policy

- Sync `upstream-dev`, `upstream-beta`, and `upstream-production` from upstream nightly.
- Rebase fork `dev` onto `upstream-dev` nightly.
- Do not auto-reset fork `beta` or `production` to upstream.
- Promote fork releases from `dev` to `beta` to `production` on a cadence that matches testing confidence, not upstream branch movement.

### Why `dev` should be the default branch

GitHub scheduled workflows only run when the workflow file exists on the default branch. Since `dev` is now the fork's real integration branch and is no longer disposable, it is the correct place for fork-owned workflows and docs.

That means:

- `dev` should be the default branch for this fork.
- `upstream-*` branches should remain disposable and exact.
- Fork-owned docs and workflows should live on fork-owned branches, not on upstream mirrors.

## Rebase Policy

When nightly rebases of fork `dev` onto `upstream-dev` hit conflicts, classify the conflict before deciding the resolution:

1. Upstream replaced something we also changed.
2. Upstream added something net new that can coexist with our work.
3. Upstream change is incompatible with our implementation.

Default bias:

- Prefer upstream when upstream solved the same problem well.
- Keep fork changes only when they still materially improve the mission.
- Rewrite our implementation to match upstream architecture when the idea is good but the shape is wrong.
- Drop fork changes that no longer justify their maintenance cost.

This keeps the fork aligned with upstream direction instead of accumulating stale opinionated patches.

## Operating Principles

- Automate triage before automating merge.
- Prefer patch minimization over feature accumulation.
- Preserve a clear audit trail for why a PR was rejected, reworked, or merged.
- Use upstream labels, code ownership, and existing architectural boundaries as signals.
- Treat security fixes, crash fixes, and obvious bug fixes as higher-priority integration candidates than style or speculative features.
- Use the fork to prepare maintainer-ready changes, not to bypass maintainer judgment.

## Release Policy

- `dev` is expected to move fastest and can absorb upstream sync plus selected PR work.
- `beta` should be cut from fork `dev` only after automated tests, type checks, and any fork-specific verification gates pass.
- `production` should be promoted from fork `beta`, not rebuilt ad hoc from upstream.
- Upstream `beta` and `production` should inform our decisions but not control our release timeline.

## Near-term Automation Roadmap

1. Mirror upstream into `upstream-dev`, `upstream-beta`, and `upstream-production`.
2. Rebase fork `dev` onto `upstream-dev` nightly.
3. Detect and surface rebase conflicts immediately.
4. Promote fork `dev` to `beta` and `production` through explicit verification gates.
5. Pull in upstream PR candidates onto fork `dev` in controlled batches.
6. Categorize candidates into merge-as-is, rework, or reject.
7. Run tests, type checks, and architecture checks on the integrated result.
8. Produce fork releases on our own cadence while preserving a clean path back upstream when possible.

## Sources

- GitHub pull requests for `anomalyco/opencode`: https://github.com/anomalyco/opencode/pulls
- GitHub search for unreviewed upstream PRs: https://github.com/anomalyco/opencode/pulls?q=is%3Apr+is%3Aopen+review%3Anone
- GitHub Docs, scheduled workflows on the default branch: https://docs.github.com/actions/reference/events-that-trigger-workflows
- GitHub Docs, Copilot coding agent: https://docs.github.com/en/enterprise-cloud%40latest/copilot/concepts/coding-agent/about-copilot-coding-agent
- GitHub Blog, coding agent tasks that return draft pull requests: https://github.blog/news-insights/product-news/agents-panel-launch-copilot-coding-agent-tasks-anywhere-on-github/
- GitHub Community discussion on blocking AI-generated issues and PRs: https://github.com/orgs/community/discussions/159749
- Watanabe et al., "On the Use of Agentic Coding: An Empirical Study of Pull Requests on GitHub": https://arxiv.org/abs/2509.14745
- Yoshioka et al., "Let's Make Every Pull Request Meaningful: An Empirical Analysis of Developer and Agentic Pull Requests": https://arxiv.org/abs/2601.18749
