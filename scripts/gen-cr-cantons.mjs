const CR = "c1111111-1111-4111-8111-111111111111"
const provinces = {
  1: { id: "d1c10001-0001-4001-8001-000000000001" },
  2: { id: "d1c10002-0002-4002-8002-000000000002" },
  3: { id: "d1c10003-0003-4003-8003-000000000003" },
  4: { id: "d1c10004-0004-4004-8004-000000000004" },
  5: { id: "d1c10005-0005-4005-8005-000000000005" },
  6: { id: "d1c10006-0006-4006-8006-000000000006" },
  7: { id: "d1c10007-0007-4007-8007-000000000007" },
}
const legacy = {
  101: "d2c10001-0001-4001-8001-000000000011",
  102: "d2c10002-0002-4002-8002-000000000012",
  201: "d2c10003-0003-4003-8003-000000000013",
}
const cantons = [
  [1, "San José", 101],
  [1, "Escazú", 102],
  [1, "Desamparados", 103],
  [1, "Puriscal", 104],
  [1, "Tarrazú", 105],
  [1, "Aserrí", 106],
  [1, "Mora", 107],
  [1, "Goicoechea", 108],
  [1, "Santa Ana", 109],
  [1, "Alajuelita", 110],
  [1, "Vázquez de Coronado", 111],
  [1, "Acosta", 112],
  [1, "Tibás", 113],
  [1, "Moravia", 114],
  [1, "Montes de Oca", 115],
  [1, "Turrubares", 116],
  [1, "Dota", 117],
  [1, "Curridabat", 118],
  [1, "Pérez Zeledón", 119],
  [1, "León Cortés Castro", 120],
  [2, "Alajuela", 201],
  [2, "San Ramón", 202],
  [2, "Grecia", 203],
  [2, "San Mateo", 204],
  [2, "Atenas", 205],
  [2, "Naranjo", 206],
  [2, "Palmares", 207],
  [2, "Poás", 208],
  [2, "Orotina", 209],
  [2, "San Carlos", 210],
  [2, "Zarcero", 211],
  [2, "Sarchí", 212],
  [2, "Upala", 213],
  [2, "Los Chiles", 214],
  [2, "Guatuso", 215],
  [2, "Río Cuarto", 216],
  [3, "Cartago", 301],
  [3, "Paraíso", 302],
  [3, "La Unión", 303],
  [3, "Jiménez", 304],
  [3, "Turrialba", 305],
  [3, "Alvarado", 306],
  [3, "Oreamuno", 307],
  [3, "El Guarco", 308],
  [4, "Heredia", 401],
  [4, "Barva", 402],
  [4, "Santo Domingo", 403],
  [4, "Santa Bárbara", 404],
  [4, "San Rafael", 405],
  [4, "San Isidro", 406],
  [4, "Belén", 407],
  [4, "Flores", 408],
  [4, "San Pablo", 409],
  [4, "Sarapiquí", 410],
  [5, "Liberia", 501],
  [5, "Nicoya", 502],
  [5, "Santa Cruz", 503],
  [5, "Bagaces", 504],
  [5, "Carrillo", 505],
  [5, "Cañas", 506],
  [5, "Abangares", 507],
  [5, "Tilarán", 508],
  [5, "Nandayure", 509],
  [5, "La Cruz", 510],
  [5, "Hojancha", 511],
  [6, "Puntarenas", 601],
  [6, "Esparza", 602],
  [6, "Buenos Aires", 603],
  [6, "Montes de Oro", 604],
  [6, "Osa", 605],
  [6, "Quepos", 606],
  [6, "Golfito", 607],
  [6, "Coto Brus", 608],
  [6, "Parrita", 609],
  [6, "Corredores", 610],
  [6, "Garabito", 611],
  [6, "Monteverde", 612],
  [6, "Puerto Jiménez", 613],
  [7, "Limón", 701],
  [7, "Pococí", 702],
  [7, "Siquirres", 703],
  [7, "Talamanca", 704],
  [7, "Matina", 705],
  [7, "Guácimo", 706],
]

function uuid(code) {
  const c = String(code)
  if (legacy[c]) return legacy[c]
  const p = c.padStart(4, "0")
  return `d2c1${p}-0001-4001-8001-${c.padStart(12, "0")}`
}

const rows = cantons.map(([prov, name, code]) => {
  const esc = name.replace(/'/g, "''")
  return `  ('${uuid(code)}', '${CR}', '${provinces[prov].id}', '${esc}', 'canton', 2, '${code}')`
})

import { writeFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const sql = [
  `-- Costa Rica: ${cantons.length} cantones (INEC, incl. 612 Monteverde y 613 Puerto Jiménez).`,
  "insert into public.administrative_divisions (id, country_id, parent_id, name, type, level, code)",
  "values",
  rows.join(",\n"),
  "on conflict (id) do nothing;",
  "",
].join("\n")

const out = resolve(dirname(fileURLToPath(import.meta.url)), "../supabase/migrations/20260928003000_cr_cantons_full.sql")
writeFileSync(out, sql, "utf8")
console.log(`Wrote ${cantons.length} cantons to ${out}`)
