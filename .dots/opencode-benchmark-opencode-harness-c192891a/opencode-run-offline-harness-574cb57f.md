---
title: Run offline harness evals
status: open
priority: 1
issue-type: task
created-at: "2026-03-13T17:02:38.501076-05:00"
blocks:
  - opencode-build-private-task-7037ab70
  - opencode-persist-harness-runs-5e418ab4
---

Execute offline benchmark runs against pinned OpenCode commits and fixed model settings so harness changes can be compared fairly over time.

Pin at least:
- OpenCode commit
- model and provider
- agent settings and permissions
- task seeds or fixture inputs
- grading logic version
