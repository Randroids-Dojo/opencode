import { graphql } from "@octokit/graphql"

const query = `
  query Intake($owner: String!, $repo: String!, $cursor: String, $per: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequests(
        first: $per
        after: $cursor
        states: OPEN
        orderBy: { field: UPDATED_AT, direction: DESC }
      ) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          number
          url
          title
          body
          state
          isDraft
          createdAt
          updatedAt
          author {
            login
          }
          baseRefName
          headRefName
          headRefOid
          baseRepository {
            nameWithOwner
          }
          headRepository {
            nameWithOwner
          }
          additions
          deletions
          changedFiles
          mergeable
          mergeStateStatus
          reviewDecision
          comments(last: 1) {
            totalCount
            nodes {
              createdAt
            }
          }
          labels(first: 50) {
            totalCount
            pageInfo {
              hasNextPage
            }
            nodes {
              name
            }
          }
          closingIssuesReferences(first: 20) {
            totalCount
            pageInfo {
              hasNextPage
            }
            nodes {
              number
              state
              url
            }
          }
          reviews(last: 20) {
            totalCount
            pageInfo {
              hasPreviousPage
            }
            nodes {
              state
              submittedAt
              author {
                login
              }
              comments {
                totalCount
              }
            }
          }
          files(first: 100) {
            totalCount
            pageInfo {
              hasNextPage
            }
            nodes {
              path
              additions
              deletions
              changeType
            }
          }
        }
      }
    }
  }
`

type Actor = {
  login: string
} | null

type Page = {
  hasNextPage?: boolean
  hasPreviousPage?: boolean
  endCursor?: string | null
}

type Conn<T> = {
  totalCount: number
  pageInfo: Page
  nodes: T[]
}

type RawLink = {
  number: number
  state: string
  url: string
}

type RawReview = {
  state: string
  submittedAt: string | null
  author: Actor
  comments: {
    totalCount: number
  }
}

type RawFile = {
  path: string
  additions: number
  deletions: number
  changeType: string
}

type RawPull = {
  number: number
  url: string
  title: string
  body: string
  state: string
  isDraft: boolean
  createdAt: string
  updatedAt: string
  author: Actor
  baseRefName: string
  headRefName: string
  headRefOid: string
  baseRepository: {
    nameWithOwner: string
  }
  headRepository: {
    nameWithOwner: string
  } | null
  additions: number
  deletions: number
  changedFiles: number
  mergeable: string | null
  mergeStateStatus: string | null
  reviewDecision: string | null
  comments: {
    totalCount: number
    nodes: Array<{
      createdAt: string
    }>
  }
  labels: Conn<{
    name: string
  }>
  closingIssuesReferences: Conn<RawLink>
  reviews: Conn<RawReview>
  files: Conn<RawFile>
}

type RawPage = {
  repository: {
    pullRequests: Conn<RawPull>
  }
}

export type Area = "app_web" | "cli_core" | "desktop" | "docs" | "infra" | "other" | "sdk"
export type Surface = Area | "mixed"

export type Link = {
  number: number
  state: string
  url: string
}

export type Review = {
  author: string | null
  comments: number
  state: string
  submitted_at: string | null
}

export type File = {
  additions: number
  change: string
  deletions: number
  path: string
}

export type Pull = {
  additions: number
  area: Surface
  area_complete: boolean
  author: string | null
  base: string
  base_repo: string
  body: string
  changed_files: number
  comments: {
    count: number
    last_at: string | null
  }
  created_at: string
  deletions: number
  draft: boolean
  files: {
    complete: boolean
    items: File[]
    total: number
  }
  head: string
  head_repo: string | null
  labels: {
    complete: boolean
    items: string[]
    total: number
  }
  linked: {
    complete: boolean
    items: Link[]
    total: number
  }
  merge_state: string | null
  mergeable: string | null
  number: number
  review_decision: string | null
  reviews: {
    complete: boolean
    items: Review[]
    total: number
  }
  sha: string
  state: string
  target: string
  targets: string[]
  title: string
  updated_at: string
  url: string
}

