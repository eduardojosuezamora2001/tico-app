import { useEffect, useMemo, useState } from "react"

import { OrderListItemCard } from "@/components/orders/order-list-item"
import { OrderTabBadge } from "@/components/orders/order-tab-badge"
import { SiteHeader } from "@/components/site-header"
import { countCustomerUpdates, countStaffUpdates, sortOrdersInbox } from "@/lib/orders-inbox"
import { useOrdersInboxStore } from "@/stores/orders-inbox-store"
import { useAuthStore } from "@/stores/auth-store"
import { Button } from "@workspace/ui/components/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@workspace/ui/components/empty"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"

type OrdersTab = "mine" | "staff"
type StaffFilter = "all" | "pending" | "active" | "done"

export function OrdersPage() {
  const userId = useAuthStore((s) => s.session?.user.id)
  const orders = useOrdersInboxStore((s) => s.orders)
  const memberships = useOrdersInboxStore((s) => s.memberships)
  const loading = useOrdersInboxStore((s) => s.loading)
  const patchOrder = useOrdersInboxStore((s) => s.patchOrder)
  const setActiveTab = useOrdersInboxStore((s) => s.setActiveTab)
  const customerSeen = useOrdersInboxStore((s) => s.customerSeen)
  const staffSeen = useOrdersInboxStore((s) => s.staffSeen)
  const markMineSeen = useOrdersInboxStore((s) => s.markMineSeen)
  const markStaffSeen = useOrdersInboxStore((s) => s.markStaffSeen)
  const markOrderSeen = useOrdersInboxStore((s) => s.markOrderSeen)
  const customerOrderNotice = useOrdersInboxStore((s) => s.customerOrderNotice)
  const staffOrderNotice = useOrdersInboxStore((s) => s.staffOrderNotice)
  const mineUpdateCount = useOrdersInboxStore((s) => s.mineUpdateCount(userId))
  const staffUpdateCount = useOrdersInboxStore((s) => s.staffUpdateCount())

  const [error] = useState<string | null>(null)
  const [tab, setTab] = useState<OrdersTab>("mine")
  const [businessId, setBusinessId] = useState<string>("all")
  const [staffFilter, setStaffFilter] = useState<StaffFilter>("all")

  const staffBusinessIds = useMemo(
    () =>
      new Set(
        memberships.filter((item) => item.isActive && item.business?.id).map((item) => item.business!.id),
      ),
    [memberships],
  )

  const canManage = staffBusinessIds.size > 0

  useEffect(() => {
    setActiveTab(tab)
  }, [tab, setActiveTab])

  const myOrdersRaw = useMemo(
    () => orders.filter((item) => item.customerId === userId),
    [orders, userId],
  )

  const myOrders = useMemo(
    () => sortOrdersInbox(myOrdersRaw, customerSeen),
    [myOrdersRaw, customerSeen],
  )

  const myUnreadCount = useMemo(
    () => countCustomerUpdates(myOrdersRaw, customerSeen),
    [myOrdersRaw, customerSeen],
  )

  const staffOrders = useMemo(() => {
    let rows = orders.filter((item) => staffBusinessIds.has(item.businessId))
    if (businessId !== "all") rows = rows.filter((item) => item.businessId === businessId)
    if (staffFilter === "pending") rows = rows.filter((item) => item.status === "pending")
    if (staffFilter === "active") {
      rows = rows.filter(
        (item) => item.status === "accepted" && item.fulfillmentStage !== "delivered",
      )
    }
    if (staffFilter === "done") {
      rows = rows.filter(
        (item) => item.status === "denied" || item.fulfillmentStage === "delivered",
      )
    }
    return sortOrdersInbox(rows, staffSeen)
  }, [orders, staffBusinessIds, businessId, staffFilter, staffSeen])

  const staffUnreadCount = useMemo(
    () => countStaffUpdates(staffOrders, staffBusinessIds, staffSeen),
    [staffOrders, staffBusinessIds, staffSeen],
  )

  const staffBusinesses = useMemo(
    () => memberships.filter((item) => item.isActive && item.business).map((item) => item.business!),
    [memberships],
  )

  return (
    <div className="min-h-svh bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-5">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Pedidos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Revisa el estado de tus compras o gestiona los pedidos de tu local.
          </p>
        </header>

        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as OrdersTab)}
          className="flex flex-col gap-4"
        >
          <TabsList className="w-full justify-start">
            <TabsTrigger value="mine" className="gap-2">
              Mis pedidos
              <OrderTabBadge count={mineUpdateCount} active={tab === "mine"} />
            </TabsTrigger>
            {canManage ? (
              <TabsTrigger value="staff" className="gap-2">
                Gestión del local
                <OrderTabBadge count={staffUpdateCount} active={tab === "staff"} highlight />
              </TabsTrigger>
            ) : null}
          </TabsList>

          <TabsContent value="mine" className="flex flex-col gap-3">
            {myUnreadCount > 0 ? (
              <InboxHint
                count={myUnreadCount}
                onMarkAll={() => userId && markMineSeen(userId, myOrdersRaw)}
              />
            ) : null}
            {loading ? (
              <OrdersSkeleton />
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : myOrders.length === 0 ? (
              <Empty className="border border-dashed border-border">
                <EmptyHeader>
                  <EmptyTitle>Sin pedidos todavía</EmptyTitle>
                  <EmptyDescription>
                    Cuando envíes un pedido al chat de un comercio, aparecerá aquí con su progreso.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              myOrders.map((order) => (
                <OrderListItemCard
                  key={order.id}
                  order={order}
                  mode="customer"
                  notice={customerOrderNotice(order)}
                  onUpdated={patchOrder}
                  onAcknowledge={(row) => userId && markOrderSeen(userId, row ?? order, "customer")}
                />
              ))
            )}
          </TabsContent>

          {canManage ? (
            <TabsContent value="staff" className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-muted-foreground">Local</span>
                  <select
                    className="h-10 rounded-xl border border-border bg-background px-3"
                    value={businessId}
                    onChange={(event) => setBusinessId(event.target.value)}
                  >
                    <option value="all">Todos mis locales</option>
                    {staffBusinesses.map((business) => (
                      <option key={business.id} value={business.id}>
                        {business.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["all", "Todos"],
                      ["pending", "Pendientes"],
                      ["active", "En curso"],
                      ["done", "Cerrados"],
                    ] as const
                  ).map(([value, label]) => (
                    <Button
                      key={value}
                      type="button"
                      size="sm"
                      variant={staffFilter === value ? "default" : "outline"}
                      className="rounded-full"
                      onClick={() => setStaffFilter(value)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {staffUnreadCount > 0 ? (
                <InboxHint
                  count={staffUnreadCount}
                  onMarkAll={() => userId && markStaffSeen(userId, staffOrders)}
                />
              ) : null}

              {loading ? (
                <OrdersSkeleton />
              ) : error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : staffOrders.length === 0 ? (
                <Empty className="border border-dashed border-border">
                  <EmptyHeader>
                    <EmptyTitle>No hay pedidos en este filtro</EmptyTitle>
                    <EmptyDescription>
                      Los clientes aparecen aquí cuando envían un pedido al chat de tu local.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                staffOrders.map((order) => (
                  <OrderListItemCard
                    key={order.id}
                    order={order}
                    mode="staff"
                    notice={staffOrderNotice(order)}
                    onUpdated={patchOrder}
                    onAcknowledge={(row) => userId && markOrderSeen(userId, row ?? order, "staff")}
                  />
                ))
              )}
            </TabsContent>
          ) : null}
        </Tabs>
      </main>
    </div>
  )
}

function OrdersSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-28 w-full rounded-2xl" />
    </div>
  )
}

function InboxHint({ count, onMarkAll }: { count: number; onMarkAll: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 text-sm">
      <span className="text-foreground">
        {count === 1 ? "1 pedido con novedades" : `${count} pedidos con novedades`}
      </span>
      <button type="button" className="font-medium text-primary hover:underline" onClick={onMarkAll}>
        Marcar todo como visto
      </button>
    </div>
  )
}
