---
title: Add public baseline track
status: open
priority: 1
issue-type: task
created-at: "2026-03-13T17:02:38.491832-05:00"
blocks:
  - opencode-define-harness-scorecard-93714280
---

Run a small stable public benchmark track, likely SWE-bench and Terminal-Bench style tasks, to compare models inside the same OpenCode harness.

This is a calibration track, not the primary product score.

Use it to:
- compare models under fixed OpenCode settings
- compare OpenCode harness versions against stable external tasks
- detect obvious regressions before private evals run
