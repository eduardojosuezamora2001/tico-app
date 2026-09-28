/**
 * Inserta departamentos y municipios de Antioquia (sin corregimientos).
 */
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const monorepoRoot = resolve(apiRoot, "../..")
dotenv.config({ path: resolve(monorepoRoot, ".env") })

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env")
  process.exit(1)
}

const CO = "c2222222-2222-4222-8222-222222222222"
const ANTIOQUIA = "d1c20001-0001-4001-8001-000000000031"
const DEPT_DANE = "05"

const departmentLegacyId = {
  "05": "d1c20001-0001-4001-8001-000000000031",
  "25": "d1c20002-0002-4002-8002-000000000032",
  "76": "d1c20003-0003-4003-8003-000000000033",
}
const departmentLegacyCode = { "05": "ANT", "25": "CUN", "76": "VAC" }
const municipalityLegacy = { "05001": "d2c20001-0001-4001-8001-000000000041" }

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
  if (departmentLegacyId[daneCode]) return departmentLegacyId[daneCode]
  const tail = daneCode.padStart(4, "0").slice(-4)
  return `d1c2${tail}-0001-4001-8001-${daneCode.padStart(12, "0")}`
}

function municipalityUuid(municipioDane) {
  if (municipalityLegacy[municipioDane]) return municipalityLegacy[municipioDane]
  const tail = municipioDane.slice(-4).padStart(4, "0")
  return `d2c2${tail}-0001-4001-8001-${municipioDane.padStart(12, "0")}`
}

const supabase = createClient(url, key, { auth: { persistSession: false } })
const rows = JSON.parse(
  readFileSync(resolve(monorepoRoot, "scripts/data/co-dane-divipola.json"), "utf8"),
)

async function upsertBatch(label, batch) {
  const { error } = await supabase
    .from("administrative_divisions")
    .upsert(batch, { onConflict: "id", ignoreDuplicates: true })
  if (error) throw new Error(`${label}: ${error.message}`)
  console.log(`${label}: ${batch.length} filas`)
}

const departments = new Map()
for (const row of rows) {
  if (!departments.has(row.departamentoDANE)) {
    departments.set(row.departamentoDANE, titleCase(row.departamento))
  }
}

const departmentRows = [...departments.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([daneCode, name]) => ({
    id: departmentUuid(daneCode),
    country_id: CO,
    parent_id: null,
    name,
    type: "department",
    level: 1,
    code: departmentLegacyCode[daneCode] ?? daneCode,
  }))

const municipalityRows = rows
  .filter((row) => row.departamentoDANE === DEPT_DANE)
  .sort((a, b) => a.municipioDANE.localeCompare(b.municipioDANE))
  .map(({ municipio, municipioDANE }) => ({
    id: municipalityUuid(municipioDANE),
    country_id: CO,
    parent_id: ANTIOQUIA,
    name: titleCase(municipio),
    type: "municipality",
    level: 2,
    code: municipioDANE,
  }))

await upsertBatch("departamentos", departmentRows)
await upsertBatch("municipios Antioquia", municipalityRows)
