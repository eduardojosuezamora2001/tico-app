import { useEffect, useRef, useState } from "react"
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
import { chatSocket } from "@/lib/socket"
import { useAuthStore } from "@/stores/auth-store"

export function FloatChat() {
  const { pathname } = useLocation()
  const status = useAuthStore((s) => s.status)
  const userId = useAuthStore((s) => s.session?.user.id)
  const profile = useAuthStore((s) => s.profile)
  const accessToken = useAuthStore((s) => s.session?.access_token)
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
  const itemsRef = useRef(items)
  openRef.current = open
  activeRef.current = active
  itemsRef.current = items

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
      const onMessage = (message: Message) => {
        if (message.receiverId !== userId) return
        const viewing =
          openRef.current &&
          activeRef.current?.businessId === message.businessId &&
          activeRef.current.peerId === message.senderId
        if (viewing) {
          void api.get(`/messages/conversations/${message.businessId}/${message.senderId}`)
          return
        }

        const known = itemsRef.current.find(
          (item) => item.businessId === message.businessId && item.peerId === message.senderId,
        )
        if (known) {
          setItems((current) =>
            current.map((item) =>
              item.businessId === message.businessId && item.peerId === message.senderId
                ? { ...item, unreadCount: item.unreadCount + 1, lastText: message.text, lastAt: message.createdAt }
                : item,
            ),
          )
        } else {
          void loadConversations()
        }

        const title = known
          ? `${known.peerName ?? "Contacto"} · ${known.businessName}`
          : "Nuevo mensaje"
        setNotice({ id: message.id, title, body: message.text })
        if (
          document.hidden &&
          typeof Notification !== "undefined" &&
          Notification.permission === "granted"
        ) {
          new Notification(title, { body: message.text })
        }
      }
      socket.on("message:new", onMessage)
      detach = () => socket.off("message:new", onMessage)
    })
    return () => {
      live = false
      detach()
    }
  }, [status, userId, accessToken])

  useEffect(() => {
    if (!active) return
    let cancelled = false
    setThreadReady(false)
    void api
      .get<{ data: Message[] }>(`/messages/conversations/${active.businessId}/${active.peerId}`)
      .then((response) => {
        if (cancelled) return
        setMessages(response.data.data)
        setItems((current) =>
          current.map((item) =>
            item.businessId === active.businessId && item.peerId === active.peerId
              ? { ...item, unreadCount: 0 }
              : item,
          ),
        )
        setNotice(null)
      })
      .catch(() => {
        if (!cancelled) setError("No se pudo abrir la conversación.")
      })
      .finally(() => {
        if (!cancelled) setThreadReady(true)
      })

    let live = true
    let detach = () => {}
    void chatSocket().then((socket) => {
      if (!socket || !live) return
      const onMessage = (message: Message) => {
        if (message.businessId !== active.businessId) return
        if (message.senderId !== active.peerId && message.receiverId !== active.peerId) return
        setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]))
      }
      socket.on("message:new", onMessage)
      detach = () => socket.off("message:new", onMessage)
    })
    return () => {
      cancelled = true
      live = false
      detach()
    }
  }, [active])

  async function send(event: React.FormEvent) {
    event.preventDefault()
    if (!active) return
    const body = text.trim()
    if (!body) return
    setText("")
    try {
      const response = await api.post<{ data: Message }>("/messages", {
        businessId: active.businessId,
        receiverId: active.peerId,
        text: body,
      })
      const message = response.data.data
      setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]))
    } catch {
      setError("No se pudo enviar.")
      setText(body)
    }
  }

  if (status === "loading" || pathname.startsWith("/mensajes")) return null

  if (status !== "authenticated") {
    return (
      <Button
        className="fixed right-4 bottom-4 z-40 rounded-full shadow-lg"
        render={<Link to="/login" />}
      >
        Chat
      </Button>
    )
  }

  const groups = new Map<string, Conversation[]>()
  for (const item of items) {
    groups.set(item.businessId, [...(groups.get(item.businessId) ?? []), item])
  }
  const unread = items.reduce((sum, item) => sum + item.unreadCount, 0)

  return (
    <>
    {notice ? (
      <p
        role="status"
        className="fixed right-4 bottom-20 z-40 max-w-xs rounded-2xl border border-border bg-card px-4 py-3 text-sm shadow-lg"
      >
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
          <SheetTitle>{active ? (active.peerName ?? "Contacto") : "Mensajes"}</SheetTitle>
          <SheetDescription>
            {active ? active.businessName : "Conversaciones agrupadas por local."}
          </SheetDescription>
        </SheetHeader>
        {error ? <p className="px-4 text-sm text-destructive">{error}</p> : null}
        {active ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <Button type="button" variant="ghost" className="mx-4 self-start" onClick={() => setActive(null)}>
              Todos los locales
            </Button>
            {threadReady ? (
              <MessageThread
                threadKey={`${active.businessId}:${active.peerId}`}
                messages={messages}
                userId={userId}
                peerName={active.peerName}
                selfName={profile?.fullName ?? null}
                selfAvatar={profile?.avatarUrl}
              />
            ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
                <Skeleton className="h-12 w-2/3 rounded-xl" />
                <Skeleton className="ms-auto h-12 w-1/2 rounded-xl" />
              </div>
            )}
            <MessageComposer value={text} onChange={setText} onSubmit={(event) => void send(event)} />
          </div>
        ) : (
          <ScrollArea className="min-h-0 flex-1" viewportClassName="h-full">
            <div className="flex flex-col gap-4 px-4 pb-4">
              {[...groups.entries()].map(([businessId, threads]) => (
                <section key={businessId} className="flex flex-col gap-2">
                  <h3 className="text-sm font-medium">{threads[0]?.businessName}</h3>
                  <ul className="divide-y divide-border rounded-xl border border-border">
                    {threads.map((item) => (
                      <li key={`${item.businessId}:${item.peerId}`}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/50"
                          onClick={() => {
                            setError(null)
                            setActive(item)
                          }}
                        >
                          <PersonAvatar name={item.peerName} size="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium">{item.peerName ?? "Contacto"}</span>
                            <span className="block truncate text-sm text-muted-foreground">{item.lastText}</span>
                          </span>
                          {item.unreadCount > 0 ? (
                            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                              {item.unreadCount > 9 ? "9+" : item.unreadCount}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
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
