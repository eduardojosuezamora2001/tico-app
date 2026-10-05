import type { SupabaseClient } from "npm:@supabase/supabase-js@2"

import type { ToolDef } from "./deepseek.ts"

const ALLOWED = new Set([
  "count_businesses_by_zone",
  "business_exists",
  "list_business_catalog",
  "search_nearby",
  "search_businesses",
  "escalate_to_support",
])

export const ASSISTANT_TOOLS: ToolDef[] = [
  {
    type: "function",
    function: {
      name: "count_businesses_by_zone",
      description:
        "Cuenta comercios activos publicados. Sin provinceNames (o []) = todo Costa Rica. Con nombres = filtra por provincia(s).",
      parameters: {
        type: "object",
        properties: {
          provinceNames: {
            type: "array",
            items: { type: "string" },
            description:
              "Opcional. Ej. Heredia, San José. Omitir o [] para contar en todo el país.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "business_exists",
      description:
        "Comprueba si un negocio publicado existe por nombre, slug o UUID. No lista catálogo; usa list_business_catalog.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_nearby",
      description: "Lista negocios publicados más cercanos a un punto geográfico.",
      parameters: {
        type: "object",
        properties: {
          latitude: { type: "number" },
          longitude: { type: "number" },
          radiusKm: { type: "number" },
          limit: { type: "integer" },
        },
        required: ["latitude", "longitude"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_business_catalog",
      description:
        "Lista productos, servicios y platos publicados de un negocio (precios incluidos).",
      parameters: {
        type: "object",
        properties: {
          businessId: { type: "string", description: "UUID del negocio" },
          businessQuery: { type: "string", description: "Nombre o slug del negocio" },
          limit: { type: "integer" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_businesses",
      description: "Busca negocios publicados por texto, categoría o ítem de catálogo.",
      parameters: {
        type: "object",
        properties: {
          q: { type: "string" },
          categories: { type: "array", items: { type: "string" } },
          catalogKind: { type: "string", enum: ["product", "service", "menu"] },
          catalogLabel: { type: "string" },
          limit: { type: "integer" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "escalate_to_support",
      description: "Abre o reactiva un chat con el equipo de soporte de TicoApp (humanos).",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "Resumen breve del problema del usuario" },
        },
        required: ["summary"],
      },
    },
  },
]

function sanitizeText(value: unknown, max: number): string {
  if (typeof value !== "string") return ""
  return value.trim().slice(0, max)
}

async function divisionIdsByNames(db: SupabaseClient, names: string[]) {
  const ids: string[] = []
  for (const raw of names.slice(0, 5)) {
    const name = sanitizeText(raw, 80)
    if (!name) continue
    const { data } = await db
      .from("administrative_divisions")
      .select("id")
      .ilike("name", name)
      .limit(3)
    for (const row of data ?? []) {
      ids.push(row.id as string)
    }
  }
  return [...new Set(ids)]
}

export async function runTool(
  db: SupabaseClient,
  userId: string,
  name: string,
  argsJson: string,
  geo: { lat?: number; lng?: number },
): Promise<unknown> {
  if (!ALLOWED.has(name)) {
    return { error: "Tool not allowed" }
  }

  let args: Record<string, unknown> = {}
  try {
    args = JSON.parse(argsJson) as Record<string, unknown>
  } catch {
    return { error: "Invalid tool arguments JSON" }
  }

  if (name === "count_businesses_by_zone") {
    const names = Array.isArray(args.provinceNames)
      ? args.provinceNames.map((n) => sanitizeText(n, 80)).filter(Boolean)
      : []
    const divisionIds = await divisionIdsByNames(db, names)
    const { data, error } = await db.rpc("assistant_count_active_businesses", {
      p_division_ids: divisionIds.length > 0 ? divisionIds : null,
    })
    if (error) return { error: error.message }
    return {
      count: data,
      scope: names.length > 0 ? "provinces" : "costa_rica",
      provinceNames: names,
      divisionIds,
    }
  }

  if (name === "business_exists") {
    const query = sanitizeText(args.query, 120)
    if (!query) return { matches: [] }
    const { data, error } = await db.rpc("assistant_business_exists", { p_query: query })
    if (error) return { error: error.message }
    return { matches: data ?? [] }
  }

  if (name === "list_business_catalog") {
    let businessId = sanitizeText(args.businessId, 40)
    const businessQuery = sanitizeText(args.businessQuery, 120)
    if (!businessId && businessQuery) {
      const { data: matches, error: lookupError } = await db.rpc("assistant_business_exists", {
        p_query: businessQuery,
      })
      if (lookupError) return { error: lookupError.message }
      const first = (matches ?? [])[0] as { id?: string } | undefined
      if (!first?.id) return { error: "Negocio no encontrado", businessQuery, items: [] }
      businessId = first.id
    }
    if (!businessId) return { error: "Indica businessId o businessQuery" }
    const lim = typeof args.limit === "number" ? Math.min(args.limit, 50) : 30
    const { data, error } = await db.rpc("list_business_catalog", {
      p_business_id: businessId,
      lim,
      cursor_updated_at: null,
      cursor_item_type: null,
      cursor_item_id: null,
    })
    if (error) return { error: error.message }
    const items = (data ?? []).map(
      (row: {
        item_type: string
        item_id: string
        name: string
        price: number | string
        group_label: string | null
      }) => ({
        itemType: row.item_type,
        itemId: row.item_id,
        name: row.name,
        price: row.price,
        groupLabel: row.group_label,
      }),
    )
    return { businessId, items, count: items.length }
  }

  if (name === "search_nearby") {
    const lat = typeof args.latitude === "number" ? args.latitude : geo.lat
    const lng = typeof args.longitude === "number" ? args.longitude : geo.lng
    if (lat == null || lng == null) {
      return { error: "Se necesita ubicación del usuario para buscar cerca." }
    }
    const radius = typeof args.radiusKm === "number" ? Math.min(args.radiusKm, 50) : 15
    const lim = typeof args.limit === "number" ? Math.min(args.limit, 20) : 10
    const { data, error } = await db.rpc("find_businesses_nearby", {
      lat,
      lng,
      radius_m: radius * 1000,
      lim,
    })
    if (error) return { error: error.message }
    return { businesses: data ?? [] }
  }

  if (name === "search_businesses") {
    const q = sanitizeText(args.q, 120) || null
    const categories = Array.isArray(args.categories)
      ? args.categories.map((c) => sanitizeText(c, 60)).filter(Boolean)
      : null
    const catalogKind = sanitizeText(args.catalogKind, 20) || null
    const catalogLabel = sanitizeText(args.catalogLabel, 120) || null
    const lim = typeof args.limit === "number" ? Math.min(args.limit, 20) : 15
    const { data, error } = await db.rpc("discover_businesses_v2", {
      q,
      marketplace_tag_slugs: null,
      categories: categories?.length ? categories : null,
      lat: geo.lat ?? null,
      lng: geo.lng ?? null,
      radius_km: 25,
      lim,
      cursor_distance: null,
      cursor_name: null,
      cursor_id: null,
      administrative_division_ids: null,
      catalog_kind: catalogKind,
      catalog_label: catalogLabel,
    })
    if (error) return { error: error.message }
    return { businesses: data ?? [] }
  }

  if (name === "escalate_to_support") {
    const summary = sanitizeText(args.summary, 500)
    const { data: thread, error: threadError } = await db
      .from("support_threads")
      .upsert(
        {
          user_id: userId,
          status: "open",
          last_text: summary || "Solicitud de soporte",
          last_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select("id")
      .single()
    if (threadError) return { error: threadError.message }

    const { error: msgError } = await db.from("support_messages").insert({
      thread_id: thread.id,
      sender_id: userId,
      body: summary || "Necesito ayuda del equipo TicoApp.",
      is_read: false,
    })
    if (msgError) return { error: msgError.message }
    return { supportThreadId: thread.id, status: "open" }
  }

  return { error: "Unknown tool" }
}

export function extractCitations(toolResults: unknown[]): {
  businessId: string | null
  label: string
  href: string | null
}[] {
  const out: { businessId: string | null; label: string; href: string | null }[] = []
  const seen = new Set<string>()

  for (const result of toolResults) {
    if (!result || typeof result !== "object") continue
    const obj = result as Record<string, unknown>
    const lists = [obj.matches, obj.businesses].filter(Array.isArray) as unknown[][]
    for (const list of lists) {
      for (const item of list) {
        if (!item || typeof item !== "object") continue
        const row = item as Record<string, unknown>
        const id = typeof row.id === "string" ? row.id : null
        const name = typeof row.name === "string" ? row.name : "Negocio"
        if (!id || seen.has(id)) continue
        seen.add(id)
        out.push({ businessId: id, label: name, href: `/n/${id}` })
      }
    }
  }
  return out.slice(0, 8)
}
