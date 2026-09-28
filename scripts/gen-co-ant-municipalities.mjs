/**
 * Genera migración SQL con municipios de Antioquia, Colombia (DIVIPOLA / DANE).
 * Fuente: scripts/data/co-dane-divipola.json
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const CO = "c2222222-2222-4222-8222-222222222222"
const ANTIOQUIA = "d1c20001-0001-4001-8001-000000000031"
const DEPT_DANE = "05"

const municipalityLegacy = {
  "05001": "d2c20001-0001-4001-8001-000000000041",
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

function municipalityUuid(municipioDane) {
  if (municipalityLegacy[municipioDane]) return municipalityLegacy[municipioDane]
  const tail = municipioDane.slice(-4).padStart(4, "0")
  return `d2c2${tail}-0001-4001-8001-${municipioDane.padStart(12, "0")}`
}

const cachePath = resolve(root, "scripts/data/co-dane-divipola.json")
const rows = JSON.parse(readFileSync(cachePath, "utf8"))
const municipalities = rows
  .filter((row) => row.departamentoDANE === DEPT_DANE)
  .sort((a, b) => a.municipioDANE.localeCompare(b.municipioDANE))

if (municipalities.length === 0) {
  throw new Error("No Antioquia municipalities found in cache")
}

const sqlRows = municipalities.map(({ municipio, municipioDANE }) => {
  const esc = titleCase(municipio).replace(/'/g, "''")
  return `  ('${municipalityUuid(municipioDANE)}', '${CO}', '${ANTIOQUIA}', '${esc}', 'municipality', 2, '${municipioDANE}')`
})

const sql = [
  `-- Colombia / Antioquia: ${municipalities.length} municipios (DIVIPOLA cve_dpto=${DEPT_DANE}).`,
  "insert into public.administrative_divisions (id, country_id, parent_id, name, type, level, code)",
  "values",
  sqlRows.join(",\n"),
  "on conflict (id) do nothing;",
  "",
].join("\n")

const out = resolve(root, "supabase/migrations/20260928006200_co_ant_municipalities.sql")
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, sql, "utf8")
console.log(`Wrote ${municipalities.length} municipalities to ${out}`)
