---
title: Grade verdict accuracy
status: open
priority: 1
issue-type: task
created-at: "2026-03-13T17:02:38.518134-05:00"
blocks:
  - opencode-define-pipeline-scorecard-ec9f6ec8
  - opencode-judge-candidate-prs-a107d1a5
  - opencode-replay-benchmark-candidates-bedc8cc9
---

Compare pipeline integrate, rework, reject, and defer decisions against the gold set and explain misses.

Call out:
- false accepts
- false rejects
- confidence that was too high or too low
- repeated failure modes by subsystem
