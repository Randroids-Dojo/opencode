---
title: Replay benchmark candidates
status: open
priority: 1
issue-type: task
created-at: "2026-03-13T17:02:38.515673-05:00"
blocks:
  - opencode-build-historical-pr-24dd0916
  - opencode-replay-candidate-prs-258a457d
---

Run the fork pipeline against frozen benchmark PR cases on current fork snapshots and capture replay, conflict, and verification artifacts.

Replay should happen against current fork `dev` with frozen benchmark inputs so the benchmark stays realistic while still being auditable.
