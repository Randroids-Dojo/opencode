#!/usr/bin/env bun

import path from "path"
import { mkdir, rm } from "node:fs/promises"
import { parseArgs } from "util"
import { Process } from "../packages/opencode/src/util/process"
import { plan, prs } from "../packages/opencode/src/util/replay"
import type { Pull, Set } from "../packages/opencode/src/util/upstream"

const upstream = "https://github.com/anomalyco/opencode.git"

type CheckRun = {
  cmd: string[]
  code: number
  cwd: string
  log: string
  ms: number
  name: string
}

type Replay = {
  area: string | null
  base: string
  base_sha: string | null
  branch: string
  checks: CheckRun[]
  conflict: string[]
  diff: string[]
  error: string | null
  fetched_sha: string | null
  install: CheckRun | null
  kept: boolean
  number: number
  replay_sha: string | null
  skips: string[]
  status: string
  targets: string[]
  title: string | null
  worktree: string
}

type Index = {
  counts: Record<string, number>
  generated_at: string
  items: string[]
  version: 1
}

function stamp() {
  return new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14)
}

function usage() {
  return `
Usage: bun script/replay-candidate-prs.ts --prs <numbers> [options]

Options:
  --prs <list>      Comma or space separated PR numbers
  --input <path>    Intake dataset path (default: tmp/upstream-prs/pulls.json)
  --dir <path>      Output directory (default: tmp/replay/<timestamp>)
  --base <ref>      Base ref to replay against (default: origin/dev)
  --keep            Keep worktrees and replay branches after the run
  -h, --help        Show this help text
`
}

function text(buf: Buffer) {
  return buf.toString().trim()
}

async function git(cwd: string, args: string[]) {
  return Process.run(["git", ...args], {
    cwd,
    nothrow: true,
  })
}

async function lines(cwd: string, args: string[]) {
  return text((await git(cwd, args)).stdout)
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

async function write(file: string, val: unknown) {
  const data = typeof val === "string" ? val : `${JSON.stringify(val, null, 2)}\n`
  await Bun.write(file, data)
}

async function log(dir: string, name: string, cmd: string[], cwd: string) {
  const start = Date.now()
  const res = await Process.run(cmd, {
    cwd,
    nothrow: true,
  })
  const ms = Date.now() - start
  const file = path.join(dir, `${name}.log`)
  const out = [
    `$ ${cmd.join(" ")}`,
    "",
    "--- stdout ---",
    res.stdout.toString(),
    "",
    "--- stderr ---",
    res.stderr.toString(),
  ].join("\n")
  await write(file, `${out}\n`)
  return {
    cmd,
    code: res.code,
    cwd,
    log: path.basename(file),
    ms,
    name,
  } satisfies CheckRun
}

async function load(file: string) {
  const text = await Bun.file(file).text()
  const data = JSON.parse(text) as Set
  return new Map(data.pulls.map((item) => [item.number, item]))
}

async function cleanup(root: string, worktree: string, branch: string) {
  await git(root, ["worktree", "remove", "--force", worktree])
  await rm(worktree, { force: true, recursive: true }).catch(() => undefined)
  await git(root, ["branch", "-D", branch])
}

async function one(
  root: string,
  dir: string,
  pull: Pull | undefined,
  num: number,
  base: string,
  keep: boolean,
): Promise<Replay> {
  const run = stamp()
  const name = `pr-${num}`
  const branch = `replay/${name}-${run}`
  const worktree = path.join(dir, "worktrees", `${name}-${run}`)
  const out = path.join(dir, name)
  const res: Replay = {
    area: pull?.area ?? null,
    base,
    base_sha: null,
    branch,
    checks: [],
    conflict: [],
    diff: [],
    error: null,
    fetched_sha: null,
    install: null,
    kept: keep,
    number: num,
    replay_sha: null,
    skips: [],
    status: "missing_metadata",
    targets: pull?.targets ?? [],
    title: pull?.title ?? null,
    worktree,
  }

  await mkdir(out, { recursive: true })
  await mkdir(path.join(out, "checks"), { recursive: true })
  await mkdir(path.join(dir, "worktrees"), { recursive: true })

  if (!pull) {
    res.error = "PR metadata missing from intake dataset."
    await write(path.join(out, "record.json"), res)
    return res
  }

  const baseSha = await git(root, ["rev-parse", base])
  res.base_sha = text(baseSha.stdout) || null
  res.status = "starting"

  const added = await git(root, ["worktree", "add", "--detach", worktree, base])
  await write(path.join(out, "worktree.log"), `${text(added.stdout)}\n${text(added.stderr)}\n`)
  if (added.code !== 0) {
    res.error = text(added.stderr) || text(added.stdout) || "Failed to create replay worktree."
    res.status = "worktree_failed"
    await write(path.join(out, "record.json"), res)
    return res
  }

  const start = await git(worktree, ["checkout", "-B", branch])
  if (start.code !== 0) {
    res.error = text(start.stderr) || text(start.stdout) || "Failed to create replay branch."
    res.status = "worktree_failed"
    await write(path.join(out, "branch.log"), `${text(start.stdout)}\n${text(start.stderr)}\n`)
    if (!keep) await cleanup(root, worktree, branch)
    await write(path.join(out, "record.json"), res)
    return res
  }

  try {
    const fetch = await git(worktree, ["fetch", "--no-tags", upstream, `pull/${num}/head`])
    await write(path.join(out, "fetch.log"), `${text(fetch.stdout)}\n${text(fetch.stderr)}\n`)
    if (fetch.code !== 0) {
      res.error = text(fetch.stderr) || text(fetch.stdout) || "Failed to fetch PR head."
      res.status = "fetch_failed"
      return res
    }

    const fetched = await git(worktree, ["rev-parse", "FETCH_HEAD"])
    res.fetched_sha = text(fetched.stdout) || null

    const merge = await git(worktree, ["merge", "--no-commit", "--no-ff", "FETCH_HEAD"])
    await write(path.join(out, "merge.log"), `${text(merge.stdout)}\n${text(merge.stderr)}\n`)
    if (merge.code !== 0) {
      res.conflict = await lines(worktree, ["diff", "--name-only", "--diff-filter=U"])
      res.error = text(merge.stderr) || text(merge.stdout) || "Merge failed."
      res.status = res.conflict.length > 0 ? "conflict" : "merge_failed"
      await git(worktree, ["merge", "--abort"])
      return res
    }

    const head = await git(worktree, ["rev-parse", "-q", "--verify", "MERGE_HEAD"])
    if (head.code !== 0) {
      res.status = "noop"
      return res
    }

    await git(worktree, ["add", "-A"])
    const msg = `replay: PR #${num} ${pull.title}`
    const commit = await git(worktree, ["commit", "-m", msg])
    await write(path.join(out, "commit.log"), `${text(commit.stdout)}\n${text(commit.stderr)}\n`)
    if (commit.code !== 0) {
      res.error = text(commit.stderr) || text(commit.stdout) || "Failed to create replay commit."
      res.status = "commit_failed"
      return res
    }

    const replay = await git(worktree, ["rev-parse", "HEAD"])
    res.replay_sha = text(replay.stdout) || null

    const diff = await lines(worktree, ["diff", "--name-only", `${base}..HEAD`])
    res.diff = diff
    const pick = plan(diff)
    res.area = pick.area
    res.targets = pick.targets
    res.skips = pick.skips

    const show = await git(worktree, ["show", "--stat", "--summary", "--format=fuller", "HEAD"])
    await write(path.join(out, "show.txt"), `${text(show.stdout)}\n${text(show.stderr)}\n`)

    const patch = await git(worktree, ["diff", "--binary", `${base}..HEAD`])
    await write(path.join(out, "diff.patch"), `${patch.stdout.toString()}\n${patch.stderr.toString()}\n`)

    if (pick.checks.length > 0) {
      res.install = await log(out, "install", ["bun", "install", "--frozen-lockfile"], worktree)
      if (res.install.code !== 0) {
        res.status = "install_failed"
        res.error = `install failed with exit code ${res.install.code}.`
        return res
      }
    }

    for (let i = 0; i < pick.checks.length; i++) {
      const item = pick.checks[i]!
      const name = `${String(i + 1).padStart(2, "0")}-${item.name}`
      res.checks.push(await log(path.join(out, "checks"), name, item.cmd, path.join(worktree, item.cwd)))
    }

    const bad = res.checks.find((item) => item.code !== 0)
    res.status = bad ? "checks_failed" : "applied"
    if (bad) {
      res.error = `${bad.name} failed with exit code ${bad.code}.`
    }
    return res
  } finally {
    await write(path.join(out, "record.json"), res)
    if (!keep) await cleanup(root, worktree, branch)
  }
}

const args = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: false,
  options: {
    base: { type: "string" },
    dir: { type: "string" },
    help: { type: "boolean", short: "h", default: false },
    input: { type: "string" },
    keep: { type: "boolean", default: false },
    prs: { type: "string" },
  },
})

