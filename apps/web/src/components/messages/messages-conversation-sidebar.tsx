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
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@workspace/ui/components/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@workspace/ui/components/input-group"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Separator } from "@workspace/ui/components/separator"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { cn } from "cn"

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
    <aside className="flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden border-border bg-background md:w-80 md:border-r md:bg-card/50 lg:w-[22rem] xl:w-[24rem]">
      <div className="flex flex-col gap-3 border-b border-border px-3 pt-3 pb-3 sm:gap-4 sm:px-4 sm:pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">Mensajes</h1>
            <p className="text-xs text-muted-foreground md:hidden">
              {activeCount === 1 ? "1 conversación activa" : `${activeCount} conversaciones activas`}
            </p>
          </div>
          <Badge variant="secondary" className="hidden shrink-0 md:inline-flex">
            {activeCount} activas
          </Badge>
        </div>

        <Tabs
          value={tab}
          onValueChange={(value) => onTabChange(value as ConversationTab)}
          className="w-full gap-0"
        >
          <TabsList className="grid h-10 w-full grid-cols-2 rounded-full">
            <TabsTrigger value="active" className="rounded-full">
              Activos
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-full">
              Historial
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <InputGroup className="h-10 rounded-full bg-background">
          <InputGroupAddon>
            <HugeiconsIcon icon={Search01Icon} strokeWidth={2} className="text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Buscar chats…"
            aria-label="Buscar conversaciones"
          />
        </InputGroup>

        <div className="md:hidden">
          <AssistantHubEntry compact />
        </div>
        <div className="hidden md:block">
          <AssistantHubEntry />
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1" viewportClassName="h-full">
        {loading ? (
          <div className="flex flex-col gap-2 p-3 sm:gap-3 sm:p-4">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-xl sm:h-24 sm:rounded-2xl" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <Empty className="border-0 py-12">
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
          <ul className="flex flex-col md:gap-2 md:p-3 md:pb-4">
            {visible.map((item, index) => (
              <ConversationCard
                key={item.id}
                item={item}
                selected={item.id === selectedId}
                online={online.has(item.assigneeId ?? "")}
                cartLines={cartByBusiness[item.businessId] ?? []}
                onClaim={onClaim}
                onTake={onTake}
                showDivider={index < visible.length - 1}
              />
            ))}
          </ul>
        )}
      </ScrollArea>

      <div className="hidden border-t border-border p-4 md:block">
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

function ConversationCard({
  item,
  selected,
  online,
  cartLines,
  onClaim,
  onTake,
  showDivider,
}: {
  item: Conversation
  selected: boolean
  online: boolean
  cartLines: CartLine[]
  onClaim: (id: string) => void
  onTake: (id: string) => void
  showDivider: boolean
}) {
  const unread = item.unreadCount > 0
  const status = conversationPreviewStatus(item, cartLines)
  const total = cartTotal(cartLines)
  const title = conversationTitle(item)
  const claimable = canClaim(item)
  const takeable = canTake(item)

  const body = (
    <div
      className={cn(
        "flex items-start gap-3 px-3 py-3 transition-colors md:rounded-2xl md:border md:p-3",
        selected
          ? "bg-primary/10 md:border-primary/40 md:shadow-[0_8px_24px_-20px_var(--color-primary)]"
          : "active:bg-muted/70 md:border-border md:bg-card md:hover:border-primary/25 md:hover:bg-muted/30",
      )}
    >
      <PersonAvatar name={title} size="default" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className={cn("truncate text-sm", unread ? "font-semibold" : "font-medium")}>{title}</p>
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {formatRelativeTime(item.lastAt)}
          </span>
        </div>

        <div className="mt-0.5 flex items-center gap-1.5">
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          {item.viewerRole === "customer" && total > 0 ? (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-medium">
              {formatColones(total)}
            </Badge>
          ) : null}
        </div>

        <div className="mt-1.5 flex items-end gap-2">
          <p
            className={cn(
              "min-w-0 flex-1 truncate text-xs leading-snug",
              unread ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            {messagePreviewText(item.lastText)}
          </p>
          {unread ? (
            <Badge className="h-5 min-w-5 justify-center rounded-full px-1.5 text-[10px]">
              {item.unreadCount > 9 ? "9+" : item.unreadCount}
            </Badge>
          ) : (
            <span className="mb-0.5 inline-flex shrink-0 items-center">
              <OnlineDot on={online && item.viewerRole !== "customer" && item.viewerRole !== "assignee"} />
            </span>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <li className="flex flex-col">
      {canOpen(item) ? (
        <Link to={`/mensajes/${item.id}`} aria-current={selected ? "page" : undefined}>
          {body}
        </Link>
      ) : (
        body
      )}

      {claimable || takeable ? (
        <div className="flex gap-2 px-3 pb-3 md:px-1 md:pb-0">
          {claimable ? (
            <Button type="button" size="sm" className="h-8 flex-1 rounded-full" onClick={() => onClaim(item.id)}>
              Atender
            </Button>
          ) : null}
          {takeable ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 flex-1 rounded-full"
              onClick={() => onTake(item.id)}
            >
              Tomar
            </Button>
          ) : null}
        </div>
      ) : null}

      {showDivider ? <Separator className="md:hidden" /> : null}
    </li>
  )
}

function StatusBadge({
  tone,
  children,
}: {
  tone: "success" | "primary" | "muted"
  children: React.ReactNode
}) {
  return (
    <Badge
      variant={tone === "muted" ? "secondary" : "outline"}
      className={cn(
        "h-5 px-1.5 text-[10px] font-medium",
        tone === "success" &&
          "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        tone === "primary" && "border-transparent bg-primary/15 text-primary",
      )}
    >
      {children}
    </Badge>
  )
}
