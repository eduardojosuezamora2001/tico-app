import { useState } from "react"
import {
  nextFulfillmentStage,
  orderStageLabel,
  parseMessageContent,
  toChatOrderPayload,
  type ChatOrder,
  type ChatOrderPayload,
  type ConversationRole,
} from "@workspace/shared"
import { ShoppingBag01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { formatColones } from "@/lib/messages-ui"
import { decideChatOrder } from "@/services/messages.service"
import { advanceOrderStage } from "@/services/orders.service"
import { Button } from "@workspace/ui/components/button"

export function OrderMessageCard({
  messageId,
  order,
  dbOrder,
  viewerRole,
  mine,
  onUpdated,
  onOrderUpdated,
}: {
  messageId: string
  order: ChatOrderPayload
  dbOrder?: ChatOrder
  viewerRole: ConversationRole | undefined
  mine: boolean
  onUpdated: (messageId: string, next: ChatOrderPayload) => void
  onOrderUpdated?: (order: ChatOrder) => void
}) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resolved = dbOrder ?? payloadAsOrder(order)
  const canDecide =
    resolved.status === "pending" && (viewerRole === "assignee" || viewerRole === "owner")
  const nextStage =
    resolved.status === "accepted" && resolved.fulfillmentStage
      ? nextFulfillmentStage(resolved.fulfillmentStage)
      : null
  const canAdvance =
    Boolean(nextStage) && (viewerRole === "assignee" || viewerRole === "owner")
  const shortId = resolved.id.slice(-4).padStart(4, "0")

  async function decide(decision: "accept" | "deny") {
    setPending(true)
    setError(null)
    try {
      const result = await decideChatOrder(messageId, decision)
      const parsed = parseMessageContent(result.message.text)
      if (parsed.kind === "order") onUpdated(messageId, parsed.order)
      onOrderUpdated?.(result.order)
      setOpen(true)
    } catch {
      setError("No se pudo actualizar el pedido.")
    } finally {
      setPending(false)
    }
  }

  async function advanceStage() {
    if (!nextStage) return
    setPending(true)
    setError(null)
    try {
      const updated = await advanceOrderStage(resolved.id, nextStage)
      onUpdated(messageId, toChatOrderPayload(updated))
      onOrderUpdated?.(updated)
      setOpen(true)
    } catch {
      setError("No se pudo avanzar el pedido.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div
      className={
        mine
          ? "w-full max-w-sm rounded-2xl border border-primary/30 bg-primary/10 p-4 text-foreground"
          : "w-full max-w-sm rounded-2xl border border-border bg-card p-4 text-foreground shadow-sm"
      }
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <HugeiconsIcon icon={ShoppingBag01Icon} strokeWidth={2} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Pedido #{shortId}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {resolved.lines.length} ítem{resolved.lines.length === 1 ? "" : "s"} · {formatColones(resolved.total)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={open ? "secondary" : "default"}
              className="rounded-full"
              onClick={() => setOpen((value) => !value)}
            >
              {open ? "Ocultar pedido" : "Ver pedido"}
            </Button>
            <OrderStatusBadge order={resolved} />
          </div>
        </div>
      </div>

      {open ? (
        <div className="mt-4 border-t border-border/80 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {resolved.businessName}
          </p>
          <ul className="mt-2 flex flex-col gap-2 text-sm">
            {resolved.lines.map((line) => (
              <li key={line.productId} className="flex items-start justify-between gap-3">
                <span>
                  {line.quantity}x {line.name}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {formatColones(line.price * line.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm font-semibold">Total: {formatColones(resolved.total)}</p>

          {canDecide ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="rounded-full"
                disabled={pending}
                onClick={() => void decide("accept")}
              >
                Aceptar pedido
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full"
                disabled={pending}
                onClick={() => void decide("deny")}
              >
                Denegar
              </Button>
            </div>
          ) : null}

          {canAdvance && nextStage ? (
            <div className="mt-4">
              <Button
                type="button"
                size="sm"
                className="rounded-full"
                disabled={pending}
                onClick={() => void advanceStage()}
              >
                {nextStage === "ready" ? "Listo para retiro" : "Marcar entregado"}
              </Button>
            </div>
          ) : null}

          {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}

          {resolved.status === "accepted" ? (
            <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-300">
              {orderStageLabel(resolved.fulfillmentStage) ?? "Pedido aceptado"}
              {resolved.fulfillmentStage === "delivered" ? "." : " · Actualiza el estado cuando avance."}
            </p>
          ) : null}
          {resolved.status === "denied" ? (
            <p className="mt-3 text-xs text-destructive">Pedido denegado por el comercio.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function payloadAsOrder(order: ChatOrderPayload): ChatOrder {
  return {
    id: order.orderId,
    businessId: "",
    conversationId: "",
    messageId: "",
    customerId: "",
    status: order.status,
    fulfillmentStage: order.fulfillmentStage ?? null,
    businessName: order.businessName,
    lines: order.lines,
    subtotal: order.total,
    total: order.total,
    decidedAt: order.decidedAt ?? null,
    stageUpdatedAt: order.stageUpdatedAt ?? null,
    createdAt: order.decidedAt ?? new Date().toISOString(),
    updatedAt: order.stageUpdatedAt ?? order.decidedAt ?? new Date().toISOString(),
  }
}

function OrderStatusBadge({ order }: { order: ChatOrder }) {
  if (order.status === "accepted") {
    const label = orderStageLabel(order.fulfillmentStage) ?? "Aceptado"
    return (
      <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
        {label}
      </span>
    )
  }
  if (order.status === "denied") {
    return (
      <span className="rounded-full bg-destructive/15 px-2.5 py-0.5 text-[11px] font-medium text-destructive">
        Denegado
      </span>
    )
  }
  return (
    <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-200">
      Pendiente
    </span>
  )
}
