/**
 * Imprime cada batch SQL como JSON en stdout (una línea por batch).
 * Uso interno para aplicar vía Supabase MCP.
 */
import { readFileSync, readdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const dir = resolve(dirname(fileURLToPath(import.meta.url)), "../tmp-mx-jal-colony-batches")
const files = readdirSync(dir)
  .filter((file) => file.endsWith(".sql"))
  .sort()

for (const file of files) {
  const sql = readFileSync(resolve(dir, file), "utf8")
  process.stdout.write(JSON.stringify({ batch: file, sql }) + "\n")
}
