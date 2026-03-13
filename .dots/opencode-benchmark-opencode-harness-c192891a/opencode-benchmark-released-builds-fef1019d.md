---
title: Benchmark released builds
status: open
priority: 1
issue-type: task
created-at: "2026-03-13T17:02:38.503853-05:00"
blocks:
  - opencode-smoke-test-release-79b22620
  - opencode-implement-ci-verification-22395585
  - opencode-run-offline-harness-574cb57f
---

Run harness benchmarks against built and installed releases, not only local source trees, so shipping quality is measured directly.

The first released-build track should cover:
- raw CLI artifact runs
- installer-path runs via `./install --binary`
- startup and smoke behavior for packaged desktop builds where feasible
