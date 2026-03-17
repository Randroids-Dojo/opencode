#!/usr/bin/env bun

import path from "path"
import { mkdir } from "node:fs/promises"
import { parseArgs } from "util"
import { ingest, index, summary } from "../packages/opencode/src/util/upstream"

async function token() {
  const env = process.env["GITHUB_TOKEN"] ?? process.env["GH_TOKEN"]
  if (env) return env

  const proc = Bun.spawn(["gh", "auth", "token"], {
    stderr: "ignore",
    stdout: "pipe",
  })
  const out = await new Response(proc.stdout).text()
  const code = await proc.exited
  if (code === 0) return out.trim()

  throw new Error("Set GITHUB_TOKEN or GH_TOKEN, or authenticate with `gh auth login`.")
}

function num(raw: string | undefined, name: string) {
  if (!raw) return
  const val = Number(raw)
  if (!Number.isInteger(val) || val < 1) {
    throw new Error(`${name} must be a positive integer`)
  }
  return val
}

const args = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: false,
  options: {
    batch: { type: "string" },
    dir: { type: "string" },
    help: { type: "boolean", short: "h", default: false },
    limit: { type: "string" },
    owner: { type: "string" },
    repo: { type: "string" },
  },
})

if (args.values.help) {
  console.log(`
Usage: bun script/ingest-upstream-prs.ts [options]

Options:
  --dir <path>     Output directory (default: tmp/upstream-prs)
  --limit <n>      Maximum PRs to ingest
  --batch <n>      PRs per GraphQL page (default: 20)
  --owner <name>   GitHub owner (default: anomalyco)
  --repo <name>    GitHub repo (default: opencode)
  -h, --help       Show this help text
`)
  process.exit(0)
}

const dir = path.resolve(process.cwd(), args.values.dir ?? "tmp/upstream-prs")
const set = await ingest({
  batch: num(args.values.batch, "batch"),
  limit: num(args.values.limit, "limit"),
  owner: args.values.owner ?? "anomalyco",
  repo: args.values.repo ?? "opencode",
  token: await token(),
})
const meta = {
  ...index(set),
  files: {
    pulls: "pulls.json",
    summary: "summary.md",
  },
}

await mkdir(dir, { recursive: true })
await Bun.write(path.join(dir, "index.json"), `${JSON.stringify(meta, null, 2)}\n`)
await Bun.write(path.join(dir, "pulls.json"), `${JSON.stringify(set, null, 2)}\n`)
await Bun.write(path.join(dir, "summary.md"), `${summary(set)}\n`)

console.log(`Wrote ${set.pulls.length} pull requests from ${set.repo} to ${dir}`)
console.log(`- ${path.join(dir, "index.json")}`)
console.log(`- ${path.join(dir, "pulls.json")}`)
console.log(`- ${path.join(dir, "summary.md")}`)
