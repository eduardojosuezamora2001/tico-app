import { useEffect, useRef, useState, type FormEvent } from "react"
import { Link, useLocation } from "react-router"
import type { Conversation, Message } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@workspace/ui/components/empty"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"

import { MessageComposer, MessageThread, PersonAvatar } from "@/components/message-thread"
import { api } from "@/lib/api"
import {
  canClaim,
  canCompose,
  canOpen,
  canTake,
  conversationTitle,
  errorMessage,
  foldConversation,
  foldMessage,
  senderName,
  statusLine,
  type IncomingMessage,
} from "@/lib/chat-events"
import { OnlineDot, useOnlineUsers } from "@/lib/presence"
import { chatSocket } from "@/lib/socket"
import { useAuthStore } from "@/stores/auth-store"

export function FloatChat() {
  const { pathname } = useLocation()
  const status = useAuthStore((s) => s.status)
  const userId = useAuthStore((s) => s.session?.user.id)
  const profile = useAuthStore((s) => s.profile)
  const accessToken = useAuthStore((s) => s.session?.access_token)
  const online = useOnlineUsers()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Conversation[]>([])
  const [active, setActive] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [threadReady, setThreadReady] = useState(false)
  const [text, setText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ id: string; title: string; body: string } | null>(null)
  const openRef = useRef(open)
  const activeRef = useRef(active)
  openRef.current = open
  activeRef.current = active

  function loadConversations() {
    return api
      .get<{ data: Conversation[] }>("/messages/conversations")
      .then((response) => setItems(response.data.data))
      .catch(() => setError("No se pudieron cargar las conversaciones."))
  }

  useEffect(() => {
    if (status !== "authenticated") {
      setItems([])
      return
    }
    void loadConversations()
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission().catch(() => undefined)
    }
  }, [status])

  useEffect(() => {
    if (!open || status !== "authenticated") return
    setError(null)
    void loadConversations()
  }, [open, status])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 5000)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    if (status !== "authenticated" || !userId) return
    let live = true
    let detach = () => {}
    void chatSocket().then((socket) => {
      if (!socket || !live) return
      const onMessage = (event: IncomingMessage) => {
        const viewing =
          openRef.current &&
          activeRef.current?.id === event.conversation.id &&
          event.conversation.viewerRole !== "member"
        setItems((current) => foldMessage(current, event, userId, viewing ? event.conversation.id : null))
        setActive((current) =>
          current?.id === event.conversation.id ? { ...event.conversation, unreadCount: viewing ? 0 : current.unreadCount } : current,
        )
        if (viewing) {
          setMessages((current) =>
            current.some((item) => item.id === event.message.id) ? current : [...current, event.message],
          )
          const counts = event.conversation.viewerRole === "customer" || event.conversation.viewerRole === "assignee"
          if (counts && event.message.senderId !== userId) void api.get(`/messages/conversations/${event.conversation.id}`)
          return
        }
        if (event.message.senderId === userId) return
        const title =
          event.conversation.viewerRole === "customer"
            ? event.conversation.businessName
            : `${event.conversation.customerName ?? "Cliente"} · ${event.conversation.businessName}`
        setNotice({ id: event.message.id, title, body: event.message.text })
        if (document.hidden && typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification(title, { body: event.message.text })
        }
      }
      const onConversation = (conversation: Conversation) => {
        setItems((current) => foldConversation(current, conversation))
        if (activeRef.current?.id === conversation.id && conversation.viewerRole === "member") setMessages([])
        setActive((current) =>
          current?.id === conversation.id ? { ...conversation, unreadCount: current.unreadCount } : current,
        )
      }
      socket.on("message:new", onMessage)
      socket.on("conversation:updated", onConversation)
      detach = () => {
        socket.off("message:new", onMessage)
        socket.off("conversation:updated", onConversation)
      }
    })
    return () => {
      live = false
      detach()
    }
  }, [status, userId, accessToken])

  useEffect(() => {
    if (!active || active.viewerRole === "member") {
      setMessages([])
      setThreadReady(Boolean(active))
      return
    }
    let cancelled = false
    setThreadReady(false)
    void api
      .get<{ data: { conversation: Conversation; messages: Message[] } }>(`/messages/conversations/${active.id}`)
      .then((response) => {
        if (cancelled) return
        setMessages(response.data.data.messages)
        setItems((current) =>
          foldConversation(current, response.data.data.conversation).map((item) =>
            item.id === active.id ? { ...item, unreadCount: 0 } : item,
          ),
        )
        setActive((current) => (current?.id === active.id ? { ...response.data.data.conversation, unreadCount: 0 } : current))
        setNotice(null)
      })
      .catch((caught) => {
        if (!cancelled) setError(errorMessage(caught, "No se pudo abrir la conversación."))
      })
      .finally(() => {
        if (!cancelled) setThreadReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [active?.id, active?.viewerRole])

  async function claim(id: string) {
    setError(null)
    try {
      const response = await api.post<{ data: Conversation }>(`/messages/conversations/${id}/claim`)
      setItems((current) => foldConversation(current, response.data.data))
      setActive(response.data.data)
    } catch (caught) {
      setError(errorMessage(caught, "No se pudo atender."))
    }
  }

  async function take(id: string) {
    setError(null)
    try {
      const response = await api.post<{ data: Conversation }>(`/messages/conversations/${id}/take`)
      setItems((current) => foldConversation(current, response.data.data))
      setActive(response.data.data)
    } catch (caught) {
      setError(errorMessage(caught, "No se pudo tomar el chat."))
    }
  }

  async function send(event: FormEvent) {
    event.preventDefault()
    if (!active || !canCompose(active)) return
    const body = text.trim()
    if (!body) return
    setText("")
    try {
      const path = active.viewerRole === "customer" ? "/messages" : `/messages/conversations/${active.id}/reply`
      const payload = active.viewerRole === "customer" ? { businessId: active.businessId, text: body } : { text: body }
      const response = await api.post<{ data: { message: Message; conversation: Conversation } }>(path, payload)
      const message = response.data.data.message
      setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]))
      setItems((current) => foldConversation(current, response.data.data.conversation))
    } catch (caught) {
      setError(errorMessage(caught, "No se pudo enviar."))
      setText(body)
    }
  }

  if (status === "loading" || pathname.startsWith("/mensajes")) return null

  if (status !== "authenticated") {
    return (
      <Button className="fixed right-4 bottom-4 z-40 rounded-full shadow-lg" render={<Link to="/login" />}>
        Chat
      </Button>
    )
  }

  const unread = items.reduce((sum, item) => sum + item.unreadCount, 0)
  const staffView = items.some((item) => item.viewerRole !== "customer")
  const queue = items.filter((item) => item.status === "waiting" && item.viewerRole !== "customer")
  const ongoing = items.filter((item) => !queue.includes(item))

  return (
    <>
      {notice ? (
        <p role="status" className="fixed right-4 bottom-20 z-40 max-w-xs rounded-2xl border border-border bg-card px-4 py-3 text-sm shadow-lg">
          <span className="block font-medium">{notice.title}</span>
          <span className="mt-1 block text-muted-foreground">{notice.body}</span>
        </p>
      ) : null}
      <Sheet
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setActive(null)
        }}
      >
        <SheetTrigger
          render={
            <Button
              aria-label={unread > 0 ? `Chat, ${unread} sin revisar` : "Chat"}
              className={`fixed right-4 bottom-4 z-40 rounded-full shadow-lg ${unread > 0 ? "animate-[chat-buzz_1.5s_ease-in-out_infinite] motion-reduce:animate-none" : ""}`}
            />
          }
        >
          Chat
          {unread > 0 ? (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{active ? conversationTitle(active) : "Mensajes"}</SheetTitle>
            <SheetDescription>
              {active ? statusLine(active) : staffView ? "Por atender y en curso." : "Conversaciones con los locales."}
            </SheetDescription>
          </SheetHeader>
          {error ? <p className="px-4 text-sm text-destructive">{error}</p> : null}
          {active ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center gap-2 px-4">
                <Button type="button" variant="ghost" onClick={() => setActive(null)}>
                  Chats
                </Button>
                {canClaim(active) ? (
                  <Button type="button" size="sm" onClick={() => void claim(active.id)}>
                    Atender
                  </Button>
                ) : null}
                {canTake(active) ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => void take(active.id)}>
                    Tomar
                  </Button>
                ) : null}
              </div>
              {active.viewerRole === "owner" && active.assigneeName ? (
                <p className="mx-4 rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                  Supervisión · lo atiende {active.assigneeName}
                </p>
              ) : null}
              {active.viewerRole === "member" ? (
                <Empty className="min-h-0 flex-1 border-0">
                  <EmptyHeader>
                    <EmptyTitle>Lo atiende {active.assigneeName ?? "otra persona"}</EmptyTitle>
                    <EmptyDescription>Cuando lo tomes podrás leer y responder.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : threadReady ? (
                <MessageThread
                  threadKey={active.id}
                  messages={messages}
                  userId={userId}
                  peerName={conversationTitle(active)}
                  selfName={profile?.fullName ?? null}
                  selfAvatar={profile?.avatarUrl}
                  nameFor={(message) => senderName(active, message.senderId)}
                />
              ) : (
                <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
                  <Skeleton className="h-12 w-2/3 rounded-xl" />
                  <Skeleton className="ms-auto h-12 w-1/2 rounded-xl" />
                </div>
              )}
              {canCompose(active) ? (
                <MessageComposer value={text} onChange={setText} onSubmit={(event) => void send(event)} />
              ) : null}
            </div>
          ) : (
            <ScrollArea className="min-h-0 flex-1" viewportClassName="h-full">
              <div className="flex flex-col gap-4 px-4 pb-4">
                <FloatSection
                  title={staffView ? "Por atender" : undefined}
                  items={staffView ? queue : items}
                  online={online}
                  onOpen={setActive}
                  onClaim={(id) => void claim(id)}
                  onTake={(id) => void take(id)}
                />
                {staffView ? (
                  <FloatSection
                    title="En curso"
                    items={ongoing}
                    online={online}
                    onOpen={setActive}
                    onClaim={(id) => void claim(id)}
                    onTake={(id) => void take(id)}
                  />
                ) : null}
                {items.length === 0 && !error ? (
                  <Empty className="border-0 px-0">
                    <EmptyHeader>
                      <EmptyTitle>Sin conversaciones</EmptyTitle>
                      <EmptyDescription>Todavía no tienes conversaciones.</EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : null}
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

function FloatSection({
  title,
  items,
  online,
  onOpen,
  onClaim,
  onTake,
}: {
  title?: string
  items: Conversation[]
  online: ReadonlySet<string>
  onOpen: (item: Conversation) => void
  onClaim: (id: string) => void
  onTake: (id: string) => void
}) {
  if (items.length === 0) return null
  return (
    <section className="flex flex-col gap-2">
      {title ? <h3 className="text-sm font-medium">{title}</h3> : null}
      <ul className="divide-y divide-border rounded-xl border border-border">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2 pe-2">
            {canOpen(item) ? (
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left hover:bg-muted/50"
                onClick={() => onOpen(item)}
              >
                <RowBody item={item} online={online.has(item.assigneeId ?? "")} />
              </button>
            ) : (
              <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2">
                <RowBody item={item} online={online.has(item.assigneeId ?? "")} />
              </div>
            )}
            {canClaim(item) ? (
              <Button type="button" size="sm" onClick={() => onClaim(item.id)}>
                Atender
              </Button>
            ) : null}
            {canTake(item) ? (
              <Button type="button" size="sm" variant="outline" onClick={() => onTake(item.id)}>
                Tomar
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

function RowBody({ item, online }: { item: Conversation; online: boolean }) {
  return (
    <>
      <PersonAvatar name={conversationTitle(item)} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 font-medium">
          <OnlineDot on={online && item.viewerRole !== "customer" && item.viewerRole !== "assignee"} />
          <span className="truncate">{conversationTitle(item)}</span>
        </span>
        <span className="block truncate text-sm text-muted-foreground">
          {item.viewerRole === "customer" ? item.lastText : `${statusLine(item)} · ${item.lastText}`}
        </span>
      </span>
      {item.unreadCount > 0 ? (
        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
          {item.unreadCount > 9 ? "9+" : item.unreadCount}
        </span>
      ) : null}
    </>
  )
}
