import { Link } from "react-router"
import { messagePreviewText, type Conversation } from "@workspace/shared"
import { HelpCircleIcon, Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { AssistantHubEntry } from "@/components/assistant-hub-entry"
import { PersonAvatar } from "@/components/message-thread"
import {
  activeConversationCount,
  conversationPreviewStatus,
  formatColones,
  formatRelativeTime,
  splitConversations,
  type ConversationTab,
} from "@/lib/messages-ui"
import { canClaim, canOpen, canTake, conversationTitle } from "@/lib/chat-events"
import { OnlineDot } from "@/lib/presence"
import type { CartLine } from "@/stores/cart-store"
import { cartTotal } from "@/stores/cart-store"
import { Button } from "@workspace/ui/components/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@workspace/ui/components/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@workspace/ui/components/input-group"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Skeleton } from "@workspace/ui/components/skeleton"

export function MessagesConversationSidebar({
  items,
  selectedId,
  loading,
  query,
  tab,
  online,
  cartByBusiness,
  onQueryChange,
  onTabChange,
  onClaim,
  onTake,
}: {
  items: Conversation[]
  selectedId: string
  loading: boolean
  query: string
  tab: ConversationTab
  online: ReadonlySet<string>
  cartByBusiness: Record<string, CartLine[]>
  onQueryChange: (value: string) => void
  onTabChange: (tab: ConversationTab) => void
  onClaim: (id: string) => void
  onTake: (id: string) => void
}) {
  const needle = query.trim().toLowerCase()
  const filtered = items.filter((item) => {
    if (!needle) return true
    return `${item.customerName ?? ""} ${item.assigneeName ?? ""} ${item.businessName} ${item.lastText}`
      .toLowerCase()
      .includes(needle)
  })
  const visible = splitConversations(filtered, tab)
  const activeCount = activeConversationCount(items)

  return (
    <aside className="flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden border-border bg-card/50 md:w-80 lg:w-[22rem] md:border-r xl:w-[24rem]">
      <div className="flex flex-col gap-4 border-b border-border px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold tracking-tight">Mis conversaciones</h1>
          <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
            {activeCount} activas
          </span>
        </div>

        <div className="flex rounded-full border border-border bg-background p-1">
          <TabButton active={tab === "active"} onClick={() => onTabChange("active")}>
            Activos
          </TabButton>
          <TabButton active={tab === "history"} onClick={() => onTabChange("history")}>
            Historial
          </TabButton>
        </div>

        <InputGroup className="h-10 rounded-full bg-background">
          <InputGroupAddon>
            <HugeiconsIcon icon={Search01Icon} strokeWidth={2} className="text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Buscar sodas, pedidos, #..."
            aria-label="Buscar conversaciones"
          />
        </InputGroup>

        <AssistantHubEntry />
      </div>

      <ScrollArea className="min-h-0 flex-1" viewportClassName="h-full">
        {loading ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <Empty className="border-0 py-10">
            <EmptyHeader>
              <EmptyTitle>{tab === "active" ? "Sin conversaciones activas" : "Sin historial"}</EmptyTitle>
              <EmptyDescription>
                {tab === "active"
                  ? "Cuando escribas a un comercio aparecerá aquí."
                  : "Las conversaciones finalizadas se mostrarán en esta pestaña."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="flex flex-col gap-2 p-3 pb-4">
            {visible.map((item) => (
              <ConversationCard
                key={item.id}
                item={item}
                selected={item.id === selectedId}
                online={online.has(item.assigneeId ?? "")}
                cartLines={cartByBusiness[item.businessId] ?? []}
                onClaim={onClaim}
                onTake={onTake}
              />
            ))}
          </ul>
        )}
      </ScrollArea>

      <div className="border-t border-border p-4">
        <div className="rounded-2xl border border-dashed border-border bg-background/60 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <HugeiconsIcon icon={HelpCircleIcon} strokeWidth={2} className="size-4 text-primary" />
            ¿Dudas con comercios?
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Escríbenos por chat o visita el centro de ayuda desde tu cuenta.
          </p>
        </div>
      </div>
    </aside>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "flex-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          : "flex-1 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      }
    >
      {children}
    </button>
  )
}

function ConversationCard({
  item,
  selected,
  online,
  cartLines,
  onClaim,
  onTake,
}: {
  item: Conversation
  selected: boolean
  online: boolean
  cartLines: CartLine[]
  onClaim: (id: string) => void
  onTake: (id: string) => void
}) {
  const unread = item.unreadCount > 0
  const status = conversationPreviewStatus(item, cartLines)
  const total = cartTotal(cartLines)
  const title = conversationTitle(item)

  const card = (
    <div
      className={
        selected
          ? "rounded-2xl border border-primary/40 bg-primary/10 p-3 shadow-[0_8px_24px_-20px_var(--color-primary)]"
          : "rounded-2xl border border-border bg-card p-3 transition-colors hover:border-primary/25 hover:bg-muted/30"
      }
    >
      <div className="flex items-start gap-3">
        <PersonAvatar name={title} size="default" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={`truncate text-sm ${unread ? "font-semibold" : "font-medium"}`}>{title}</p>
            <span className="shrink-0 text-[11px] text-muted-foreground">{formatRelativeTime(item.lastAt)}</span>
          </div>
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
          <p className={`mt-2 line-clamp-2 text-xs ${unread ? "text-foreground" : "text-muted-foreground"}`}>
            {messagePreviewText(item.lastText)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {total > 0 ? (
              <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums">
                {formatColones(total)}
              </span>
            ) : null}
            {item.viewerRole === "customer" && total > 0 ? (
              <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                Pedido en chat
              </span>
            ) : null}
            {unread ? (
              <span className="ms-auto grid size-5 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {item.unreadCount > 9 ? "9+" : item.unreadCount}
              </span>
            ) : (
              <span className="ms-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <OnlineDot on={online && item.viewerRole !== "customer" && item.viewerRole !== "assignee"} />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <li className="flex flex-col gap-2">
      {canOpen(item) ? (
        <Link to={`/mensajes/${item.id}`} aria-current={selected ? "page" : undefined}>
          {card}
        </Link>
      ) : (
        card
      )}
      <div className="flex gap-2 px-1">
        {canClaim(item) ? (
          <Button type="button" size="sm" className="h-8 flex-1 rounded-full" onClick={() => onClaim(item.id)}>
            Atender
          </Button>
        ) : null}
        {canTake(item) ? (
          <Button type="button" size="sm" variant="outline" className="h-8 flex-1 rounded-full" onClick={() => onTake(item.id)}>
            Tomar
          </Button>
        ) : null}
      </div>
    </li>
  )
}

function StatusPill({
  tone,
  children,
}: {
  tone: "success" | "primary" | "muted"
  children: React.ReactNode
}) {
  const styles =
    tone === "success"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : tone === "primary"
        ? "bg-primary/15 text-primary"
        : "bg-muted text-muted-foreground"
  return <span className={`mt-1 inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium ${styles}`}>{children}</span>
}
