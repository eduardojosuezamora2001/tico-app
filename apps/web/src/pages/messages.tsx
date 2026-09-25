import { useEffect, useRef, useState } from "react"
import { Link, useParams } from "react-router"
import type { Conversation, Message } from "@workspace/shared"

import { SiteHeader } from "@/components/site-header"
import { api } from "@/lib/api"
import { chatSocket } from "@/lib/socket"
import { useAuthStore } from "@/stores/auth-store"

type Filter = "all" | "unread"

function initials(name: string | null) {
  const parts = (name ?? "C").trim().split(/\s+/).slice(0, 2)
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "C"
}

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

function Inbox() {
  const { businessId = "", peerId = "" } = useParams()
  const userId = useAuthStore((s) => s.session?.user.id)
  const [items, setItems] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [text, setText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const threadEnd = useRef<HTMLDivElement>(null)
  const open = Boolean(businessId && peerId)
  const active = items.find((item) => item.businessId === businessId && item.peerId === peerId)

  useEffect(() => {
    void api
      .get<{ data: Conversation[] }>("/messages/conversations")
      .then((response) => setItems(response.data.data))
      .catch(() => setError("No se pudieron cargar las conversaciones."))
  }, [])

  useEffect(() => {
    if (!open) {
      setMessages([])
      return
    }
    void api
      .get<{ data: Message[] }>(`/messages/conversations/${businessId}/${peerId}`)
      .then((response) => {
        setMessages(response.data.data)
        setItems((current) =>
          current.map((item) =>
            item.businessId === businessId && item.peerId === peerId ? { ...item, unreadCount: 0 } : item,
          ),
        )
      })
      .catch(() => setError("No se pudo abrir la conversación."))
  }, [open, businessId, peerId])

  useEffect(() => {
    threadEnd.current?.scrollIntoView({ block: "end" })
  }, [messages, businessId, peerId])

  useEffect(() => {
    if (!userId) return
    let live = true
    let detach = () => {}
    void chatSocket().then((socket) => {
      if (!socket || !live) return
      const onMessage = (message: Message) => {
        const peer = message.senderId === userId ? message.receiverId : message.senderId
        const mine = message.senderId === userId
        setItems((current) => {
          const index = current.findIndex((item) => item.businessId === message.businessId && item.peerId === peer)
          if (index === -1) return current
          const next = [...current]
          const item = next[index]
          if (!item) return current
          const viewing = message.businessId === businessId && peer === peerId
          next.splice(index, 1)
          next.unshift({
            ...item,
            lastText: message.text,
            lastAt: message.createdAt,
            unreadCount: mine || viewing ? item.unreadCount : item.unreadCount + 1,
          })
          return next
        })
        if (message.businessId !== businessId) return
        if (message.senderId !== peerId && message.receiverId !== peerId) return
        setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]))
      }
      socket.on("message:new", onMessage)
      detach = () => socket.off("message:new", onMessage)
    })
    return () => {
      live = false
      detach()
    }
  }, [userId, businessId, peerId])

  async function send(event: React.FormEvent) {
    event.preventDefault()
    const body = text.trim()
    if (!body || !open) return
    setText("")
    try {
      const response = await api.post<{ data: Message }>("/messages", {
        businessId,
        receiverId: peerId,
        text: body,
      })
      const message = response.data.data
      setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]))
    } catch {
      setError("No se pudo enviar. Solo puedes escribir si tú o la otra persona pertenecen al negocio.")
      setText(body)
    }
  }

  const needle = query.trim().toLowerCase()
  const visible = items.filter((item) => {
    if (filter === "unread" && item.unreadCount === 0) return false
    if (!needle) return true
    return `${item.peerName ?? ""} ${item.businessName} ${item.lastText}`.toLowerCase().includes(needle)
  })

  return (
    <div className="flex h-svh flex-col bg-background text-foreground">
      <SiteHeader />
      <div className="flex min-h-0 flex-1">
        <aside className={`${open ? "hidden md:flex" : "flex"} w-full shrink-0 flex-col border-border bg-card md:w-[22rem] md:border-r`}>
          <div className="px-4 pt-4">
            <h1 className="text-2xl font-semibold tracking-tight">Chats</h1>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar"
              className="mt-3 h-9 w-full rounded-full bg-muted px-4 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="mt-3 flex gap-2">
              <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
                Todos
              </FilterButton>
              <FilterButton active={filter === "unread"} onClick={() => setFilter("unread")}>
                No leídos
              </FilterButton>
            </div>
          </div>
          {error && !open ? <p className="px-4 pt-3 text-sm text-destructive">{error}</p> : null}
          <ul className="mt-2 min-h-0 flex-1 overflow-y-auto [scrollbar-color:var(--border)_transparent]">
            {visible.map((item) => {
              const selected = item.businessId === businessId && item.peerId === peerId
              const unread = item.unreadCount > 0
              return (
                <li key={`${item.businessId}:${item.peerId}`}>
                  <Link
                    to={`/mensajes/${item.businessId}/${item.peerId}`}
                    aria-current={selected ? "page" : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 ${selected ? "bg-accent" : "hover:bg-muted"}`}
                  >
                    <Avatar name={item.peerName} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={`truncate ${unread ? "font-semibold" : "font-medium"}`}>
                          {item.peerName ?? "Contacto"}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">{when(item.lastAt)}</span>
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-2">
                        <span className={`truncate text-sm ${unread ? "text-foreground" : "text-muted-foreground"}`}>
                          {item.businessName} · {item.lastText}
                        </span>
                        {unread ? (
                          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                            {item.unreadCount > 9 ? "9+" : item.unreadCount}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
            {visible.length === 0 ? (
              <li className="px-4 py-8 text-sm text-muted-foreground">
                {items.length === 0 ? "Todavía no tienes conversaciones." : "Ningún chat coincide."}
              </li>
            ) : null}
          </ul>
        </aside>

        <section className={`${open ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col bg-background`}>
          {open ? (
            <>
              <header className="flex items-center gap-3 border-b border-border px-4 py-3">
                <Link className="text-sm text-primary md:hidden" to="/mensajes">
                  Chats
                </Link>
                <Avatar name={active?.peerName ?? null} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{active?.peerName ?? "Contacto"}</p>
                  {active ? (
                    <Link className="block truncate text-sm text-muted-foreground hover:text-foreground" to={`/n/${active.businessId}`}>
                      {active.businessName}
                    </Link>
                  ) : null}
                </div>
              </header>
              <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 py-4 [scrollbar-color:var(--border)_transparent]">
                {messages.map((item) => {
                  const mine = item.senderId === userId
                  return (
                    <li key={item.id} className={`flex items-end gap-2 ${mine ? "justify-end" : ""}`}>
                      {mine ? null : <Avatar name={active?.peerName ?? null} small />}
                      <p
                        className={`max-w-[min(70%,28rem)] rounded-[1.25rem] px-3.5 py-2 text-sm whitespace-pre-wrap ${
                          mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                        }`}
                      >
                        {item.text}
                      </p>
                    </li>
                  )
                })}
                <div ref={threadEnd} />
              </ul>
              {error ? <p className="px-4 text-sm text-destructive">{error}</p> : null}
              <form className="flex items-center gap-2 px-4 py-3" onSubmit={(event) => void send(event)}>
                <input
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Aa"
                  className="h-10 min-w-0 flex-1 rounded-full bg-muted px-4 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button
                  type="submit"
                  className="grid size-10 place-items-center rounded-full bg-primary text-sm font-medium text-primary-foreground disabled:opacity-40"
                  disabled={!text.trim()}
                  aria-label="Enviar"
                >
                  <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
                    <path fill="currentColor" d="M2 8.2 13.5 2.5 8.8 14l-1.4-4.6L2 8.2Z" />
                  </svg>
                </button>
              </form>
            </>
          ) : (
            <div className="grid flex-1 place-items-center px-6 text-center text-muted-foreground">
              <p>Elige un chat para ver los mensajes.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-sm font-medium ${
        active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-accent"
      }`}
    >
      {children}
    </button>
  )
}

function Avatar({ name, small = false }: { name: string | null; small?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full bg-primary/15 font-medium text-primary ${
        small ? "size-7 text-[11px]" : "size-11 text-sm"
      }`}
    >
      {initials(name)}
    </span>
  )
}