if (args.values.help || !args.values.prs) {
  console.log(usage())
  process.exit(args.values.help ? 0 : 1)
}

const root = process.cwd()
const dir = path.resolve(root, args.values.dir ?? path.join("tmp", "replay", stamp()))
const input = path.resolve(root, args.values.input ?? path.join("tmp", "upstream-prs", "pulls.json"))
const base = args.values.base ?? "origin/dev"
const nums = prs(args.values.prs)

if (nums.length === 0) {
  throw new Error("No valid PR numbers were provided.")
}

await mkdir(dir, { recursive: true })
if (base.startsWith("origin/")) {
  await git(root, ["fetch", "origin", base.slice("origin/".length)])
}

const pulls = await load(input)
const items: Replay[] = []

for (const num of nums) {
  items.push(await one(root, dir, pulls.get(num), num, base, args.values.keep))
}

const counts: Record<string, number> = {}
for (const item of items) {
  counts[item.status] = (counts[item.status] ?? 0) + 1
}

const index: Index = {
  counts,
  generated_at: new Date().toISOString(),
  items: items.map((item) => `pr-${item.number}`),
  version: 1,
}
const summaryLines = [
  "# Candidate Replay",
  "",
  `- Generated: ${index.generated_at}`,
  `- Base: ${base}`,
  `- PRs: ${items.length}`,
  "",
  "## Status",
  "",
  "| Status | Count |",
  "| --- | ---: |",
  ...Object.keys(counts)
    .sort()
    .map((key) => `| ${key} | ${counts[key]} |`),
  "",
]

await write(path.join(dir, "index.json"), index)
await write(path.join(dir, "summary.md"), `${summaryLines.join("\n")}\n`)

const bad = items.find((item) => item.status !== "applied" && item.status !== "noop")
if (bad) process.exit(1)
