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
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"

import { OrderPickupVerify } from "@/components/orders/order-pickup-verify"
import { formatColones } from "@/lib/messages-ui"
import { decideChatOrder } from "@/services/messages.service"
import { advanceOrderStage } from "@/services/orders.service"

export function OrderMessageCard({
  messageId,
  order,
  dbOrder,
  viewerRole,
  mine,
  onUpdated,
  onOrderUpdated,
  pickupOtpEnabled,
}: {
  messageId: string
  order: ChatOrderPayload
  dbOrder?: ChatOrder
  viewerRole: ConversationRole | undefined
  mine: boolean
  onUpdated: (messageId: string, next: ChatOrderPayload) => void
  onOrderUpdated?: (order: ChatOrder) => void
  pickupOtpEnabled?: boolean
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
  const showPickupVerify =
    pickupOtpEnabled === true &&
    resolved.fulfillmentStage === "ready" &&
    nextStage === "delivered" &&
    (viewerRole === "assignee" || viewerRole === "owner")
  const canAdvance =
    Boolean(nextStage) && (viewerRole === "assignee" || viewerRole === "owner") && !showPickupVerify
  const shortId = resolved.id.slice(-4).padStart(4, "0")
  const pickupCode =
    viewerRole !== "assignee" &&
    viewerRole !== "owner" &&
    resolved.fulfillmentStage === "ready" &&
    resolved.pickupCode
      ? resolved.pickupCode
      : null

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
    <Card
      size="sm"
      className={
        mine
          ? "w-full max-w-sm border-primary/30 bg-primary/10 shadow-none"
          : "w-full max-w-sm shadow-sm"
      }
    >
      <CardHeader className="gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
            <HugeiconsIcon icon={ShoppingBag01Icon} strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>Pedido #{shortId}</CardTitle>
              <OrderStatusBadge order={resolved} />
            </div>
            <CardDescription>
              {resolved.lines.length} ítem{resolved.lines.length === 1 ? "" : "s"} ·{" "}
              {formatColones(resolved.total)}
            </CardDescription>
          </div>
        </div>
        {pickupCode ? (
          <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Código de retiro
            </p>
            <p className="font-mono text-2xl font-bold tracking-[0.28em] text-foreground">{pickupCode}</p>
          </div>
        ) : null}
      </CardHeader>

      {open ? (
        <>
          <Separator />
          <CardContent className="flex flex-col gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {resolved.businessName}
            </p>
            <ul className="flex flex-col gap-2 text-sm">
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
            <p className="text-sm font-semibold">Total: {formatColones(resolved.total)}</p>

            {canDecide ? (
              <div className="flex flex-wrap gap-2">
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

            {showPickupVerify ? (
              <OrderPickupVerify
                orderId={resolved.id}
                disabled={pending}
                onVerified={(updated) => {
                  onUpdated(messageId, toChatOrderPayload(updated))
                  onOrderUpdated?.(updated)
                }}
              />
            ) : null}

            {canAdvance && nextStage ? (
              <Button
                type="button"
                size="sm"
                className="rounded-full"
                disabled={pending}
                onClick={() => void advanceStage()}
              >
                {nextStage === "ready" ? "Listo para retiro" : "Marcar entregado"}
              </Button>
            ) : null}

            {error ? <p className="text-xs text-destructive">{error}</p> : null}

            {resolved.status === "accepted" ? (
              <p className="text-xs text-muted-foreground">
                {orderStageLabel(resolved.fulfillmentStage) ?? "Pedido aceptado"}
                {resolved.fulfillmentStage === "delivered" ? "." : " · Actualiza el estado cuando avance."}
              </p>
            ) : null}
            {resolved.status === "denied" ? (
              <p className="text-xs text-destructive">Pedido denegado por el comercio.</p>
            ) : null}
          </CardContent>
        </>
      ) : null}

      <CardFooter className="justify-start border-t">
        <Button
          type="button"
          size="sm"
          variant={open ? "secondary" : "default"}
          className="rounded-full"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Ocultar pedido" : "Ver pedido"}
        </Button>
      </CardFooter>
    </Card>
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
    return <Badge variant="secondary">{label}</Badge>
  }
  if (order.status === "denied") {
    return <Badge variant="destructive">Denegado</Badge>
  }
  return <Badge variant="outline">Pendiente</Badge>
}
