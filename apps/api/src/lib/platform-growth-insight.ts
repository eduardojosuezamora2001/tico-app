import type {
  PlatformGrowthInsightRequest,
  PlatformGrowthInsightResponse,
} from "@workspace/shared"

import { env } from "../config/env.js"

function trendLabel(rate: number) {
  if (rate > 0.08) return "al alza"
  if (rate < -0.08) return "a la baja"
  return "estable"
}

function pct(rate: number) {
  return `${rate >= 0 ? "+" : ""}${Math.round(rate * 100)}%`
}

export function buildHeuristicPlatformGrowthInsight(metrics: PlatformGrowthInsightRequest): string {
  if (metrics.clientsLast14 === 0 && metrics.ownersLast14 === 0) {
    return "Todavía no hay altas recientes de clientes o dueños para proyectar. Cuando crezca el registro diario, aquí verás una estimación a 7 días y al mes."
  }

  return (
    `Con el ritmo de los últimos 14 días, se proyectan unos ${Math.round(metrics.projectedClientsNext7)} clientes nuevos ` +
    `y ${Math.round(metrics.projectedOwnersNext7)} dueños en los próximos 7 días ` +
    `(≈ ${metrics.avgDailyClients.toFixed(1)} clientes/día y ${metrics.avgDailyOwners.toFixed(1)} dueños/día). ` +
    `La tendencia de clientes se ve ${trendLabel(metrics.clientsGrowthRate)} (${pct(metrics.clientsGrowthRate)}) ` +
    `y la de dueños ${trendLabel(metrics.ownersGrowthRate)} (${pct(metrics.ownersGrowthRate)}). ` +
    `A escala mensual, la estimación ronda ${Math.round(metrics.projectedClientsMonth)} clientes y ${Math.round(metrics.projectedOwnersMonth)} dueños.`
  )
}

export function buildPlatformGrowthInsightPrompt(metrics: PlatformGrowthInsightRequest): string {
  return [
    "Sos un analista de crecimiento para la plataforma TicoApp (Costa Rica).",
    "Escribí en español costarricense claro (vos), 2 a 4 oraciones, sin markdown ni listas.",
    "Usá solo estos números; no inventes métricas distintas:",
    `- Clientes totales: ${metrics.clientsTotal}`,
    `- Dueños totales: ${metrics.ownersTotal}`,
    `- Comercios totales: ${metrics.businessesTotal}`,
    `- Altas clientes (14 días): ${metrics.clientsLast14}`,
    `- Altas dueños (14 días): ${metrics.ownersLast14}`,
    `- Altas comercios (14 días): ${metrics.businessesLast14}`,
    `- Promedio diario clientes: ${metrics.avgDailyClients.toFixed(2)}`,
    `- Promedio diario dueños: ${metrics.avgDailyOwners.toFixed(2)}`,
    `- Proyección clientes 7 días: ${metrics.projectedClientsNext7.toFixed(1)}`,
    `- Proyección dueños 7 días: ${metrics.projectedOwnersNext7.toFixed(1)}`,
    `- Proyección clientes mes: ${metrics.projectedClientsMonth.toFixed(1)}`,
    `- Proyección dueños mes: ${metrics.projectedOwnersMonth.toFixed(1)}`,
    `- Crecimiento clientes (tendencia): ${pct(metrics.clientsGrowthRate)} (${trendLabel(metrics.clientsGrowthRate)})`,
    `- Crecimiento dueños (tendencia): ${pct(metrics.ownersGrowthRate)} (${trendLabel(metrics.ownersGrowthRate)})`,
    "Explicá qué puede esperar la plataforma en clientes y dueños a corto plazo, y una sugerencia breve de acción.",
  ].join("\n")
}

async function callDeepSeek(prompt: string): Promise<string> {
  const key = env.DEEPSEEK_API_KEY?.trim()
  if (!key) throw new Error("missing_deepseek_key")

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "Generás proyecciones de crecimiento de plataforma cortas y honestas para superadmins. No uses emojis.",
        },
        { role: "user", content: prompt },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`DeepSeek (${res.status}): ${err.slice(0, 200)}`)
  }

  const payload = (await res.json()) as {
    choices?: { message?: { content?: string | null } }[]
  }
  const text = payload.choices?.[0]?.message?.content?.trim() ?? ""
  if (!text) throw new Error("empty_deepseek_response")
  return text.slice(0, 2000)
}

export async function generatePlatformGrowthInsight(
  metrics: PlatformGrowthInsightRequest,
): Promise<PlatformGrowthInsightResponse> {
  try {
    const text = await callDeepSeek(buildPlatformGrowthInsightPrompt(metrics))
    return { text, source: "ai" }
  } catch (error) {
    console.warn(
      "[platform-growth-insight] fallback heurístico:",
      error instanceof Error ? error.message : error,
    )
    return { text: buildHeuristicPlatformGrowthInsight(metrics), source: "heuristic" }
  }
}
