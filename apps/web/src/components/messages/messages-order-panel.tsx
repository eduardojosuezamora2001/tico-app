import { useEffect, useMemo, useState } from "react"
import type { Business, ChatOrder, Conversation } from "@workspace/shared"
import {
  CheckmarkCircle02Icon,
  Download01Icon,
  Location01Icon,
  ShoppingBag01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  cartBreakdown,
  formatColones,
  orderBreakdown,
  orderProgress,
  orderShortId,
  orderStatusLabel,
  orderStepsFromOrder,
  wazeUrl,
} from "@/lib/messages-ui"
import type { CartLine } from "@/stores/cart-store"
import { Button } from "@workspace/ui/components/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@workspace/ui/components/empty"
import { Skeleton } from "@workspace/ui/components/skeleton"

export type MessagesOrderPanelProps = {
  conversation: Conversation | null
  business: Business | null
  orders: ChatOrder[]
  cartLines: CartLine[]
  loading: boolean
}

export function MessagesOrderPanel({
  conversation,
  business,
  orders,
  cartLines,
  loading,
}: MessagesOrderPanelProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const mergedOrders = useMemo(() => orders, [orders])
  const acceptedOrders = useMemo(
    () => mergedOrders.filter((item) => item.status === "accepted"),
    [mergedOrders],
  )
  const pendingOrders = useMemo(
    () => mergedOrders.filter((item) => item.status === "pending"),
    [mergedOrders],
  )

  useEffect(() => {
    setSelectedOrderId(null)
  }, [conversation?.id])

  useEffect(() => {
    if (selectedOrderId && mergedOrders.some((item) => item.id === selectedOrderId)) return
    const latest = acceptedOrders.at(-1) ?? pendingOrders.at(-1)
    setSelectedOrderId(latest?.id ?? null)
  }, [mergedOrders, acceptedOrders, pendingOrders, selectedOrderId])

  if (!conversation) {
    if (business) {
      if (loading) {
        return (
          <div className="flex flex-col gap-3 p-4">
            <Skeleton className="h-8 w-2/3 rounded-lg" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        )
      }
      const hasCart = cartLines.length > 0
      return (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="border-b border-border px-4 py-4 sm:px-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Orden en curso</p>
            <h2 className="mt-2 text-lg font-semibold">Sin pedidos activos</h2>
          </div>
          {hasCart ? (
            <CartPreview lines={cartLines} />
          ) : (
            <section className="border-b border-border px-4 py-6 sm:px-5">
              <Empty className="border border-dashed border-border bg-background/40">
                <EmptyHeader>
                  <EmptyTitle className="text-base">Sin pedidos en curso</EmptyTitle>
                  <EmptyDescription>
                    Envía productos al chat desde la ficha del comercio. Cuando el local acepte tu pedido, aparecerá
                    aquí.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </section>
          )}
          <PickupSection business={business} />
        </div>
      )
    }
    return (
      <Empty className="m-4 border border-dashed border-border">
        <EmptyHeader>
          <EmptyTitle>Sin pedido seleccionado</EmptyTitle>
          <EmptyDescription>
            El detalle del pedido aparece cuando chateas con un comercio y envías productos al chat.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  if (conversation.viewerRole !== "customer") {
    return (
      <div className="flex flex-col gap-4 p-5">
        <p className="text-sm font-semibold">Vista de comercio</p>
        <p className="text-sm text-muted-foreground">
          El seguimiento de pedidos está disponible para clientes. Usa el chat para coordinar con{" "}
          {conversation.customerName ?? "el cliente"}.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-8 w-2/3 rounded-lg" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    )
  }

  const selected = mergedOrders.find((item) => item.id === selectedOrderId)
  const hasCart = cartLines.length > 0
  const showOrder = Boolean(selected)
  const steps = selected ? orderStepsFromOrder(selected) : []
  const progress = steps.length > 0 ? orderProgress(steps) : 0
  const breakdown = selected ? orderBreakdown(selected.lines) : null
  const currentStep = steps.find((step) => step.state === "current")

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="border-b border-border px-4 py-4 sm:px-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Orden en curso</p>
        {showOrder && selected ? (
          <div className="mt-2 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Pedido #{orderShortId(selected.id)}</h2>
            <OrderStatusBadge status={selected.status} label={currentStep?.label ?? orderStatusLabel(selected)} />
          </div>
        ) : (
          <h2 className="mt-2 text-lg font-semibold">Sin pedidos activos</h2>
        )}
      </div>

      {acceptedOrders.length > 0 ? (
        <section className="border-b border-border px-4 py-3 sm:px-5">
          <p className="text-xs font-medium text-muted-foreground">Tus pedidos aceptados</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {acceptedOrders.map((item) => {
              const active = item.id === selectedOrderId
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedOrderId(item.id)}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                      active
                        ? "border-primary/40 bg-primary/10 text-foreground"
                        : "border-border bg-background/50 text-muted-foreground hover:border-primary/20 hover:bg-muted/40"
                    }`}
                  >
                    <span className="font-medium">Pedido #{orderShortId(item.id)}</span>
                    <span className="shrink-0 tabular-nums text-xs">{formatColones(item.total)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      {showOrder && selected && breakdown ? (
        <>
          <section className="border-b border-border px-4 py-4 sm:px-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progreso de tu orden</span>
              <span className="font-medium text-foreground">{progress}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <ol className="mt-4 flex flex-col gap-3">
              {steps.map((step) => (
                <li key={step.id} className="flex gap-3">
                  <StepIcon state={step.state} />
                  <div className="min-w-0">
                    <p
                      className={`text-sm ${step.state === "current" ? "font-semibold text-primary" : "text-foreground"}`}
                    >
                      {step.label}
                    </p>
                    {step.detail ? <p className="text-xs text-muted-foreground">{step.detail}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="border-b border-border px-4 py-4 sm:px-5">
            <p className="text-sm font-semibold">Detalle del pedido</p>
            <ul className="mt-3 flex flex-col gap-3">
              {selected.lines.map((line) => (
                <li key={line.productId} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {line.quantity}x {line.name}
                    </p>
                  </div>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatColones(line.price * line.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 flex flex-col gap-1.5 border-t border-border pt-3 text-sm">
              <Row label="Subtotal" value={formatColones(breakdown.subtotal)} />
              <Row label="Servicio" value="Gratis (Retiro)" muted />
              <Row label="IVA (13%)" value={formatColones(breakdown.tax)} />
            </dl>
            <p className="mt-3 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
              Total: {formatColones(breakdown.total)}
            </p>
          </section>
        </>
      ) : hasCart ? (
        <CartPreview lines={cartLines} />
      ) : (
        <section className="border-b border-border px-4 py-6 sm:px-5">
          <Empty className="border border-dashed border-border bg-background/40">
            <EmptyHeader>
              <EmptyTitle className="text-base">Sin pedidos en curso</EmptyTitle>
              <EmptyDescription>
                Envía productos al chat desde la ficha del comercio. Cuando el local acepte tu pedido, aparecerá aquí.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </section>
      )}

      {business ? <PickupSection business={business} /> : null}

      <div className="mt-auto border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button type="button" variant="outline" className="w-full rounded-full" disabled={!showOrder}>
          <HugeiconsIcon icon={Download01Icon} strokeWidth={2} data-icon="inline-start" />
          Descargar tiquete (próximamente)
        </Button>
      </div>
    </div>
  )
}

function PickupSection({ business }: { business: Business }) {
  return (
    <section className="px-4 py-4 sm:px-5">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <HugeiconsIcon icon={Location01Icon} strokeWidth={2} className="size-4 text-primary" />
        Datos para retiro
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {business.address ?? "Consulta la dirección con el comercio."}
      </p>
      {wazeUrl(business.address) ? (
        <a
          href={wazeUrl(business.address)!}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex text-sm font-medium text-primary hover:underline"
        >
          Abrir en Waze
        </a>
      ) : null}
    </section>
  )
}

function CartPreview({ lines }: { lines: CartLine[] }) {
  const { subtotal, tax, total } = cartBreakdown(lines)
  return (
    <>
      <section className="border-b border-border px-4 py-4 sm:px-5">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Carrito local (sin enviar)</p>
      </section>
      <section className="border-b border-border px-4 py-4 sm:px-5">
        <ul className="flex flex-col gap-3">
          {lines.map((line) => (
            <li key={line.productId} className="flex items-start justify-between gap-3 text-sm">
              <span>
                {line.quantity}x {line.name}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatColones(line.price * line.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm font-semibold">Total estimado: {formatColones(total)}</p>
        <dl className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
          <Row label="Subtotal" value={formatColones(subtotal)} />
          <Row label="IVA (13%)" value={formatColones(tax)} />
        </dl>
      </section>
    </>
  )
}

function OrderStatusBadge({
  status,
  label,
}: {
  status: ChatOrder["status"]
  label: string
}) {
  const tone =
    status === "accepted"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : status === "pending"
        ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
        : "bg-destructive/15 text-destructive"
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${tone}`}>{label}</span>
}

function StepIcon({ state }: { state: "done" | "current" | "pending" }) {
  if (state === "done") {
    return (
      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
        <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-3.5" />
      </span>
    )
  }
  if (state === "current") {
    return (
      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
        <HugeiconsIcon icon={ShoppingBag01Icon} strokeWidth={2} className="size-3.5" />
      </span>
    )
  }
  return <span className="mt-0.5 size-5 shrink-0 rounded-full border-2 border-muted" />
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${muted ? "text-muted-foreground" : ""}`}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}
