# OpenCode Fork

This is a fork of [anomalyco/opencode](https://github.com/anomalyco/opencode).

## Remotes

- **origin:** `Randroids-Dojo/opencode` (the fork) — workflows, PRs, issues live here
- **upstream:** `anomalyco/opencode` (the source repo)

Always use the fork repo for `gh` CLI queries (e.g., `gh run list`, `gh api repos/...`). Omit `--repo` or use `--repo Randroids-Dojo/opencode`.

## Branch Architecture

### Fork-owned (release lanes)
- `dev` — main integration branch, rebased nightly onto upstream-dev
- `beta` — promoted from dev after verification
- `production` — promoted from beta, released independently

### Upstream mirrors (disposable, force-pushed nightly)
- `upstream-dev`, `upstream-beta`, `upstream-production`

## Sync

Nightly at 3 AM UTC via `.github/workflows/sync-upstream.yml`:
1. Mirrors upstream branches to `upstream-*` mirror branches
2. Rebases fork `dev` onto `upstream-dev` (creates GitHub issue on conflict)
