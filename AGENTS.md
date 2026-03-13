# AGENTS

## Mission

This fork exists to reduce the review burden on `anomalyco/opencode` by continuously triaging, reworking, testing, and integrating upstream pull requests. The default assumption is that useful work may need to live in this fork for a long time, so agents should optimize for:

- keeping the fork shippable on its own cadence
- staying close to upstream architecture
- carrying the smallest reasonable delta ahead of upstream
- preserving a clear audit trail for why changes were accepted, reworked, or dropped

Read [`specs/fork-mission.md`](specs/fork-mission.md) before making major workflow or branch-policy changes.

## Branch Model

- `dev` is the default branch and the fork's main integration branch.
- `beta` and `production` are fork-owned promotion branches.
- `upstream-dev`, `upstream-beta`, and `upstream-production` are exact mirrors of upstream.
- Do not force-reset `dev`, `beta`, or `production` to upstream.
- Prefer rebasing fork work onto `upstream-dev` and promoting forward through `beta` and `production`.
- Treat upstream changes as the default winner when they solve the same problem well. Keep fork-only implementations only when they materially help the mission.

## Planning

This repo uses Dots for cross-session planning. The tracked state lives in `.dots/` and should stay committed.

At the start of a session:

```bash
dot ls
dot ready
```

Before starting a tracked task:

```bash
dot on <id>
```

When finishing a tracked task:

```bash
dot off <id> -r "What changed"
```

Read [`specs/task-tracking.md`](specs/task-tracking.md) for the current conventions and starter backlog.

## Repo Rules

- To regenerate the JavaScript SDK, run `./packages/sdk/js/script/build.ts`.
- Always use parallel tools when applicable.
- The default branch in this repo is `dev`.
- Local `main` may not exist; use `dev` or `origin/dev` for diffs.
- Prefer automation: execute requested actions without confirmation unless blocked by missing info or safety concerns.
- Do not run tests from repo root. Use a package directory such as `packages/opencode`.
- Run type checks with `bun typecheck` from the relevant package directory. Do not call `tsc` directly.

## Style Guide

### General Principles

- Keep things in one function unless composable or reusable.
- Avoid `try`/`catch` where possible.
- Avoid using the `any` type.
- Prefer single word names where possible.
- Use Bun APIs when possible, like `Bun.file()`.
- Rely on type inference where possible. Avoid explicit type annotations or interfaces unless necessary for exports or clarity.
- Prefer functional array methods like `flatMap`, `filter`, and `map` over loops. Use type guards on `filter` to preserve inference downstream.

### Naming

Prefer single word names for variables and functions. Only use multiple words when a single word would be unclear.

This rule is mandatory for agent-written code.

- Use single word names by default for new locals, params, and helper functions.
- Multi-word names are allowed only when a single word would be unclear or ambiguous.
- Do not introduce new camelCase compounds when a short single-word alternative is clear.
- Before finishing edits, review touched lines and shorten newly introduced identifiers where possible.
- Good short names to prefer: `pid`, `cfg`, `err`, `opts`, `dir`, `root`, `child`, `state`, `timeout`.
- Avoid names like `inputPID`, `existingClient`, `connectTimeout`, and `workerPath` unless they are genuinely necessary.

```ts
// Good
const foo = 1
function journal(dir: string) {}

// Bad
const fooBar = 1
function prepareJournal(dir: string) {}
```

Reduce total variable count by inlining when a value is only used once.

```ts
// Good
const journal = await Bun.file(path.join(dir, "journal.json")).json()

// Bad
const journalPath = path.join(dir, "journal.json")
const journal = await Bun.file(journalPath).json()
```

### Destructuring

Avoid unnecessary destructuring. Use dot notation to preserve context.

```ts
// Good
obj.a
obj.b

// Bad
const { a, b } = obj
```

### Variables

Prefer `const` over `let`. Use ternaries or early returns instead of reassignment.

```ts
// Good
const foo = condition ? 1 : 2

// Bad
let foo
if (condition) foo = 1
else foo = 2
```

### Control Flow

Avoid `else` statements. Prefer early returns.

```ts
// Good
function foo() {
  if (condition) return 1
  return 2
}

// Bad
function foo() {
  if (condition) return 1
  else return 2
}
```

### Schema Definitions

Use snake_case for Drizzle field names so column names do not need to be redefined as strings.

```ts
// Good
const table = sqliteTable("session", {
  id: text().primaryKey(),
  project_id: text().notNull(),
  created_at: integer().notNull(),
})

// Bad
const table = sqliteTable("session", {
  id: text("id").primaryKey(),
  projectID: text("project_id").notNull(),
  createdAt: integer("created_at").notNull(),
})
```

## Testing

- Avoid mocks as much as possible.
- Test the actual implementation instead of duplicating logic in tests.
- Tests cannot run from repo root because of the `do-not-run-tests-from-root` guard.

## Type Checking

- Always run `bun typecheck` from a package directory like `packages/opencode`.
- Never run `tsc` directly.
