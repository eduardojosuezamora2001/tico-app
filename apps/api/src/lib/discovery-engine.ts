import { env } from "../config/env.js"
import { DISCOVERY_RANKING_WEIGHTS } from "./discovery-ranking.js"
import { supabaseAdmin } from "./supabase.js"

export type DiscoverBusinessArgs = {
  q: string | null
  marketplace_tag_slugs: string[] | null
  categories: string[] | null
  lat: number | null
  lng: number | null
  radius_km: number
  lim: number
  cursor_distance: number | null
  cursor_name: string | null
  cursor_id: string | null
  administrative_division_ids: string[] | null
  catalog_kind: string | null
  catalog_label: string | null
}

type DiscoverRow = {
  id: string
  slug: string
  name: string
  description: string | null
  category: string
  address: string | null
  whatsapp_number: string | null
  logo_url: string | null
  banner_url: string | null
  latitude: number | null
  longitude: number | null
  distance_m: number | null
  matches: unknown
}

function logDuration(event: string, startedAt: number, extra?: Record<string, unknown>) {
  const ms = Math.round(performance.now() - startedAt)
  console.info(JSON.stringify({ event, ms, ...extra }))
  if (event === "discover_businesses" && ms > env.DISCOVERY_P95_SLA_MS) {
    console.warn(
      JSON.stringify({
        event: "discovery_sla_exceeded",
        ms,
        slaMs: env.DISCOVERY_P95_SLA_MS,
        next: "Activa DISCOVERY_ENGINE=external con DISCOVERY_EXTERNAL_URL si discover_businesses_v2 no cumple el SLA.",
      }),
    )
  }
  return ms
}

async function searchExternal(args: DiscoverBusinessArgs): Promise<DiscoverRow[]> {
  const response = await fetch(env.DISCOVERY_EXTERNAL_URL!, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: args,
      weights: DISCOVERY_RANKING_WEIGHTS,
    }),
    signal: AbortSignal.timeout(2_000),
  })
  if (!response.ok) {
    throw new Error(`Motor externo respondió ${response.status}`)
  }
  const body = (await response.json()) as { data?: DiscoverRow[] }
  if (!Array.isArray(body.data)) {
    throw new Error("Motor externo sin data[]")
  }
  return body.data
}

export async function discoverBusinesses(args: DiscoverBusinessArgs) {
  const started = performance.now()

  if (env.DISCOVERY_ENGINE === "external") {
    if (!env.DISCOVERY_EXTERNAL_URL) {
      console.warn(
        JSON.stringify({
          event: "discovery_external_unconfigured",
          weights: DISCOVERY_RANKING_WEIGHTS,
        }),
      )
    } else {
      try {
        const data = await searchExternal(args)
        logDuration("discover_businesses", started, { engine: "external" })
        return { data, error: null }
      } catch (error) {
        console.warn(
          JSON.stringify({
            event: "discovery_external_fallback",
            message: error instanceof Error ? error.message : "error",
            weights: DISCOVERY_RANKING_WEIGHTS,
          }),
        )
      }
    }
  }

  const result = await supabaseAdmin.rpc("discover_businesses_v2", args)
  logDuration("discover_businesses", started, { engine: "postgres", rpc: "discover_businesses_v2" })
  return result
}

export function logCatalogList(businessId: string, startedAt: number, kind: string) {
  logDuration("catalog_list", startedAt, { businessId, kind })
}
