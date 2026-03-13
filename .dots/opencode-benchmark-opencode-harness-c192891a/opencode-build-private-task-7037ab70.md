---
title: Build private task set
status: open
priority: 1
issue-type: task
created-at: "2026-03-13T17:02:38.495161-05:00"
blocks:
  - opencode-define-harness-scorecard-93714280
---

Create private OpenCodeBench tasks from real product workflows like CLI sessions, app flows, tool use, config edits, and recovery from common failures.

The initial private task set should cover:
- CLI session start, help, version, serve, install, and upgrade flows
- app session, prompt, terminal, workspace, and settings flows
- tool orchestration, patch application, and config editing
- recovery from common failure states such as broken config, missing auth, or interrupted sessions
