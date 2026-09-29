import { useEffect, useMemo, useState } from "react"

import { OrderListItemCard } from "@/components/orders/order-list-item"
import { OrderTabBadge } from "@/components/orders/order-tab-badge"
import { SiteHeader } from "@/components/site-header"
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
  const markMineSeen = useOrdersInboxStore((s) => s.markMineSeen)
  const mineUpdateCount = useOrdersInboxStore((s) => s.mineUpdateCount(userId))
  const staffOpenCount = useOrdersInboxStore((s) => s.staffOpenCount())

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

  const myOrders = useMemo(
    () => orders.filter((item) => item.customerId === userId).sort(sortByNewest),
    [orders, userId],
  )

  useEffect(() => {
    if (tab !== "mine" || !userId) return
    markMineSeen(userId, myOrders)
  }, [tab, userId, myOrders, markMineSeen])

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
    return rows.sort(sortByNewest)
  }, [orders, staffBusinessIds, businessId, staffFilter])

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
                <OrderTabBadge count={staffOpenCount} active={tab === "staff"} highlight />
              </TabsTrigger>
            ) : null}
          </TabsList>

          <TabsContent value="mine" className="flex flex-col gap-3">
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
                <OrderListItemCard key={order.id} order={order} mode="customer" onUpdated={patchOrder} />
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
                  <OrderListItemCard key={order.id} order={order} mode="staff" onUpdated={patchOrder} />
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

function sortByNewest(a: { createdAt: string }, b: { createdAt: string }) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
}
