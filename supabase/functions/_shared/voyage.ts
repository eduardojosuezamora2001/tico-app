const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings"
const MODEL = "voyage-3-lite"

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const key = Deno.env.get("VOYAGE_API_KEY")
  if (!key) throw new Error("Missing VOYAGE_API_KEY")

  if (texts.length === 0) return []

  const res = await fetch(VOYAGE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      input: texts,
      input_type: "document",
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Voyage embed failed: ${res.status} ${err}`)
  }

  const payload = (await res.json()) as { data: { embedding: number[] }[] }
  return payload.data.map((row) => row.embedding)
}

export async function embedQuery(text: string): Promise<number[]> {
  const key = Deno.env.get("VOYAGE_API_KEY")
  if (!key) throw new Error("Missing VOYAGE_API_KEY")

  const res = await fetch(VOYAGE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      input: [text],
      input_type: "query",
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Voyage query embed failed: ${res.status} ${err}`)
  }

  const payload = (await res.json()) as { data: { embedding: number[] }[] }
  return payload.data[0]?.embedding ?? []
}
