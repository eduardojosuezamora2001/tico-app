import { useState, type FormEvent } from "react"
import { Link } from "react-router"
import type { Business, ChatOrder, Conversation, Message } from "@workspace/shared"
import {
  Attachment01Icon,
  Call02Icon,
  Location01Icon,
  Mic01Icon,
  SentIcon,
  ShoppingBag01Icon,
  WhatsappIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { MessagesOrderPanel, type MessagesOrderPanelProps } from "@/components/messages/messages-order-panel"
import { MessageComposer, MessageThread, PersonAvatar } from "@/components/message-thread"
import { orderNumberFromConversation, whatsappUrl } from "@/lib/messages-ui"
import {
  canClaim,
  canCompose,
  canTake,
  conversationTitle,
  senderName,
  statusLine,
} from "@/lib/chat-events"
import { OnlineDot } from "@/lib/presence"
import type { CartLine } from "@/stores/cart-store"
import { cartTotal } from "@/stores/cart-store"
import { Button } from "@workspace/ui/components/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@workspace/ui/components/empty"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"

export function MessagesChatPanel({
  conversationId,
  draftBusinessId,
  draftName,
  draftReady,
  active,
  messages,
  business,
  cartLines,
  threadReady,
  userId,
  profileName,
  profileAvatar,
  text,
  error,
  online,
  onTextChange,
  onSend,
  onClaim,
  onTake,
  ordersByMessageId,
  onOrderUpdated,
  onOrderRecordUpdated,
  orderPanel,
}: {
  conversationId: string
  draftBusinessId: string
  draftName: string | null
  draftReady: boolean
  active: Conversation | undefined
  messages: Message[]
  business: Business | null
  cartLines: CartLine[]
  threadReady: boolean
  userId: string | undefined
  profileName: string | null
  profileAvatar: string | null | undefined
  text: string
  error: string | null
  online: boolean
  onTextChange: (value: string) => void
  onSend: (event: FormEvent) => void
  onClaim: (id: string) => void
  onTake: (id: string) => void
  ordersByMessageId: Record<string, ChatOrder>
  onOrderUpdated: (messageId: string, text: string) => void
  onOrderRecordUpdated: (order: ChatOrder) => void
  orderPanel?: MessagesOrderPanelProps | null
}) {
  const [orderSheetOpen, setOrderSheetOpen] = useState(false)
  const open = Boolean(conversationId || draftBusinessId)
  const showOrderSheet = Boolean(
    orderPanel && (draftBusinessId || active?.viewerRole === "customer"),
  )
  const blocked = active?.viewerRole === "member"
  const title = draftBusinessId ? draftName : active ? conversationTitle(active) : null
  const wa = whatsappUrl(business?.whatsappNumber)
  const cartTotalAmount = cartTotal(cartLines)

  if (!open) {
    return (
      <section className="hidden min-w-0 flex-1 flex-col bg-background md:flex">
        <Empty className="min-h-0 flex-1 border-0">
          <EmptyHeader>
            <EmptyTitle>Elige una conversación</EmptyTitle>
            <EmptyDescription>
              Selecciona un chat para ver mensajes, coordinar pedidos y pagos con el comercio.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </section>
    )
  }

  return (
    <section className={`${open ? "flex" : "hidden md:flex"} min-h-0 min-w-0 flex-1 flex-col bg-background`}>
      {draftBusinessId ? (
        draftReady ? (
          <>
            <ChatHeader
              title={draftName ?? "Local"}
              subtitle="Nueva conversación"
              backHref="/mensajes"
              wa={wa}
              actions={
                showOrderSheet ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full xl:hidden"
                    onClick={() => setOrderSheetOpen(true)}
                  >
                    <HugeiconsIcon icon={ShoppingBag01Icon} strokeWidth={2} data-icon="inline-start" />
                    <span className="max-[380px]:sr-only">Pedido</span>
                  </Button>
                ) : null
              }
            />
            {showOrderSheet && orderPanel ? (
              <OrderSheet
                open={orderSheetOpen}
                onOpenChange={setOrderSheetOpen}
                title="Orden en curso"
                description={`Carrito y pedidos con ${draftName ?? "el local"}`}
                orderPanel={orderPanel}
              />
            ) : null}
            <MessageThread
              threadKey={draftBusinessId}
              messages={[]}
              userId={userId}
              peerName={draftName}
              selfName={profileName}
              selfAvatar={profileAvatar}
              variant="customer"
            />
            {error ? <p className="px-4 text-sm text-destructive">{error}</p> : null}
            <RichComposer
              value={text}
              onChange={onTextChange}
              onSubmit={onSend}
              placeholder={`Escribe un mensaje a ${draftName ?? "el local"}...`}
            />
          </>
        ) : (
          <ChatSkeleton backHref="/mensajes" />
        )
      ) : conversationId ? (
        <>
          <ChatHeader
            title={
              active?.viewerRole === "customer" && active ? (
                <Link className="hover:underline" to={`/n/${active.businessId}`}>
                  {conversationTitle(active)}
                </Link>
              ) : (
                (active ? conversationTitle(active) : "Conversación")
              )
            }
            subtitle={
              active ? (
                <span className="flex items-center gap-1.5">
                  <OnlineDot on={online && active.viewerRole !== "assignee"} />
                  {active.viewerRole === "customer" && active.assigneeName
                    ? `Atendido por ${active.assigneeName}${online ? " (En línea)" : ""}`
                    : statusLine(active)}
                  {active.viewerRole === "customer" ? (
                    <span className="hidden rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary sm:inline">
                      Verificado CR
                    </span>
                  ) : null}
                </span>
              ) : null
            }
            backHref="/mensajes"
            wa={wa}
            actions={
              <>
                {showOrderSheet ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full xl:hidden"
                    onClick={() => setOrderSheetOpen(true)}
                  >
                    <HugeiconsIcon icon={ShoppingBag01Icon} strokeWidth={2} data-icon="inline-start" />
                    <span className="max-[380px]:sr-only">Pedido</span>
                  </Button>
                ) : null}
                {active && canClaim(active) ? (
                  <Button type="button" size="sm" className="rounded-full" onClick={() => onClaim(active.id)}>
                    Atender
                  </Button>
                ) : null}
                {active && canTake(active) ? (
                  <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => onTake(active.id)}>
                    Tomar
                  </Button>
                ) : null}
              </>
            }
          />

          {showOrderSheet && orderPanel ? (
            <OrderSheet
              open={orderSheetOpen}
              onOpenChange={setOrderSheetOpen}
              title="Orden en curso"
              description={`Seguimiento de tu pedido con ${active ? conversationTitle(active) : "el comercio"}`}
              orderPanel={orderPanel}
            />
          ) : null}

          {active?.viewerRole === "customer" && cartLines.length > 0 ? (
            <div className="border-b border-primary/20 bg-primary/5 px-4 py-3 sm:px-5">
              <p className="text-sm font-medium text-primary">
                Pedido #{orderNumberFromConversation(active.id)} · {cartLines.length} ítem
                {cartLines.length === 1 ? "" : "s"} en carrito
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Total estimado ₡{cartTotalAmount.toLocaleString("es-CR")}. Confirma detalles y pago con el comercio.
              </p>
            </div>
          ) : null}

          {active?.viewerRole === "owner" && active.assigneeName ? (
            <p className="border-b border-border bg-muted/40 px-4 py-2 text-sm text-muted-foreground sm:px-5">
              Supervisión · lo atiende {active.assigneeName}
            </p>
          ) : null}

          {blocked ? (
            <Empty className="min-h-0 flex-1 border-0">
              <EmptyHeader>
                <EmptyTitle>Lo atiende {active?.assigneeName ?? "otra persona"}</EmptyTitle>
                <EmptyDescription>Cuando tomes el chat podrás leer y responder.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : threadReady ? (
            <>
              <MessageThread
                threadKey={conversationId}
                messages={messages}
                userId={userId}
                peerName={active ? conversationTitle(active) : null}
                selfName={profileName}
                selfAvatar={profileAvatar}
                variant={active?.viewerRole === "customer" ? "customer" : "default"}
                nameFor={active ? (message) => senderName(active, message.senderId) : undefined}
                viewerRole={active?.viewerRole}
                ordersByMessageId={ordersByMessageId}
                onOrderUpdated={onOrderUpdated}
                onOrderRecordUpdated={onOrderRecordUpdated}
              />
            </>
          ) : (
            <ChatSkeleton />
          )}

          {error ? <p className="px-4 text-sm text-destructive sm:px-5">{error}</p> : null}

          {active && canCompose(active) ? (
            <RichComposer
              value={text}
              onChange={onTextChange}
              onSubmit={onSend}
              placeholder={`Escribe un mensaje a ${conversationTitle(active)}...`}
            />
          ) : null}
        </>
      ) : null}
    </section>
  )
}

