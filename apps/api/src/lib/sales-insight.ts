import type { SalesInsightRequest, SalesInsightResponse } from "@workspace/shared"

import { env } from "../config/env.js"

function colones(value: number) {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  }).format(value)
}

function trendLabel(metrics: SalesInsightRequest) {
  const avg = metrics.avgDailySales
  const nextDaily = metrics.projectedNext7 / 7
  if (avg <= 0 && nextDaily <= 0) return "estable"
  if (avg <= 0) return "al alza"
  const delta = (nextDaily - avg) / avg
  if (delta > 0.08) return "al alza"
  if (delta < -0.08) return "a la baja"
  return "estable"
}

/** Texto determinístico cuando no hay DeepSeek o falla la llamada. */
export function buildHeuristicSalesInsight(metrics: SalesInsightRequest): string {
  if (metrics.acceptedOrders === 0 && metrics.pendingOrders === 0) {
    return "Todavía no hay pedidos suficientes para proyectar. Cuando aceptes ventas, aquí verás una estimación de los próximos 7 días y del mes."
  }

  const trend = trendLabel(metrics)
  const conversionPct = Math.round(metrics.conversionRate * 100)
  const pending =
    metrics.pendingOrders > 0
      ? ` Tenés ${metrics.pendingOrders} pedido${metrics.pendingOrders === 1 ? "" : "s"} pendiente${metrics.pendingOrders === 1 ? "" : "s"} por ${colones(metrics.pendingSales)} que podrían sumarse si los aceptás.`
      : ""

  return (
    `Con el ritmo actual, la proyección a 7 días es de unos ${colones(metrics.projectedNext7)} ` +
    `(≈ ${colones(metrics.avgDailySales)} por día) y la estimación mensual ronda ${colones(metrics.projectedMonth)}. ` +
    `La tendencia reciente se ve ${trend} y tu tasa de aceptación es del ${conversionPct}%.` +
    pending
  )
}

export function buildSalesInsightPrompt(metrics: SalesInsightRequest): string {
  const trend = trendLabel(metrics)
  return [
    "Sos un asesor de negocios para dueños de comercios en Costa Rica.",
    "Escribí en español costarricense claro (vos), 2 a 4 oraciones, sin markdown ni listas.",
    "Usá solo estos números; no inventes métricas ni montos distintos:",
    `- Ventas aceptadas: ${colones(metrics.acceptedSales)} (${metrics.acceptedOrders} pedidos)`,
    `- Pendientes: ${colones(metrics.pendingSales)} (${metrics.pendingOrders} pedidos)`,
    `- Rechazados: ${metrics.deniedOrders}`,
    `- Promedio diario (14 días): ${colones(metrics.avgDailySales)}`,
    `- Proyección 7 días: ${colones(metrics.projectedNext7)}`,
    `- Proyección mensual: ${colones(metrics.projectedMonth)}`,
    `- Tasa de aceptación: ${Math.round(metrics.conversionRate * 100)}%`,
    `- Tendencia calculada: ${trend}`,
    "Explicá qué puede esperar el dueño en los próximos días y el mes, y una sugerencia breve y accionable.",
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
            "Generás predicciones de ventas cortas y honestas para dueños de negocio. No uses emojis.",
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

/** Genera insight con DeepSeek; si falla, usa el texto heurístico. */
export async function generateSalesInsight(
  metrics: SalesInsightRequest,
): Promise<SalesInsightResponse> {
  try {
    const text = await callDeepSeek(buildSalesInsightPrompt(metrics))
    return { text, source: "ai" }
  } catch (error) {
    console.warn(
      "[sales-insight] fallback heurístico:",
      error instanceof Error ? error.message : error,
    )
    return { text: buildHeuristicSalesInsight(metrics), source: "heuristic" }
  }
}
