import { useEffect, useState } from "react"
import { Link, useParams } from "react-router"
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
import { chatSocket } from "@/lib/socket"
import { useAuthStore } from "@/stores/auth-store"

type Filter = "all" | "unread"

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
  const profile = useAuthStore((s) => s.profile)
  const [items, setItems] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [listReady, setListReady] = useState(false)
  const [threadReady, setThreadReady] = useState(false)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [text, setText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const open = Boolean(businessId && peerId)
  const active = items.find((item) => item.businessId === businessId && item.peerId === peerId)

  useEffect(() => {
    void api
      .get<{ data: Conversation[] }>("/messages/conversations")
      .then((response) => setItems(response.data.data))
      .catch(() => setError("No se pudieron cargar las conversaciones."))
      .finally(() => setListReady(true))
  }, [])

  useEffect(() => {
    if (!open) {
      setMessages([])
      setThreadReady(false)
      return
    }
    let live = true
    setThreadReady(false)
    void api
      .get<{ data: Message[] }>(`/messages/conversations/${businessId}/${peerId}`)
      .then((response) => {
        if (!live) return
        setMessages(response.data.data)
        setItems((current) =>
          current.map((item) =>
            item.businessId === businessId && item.peerId === peerId ? { ...item, unreadCount: 0 } : item,
          ),
        )
      })
      .catch(() => {
        if (live) setError("No se pudo abrir la conversación.")
      })
      .finally(() => {
        if (live) setThreadReady(true)
      })
    return () => {
      live = false
    }
  }, [open, businessId, peerId])

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
              <ul>
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
                        <PersonAvatar name={item.peerName} />
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
              </ul>
            )}
          </ScrollArea>
        </aside>

        <section className={`${open ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col bg-background`}>
          {open ? (
            <>
              <header className="flex items-center gap-3 border-b border-border px-4 py-3">
                <Link className="text-sm text-primary md:hidden" to="/mensajes">
                  Chats
                </Link>
                <PersonAvatar name={active?.peerName ?? null} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{active?.peerName ?? "Contacto"}</p>
                  {active ? (
                    <Link className="block truncate text-sm text-muted-foreground hover:text-foreground" to={`/n/${active.businessId}`}>
                      {active.businessName}
                    </Link>
                  ) : null}
                </div>
              </header>
              {threadReady ? (
                <MessageThread
                  threadKey={`${businessId}:${peerId}`}
                  messages={messages}
                  userId={userId}
                  peerName={active?.peerName ?? null}
                  selfName={profile?.fullName ?? null}
                  selfAvatar={profile?.avatarUrl}
                />
              ) : (
                <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
                  <Skeleton className="h-12 w-2/3 rounded-xl" />
                  <Skeleton className="ms-auto h-12 w-1/2 rounded-xl" />
                  <Skeleton className="h-12 w-3/5 rounded-xl" />
                </div>
              )}
              {error ? <p className="px-4 text-sm text-destructive">{error}</p> : null}
              <MessageComposer value={text} onChange={setText} onSubmit={(event) => void send(event)} placeholder="Aa" />
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
