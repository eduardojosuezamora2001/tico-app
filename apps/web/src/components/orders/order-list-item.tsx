import { useState } from "react"
import { Link } from "react-router"
import {
  nextFulfillmentStage,
  orderStageLabel,
  type OrderListItem,
} from "@workspace/shared"
import { Message01Icon, ShoppingBag01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { OrderPickupCodeDisplay, OrderPickupCodePending } from "@/components/orders/order-pickup-code-display"
import { OrderPickupVerify } from "@/components/orders/order-pickup-verify"
import { OrderStepTimeline } from "@/components/orders/order-step-timeline"
import {
  formatColones,
  formatRelativeTime,
  orderShortId,
  orderStatusLabel,
  orderStepsFromOrder,
} from "@/lib/messages-ui"
import { decideChatOrder } from "@/services/messages.service"
import { advanceOrderStage } from "@/services/orders.service"
import { Button } from "@workspace/ui/components/button"

export function OrderListItemCard({
  order,
  mode,
  notice,
  onUpdated,
  onAcknowledge,
}: {
  order: OrderListItem
  mode: "customer" | "staff"
  notice?: "new" | "updated" | null
  onUpdated: (order: OrderListItem) => void
  onAcknowledge?: (order?: OrderListItem) => void
}) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const shortId = orderShortId(order.id)
  const steps = orderStepsFromOrder(order)
  const currentStep = steps.find((step) => step.state === "current")
  const nextStage =
    order.status === "accepted" && order.fulfillmentStage
      ? nextFulfillmentStage(order.fulfillmentStage)
      : null
  const canDecide = mode === "staff" && order.status === "pending"
  const pickupOtp = mode === "staff" && order.pickupOtpEnabled === true
  const showPickupVerify =
    pickupOtp && order.fulfillmentStage === "ready" && nextStage === "delivered"
  const canAdvance = mode === "staff" && Boolean(nextStage) && !showPickupVerify
  const showCustomerPickupCode =
    mode === "customer" && order.fulfillmentStage === "ready" && order.pickupCode
  const showCustomerPickupPending =
    mode === "customer" &&
    order.status === "accepted" &&
    order.fulfillmentStage === "preparing" &&
    order.pickupOtpEnabled === true

  async function decide(decision: "accept" | "deny") {
    setPending(true)
    setError(null)
    try {
      const result = await decideChatOrder(order.messageId, decision)
      const merged = { ...order, ...result.order, businessSlug: order.businessSlug, customerName: order.customerName }
      onUpdated(merged)
      onAcknowledge?.(merged)
    } catch {
      setError("No se pudo actualizar el pedido.")
    } finally {
      setPending(false)
    }
  }

  async function advance() {
    if (!nextStage) return
    setPending(true)
    setError(null)
    try {
      const updated = await advanceOrderStage(order.id, nextStage)
      const merged = { ...order, ...updated, businessSlug: order.businessSlug, customerName: order.customerName }
      onUpdated(merged)
      onAcknowledge?.(merged)
    } catch {
      setError("No se pudo avanzar el pedido.")
    } finally {
      setPending(false)
    }
  }

  const highlighted = Boolean(notice)

  function toggleDetail() {
    setOpen((value) => {
      const next = !value
      if (next && notice) onAcknowledge?.(order)
      return next
    })
  }

  return (
    <article
      className={`rounded-2xl border bg-card p-4 shadow-sm ${
        highlighted
          ? notice === "new"
            ? "border-primary/50 ring-2 ring-primary/20"
            : "border-amber-500/50 ring-2 ring-amber-500/15"
          : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-start gap-3">
        <span
          className={`relative grid size-11 shrink-0 place-items-center rounded-xl ${
            highlighted ? "bg-primary/15 text-primary" : "bg-primary/10 text-primary"
          }`}
        >
          <HugeiconsIcon icon={ShoppingBag01Icon} strokeWidth={2} className="size-5" />
          {highlighted ? (
            <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-primary ring-2 ring-card" />
          ) : null}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">Pedido #{shortId}</h3>
            {notice ? <InboxNoticeBadge notice={notice} /> : null}
            <StatusBadge order={order} label={currentStep?.label ?? orderStatusLabel(order)} />
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {mode === "customer" ? (
              order.businessName
            ) : (
              <>
                {order.customerName ?? "Cliente"} · {order.businessName}
              </>
            )}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {order.lines.length} ítem{order.lines.length === 1 ? "" : "s"} · {formatColones(order.total)} ·{" "}
            {formatRelativeTime(order.createdAt)}
            {order.updatedAt !== order.createdAt ? (
              <> · Actualizado {formatRelativeTime(order.updatedAt)}</>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={toggleDetail}>
            {open ? "Ocultar" : "Detalle"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full"
            render={<Link to={`/mensajes/${order.conversationId}`} onClick={() => notice && onAcknowledge?.(order)} />}
          >
            <HugeiconsIcon icon={Message01Icon} strokeWidth={2} data-icon="inline-start" />
            Chat
          </Button>
        </div>
      </div>

      {open ? (
        <div className="mt-4 border-t border-border pt-4">
          {showCustomerPickupCode ? (
            <div className="mb-4">
              <OrderPickupCodeDisplay code={order.pickupCode!} />
            </div>
          ) : null}
          {showCustomerPickupPending ? (
            <div className="mb-4">
              <OrderPickupCodePending />
            </div>
          ) : null}
          <OrderStepTimeline steps={steps} variant="compact" />
          <ul className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
            {order.lines.map((line) => (
              <li key={line.productId} className="flex justify-between gap-3 text-sm">
                <span>
                  {line.quantity}x {line.name}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {formatColones(line.price * line.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm font-semibold">Total: {formatColones(order.total)}</p>

          {canDecide ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" size="sm" className="rounded-full" disabled={pending} onClick={() => void decide("accept")}>
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
            <div className="mt-4 border-t border-border pt-4">
              <OrderPickupVerify
                orderId={order.id}
                disabled={pending}
                onVerified={(updated) => {
                  const merged = {
                    ...order,
                    ...updated,
                    businessSlug: order.businessSlug,
                    customerName: order.customerName,
                    pickupOtpEnabled: order.pickupOtpEnabled,
                  }
                  onUpdated(merged)
                  onAcknowledge?.(merged)
                }}
              />
            </div>
          ) : null}

          {canAdvance && nextStage ? (
            <div className="mt-4">
              <Button type="button" size="sm" className="rounded-full" disabled={pending} onClick={() => void advance()}>
                {nextStage === "ready" ? "Marcar listo para retiro" : "Marcar entregado"}
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                Etapa actual: {orderStageLabel(order.fulfillmentStage) ?? "—"}
              </p>
            </div>
          ) : null}

          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        </div>
      ) : null}
    </article>
  )
}

function InboxNoticeBadge({ notice }: { notice: "new" | "updated" }) {
  const label = notice === "new" ? "Nuevo" : "Actualizado"
  const tone =
    notice === "new"
      ? "bg-primary/15 text-primary"
      : "bg-amber-500/15 text-amber-900 dark:text-amber-200"
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tone}`}>{label}</span>
}

function StatusBadge({ order, label }: { order: OrderListItem; label: string }) {
  const tone =
    order.status === "accepted"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : order.status === "pending"
        ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
        : "bg-destructive/15 text-destructive"
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${tone}`}>{label}</span>
}
