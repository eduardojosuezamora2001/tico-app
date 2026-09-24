import { describe, expect, it } from "vitest"

// Variables minimas para que `config/env.ts` valide sin un .env real.
process.env.SUPABASE_URL ??= "https://example.supabase.co"
process.env.SUPABASE_PUBLISHABLE_KEY ??= "test-publishable-key"
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key"
process.env.NODE_ENV = "test"

const { app } = await import("./app.js")

describe("API skeleton", () => {
  it("responds on /api/health", async () => {
    const res = await app.request("/api/health")
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string; timestamp: string }
    expect(body.status).toBe("ok")
    expect(new Date(body.timestamp).toString()).not.toBe("Invalid Date")
  })

  it("returns a structured 404 for unknown routes", async () => {
    const res = await app.request("/api/nope")
    expect(res.status).toBe(404)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe("NOT_FOUND")
  })
})
