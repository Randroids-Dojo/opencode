import { describe, expect, test } from "bun:test"
import { area, index, item, pack, summary, surface } from "../../src/util/upstream"
import type { Set } from "../../src/util/upstream"

describe("area", () => {
  test("classifies core paths", () => {
    expect(area("packages/opencode/src/cli/cmd/github.ts")).toBe("cli_core")
    expect(pack("packages/opencode/src/cli/cmd/github.ts")).toBe("packages/opencode")
  })

  test("classifies mixed file sets", () => {
    expect(surface(["packages/opencode/src/index.ts", "packages/app/src/root.tsx"])).toBe("mixed")
  })

  test("classifies docs from root markdown", () => {
    expect(area("README.md")).toBe("docs")
    expect(pack("README.md")).toBe("docs")
  })
})

describe("item", () => {
  test("normalizes truncation flags and targets", () => {
    const pull = item({
      additions: 7,
      author: { login: "alice" },
      baseRefName: "dev",
      baseRepository: { nameWithOwner: "anomalyco/opencode" },
      body: "Fix it",
      changedFiles: 120,
      closingIssuesReferences: {
        totalCount: 1,
        pageInfo: { hasNextPage: false },
        nodes: [{ number: 10, state: "OPEN", url: "https://github.com/anomalyco/opencode/issues/10" }],
      },
      comments: {
        totalCount: 3,
        nodes: [{ createdAt: "2026-03-17T00:00:00Z" }],
      },
      createdAt: "2026-03-16T00:00:00Z",
      deletions: 2,
      files: {
        totalCount: 120,
        pageInfo: { hasNextPage: true },
        nodes: [
          {
            additions: 5,
            changeType: "MODIFIED",
            deletions: 1,
            path: "packages/opencode/src/cli/cmd/github.ts",
          },
          {
            additions: 2,
            changeType: "ADDED",
            deletions: 1,
            path: ".github/workflows/test.yml",
          },
        ],
      },
      headRefName: "fix-branch",
      headRefOid: "abc123",
      headRepository: { nameWithOwner: "contrib/opencode" },
      isDraft: false,
      labels: {
        totalCount: 2,
        pageInfo: { hasNextPage: false },
        nodes: [{ name: "bug" }, { name: "needs:issue" }],
      },
      mergeStateStatus: "CLEAN",
      mergeable: "MERGEABLE",
      number: 42,
      reviewDecision: "REVIEW_REQUIRED",
      reviews: {
        totalCount: 21,
        pageInfo: { hasPreviousPage: true },
        nodes: [
          {
            author: { login: "bob" },
            comments: { totalCount: 2 },
            state: "COMMENTED",
            submittedAt: "2026-03-17T01:00:00Z",
          },
        ],
      },
      state: "OPEN",
      title: "Fix GitHub path handling",
      updatedAt: "2026-03-17T02:00:00Z",
      url: "https://github.com/anomalyco/opencode/pull/42",
    })

    expect(pull.area).toBe("mixed")
    expect(pull.area_complete).toBe(false)
    expect(pull.files.complete).toBe(false)
    expect(pull.reviews.complete).toBe(false)
    expect(pull.labels.items).toEqual(["bug", "needs:issue"])
    expect(pull.targets).toEqual([".github", "packages/opencode"])
    expect(pull.linked.items[0]).toEqual({
      number: 10,
      state: "OPEN",
      url: "https://github.com/anomalyco/opencode/issues/10",
    })
  })
})

describe("index", () => {
  test("counts pull summaries", () => {
    const set = {
      generated_at: "2026-03-17T03:00:00Z",
      pages: 2,
      pulls: [
        {
          additions: 1,
          area: "cli_core",
          area_complete: true,
          author: "alice",
          base: "dev",
          base_repo: "anomalyco/opencode",
          body: "",
          changed_files: 1,
          comments: { count: 0, last_at: null },
          created_at: "2026-03-17T00:00:00Z",
          deletions: 0,
          draft: true,
          files: { complete: true, items: [], total: 1 },
          head: "a",
          head_repo: "fork/opencode",
          labels: { complete: true, items: [], total: 0 },
          linked: { complete: true, items: [], total: 0 },
          merge_state: "CLEAN",
          mergeable: "MERGEABLE",
          number: 1,
          review_decision: null,
          reviews: { complete: true, items: [], total: 0 },
          sha: "1",
          state: "OPEN",
          target: "dev",
          targets: ["packages/opencode"],
          title: "a",
          updated_at: "2026-03-17T00:00:00Z",
          url: "https://example.com/1",
        },
        {
          additions: 1,
          area: "mixed",
          area_complete: false,
          author: "bob",
          base: "dev",
          base_repo: "anomalyco/opencode",
          body: "",
          changed_files: 2,
          comments: { count: 1, last_at: "2026-03-17T01:00:00Z" },
          created_at: "2026-03-17T00:30:00Z",
          deletions: 1,
          draft: false,
          files: { complete: false, items: [], total: 2 },
          head: "b",
          head_repo: null,
          labels: { complete: false, items: ["bug"], total: 1 },
          linked: { complete: false, items: [], total: 3 },
          merge_state: "DIRTY",
          mergeable: "CONFLICTING",
          number: 2,
          review_decision: "CHANGES_REQUESTED",
          reviews: { complete: false, items: [], total: 21 },
          sha: "2",
          state: "OPEN",
          target: "dev",
          targets: [".github", "packages/opencode"],
          title: "b",
          updated_at: "2026-03-17T02:00:00Z",
          url: "https://example.com/2",
        },
      ],
      repo: "anomalyco/opencode",
      version: 1 as const,
    } satisfies Set

    expect(index(set)).toEqual({
      counts: {
        area: {
          app_web: 0,
          cli_core: 1,
          desktop: 0,
          docs: 0,
          infra: 0,
          mixed: 1,
          other: 0,
          sdk: 0,
        },
        drafts: 1,
        files_incomplete: 1,
        labels_incomplete: 1,
        linked_incomplete: 1,
        pulls: 2,
        reviews_incomplete: 1,
      },
      generated_at: "2026-03-17T03:00:00Z",
      pages: 2,
      repo: "anomalyco/opencode",
      version: 1,
    })

    expect(summary(set)).toContain("| mixed | 1 |")
  })
})
