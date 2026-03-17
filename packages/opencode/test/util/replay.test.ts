import { describe, expect, test } from "bun:test"
import { plan, prs } from "../../src/util/replay"

describe("prs", () => {
  test("parses comma and space separated PR numbers", () => {
    expect(prs("12, 34 56")).toEqual([12, 34, 56])
  })

  test("drops invalid and duplicate values", () => {
    expect(prs("5,foo,5,0,-1,8")).toEqual([5, 8])
  })
})

describe("plan", () => {
  test("selects core replay checks", () => {
    expect(plan(["packages/opencode/src/cli/cmd/github.ts", "packages/util/src/index.ts"])).toEqual({
      area: "cli_core",
      checks: [
        { cmd: ["bun", "typecheck"], cwd: "packages/opencode", name: "opencode-typecheck" },
        { cmd: ["bun", "test"], cwd: "packages/opencode", name: "opencode-test" },
      ],
      skips: [],
      targets: ["packages/opencode", "packages/util"],
    })
  })

  test("selects mixed checks and fallback repo typecheck", () => {
    const out = plan(["packages/app/src/index.tsx", ".github/workflows/test.yml", "package.json"])

    expect(out.area).toBe("mixed")
    expect(out.targets).toEqual([".github", "package.json", "packages/app"])
    expect(out.checks).toEqual([
      { cmd: ["bun", "typecheck"], cwd: "packages/app", name: "app-typecheck" },
      { cmd: ["bun", "run", "test:unit"], cwd: "packages/app", name: "app-test-unit" },
      { cmd: ["bunx", "actionlint"], cwd: ".", name: "actionlint" },
      { cmd: ["bun", "typecheck"], cwd: ".", name: "repo-typecheck" },
    ])
    expect(out.skips).toEqual(["Fallback repo typecheck selected for unmapped targets: package.json."])
  })

  test("documents docs-only diffs", () => {
    expect(plan(["README.md", "specs/pr-evaluation-pipeline.md"])).toEqual({
      area: "docs",
      checks: [],
      skips: ["Docs-only replay diff; no deterministic replay checks selected."],
      targets: ["docs", "specs"],
    })
  })
})
