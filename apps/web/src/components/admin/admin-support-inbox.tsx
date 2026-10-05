import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useSearchParams } from "react-router"
import type { Message, SupportMessage, SupportThread } from "@workspace/shared"
import { ArrowLeft01Icon, Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { MessageComposer, MessageThread, PersonAvatar } from "@/components/message-thread"
import { formatRelativeTime } from "@/lib/messages-ui"
import {
  listSupportMessages,
  listSupportThreadsForAdmin,
  sendSupportMessage,
} from "@/services/support.service"
import { useAuthStore } from "@/stores/auth-store"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@workspace/ui/components/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@workspace/ui/components/input-group"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "cn"

function supportToMessage(row: SupportMessage): Message {
  return {
    id: row.id,
    senderId: row.senderId,
    receiverId: null,
    businessId: "",
    conversationId: row.threadId,
    text: row.body,
    isRead: row.isRead,
    createdAt: row.createdAt,
    updatedAt: row.createdAt,
  }
}

function threadTitle(thread: SupportThread) {
  return thread.userName?.trim() || thread.userEmail || thread.userId.slice(0, 8)
}

function statusLabel(status: SupportThread["status"]) {
  if (status === "open") return "Abierto"
  if (status === "assigned") return "Asignado"
  return "Cerrado"
}

export function AdminSupportInbox() {
  const userId = useAuthStore((s) => s.session?.user.id)
  const profile = useAuthStore((s) => s.profile)
  const [searchParams, setSearchParams] = useSearchParams()
  const activeId = searchParams.get("thread") ?? ""

  const [threads, setThreads] = useState<SupportThread[]>([])
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [listReady, setListReady] = useState(false)
  const [threadReady, setThreadReady] = useState(false)
  const [query, setQuery] = useState("")
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const active = threads.find((t) => t.id === activeId)
  const open = Boolean(activeId)

  function reloadThreads() {
    return listSupportThreadsForAdmin()
      .then(setThreads)
      .catch(() => setError("No se pudieron cargar los hilos."))
  }

  useEffect(() => {
    void reloadThreads().finally(() => setListReady(true))
  }, [])

  useEffect(() => {
    if (!activeId) {
      setMessages([])
      setThreadReady(true)
      return
    }
    setThreadReady(false)
    void listSupportMessages(activeId)
      .then(setMessages)
      .catch(() => setError("No se pudo cargar el hilo."))
      .finally(() => setThreadReady(true))
  }, [activeId])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return threads
    return threads.filter((thread) => {
      const label = `${threadTitle(thread)} ${thread.lastText ?? ""} ${thread.userEmail ?? ""}`.toLowerCase()
      return label.includes(needle)
    })
  }, [query, threads])

  function selectThread(id: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set("thread", id)
      return next
    })
  }

  async function send(event: FormEvent) {
    event.preventDefault()
    if (!activeId) return
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    setText("")
    setError(null)
    try {
      const res = await sendSupportMessage({ threadId: activeId, message: body })
      setMessages((prev) => [...prev, res.message])
      await reloadThreads()
    } catch {
      setError("No se pudo enviar.")
      setText(body)
    } finally {
      setSending(false)
    }
  }

  async function closeThread() {
    if (!activeId) return
    try {
      await sendSupportMessage({
        threadId: activeId,
        message: "Conversación cerrada por soporte.",
        closeThread: true,
      })
      await reloadThreads()
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete("thread")
        return next
      })
    } catch {
      setError("No se pudo cerrar el hilo.")
    }
  }

  const chatMessages = useMemo(() => messages.map(supportToMessage), [messages])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background">
      {error ? (
        <p className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          className={cn(
            "flex min-h-0 h-full w-full shrink-0 flex-col overflow-hidden border-border bg-card/50 md:w-80 lg:w-[22rem] md:border-r",
            open ? "hidden md:flex" : "flex",
          )}
        >
          <div className="flex flex-col gap-4 border-b border-border px-4 py-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl font-semibold tracking-tight">Soporte</h2>
              <Badge variant="secondary">{threads.length} hilos</Badge>
            </div>
            <InputGroup className="h-10 rounded-full bg-background">
              <InputGroupAddon>
                <HugeiconsIcon icon={Search01Icon} strokeWidth={2} className="text-muted-foreground" />
              </InputGroupAddon>
              <InputGroupInput
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar usuario o mensaje…"
                aria-label="Buscar hilos de soporte"
              />
            </InputGroup>
          </div>
          <ScrollArea className="min-h-0 flex-1" viewportClassName="h-full">
            {!listReady ? (
              <div className="flex flex-col gap-3 p-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <Skeleton key={index} className="h-24 w-full rounded-2xl" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <Empty className="border-0">
                <EmptyHeader>
                  <EmptyTitle>Sin hilos</EmptyTitle>
                  <EmptyDescription>Cuando un usuario escriba a soporte, aparecerá aquí.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="flex flex-col gap-2 p-3">
                {filtered.map((thread) => {
                  const selected = thread.id === activeId
                  return (
                    <li key={thread.id}>
                      <button
                        type="button"
                        aria-current={selected ? "true" : undefined}
                        onClick={() => selectThread(thread.id)}
                        className={cn(
                          "flex w-full gap-3 rounded-2xl border border-transparent p-3 text-left transition-colors hover:bg-muted/60",
                          selected && "border-border bg-muted/80",
                        )}
                      >
                        <PersonAvatar name={threadTitle(thread)} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-sm font-medium">{threadTitle(thread)}</p>
                            <span className="shrink-0 text-[11px] text-muted-foreground">
                              {formatRelativeTime(thread.lastAt)}
                            </span>
                          </div>
                          <span className="mt-1 inline-flex rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {statusLabel(thread.status)}
                          </span>
                          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                            {thread.lastText ?? "—"}
                          </p>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </ScrollArea>
        </aside>

        <section
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col bg-background",
            !open ? "hidden md:flex" : "flex",
          )}
        >
          {!active ? (
            <Empty className="min-h-0 flex-1 border-0">
              <EmptyHeader>
                <EmptyTitle>Seleccioná un hilo</EmptyTitle>
                <EmptyDescription>Elegí una conversación de soporte para responder.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="shrink-0 md:hidden"
                    aria-label="Volver a hilos"
                    onClick={() =>
                      setSearchParams((prev) => {
                        const next = new URLSearchParams(prev)
                        next.delete("thread")
                        return next
                      })
                    }
                  >
                    <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
                  </Button>
                  <PersonAvatar name={threadTitle(active)} />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{threadTitle(active)}</p>
                    <p className="truncate text-xs text-muted-foreground">{active.userEmail ?? active.userId}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline">{statusLabel(active.status)}</Badge>
                  {active.status !== "closed" ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => void closeThread()}>
                      Cerrar
                    </Button>
                  ) : null}
                </div>
              </header>
              <div className="flex min-h-0 flex-1 flex-col">
                {!threadReady ? (
                  <Skeleton className="m-4 h-32 rounded-2xl" />
                ) : (
                  <MessageThread
                    threadKey={active.id}
                    messages={chatMessages}
                    userId={userId}
                    peerName={threadTitle(active)}
                    selfName={profile?.fullName ?? "Soporte"}
                    selfAvatar={profile?.avatarUrl}
                  />
                )}
                {active.status !== "closed" ? (
                  <div className="border-t border-border">
                    <MessageComposer
                      value={text}
                      onChange={setText}
                      onSubmit={(event) => void send(event)}
                      placeholder="Respuesta al usuario…"
                    />
                  </div>
                ) : null}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
