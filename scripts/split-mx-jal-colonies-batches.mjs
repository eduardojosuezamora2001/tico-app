/**
 * Divide la migración de colonias Jalisco en batches para apply remoto.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const src = resolve(root, "supabase/migrations/20260928005500_mx_jal_colonies_test.sql")
const outDir = resolve(root, "tmp-mx-jal-colony-batches")
mkdirSync(outDir, { recursive: true })

const sql = readFileSync(src, "utf8")
const rows = (sql.match(/^\s+\('[^']+'.*\),?$/gm) ?? []).map((row) =>
  row.replace(/,\s*$/, ""),
)
const batchSize = 125

for (let i = 0; i < rows.length; i += batchSize) {
  const chunk = rows.slice(i, i + batchSize)
  const batchSql = [
    `-- Jalisco colonias batch ${i / batchSize + 1}`,
    "insert into public.administrative_divisions (id, country_id, parent_id, name, type, level, code)",
    "values",
    chunk.join(",\n"),
    "on conflict (id) do nothing;",
  ].join("\n")
  const file = resolve(outDir, `batch-${String(i / batchSize + 1).padStart(2, "0")}.sql`)
  writeFileSync(file, batchSql, "utf8")
  console.log(`Wrote ${chunk.length} rows -> ${file}`)
}