export type Set = {
  generated_at: string
  pages: number
  pulls: Pull[]
  repo: string
  version: 1
}

export type Index = {
  counts: {
    area: Record<Surface, number>
    drafts: number
    files_incomplete: number
    labels_incomplete: number
    linked_incomplete: number
    pulls: number
    reviews_incomplete: number
  }
  generated_at: string
  pages: number
  repo: string
  version: 1
}

export type Opts = {
  batch?: number
  limit?: number
  owner: string
  repo: string
  token: string
}

function uniq(list: string[]) {
  return [...new Set(list)].sort()
}

export function pack(file: string) {
  if (file.startsWith("packages/console/")) return file.split("/").slice(0, 3).join("/")
  if (file.startsWith("packages/")) return file.split("/").slice(0, 2).join("/")
  if (file.startsWith("sdks/")) return file.split("/").slice(0, 2).join("/")
  if (file.startsWith(".github/")) return ".github"
  if (file.startsWith("github/")) return "github"
  if (file.startsWith("infra/")) return "infra"
  if (file.startsWith("nix/")) return "nix"
  if (file.startsWith("patches/")) return "patches"
  if (file.startsWith("script/")) return "script"
  if (file.startsWith("specs/")) return "specs"

  const head = file.split("/")[0]
  if (head?.endsWith(".md")) return "docs"
  if (file.endsWith(".md")) return "docs"
  return head ?? "root"
}

export function area(file: string): Area {
  if (file.startsWith("packages/opencode/")) return "cli_core"
  if (file.startsWith("packages/util/")) return "cli_core"
  if (file.startsWith("packages/app/")) return "app_web"
  if (file.startsWith("packages/console/")) return "app_web"
  if (file.startsWith("packages/ui/")) return "app_web"
  if (file.startsWith("packages/web/")) return "app_web"
  if (file.startsWith("packages/desktop/")) return "desktop"
  if (file.startsWith("packages/desktop-electron/")) return "desktop"
  if (file.startsWith("packages/docs/")) return "docs"
  if (file.startsWith("packages/sdk/")) return "sdk"
  if (file.startsWith("packages/plugin/")) return "sdk"
  if (file.startsWith("packages/extensions/")) return "sdk"
  if (file.startsWith("sdks/")) return "sdk"
  if (file.startsWith(".github/")) return "infra"
  if (file.startsWith("github/")) return "infra"
  if (file.startsWith("infra/")) return "infra"
  if (file.startsWith("nix/")) return "infra"
  if (file.startsWith("patches/")) return "infra"
  if (file.startsWith("script/")) return "infra"
  if (file.startsWith("packages/containers/")) return "infra"
  if (file.startsWith("packages/function/")) return "infra"
  if (file.startsWith("packages/script/")) return "infra"
  if (file.startsWith("specs/")) return "docs"
  if (file.endsWith(".md")) return "docs"
  return "other"
}

export function surface(files: string[]) {
  const list = uniq(files.map(area))
  if (list.length === 0) return "other"
  if (list.length === 1) return list[0] as Surface
  return "mixed"
}

