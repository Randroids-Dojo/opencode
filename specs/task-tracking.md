# Task Tracking

This repo uses [Dots](https://github.com/joelreymont/dots) for cross-session planning. The tracked state lives in `.dots/`, is committed with the repo, and uses the `opencode` prefix.

## Session Workflow

Start each session with:

```bash
dot ls
dot ready
```

Before starting work:

```bash
dot on <id>
```

When the work is done:

```bash
dot off <id> -r "What changed"
```

## Project Conventions

- Use top-level epics only to group related work. Pick child dots for actual execution.
- Use `-a` dependencies when work must wait on another dot.
- Keep upstream sync, PR intake, replay, testing, release gating, and infrastructure work as separate dots so the audit trail stays clear.
- Prefer one end-to-end deliverable per dot. Split follow-up work into child dots instead of letting one dot sprawl.
- Close every completed dot with a concrete reason.

## Priority Guide

- `0`: incidents, security, broken release pipeline
- `1`: core PR triage and integration automation
- `2`: release gates, supporting infra, and tooling
- `3`: docs and cleanup
- `4`: parking lot and umbrella epics

## Starter Backlog

The initial backlog is seeded in `.dots/`:

- `Launch autonomous PR integration` as the umbrella epic
- `Define PR rubric`
- `Ingest upstream PR metadata`
- `Replay candidate PRs on dev`
- `Gate fork promotions`
- `Upgrade Actions runtimes`

`Replay candidate PRs on dev` is intentionally blocked on the rubric and metadata tasks so the first implementation pass has clear inputs.
