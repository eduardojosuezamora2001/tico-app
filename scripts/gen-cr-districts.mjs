/**
 * Genera migración SQL con los 492 distritos oficiales (Ministerio de Salud / INEC).
 * Fuente: CodeSystem-distritos-cs.json
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const CR = "c1111111-1111-4111-8111-111111111111"

const cantonLegacy = {
  101: "d2c10001-0001-4001-8001-000000000011",
  102: "d2c10002-0002-4002-8002-000000000012",
  201: "d2c10003-0003-4003-8003-000000000013",
}

const districtLegacy = {
  10101: "d3c10001-0001-4001-8001-000000000021",
  10102: "d3c10002-0002-4002-8002-000000000022",
  10201: "d3c10003-0003-4003-8003-000000000023",
}

function cantonUuid(code) {
  const c = String(code)
  if (cantonLegacy[c]) return cantonLegacy[c]
  const p = c.padStart(4, "0")
  return `d2c1${p}-0001-4001-8001-${c.padStart(12, "0")}`
}

function districtUuid(code) {
  const c = String(code)
  if (districtLegacy[c]) return districtLegacy[c]
  // UUID exige 8 hex en el primer segmento: d3c1 + 4 dígitos del código (sin provincia).
  const tail = c.slice(1).padStart(4, "0")
  return `d3c1${tail}-0001-4001-8001-${c.padStart(12, "0")}`
}

function cantonCodeFromDistrict(code) {
  return String(code).slice(0, 3)
}

const dataDir = resolve(root, "scripts/data")
mkdirSync(dataDir, { recursive: true })

const fhirPath = resolve(dataDir, "distritos-cs.json")
const fhirUrl =
  "https://www.ministeriodesalud.go.cr/fhir/CodeSystem-distritos-cs.json"

let fhir
try {
  fhir = JSON.parse(readFileSync(fhirPath, "utf8"))
} catch {
  console.log(`Downloading ${fhirUrl} ...`)
  const res = await fetch(fhirUrl)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  fhir = await res.json()
  writeFileSync(fhirPath, JSON.stringify(fhir, null, 2), "utf8")
}

const districts = fhir.concept.map(({ code, display }) => ({
  code: String(code),
  name: display,
}))

if (districts.length !== 492) {
  console.warn(`Expected 492 districts, got ${districts.length}`)
}

const cantonCodes = new Set(districts.map((d) => cantonCodeFromDistrict(d.code)))

const rows = districts.map(({ code, name }) => {
  const cantonCode = cantonCodeFromDistrict(code)
  const parentId = cantonUuid(cantonCode)
  const esc = name.replace(/'/g, "''")
  return `  ('${districtUuid(code)}', '${CR}', '${parentId}', '${esc}', 'district', 3, '${code}')`
})

const sql = [
  `-- Costa Rica: ${districts.length} distritos (códigos Ministerio de Salud / INEC).`,
  "insert into public.administrative_divisions (id, country_id, parent_id, name, type, level, code)",
  "values",
  rows.join(",\n"),
  "on conflict (id) do nothing;",
  "",
].join("\n")

const out = resolve(
  root,
  "supabase/migrations/20260928004000_cr_districts_full.sql",
)
writeFileSync(out, sql, "utf8")
console.log(`Wrote ${districts.length} districts to ${out}`)
console.log(`Unique canton codes referenced: ${cantonCodes.size}`)
