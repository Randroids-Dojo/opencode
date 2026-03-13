---
title: Build historical PR gold set
status: open
priority: 1
issue-type: task
created-at: "2026-03-13T17:02:38.512954-05:00"
---

Curate historical anomalyco/opencode PRs into a labeled dataset with known integrate, rework, reject, and defer outcomes.

Each benchmark case should include:
- upstream PR metadata and diff
- the upstream and fork snapshot used for replay
- expected verdict
- expected keep, change, and drop notes when the answer is `rework`
- later regression or release outcome when known
