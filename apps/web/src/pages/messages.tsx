import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router"
import type { Conversation, Message } from "@workspace/shared"
import { Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@workspace/ui/components/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@workspace/ui/components/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@workspace/ui/components/input-group"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { MessageComposer, MessageThread, PersonAvatar } from "@/components/message-thread"
import { SiteHeader } from "@/components/site-header"
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

type Filter = "all" | "unread"
type ThreadPayload = { conversation: Conversation; messages: Message[] }

function when(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.max(0, Math.floor(diff / 60000))
  if (minutes < 1) return "ahora"
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h`
  const days = Math.floor(hours / 24)
  if (days === 1) return "1 día"
  if (days < 7) return `${days} días`
  const weeks = Math.floor(days / 7)
  return weeks === 1 ? "1 sem" : `${weeks} sem`
}

export function MessagesPage() {
  return <Inbox />
}

export function MessageThreadPage() {
  return <Inbox />
}

export function LocalChatPage() {
  return <Inbox />
}

function Inbox() {
  const { conversationId = "", businessId: draftBusinessId = "" } = useParams()
  const navigate = useNavigate()
  const userId = useAuthStore((s) => s.session?.user.id)
  const profile = useAuthStore((s) => s.profile)
  const online = useOnlineUsers()
  const [items, setItems] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [listReady, setListReady] = useState(false)
  const [threadReady, setThreadReady] = useState(false)
  const [draftReady, setDraftReady] = useState(false)
  const [draftName, setDraftName] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [text, setText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const open = Boolean(conversationId || draftBusinessId)
  const listed = items.find((item) => item.id === conversationId)
  const role = listed?.viewerRole

  useEffect(() => {
    void api
      .get<{ data: Conversation[] }>("/messages/conversations")
      .then((response) => setItems(response.data.data))
      .catch(() => setError("No se pudieron cargar las conversaciones."))
      .finally(() => setListReady(true))
  }, [])

  useEffect(() => {
    if (!draftBusinessId) return
    let live = true
    setDraftReady(false)
    void api
      .get<{ data: { id: string } | null }>(`/messages/business/${draftBusinessId}`)
      .then((response) => {
        if (!live) return
        const id = response.data.data?.id
        if (id) navigate(`/mensajes/${id}`, { replace: true })
        else setDraftReady(true)
      })
      .catch(() => {
        if (live) setError("No se pudo abrir el chat del local.")
      })
    void api
      .get<{ data: { business: { name: string } } }>(`/businesses/${draftBusinessId}`)
      .then((response) => {
        if (live) setDraftName(response.data.data.business.name)
      })
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [draftBusinessId, navigate])

  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      setThreadReady(false)
      return
    }
    if (!listReady) return
    if (role === "member") {
      setMessages([])
      setThreadReady(true)
      return
    }
    let live = true
    setThreadReady(false)
    void api
      .get<{ data: ThreadPayload }>(`/messages/conversations/${conversationId}`)
      .then((response) => {
        if (!live) return
        const payload = response.data.data
        setMessages(payload.messages)
        setItems((current) =>
          foldConversation(current, payload.conversation).map((item) =>
            item.id === payload.conversation.id ? { ...item, unreadCount: 0 } : item,
          ),
        )
      })
      .catch((caught) => {
        if (!live) return
        setMessages([])
        if (!errorMessage(caught, "").includes("atiende")) {
          setError(errorMessage(caught, "No se pudo abrir la conversación."))
        }
      })
      .finally(() => {
        if (live) setThreadReady(true)
      })
    return () => {
      live = false
    }
  }, [conversationId, listReady, role])

  useEffect(() => {
    if (!userId) return
    let live = true
    let detach = () => {}
    void chatSocket().then((socket) => {
      if (!socket || !live) return
      const onMessage = (event: IncomingMessage) => {
        const viewing = event.conversation.id === conversationId && event.conversation.viewerRole !== "member"
        setItems((current) => foldMessage(current, event, userId, viewing ? conversationId : null))
        if (!viewing) return
        setMessages((current) =>
          current.some((item) => item.id === event.message.id) ? current : [...current, event.message],
        )
        const counts = event.conversation.viewerRole === "customer" || event.conversation.viewerRole === "assignee"
        if (counts && event.message.senderId !== userId) {
          void api.get(`/messages/conversations/${conversationId}`)
        }
      }
      const onConversation = (conversation: Conversation) => {
        setItems((current) => foldConversation(current, conversation))
        if (conversation.id === conversationId && conversation.viewerRole === "member") setMessages([])
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
  }, [userId, conversationId])

  async function claim(id: string) {
    setError(null)
    try {
      const response = await api.post<{ data: Conversation }>(`/messages/conversations/${id}/claim`)
      setItems((current) => foldConversation(current, response.data.data))
      navigate(`/mensajes/${id}`)
    } catch (caught) {
      setError(errorMessage(caught, "No se pudo atender."))
    }
  }

  async function take(id: string) {
    setError(null)
    try {
      const response = await api.post<{ data: Conversation }>(`/messages/conversations/${id}/take`)
      setItems((current) => foldConversation(current, response.data.data))
      navigate(`/mensajes/${id}`)
    } catch (caught) {
      setError(errorMessage(caught, "No se pudo tomar el chat."))
    }
  }

  async function send(event: FormEvent) {
    event.preventDefault()
    const body = text.trim()
    if (!body) return
    setText("")
    try {
      if (draftBusinessId) {
        const response = await api.post<{ data: { conversation: Conversation } }>("/messages", {
          businessId: draftBusinessId,
          text: body,
        })
        navigate(`/mensajes/${response.data.data.conversation.id}`, { replace: true })
        return
      }
      if (!listed || !canCompose(listed)) return
      const path = listed.viewerRole === "customer" ? "/messages" : `/messages/conversations/${listed.id}/reply`
      const payload = listed.viewerRole === "customer" ? { businessId: listed.businessId, text: body } : { text: body }
      const response = await api.post<{ data: { message: Message; conversation: Conversation } }>(path, payload)
      const message = response.data.data.message
      setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]))
      setItems((current) => foldConversation(current, response.data.data.conversation))
    } catch (caught) {
      setError(errorMessage(caught, "No se pudo enviar."))
      setText(body)
    }
  }

  const needle = query.trim().toLowerCase()
  const visible = items.filter((item) => {
    if (filter === "unread" && item.unreadCount === 0) return false
    if (!needle) return true
    return `${item.customerName ?? ""} ${item.assigneeName ?? ""} ${item.businessName} ${item.lastText}`
      .toLowerCase()
      .includes(needle)
  })
  const staffView = items.some((item) => item.viewerRole !== "customer")
  const queue = visible.filter((item) => item.status === "waiting" && item.viewerRole !== "customer")
  const ongoing = visible.filter((item) => !queue.includes(item))
  const blocked = role === "member"
  const active = listed

  return (
    <div className="flex h-svh flex-col bg-background text-foreground">
      <SiteHeader />
      <div className="flex min-h-0 flex-1">
        <aside className={`${open ? "hidden md:flex" : "flex"} w-full shrink-0 flex-col border-border bg-card md:w-[22rem] md:border-r`}>
          <div className="flex flex-col gap-3 px-4 pt-4">
            <h1 className="text-2xl font-semibold tracking-tight">Chats</h1>
            <InputGroup className="h-9 rounded-full">
              <InputGroupAddon>
                <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
                <span className="sr-only">Buscar chats</span>
              </InputGroupAddon>
              <InputGroupInput
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar"
                aria-label="Buscar chats"
              />
            </InputGroup>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={filter === "all" ? "default" : "secondary"} onClick={() => setFilter("all")}>
                Todos
              </Button>
              <Button
                type="button"
                size="sm"
                variant={filter === "unread" ? "default" : "secondary"}
                onClick={() => setFilter("unread")}
              >
                No leídos
              </Button>
            </div>
          </div>
          {error && !open ? <p className="px-4 pt-3 text-sm text-destructive">{error}</p> : null}
          <ScrollArea className="min-h-0 flex-1" viewportClassName="h-full">
            {!listReady ? (
              <div className="flex flex-col gap-3 p-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <Skeleton key={index} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <Empty className="border-0">
                <EmptyHeader>
                  <EmptyTitle>
                    {items.length === 0 ? "Sin conversaciones" : filter === "unread" && !needle ? "Sin no leídos" : "Sin resultados"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {items.length === 0
                      ? "Todavía no tienes conversaciones."
                      : filter === "unread" && !needle
                        ? "No tienes mensajes sin leer."
                        : "Ningún chat coincide con la búsqueda."}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="flex flex-col pb-4">
                {staffView && queue.length > 0 ? (
                  <ConversationGroup
                    title="Por atender"
                    items={queue}
                    selectedId={conversationId}
                    online={online}
                    onClaim={(id) => void claim(id)}
                    onTake={(id) => void take(id)}
                  />
                ) : null}
                {staffView && ongoing.length > 0 ? (
                  <ConversationGroup
                    title="En curso"
                    items={ongoing}
                    selectedId={conversationId}
                    online={online}
                    onClaim={(id) => void claim(id)}
                    onTake={(id) => void take(id)}
                  />
                ) : null}
                {!staffView ? (
                  <ConversationGroup
                    items={visible}
                    selectedId={conversationId}
                    online={online}
                    onClaim={(id) => void claim(id)}
                    onTake={(id) => void take(id)}
                  />
                ) : null}
              </div>
            )}
          </ScrollArea>
        </aside>

        <section className={`${open ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col bg-background`}>
          {draftBusinessId ? (
            draftReady ? (
              <>
                <header className="flex items-center gap-3 border-b border-border px-4 py-3">
                  <Link className="text-sm text-primary md:hidden" to="/mensajes">
                    Chats
                  </Link>
                  <PersonAvatar name={draftName} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{draftName ?? "Local"}</p>
                    <p className="truncate text-sm text-muted-foreground">Escribe al local</p>
                  </div>
                </header>
                <MessageThread
                  threadKey={draftBusinessId}
                  messages={[]}
                  userId={userId}
                  peerName={draftName}
                  selfName={profile?.fullName ?? null}
                  selfAvatar={profile?.avatarUrl}
                />
                {error ? <p className="px-4 text-sm text-destructive">{error}</p> : null}
                <MessageComposer value={text} onChange={setText} onSubmit={(event) => void send(event)} placeholder="Aa" />
              </>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
                <Skeleton className="h-12 w-2/3 rounded-xl" />
                <Skeleton className="ms-auto h-12 w-1/2 rounded-xl" />
              </div>
            )
          ) : conversationId ? (
            <>
              <header className="flex items-center gap-3 border-b border-border px-4 py-3">
                <Link className="text-sm text-primary md:hidden" to="/mensajes">
                  Chats
                </Link>
                <PersonAvatar name={active ? conversationTitle(active) : null} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {active?.viewerRole === "customer" ? (
                      <Link className="hover:underline" to={`/n/${active.businessId}`}>
                        {conversationTitle(active)}
                      </Link>
                    ) : (
                      (active ? conversationTitle(active) : "Conversación")
                    )}
                  </p>
                  {active ? (
                    <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                      <OnlineDot on={Boolean(active.assigneeId && online.has(active.assigneeId) && active.viewerRole !== "assignee")} />
                      <span className="truncate">{statusLine(active)}</span>
                    </p>
                  ) : null}
                </div>
                {active && canClaim(active) ? (
                  <Button type="button" size="sm" onClick={() => void claim(active.id)}>
                    Atender
                  </Button>
                ) : null}
                {active && canTake(active) ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => void take(active.id)}>
                    Tomar
                  </Button>
                ) : null}
              </header>
              {active?.viewerRole === "owner" && active.assigneeName ? (
                <p className="border-b border-border bg-muted px-4 py-2 text-sm text-muted-foreground">
                  Supervisión · lo atiende {active.assigneeName}
                </p>
              ) : null}
              {blocked ? (
                <Empty className="min-h-0 flex-1 border-0">
                  <EmptyHeader>
                    <EmptyTitle>Lo atiende {active?.assigneeName ?? "otra persona"}</EmptyTitle>
                    <EmptyDescription>Cuando lo tomes podrás leer y responder.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : threadReady ? (
                <MessageThread
                  threadKey={conversationId}
                  messages={messages}
                  userId={userId}
                  peerName={active ? conversationTitle(active) : null}
                  selfName={profile?.fullName ?? null}
                  selfAvatar={profile?.avatarUrl}
                  nameFor={active ? (message) => senderName(active, message.senderId) : undefined}
                />
              ) : (
                <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
                  <Skeleton className="h-12 w-2/3 rounded-xl" />
                  <Skeleton className="ms-auto h-12 w-1/2 rounded-xl" />
                  <Skeleton className="h-12 w-3/5 rounded-xl" />
                </div>
              )}
              {error ? <p className="px-4 text-sm text-destructive">{error}</p> : null}
              {active && canCompose(active) ? (
                <MessageComposer value={text} onChange={setText} onSubmit={(event) => void send(event)} placeholder="Aa" />
              ) : null}
            </>
          ) : (
            <Empty className="min-h-0 flex-1 border-0">
              <EmptyHeader>
                <EmptyTitle>Elige un chat</EmptyTitle>
                <EmptyDescription>Selecciona una conversación para ver los mensajes.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </section>
      </div>
    </div>
  )
}

function ConversationGroup({
  title,
  items,
  selectedId,
  online,
  onClaim,
  onTake,
}: {
  title?: string
  items: Conversation[]
  selectedId: string
  online: ReadonlySet<string>
  onClaim: (id: string) => void
  onTake: (id: string) => void
}) {
  return (
    <section>
      {title ? <h2 className="px-4 pt-4 pb-1 text-xs font-medium text-muted-foreground">{title}</h2> : null}
      <ul>
        {items.map((item) => (
          <ConversationRow
            key={item.id}
            item={item}
            selected={item.id === selectedId}
            online={online.has(item.assigneeId ?? "")}
            onClaim={onClaim}
            onTake={onTake}
          />
        ))}
      </ul>
    </section>
  )
}

function ConversationRow({
  item,
  selected,
  online,
  onClaim,
  onTake,
}: {
  item: Conversation
  selected: boolean
  online: boolean
  onClaim: (id: string) => void
  onTake: (id: string) => void
}) {
  const unread = item.unreadCount > 0
  const body = (
    <>
      <PersonAvatar name={conversationTitle(item)} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className={`truncate ${unread ? "font-semibold" : "font-medium"}`}>{conversationTitle(item)}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{when(item.lastAt)}</span>
        </span>
        <span className="mt-0.5 flex items-center justify-between gap-2">
          <span className={`flex min-w-0 items-center gap-1.5 text-sm ${unread ? "text-foreground" : "text-muted-foreground"}`}>
            <OnlineDot on={online && item.viewerRole !== "customer" && item.viewerRole !== "assignee"} />
            <span className="truncate">
              {item.viewerRole === "customer" ? item.lastText : `${statusLine(item)} · ${item.lastText}`}
            </span>
          </span>
          {unread ? (
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
              {item.unreadCount > 9 ? "9+" : item.unreadCount}
            </span>
          ) : null}
        </span>
      </span>
    </>
  )
  const className = `flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 ${selected ? "bg-accent" : "hover:bg-muted"}`

  return (
    <li className="flex items-center gap-2 pe-3">
      {canOpen(item) ? (
        <Link to={`/mensajes/${item.id}`} aria-current={selected ? "page" : undefined} className={className}>
          {body}
        </Link>
      ) : (
        <div className={className}>{body}</div>
      )}
      {canClaim(item) ? (
        <Button type="button" size="sm" className="shrink-0" onClick={() => onClaim(item.id)}>
          Atender
        </Button>
      ) : null}
      {canTake(item) ? (
        <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={() => onTake(item.id)}>
          Tomar
        </Button>
      ) : null}
    </li>
  )
}
