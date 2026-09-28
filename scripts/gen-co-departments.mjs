/**
 * Genera migración SQL con departamentos de Colombia (DIVIPOLA / DANE).
 * Fuente: scripts/data/co-dane-divipola.json
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const CO = "c2222222-2222-4222-8222-222222222222"

const legacyId = {
  "05": "d1c20001-0001-4001-8001-000000000031",
  "25": "d1c20002-0002-4002-8002-000000000032",
  "76": "d1c20003-0003-4003-8003-000000000033",
}

const legacyCode = {
  "05": "ANT",
  "25": "CUN",
  "76": "VAC",
}

function titleCase(value) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((word) =>
      word
        .split("-")
        .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
        .join("-"),
    )
    .join(" ")
}

function departmentUuid(daneCode) {
  if (legacyId[daneCode]) return legacyId[daneCode]
  const tail = daneCode.padStart(4, "0").slice(-4)
  return `d1c2${tail}-0001-4001-8001-${daneCode.padStart(12, "0")}`
}

const cachePath = resolve(root, "scripts/data/co-dane-divipola.json")
const rows = JSON.parse(readFileSync(cachePath, "utf8"))

const departments = new Map()
for (const row of rows) {
  if (!departments.has(row.departamentoDANE)) {
    departments.set(row.departamentoDANE, titleCase(row.departamento))
  }
}

const sorted = [...departments.entries()].sort(([a], [b]) => a.localeCompare(b))
const sqlRows = sorted.map(([daneCode, name]) => {
  const esc = name.replace(/'/g, "''")
  const code = legacyCode[daneCode] ?? daneCode
  return `  ('${departmentUuid(daneCode)}', '${CO}', null, '${esc}', 'department', 1, '${code}')`
})

const sql = [
  `-- Colombia: ${sorted.length} departamentos (DIVIPOLA / DANE).`,
  "insert into public.administrative_divisions (id, country_id, parent_id, name, type, level, code)",
  "values",
  sqlRows.join(",\n"),
  "on conflict (id) do nothing;",
  "",
].join("\n")

const out = resolve(root, "supabase/migrations/20260928006100_co_departments.sql")
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, sql, "utf8")
console.log(`Wrote ${sorted.length} departments to ${out}`)