function OrderSheet({
  open,
  onOpenChange,
  title,
  description,
  orderPanel,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  orderPanel: MessagesOrderPanelProps
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex max-h-[min(88dvh,40rem)] flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border px-4 py-3 text-left">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <MessagesOrderPanel {...orderPanel} />
      </SheetContent>
    </Sheet>
  )
}

function ChatHeader({
  title,
  subtitle,
  backHref,
  wa,
  actions,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  backHref: string
  wa: string | null
  actions?: React.ReactNode
}) {
  return (
    <header className="flex items-center gap-2 border-b border-border bg-card/40 px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3">
      <Link
        className="shrink-0 rounded-full px-2 py-1 text-sm font-medium text-primary md:hidden"
        to={backHref}
      >
        ← Chats
      </Link>
      <PersonAvatar name={typeof title === "string" ? title : "Chat"} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold sm:text-base">{title}</p>
        {subtitle ? (
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 truncate text-xs text-muted-foreground sm:text-sm">
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className="flex max-w-[45%] shrink-0 flex-wrap items-center justify-end gap-1 sm:max-w-none sm:gap-2">
        {actions}
        {wa ? (
          <Button type="button" size="sm" variant="outline" className="hidden rounded-full border-emerald-500/40 text-emerald-700 sm:inline-flex dark:text-emerald-300" render={<a href={wa} target="_blank" rel="noreferrer" />}>
            <HugeiconsIcon icon={WhatsappIcon} strokeWidth={2} data-icon="inline-start" />
            WhatsApp
          </Button>
        ) : null}
        {wa ? (
          <Button type="button" size="icon-sm" variant="outline" className="rounded-full" render={<a href={wa} target="_blank" rel="noreferrer" aria-label="Llamar por WhatsApp" />}>
            <HugeiconsIcon icon={Call02Icon} strokeWidth={2} />
          </Button>
        ) : null}
      </div>
    </header>
  )
}

function ChatSkeleton({ backHref = "/mensajes" }: { backHref?: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-border px-4 py-3">
        <Link className="text-sm text-primary md:hidden" to={backHref}>
          ← Chats
        </Link>
      </header>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <Skeleton className="h-12 w-2/3 rounded-2xl" />
        <Skeleton className="ms-auto h-12 w-1/2 rounded-2xl" />
        <Skeleton className="h-12 w-3/5 rounded-2xl" />
      </div>
    </div>
  )
}

function RichComposer({
  value,
  onChange,
  onSubmit,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
  placeholder: string
}) {
  return (
    <form
      className="shrink-0 border-t border-border bg-card/30 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-3"
      onSubmit={onSubmit}
    >
      <div className="flex items-end gap-1.5 rounded-2xl border border-border bg-background p-1.5 sm:gap-2 sm:p-2">
        <div className="hidden shrink-0 gap-1 pb-1 sm:flex">
          <IconButton label="Adjuntar archivo" icon={Attachment01Icon} disabled />
          <IconButton label="Compartir ubicación" icon={Location01Icon} disabled />
          <IconButton label="Mensaje de voz" icon={Mic01Icon} disabled />
        </div>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={1}
          aria-label="Mensaje"
          className="max-h-32 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted-foreground"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              event.currentTarget.form?.requestSubmit()
            }
          }}
        />
        <Button
          type="submit"
          className="shrink-0 rounded-full px-3 sm:px-4"
          size="sm"
          disabled={!value.trim()}
          aria-label="Enviar mensaje"
        >
          <HugeiconsIcon icon={SentIcon} strokeWidth={2} data-icon="inline-start" />
          <span className="hidden sm:inline">Enviar</span>
        </Button>
      </div>
    </form>
  )
}

function IconButton({
  label,
  icon,
  disabled,
}: {
  label: string
  icon: typeof SentIcon
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
    >
      <HugeiconsIcon icon={icon} strokeWidth={2} className="size-4" />
    </button>
  )
}
