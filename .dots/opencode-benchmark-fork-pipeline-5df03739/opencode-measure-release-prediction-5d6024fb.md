---
title: Measure release prediction quality
status: open
priority: 2
issue-type: task
created-at: "2026-03-13T17:02:38.523128-05:00"
blocks:
  - opencode-smoke-test-release-79b22620
  - opencode-grade-impl-quality-0e4cfa23
---

Track whether the pipeline's confidence and smoke predictions match what later happens on dev, beta, and production.

This should compare predicted risk, expected smoke behavior, and promotion confidence to actual outcomes on `dev`, `beta`, and `production`.
