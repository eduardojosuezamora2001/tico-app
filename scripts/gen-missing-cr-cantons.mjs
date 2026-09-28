import { readFileSync, writeFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const cantonsSql = JSON.parse(
  readFileSync(resolve(root, "tmp-cr-query.json"), "utf8"),
)
const existing = new Set([
  "101", "102", "307", "308", "401", "402", "403", "404", "405", "406", "407",
  "408", "409", "410", "501", "502", "503", "504", "505", "506", "507", "508",
  "509", "510", "511", "601", "602", "603", "604", "605", "606", "607", "608",
  "609", "610", "611", "701", "702", "703", "704", "705", "706",
])

const rowRe =
  /\('([^']+)', '([^']+)', '([^']+)', '([^']*)', 'canton', 2, '(\d+)'\)/g
const rows = [...cantonsSql.matchAll(rowRe)].map((m) => ({
  id: m[1],
  country: m[2],
  parent: m[3],
  name: m[4],
  code: m[5],
}))

const missing = rows.filter((r) => !existing.has(r.code))
const values = missing
  .map(
    (r) =>
      `  ('${r.id}', '${r.country}', '${r.parent}', '${r.name.replace(/'/g, "''")}', 'canton', 2, '${r.code}')`,
  )
  .join(",\n")

const sql = [
  `insert into public.administrative_divisions (id, country_id, parent_id, name, type, level, code)`,
  "values",
  values,
  "on conflict (id) do nothing;",
  "",
].join("\n")

writeFileSync(resolve(root, "tmp-cr-missing.json"), JSON.stringify(sql))
console.log(`Missing cantons: ${missing.length}, SQL bytes: ${sql.length}`)
