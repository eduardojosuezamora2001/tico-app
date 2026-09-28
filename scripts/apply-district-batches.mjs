/**
 * Imprime cada batch SQL como JSON en stdout (una línea por batch).
 * Uso: node scripts/apply-district-batches.mjs > batches.ndjson
 */
import { readFileSync, readdirSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const dir = resolve(dirname(fileURLToPath(import.meta.url)), "../tmp-cr-district-batches")
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))

for (const file of files) {
  const sql = JSON.parse(readFileSync(resolve(dir, file), "utf8"))
  process.stdout.write(JSON.stringify({ batch: file, sql }) + "\n")
}
