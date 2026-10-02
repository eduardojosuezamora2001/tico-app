import { beforeEach, describe, expect, it, vi } from "vitest"

const rpc = vi.fn()

vi.mock("./lib/supabase.js", () => ({
  supabaseAdmin: {
    rpc,
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    storage: { from: vi.fn() },
  },
  createUserClient: vi.fn(),
}))

process.env.SUPABASE_URL ??= "https://example.supabase.co"
process.env.SUPABASE_PUBLISHABLE_KEY ??= "test-publishable-key"
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key"
process.env.NODE_ENV = "test"

const { app } = await import("./app.js")

const businessId = "00000000-0000-4000-8000-000000000001"
const productId = "00000000-0000-4000-8000-000000000002"

describe("GET /api/businesses discover", () => {
  beforeEach(() => {
    rpc.mockReset()
    rpc.mockResolvedValue({
      data: [
        {
          id: businessId,
          slug: "pulperia-dona-ana",
          name: "Pulpería Doña Ana",
          description: null,
          category: "Pulpería",
          address: "San José",
          whatsapp_number: null,
          logo_url: null,
          banner_url: null,
          latitude: null,
          longitude: null,
          distance_m: null,
          matches: [{ kind: "product", id: productId, label: "Ranchitas" }],
        },
      ],
      error: null,
    })
  })

  it("usa discover_businesses y devuelve matches", async () => {
    const res = await app.request("/api/businesses?q=Ranchitas")
    expect(res.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith(
      "discover_businesses",
      expect.objectContaining({ q: "Ranchitas" }),
    )
    const body = (await res.json()) as {
      data: { name: string; matches: { kind: string; label: string }[] }[]
    }
    expect(body.data[0]?.name).toBe("Pulpería Doña Ana")
    expect(body.data[0]?.matches).toEqual([
      { kind: "product", id: productId, label: "Ranchitas" },
    ])
  })

  it("rechaza un cursor inválido", async () => {
    const res = await app.request("/api/businesses?cursor=no-es-valido")
    expect(res.status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })
})

describe("GET /api/discover/suggestions", () => {
  beforeEach(() => {
    rpc.mockReset()
    rpc.mockResolvedValue({
      data: [
        {
          kind: "product",
          id: productId,
          label: "Coca-Cola",
          hint: "Producto",
        },
        {
          kind: "business",
          id: businessId,
          label: "Pulpería Doña Ana",
          hint: "Pulpería",
        },
      ],
      error: null,
    })
  })

  it("devuelve sugerencias de catálogo", async () => {
    const res = await app.request("/api/discover/suggestions?q=coca")
    expect(res.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith("suggest_catalog", expect.objectContaining({ q: "coca" }))
    const body = (await res.json()) as { data: { kind: string; label: string }[] }
    expect(body.data.map((item) => item.label)).toEqual(["Coca-Cola", "Pulpería Doña Ana"])
  })
})
