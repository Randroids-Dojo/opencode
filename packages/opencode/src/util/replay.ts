import { pack, surface } from "./upstream"
import type { Surface } from "./upstream"

export type Check = {
  cmd: string[]
  cwd: string
  name: string
}

export type Plan = {
  area: Surface
  checks: Check[]
  skips: string[]
  targets: string[]
}

function uniq(list: string[]) {
  return [...new Set(list)].sort()
}

function add(list: Check[], next: Check) {
  if (list.some((item) => item.name === next.name)) return
  list.push(next)
}

export function prs(raw: string) {
  const out: number[] = []
  const seen = new Set<number>()

  for (const item of raw
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)) {
    if (!item.match(/^\d+$/)) continue
    const num = Number(item)
    if (!Number.isInteger(num) || num < 1) continue
    if (seen.has(num)) continue
    seen.add(num)
    out.push(num)
  }

  return out
}

export function plan(files: string[]): Plan {
  const targets = uniq(files.map(pack))
  const checks: Check[] = []
  const skips: string[] = []

  if (targets.length === 0) {
    skips.push("No replay diff paths were recorded.")
    return {
      area: "other",
      checks,
      skips,
      targets,
    }
  }

  if (targets.some((item) => item === "packages/opencode" || item === "packages/util")) {
    add(checks, { cmd: ["bun", "typecheck"], cwd: "packages/opencode", name: "opencode-typecheck" })
    add(checks, { cmd: ["bun", "test"], cwd: "packages/opencode", name: "opencode-test" })
  }

  if (targets.some((item) => item === "packages/app" || item === "packages/ui" || item === "packages/web")) {
    add(checks, { cmd: ["bun", "typecheck"], cwd: "packages/app", name: "app-typecheck" })
    add(checks, { cmd: ["bun", "run", "test:unit"], cwd: "packages/app", name: "app-test-unit" })
  }

  if (targets.some((item) => item === "packages/desktop")) {
    add(checks, { cmd: ["bun", "typecheck"], cwd: "packages/desktop", name: "desktop-typecheck" })
    add(checks, { cmd: ["bun", "run", "build"], cwd: "packages/desktop", name: "desktop-build" })
  }

  if (targets.some((item) => item === "packages/desktop-electron")) {
    add(checks, { cmd: ["bun", "typecheck"], cwd: "packages/desktop-electron", name: "desktop-electron-typecheck" })
    add(checks, { cmd: ["bun", "run", "build"], cwd: "packages/desktop-electron", name: "desktop-electron-build" })
  }

  if (
    targets.some(
      (item) =>
        item === "packages/sdk" || item === "packages/plugin" || item === "packages/extensions" || item === "sdks",
    )
  ) {
    add(checks, { cmd: ["bun", "./script/build.ts"], cwd: "packages/sdk/js", name: "sdk-build" })
    add(checks, { cmd: ["bun", "typecheck"], cwd: "packages/sdk/js", name: "sdk-typecheck" })
  }

  if (targets.some((item) => item === "packages/console/app")) {
    add(checks, { cmd: ["bun", "typecheck"], cwd: "packages/console/app", name: "console-app-typecheck" })
  }

  if (targets.some((item) => item === "packages/console/core")) {
    add(checks, { cmd: ["bun", "typecheck"], cwd: "packages/console/core", name: "console-core-typecheck" })
  }

  if (targets.some((item) => item === "packages/console/function")) {
    add(checks, { cmd: ["bun", "typecheck"], cwd: "packages/console/function", name: "console-function-typecheck" })
  }

  if (targets.some((item) => item === "packages/enterprise")) {
    add(checks, { cmd: ["bun", "typecheck"], cwd: "packages/enterprise", name: "enterprise-typecheck" })
  }

  if (targets.some((item) => item === ".github" || item === "github")) {
    add(checks, { cmd: ["bunx", "actionlint"], cwd: ".", name: "actionlint" })
  }

  if (targets.some((item) => item === "packages/console/mail")) {
    skips.push("packages/console/mail has no package-local typecheck or test script.")
  }

  if (targets.some((item) => item === "packages/console/resource")) {
    skips.push("packages/console/resource has no package-local typecheck or test script.")
  }

  const docs = targets.every((item) => item === "docs" || item === "specs")
  if (docs) {
    skips.push("Docs-only replay diff; no deterministic replay checks selected.")
  }

  const extra = targets.filter(
    (item) =>
      item !== ".github" &&
      item !== "docs" &&
      item !== "github" &&
      item !== "infra" &&
      item !== "nix" &&
      item !== "packages/app" &&
      item !== "packages/console/app" &&
      item !== "packages/console/core" &&
      item !== "packages/console/function" &&
      item !== "packages/console/mail" &&
      item !== "packages/console/resource" &&
      item !== "packages/containers" &&
      item !== "packages/desktop" &&
      item !== "packages/desktop-electron" &&
      item !== "packages/enterprise" &&
      item !== "packages/extensions" &&
      item !== "packages/opencode" &&
      item !== "packages/plugin" &&
      item !== "packages/sdk" &&
      item !== "packages/ui" &&
      item !== "packages/util" &&
      item !== "packages/web" &&
      item !== "patches" &&
      item !== "script" &&
      item !== "sdks" &&
      item !== "specs",
  )

  if (extra.length > 0) {
    add(checks, { cmd: ["bun", "typecheck"], cwd: ".", name: "repo-typecheck" })
    skips.push(`Fallback repo typecheck selected for unmapped targets: ${extra.join(", ")}.`)
  }

  return {
    area: surface(files),
    checks,
    skips,
    targets,
  }
}
