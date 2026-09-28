import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const sql = readFileSync(
  resolve(root, "supabase/migrations/20260928004000_cr_districts_full.sql"),
  "utf8",
)

const m = sql.match(/values\s*([\s\S]*)\s*on conflict/i)
if (!m) throw new Error("Could not parse SQL")

const chunks = m[1]
  .trim()
  .split(/\),\s*\n\s*\(/)
  .map((part, i, arr) => {
    let row = part
    if (i === 0) row = row.replace(/^\(/, "")
    if (i === arr.length - 1) row = row.replace(/\)\s*$/, "")
    else row = `(${row})`
    if (i > 0 && !row.startsWith("(")) row = `(${row}`
    if (i < arr.length - 1 && !row.endsWith(")")) row = `${row})`
    return row
  })

const batchSize = 41
const outDir = resolve(root, "tmp-cr-district-batches")
mkdirSync(outDir, { recursive: true })

let batchCount = 0
for (let i = 0; i < chunks.length; i += batchSize) {
  batchCount++
  const part = chunks.slice(i, i + batchSize)
  const batch = [
    "insert into public.administrative_divisions (id, country_id, parent_id, name, type, level, code)",
    "values",
    `  ${part.join(",\n  ")}`,
    "on conflict (id) do nothing;",
  ].join("\n")
  writeFileSync(resolve(outDir, `batch-${batchCount}.sql`), batch, "utf8")
  writeFileSync(
    resolve(outDir, `batch-${batchCount}.json`),
    JSON.stringify(batch),
    "utf8",
  )
}

console.log(`${chunks.length} rows -> ${batchCount} batches in ${outDir}`)
