---
title: Persist harness runs
status: open
priority: 2
issue-type: task
created-at: "2026-03-13T17:02:38.498293-05:00"
---

Store benchmark outputs, metadata, and task results using the existing benchmark table and any needed artifacts.

Start by reusing `packages/console/core/src/schema/benchmark.sql.ts` and the existing bench routes.

Each stored run should capture at least:
- OpenCode commit
- model and provider
- agent and prompt configuration
- task id
- score breakdown
- artifact or log references
