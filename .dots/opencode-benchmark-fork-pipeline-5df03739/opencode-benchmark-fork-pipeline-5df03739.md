---
title: Benchmark fork pipeline
status: open
priority: 4
issue-type: epic
created-at: "2026-03-13T17:02:38.483927-05:00"
---

Measure how well the fork pipeline triages, reworks, verifies, prioritizes, and safely releases upstream PR work.

This epic measures the autonomous PR-integration system, not OpenCode as a harness product.

It should answer:
- whether the pipeline makes the right integrate, rework, reject, and defer decisions
- whether accepted work is rebuilt in a fork-native shape
- whether the pipeline predicts release and regression risk accurately
