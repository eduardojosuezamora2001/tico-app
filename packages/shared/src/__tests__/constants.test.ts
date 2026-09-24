import { readdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import {
  MODULES,
  MODULE_ACTIONS,
  PERMISSIONS,
  PERMISSION_DEFINITIONS,
  PERMISSION_NAMES,
} from "../constants.js"

const here = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(here, "../../../../supabase/migrations")

function readSeedPermissionNames(): string[] {
  const seedFile = readdirSync(migrationsDir).find((f) =>
    f.endsWith("_seed_permissions.sql")
  )
  if (!seedFile) throw new Error("No se encontro *_seed_permissions.sql")
  const sql = readFileSync(join(migrationsDir, seedFile), "utf8")
  // Cada fila del seed empieza con ('modulo:accion', ...
  return [...sql.matchAll(/^\s*\('([a-z_]+:[a-z_]+)'/gm)].map((m) => m[1]!)
}

describe("PERMISSIONS", () => {
  it("every permission follows the module:action format", () => {
    for (const name of PERMISSION_NAMES) {
      expect(name).toMatch(/^[a-z_]+:[a-z_]+$/)
    }
  })

  it("has no duplicates", () => {
    expect(new Set(PERMISSION_NAMES).size).toBe(PERMISSION_NAMES.length)
  })

  it("PERMISSIONS constant and PERMISSION_DEFINITIONS describe the same set", () => {
    const fromConstant = [...Object.values(PERMISSIONS)].sort()
    const fromDefinitions = [...PERMISSION_NAMES].sort()
    expect(fromConstant).toEqual(fromDefinitions)
  })

  it("covers every module x action combination", () => {
    for (const module of Object.values(MODULES)) {
      for (const action of MODULE_ACTIONS) {
        expect(PERMISSION_NAMES).toContain(`${module}:${action}`)
      }
    }
  })

  it("definitions carry consistent module/action parts", () => {
    for (const def of PERMISSION_DEFINITIONS) {
      expect(def.name).toBe(`${def.module}:${def.action}`)
      expect(def.description.length).toBeGreaterThan(0)
    }
  })

  it("matches the SQL seed in supabase/migrations", () => {
    const seeded = readSeedPermissionNames().sort()
    expect(seeded).toEqual([...PERMISSION_NAMES].sort())
  })
})
