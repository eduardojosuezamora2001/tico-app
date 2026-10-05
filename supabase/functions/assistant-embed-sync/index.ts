import { serviceClient } from "../_shared/client.ts"
import { corsHeaders, jsonResponse, optionsResponse } from "../_shared/cors.ts"
import { embedTexts } from "../_shared/voyage.ts"

type SourceRow = {
  source_type: string
  source_id: string
  business_id: string | null
  content: string
  metadata: Record<string, unknown>
  content_hash: string
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse()

  try {
    const auth = req.headers.get("Authorization") ?? ""
    const token = auth.replace(/^Bearer\s+/i, "").trim()
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    if (!serviceKey || token !== serviceKey) {
      return jsonResponse({ error: "Unauthorized" }, 401)
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {}
    const limit = Math.min(Math.max(Number(body.limit) || 500, 1), 2000)

    const db = serviceClient()
    const { data: sources, error: listError } = await db.rpc("assistant_list_embed_sources", {
      p_limit: limit,
    })
    if (listError) return jsonResponse({ error: listError.message }, 500)

    const rows = (sources ?? []) as SourceRow[]
    if (rows.length === 0) {
      return jsonResponse({ updated: 0, skipped: 0 })
    }

    const { data: existing } = await db
      .from("knowledge_chunks")
      .select("source_type, source_id, content_hash")
      .in(
        "source_id",
        rows.map((r) => r.source_id),
      )

    const hashByKey = new Map<string, string>()
    for (const row of existing ?? []) {
      hashByKey.set(`${row.source_type}:${row.source_id}`, row.content_hash as string)
    }

    const pending = rows.filter((r) => hashByKey.get(`${r.source_type}:${r.source_id}`) !== r.content_hash)
    let updated = 0

    const batchSize = 3
    const pauseMs = 21_000
    for (let i = 0; i < pending.length; i += batchSize) {
      const batch = pending.slice(i, i + batchSize)
      let vectors: number[][] = []
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          vectors = await embedTexts(batch.map((b) => b.content.slice(0, 8000)))
          break
        } catch (error) {
          const msg = error instanceof Error ? error.message : ""
          if (!msg.includes("429") || attempt === 3) throw error
          await new Promise((r) => setTimeout(r, pauseMs * (attempt + 1)))
        }
      }
      for (let j = 0; j < batch.length; j++) {
        const row = batch[j]!
        const embedding = vectors[j]
        if (!embedding?.length) continue
        const { error } = await db.from("knowledge_chunks").upsert(
          {
            source_type: row.source_type,
            source_id: row.source_id,
            business_id: row.business_id,
            content: row.content,
            metadata: row.metadata,
            content_hash: row.content_hash,
            embedding,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "source_type,source_id" },
        )
        if (!error) updated++
      }
      if (i + batchSize < pending.length) {
        await new Promise((r) => setTimeout(r, pauseMs))
      }
    }

    return jsonResponse({
      updated,
      skipped: rows.length - pending.length,
      total: rows.length,
    })
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Embed sync failed" },
      500,
    )
  }
})
