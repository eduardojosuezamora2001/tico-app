/**
 * Genera migración SQL con los municipios oficiales de Jalisco (INEGI).
 * Fuente: https://gaia.inegi.org.mx/wscatgeo/v2/mgem/14
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const MX = "c3333333-3333-4333-8333-333333333333"
const JALISCO = "d1c30002-0002-4002-8002-000000000062"
const CVE_ENT = "14"

const legacy = {
  "14039": "d2c30002-0002-4002-8002-000000000072",
}

function municipalityUuid(cvegeo) {
  if (legacy[cvegeo]) return legacy[cvegeo]
  const tail = cvegeo.slice(-4).padStart(4, "0")
  return `d2c3${tail}-0001-4001-8001-${cvegeo.padStart(12, "0")}`
}

const dataDir = resolve(root, "scripts/data")
mkdirSync(dataDir, { recursive: true })

const cachePath = resolve(dataDir, "mx-jal-municipalities.json")
const apiUrl = `https://gaia.inegi.org.mx/wscatgeo/v2/mgem/${CVE_ENT}`

let payload
try {
  payload = JSON.parse(readFileSync(cachePath, "utf8"))
} catch {
  console.log(`Downloading ${apiUrl} ...`)
  const res = await fetch(apiUrl)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  payload = await res.json()
  writeFileSync(cachePath, JSON.stringify(payload, null, 2), "utf8")
}

const municipalities = payload.datos ?? []
if (municipalities.length === 0) {
  throw new Error("No municipalities returned from INEGI")
}

const rows = municipalities.map(({ cvegeo, cve_mun, nomgeo }) => {
  const esc = nomgeo.replace(/'/g, "''")
  return `  ('${municipalityUuid(cvegeo)}', '${MX}', '${JALISCO}', '${esc}', 'municipality', 2, '${cve_mun}')`
})

const sql = [
  `-- México / Jalisco: ${municipalities.length} municipios (INEGI cve_ent=${CVE_ENT}).`,
  "insert into public.administrative_divisions (id, country_id, parent_id, name, type, level, code)",
  "values",
  rows.join(",\n"),
  "on conflict (id) do nothing;",
  "",
].join("\n")

const out = resolve(
  root,
  "supabase/migrations/20260928005000_mx_jal_municipalities.sql",
)
writeFileSync(out, sql, "utf8")
console.log(`Wrote ${municipalities.length} municipalities to ${out}`)
