import { useEffect, useState } from "react"
import { Link } from "react-router"

import { env } from "@/lib/env"

type HealthView =
  | { kind: "loading" }
  | { kind: "ok"; status: number; body: unknown }
  | { kind: "error"; status: number; body: unknown; detail?: string }

async function fetchServerHealth(): Promise<HealthView> {
  const url = env.VITE_SERVER_HEALTH_URL
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    })
    const text = await res.text()
    let body: unknown = text
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      return {
        kind: "error",
        status: res.status || 502,
        body: text,
        detail: "La respuesta del proxy no es JSON",
      }
    }
    if (!res.ok) {
      return { kind: "error", status: res.status, body }
    }
    return { kind: "ok", status: res.status, body }
  } catch (err) {
    return {
      kind: "error",
      status: 503,
      body: {
        status: "unavailable",
        reason: "proxy_unreachable",
        message: err instanceof Error ? err.message : "Sin conexión al proxy de health",
      },
      detail: "No se pudo contactar el webhook de n8n",
    }
  }
}

export function HealthPage() {
  const [view, setView] = useState<HealthView>({ kind: "loading" })

  useEffect(() => {
    let cancelled = false
    void fetchServerHealth().then((next) => {
      if (!cancelled) setView(next)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-4 p-6 text-sm leading-relaxed">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold tracking-tight">Estado del servidor</h1>
        <Link className="text-muted-foreground underline-offset-4 hover:underline" to="/">
          Inicio
        </Link>
      </div>
      <p className="text-muted-foreground">
        Consulta puntual vía n8n (<code className="text-foreground">{env.VITE_SERVER_HEALTH_URL}</code>).
        No hay monitoreo periódico.
      </p>

      {view.kind === "loading" ? (
        <p role="status">Consultando…</p>
      ) : (
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <p>
            HTTP{" "}
            <span className="font-semibold tabular-nums">
              {view.status}
            </span>
            {view.kind === "ok" ? " · OK" : " · Error"}
          </p>
          {view.kind === "error" && view.detail ? (
            <p className="text-muted-foreground">{view.detail}</p>
          ) : null}
          <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs leading-relaxed">
            {JSON.stringify(view.body, null, 2)}
          </pre>
          <button
            type="button"
            className="self-start rounded-full border border-border px-3 py-1.5 text-sm hover:bg-muted"
            onClick={() => {
              setView({ kind: "loading" })
              void fetchServerHealth().then(setView)
            }}
          >
            Volver a consultar
          </button>
        </section>
      )}
    </main>
  )
}