export function item(raw: RawPull): Pull {
  const files = raw.files.nodes.map((file) => ({
    additions: file.additions,
    change: file.changeType,
    deletions: file.deletions,
    path: file.path,
  }))
  const paths = files.map((file) => file.path)

  return {
    additions: raw.additions,
    area: surface(paths),
    area_complete: !raw.files.pageInfo.hasNextPage,
    author: raw.author?.login ?? null,
    base: raw.baseRefName,
    base_repo: raw.baseRepository.nameWithOwner,
    body: raw.body,
    changed_files: raw.changedFiles,
    comments: {
      count: raw.comments.totalCount,
      last_at: raw.comments.nodes[0]?.createdAt ?? null,
    },
    created_at: raw.createdAt,
    deletions: raw.deletions,
    draft: raw.isDraft,
    files: {
      complete: !raw.files.pageInfo.hasNextPage,
      items: files,
      total: raw.files.totalCount,
    },
    head: raw.headRefName,
    head_repo: raw.headRepository?.nameWithOwner ?? null,
    labels: {
      complete: !raw.labels.pageInfo.hasNextPage,
      items: raw.labels.nodes.map((label) => label.name).sort(),
      total: raw.labels.totalCount,
    },
    linked: {
      complete: !raw.closingIssuesReferences.pageInfo.hasNextPage,
      items: raw.closingIssuesReferences.nodes.map((link) => ({
        number: link.number,
        state: link.state,
        url: link.url,
      })),
      total: raw.closingIssuesReferences.totalCount,
    },
    merge_state: raw.mergeStateStatus,
    mergeable: raw.mergeable,
    number: raw.number,
    review_decision: raw.reviewDecision,
    reviews: {
      complete: !raw.reviews.pageInfo.hasPreviousPage,
      items: raw.reviews.nodes.map((review) => ({
        author: review.author?.login ?? null,
        comments: review.comments.totalCount,
        state: review.state,
        submitted_at: review.submittedAt,
      })),
      total: raw.reviews.totalCount,
    },
    sha: raw.headRefOid,
    state: raw.state,
    target: raw.baseRefName,
    targets: uniq(paths.map(pack)),
    title: raw.title,
    updated_at: raw.updatedAt,
    url: raw.url,
  }
}

export function index(set: Set): Index {
  const counts = {
    area: {
      app_web: 0,
      cli_core: 0,
      desktop: 0,
      docs: 0,
      infra: 0,
      mixed: 0,
      other: 0,
      sdk: 0,
    } satisfies Record<Surface, number>,
    drafts: 0,
    files_incomplete: 0,
    labels_incomplete: 0,
    linked_incomplete: 0,
    pulls: set.pulls.length,
    reviews_incomplete: 0,
  }

  for (const pull of set.pulls) {
    counts.area[pull.area] += 1
    if (pull.draft) counts.drafts += 1
    if (!pull.files.complete) counts.files_incomplete += 1
    if (!pull.labels.complete) counts.labels_incomplete += 1
    if (!pull.linked.complete) counts.linked_incomplete += 1
    if (!pull.reviews.complete) counts.reviews_incomplete += 1
  }

  return {
    counts,
    generated_at: set.generated_at,
    pages: set.pages,
    repo: set.repo,
    version: set.version,
  }
}

export function summary(set: Set) {
  const data = index(set)
  const lines = [
    "# Upstream PR Intake",
    "",
    `- Generated: ${data.generated_at}`,
    `- Repo: ${data.repo}`,
    `- Pull requests: ${data.counts.pulls}`,
    `- Drafts: ${data.counts.drafts}`,
    `- Pages: ${data.pages}`,
    `- Incomplete file lists: ${data.counts.files_incomplete}`,
    `- Incomplete review lists: ${data.counts.reviews_incomplete}`,
    "",
    "## Surfaces",
    "",
    "| Surface | Count |",
    "| --- | ---: |",
  ]

  for (const key of Object.keys(data.counts.area).sort()) {
    lines.push(`| ${key} | ${data.counts.area[key as Surface]} |`)
  }

  lines.push("")
  return lines.join("\n")
}

export async function ingest(opts: Opts): Promise<Set> {
  const api = graphql.defaults({
    headers: {
      authorization: `token ${opts.token}`,
    },
  })
  const pulls: Pull[] = []
  let cursor: string | undefined
  let pages = 0
  const batch = Math.max(1, Math.min(opts.batch ?? 20, 100))

  while (true) {
    const left = opts.limit ? opts.limit - pulls.length : batch
    if (left <= 0) break

    const page = await api<RawPage>(query, {
      cursor,
      owner: opts.owner,
      per: Math.min(batch, left),
      repo: opts.repo,
    })
    pages += 1

    for (const raw of page.repository.pullRequests.nodes) {
      pulls.push(item(raw))
    }

    if (!page.repository.pullRequests.pageInfo.hasNextPage) break
    cursor = page.repository.pullRequests.pageInfo.endCursor ?? undefined
  }

  return {
    generated_at: new Date().toISOString(),
    pages,
    pulls,
    repo: `${opts.owner}/${opts.repo}`,
    version: 1,
  }
}
