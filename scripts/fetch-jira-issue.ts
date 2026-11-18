import "dotenv/config"

// Renders a Jira issue (Atlassian Document Format description/comments) to plain text on stdout.
// Used by the story-researcher agent (see .claude/agents/story-researcher.md) so it doesn't have to
// re-implement ADF rendering from scratch on every /dev-story run.

type AdfNode = {
  type?: string
  text?: string
  attrs?: Record<string, unknown>
  marks?: { type: string; attrs?: Record<string, unknown> }[]
  content?: AdfNode[]
}

function adfToText(node: AdfNode | AdfNode[] | undefined, indent = ""): string {
  if (!node) return ""
  if (Array.isArray(node)) return node.map(n => adfToText(n, indent)).join("")

  const children = () => (node.content ?? []).map(n => adfToText(n, indent)).join("")

  switch (node.type) {
    case "doc":
      return (node.content ?? []).map(n => adfToText(n, indent)).join("\n")
    case "paragraph":
      return `${indent}${children()}\n`
    case "heading": {
      const level = (node.attrs?.level as number) ?? 1
      return `${indent}${"#".repeat(level)} ${children()}\n`
    }
    case "text": {
      let text = node.text ?? ""
      const marks = (node.marks ?? []).map(m => m.type)
      if (marks.includes("strong")) text = `**${text}**`
      if (marks.includes("em")) text = `_${text}_`
      if (marks.includes("code")) text = `\`${text}\``
      if (marks.includes("link")) {
        const href = node.marks?.find(m => m.type === "link")?.attrs?.href as string | undefined
        if (href) text = `[${text}](${href})`
      }
      return text
    }
    case "hardBreak":
      return "\n"
    case "bulletList":
    case "orderedList":
      return (node.content ?? []).map(li => adfToText(li, `${indent}  `)).join("")
    case "listItem":
      return `${indent}- ${(node.content ?? []).map(n => adfToText(n, indent).trim()).join(" ")}\n`
    case "codeBlock":
      return `${indent}\`\`\`\n${children()}\n${indent}\`\`\`\n`
    case "blockquote":
      return (node.content ?? []).map(n => `> ${adfToText(n, indent)}`).join("")
    case "rule":
      return `${indent}---\n`
    case "mention":
      return `@${(node.attrs?.text as string) ?? (node.attrs?.id as string) ?? "mention"}`
    case "inlineCard":
      return node.attrs?.url ? `[link](${node.attrs.url as string})` : ""
    case "table":
      return (node.content ?? []).map(n => adfToText(n, indent)).join("")
    case "tableRow":
      return `| ${(node.content ?? []).map(n => adfToText(n, indent).replace(/\n/g, " ").trim()).join(" | ")} |\n`
    case "tableCell":
    case "tableHeader":
      return (node.content ?? []).map(n => adfToText(n, indent)).join(" ")
    case "panel":
      return `[${(node.attrs?.panelType as string) ?? "panel"}] ${children()}`
    default:
      return children()
  }
}

async function main() {
  const issueKey = process.argv[2]
  if (!issueKey?.trim()) {
    throw new Error("Usage: yarn script:fetch-jira-issue <ISSUE-KEY>")
  }

  const baseUrl = process.env.JIRA_BASE_URL
  const email = process.env.JIRA_EMAIL
  const token = process.env.JIRA_API_TOKEN
  if (!baseUrl || !email || !token) {
    throw new Error("JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN must be set (see .env)")
  }

  const auth = Buffer.from(`${email}:${token}`).toString("base64")
  const headers = { Authorization: `Basic ${auth}`, Accept: "application/json" }

  const fields = [
    "summary",
    "description",
    "status",
    "issuetype",
    "priority",
    "assignee",
    "reporter",
    "labels",
    "components",
    "fixVersions",
    "parent",
    "subtasks",
    "issuelinks",
    "created",
    "updated",
  ].join(",")

  const issueRes = await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}?fields=${fields}`, { headers })
  if (!issueRes.ok) {
    throw new Error(`Jira issue fetch failed: ${issueRes.status} ${await issueRes.text()}`)
  }
  const issue = await issueRes.json()
  const f = issue.fields

  console.log("KEY:", issue.key)
  console.log("SUMMARY:", f.summary)
  console.log("TYPE:", f.issuetype?.name)
  console.log("STATUS:", f.status?.name)
  console.log("PRIORITY:", f.priority?.name)
  console.log("ASSIGNEE:", f.assignee?.displayName ?? "Unassigned")
  console.log("REPORTER:", f.reporter?.displayName ?? "Unknown")
  console.log("LABELS:", (f.labels ?? []).join(", ") || "none")
  console.log("COMPONENTS:", (f.components ?? []).map((c: { name: string }) => c.name).join(", ") || "none")
  console.log("PARENT:", f.parent ? `${f.parent.key} - ${f.parent.fields?.summary}` : "none")
  console.log("CREATED:", f.created)
  console.log("UPDATED:", f.updated)

  console.log("\nSUBTASKS:")
  const subtasks = f.subtasks ?? []
  if (subtasks.length === 0) console.log("  none")
  for (const s of subtasks) console.log(`  - ${s.key} [${s.fields?.status?.name}] ${s.fields?.summary}`)

  console.log("\nISSUE LINKS:")
  const links = f.issuelinks ?? []
  if (links.length === 0) console.log("  none")
  for (const l of links) {
    const other = l.outwardIssue ?? l.inwardIssue
    const dir = l.outwardIssue ? l.type?.outward : l.type?.inward
    if (other) console.log(`  - ${dir} ${other.key}: ${other.fields?.summary} [${other.fields?.status?.name}]`)
  }

  console.log("\nDESCRIPTION:\n")
  console.log(adfToText(f.description) || "(empty)")

  const commentRes = await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}/comment?orderBy=created`, { headers })
  if (commentRes.ok) {
    const commentBody = await commentRes.json()
    console.log(`\nCOMMENTS (${commentBody.total}):`)
    for (const c of commentBody.comments ?? []) {
      console.log(`\n--- ${c.author?.displayName} @ ${c.created} ---`)
      console.log(adfToText(c.body))
    }
  }
}

try {
  await main()
  process.exit(0)
} catch (error) {
  console.error("\nError fetching Jira issue:", error)
  process.exit(1)
}
