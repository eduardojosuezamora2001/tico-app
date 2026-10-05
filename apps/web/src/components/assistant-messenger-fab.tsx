import { useEffect, useState, type FormEvent } from "react"
import { Link, useLocation } from "react-router"
import type { AssistantCitation, AssistantMessage, SupportMessage } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"

import {
  listAssistantMessages,
  listAssistantThreads,
  sendAssistantMessage,
} from "@/services/assistant.service"
import { readAssistantThreadId, writeAssistantThreadId } from "@/lib/assistant-storage"
import {
  getMySupportThread,
  listSupportMessages,
  sendSupportMessage,
} from "@/services/support.service"
import { registerAssistantSheetOpen, type AssistantSheetTab } from "@/lib/assistant-sheet"
import { useAuthStore } from "@/stores/auth-store"

export function AssistantMessengerFab() {
  const { pathname } = useLocation()
  const status = useAuthStore((s) => s.status)
  const userId = useAuthStore((s) => s.session?.user.id)
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<AssistantSheetTab>("assistant")

  useEffect(() => {
    registerAssistantSheetOpen((nextTab) => {
      setTab(nextTab)
      setOpen(true)
    })
    return () => registerAssistantSheetOpen(null)
  }, [])

  if (status === "loading" || status !== "authenticated" || pathname.startsWith("/admin")) {
    return null
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>TicoApp</SheetTitle>
          <SheetDescription>Asistente del directorio y soporte con el equipo.</SheetDescription>
        </SheetHeader>
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as AssistantSheetTab)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList className="mx-4 grid w-auto grid-cols-2">
            <TabsTrigger value="assistant">Asistente</TabsTrigger>
            <TabsTrigger value="support">Soporte</TabsTrigger>
          </TabsList>
          <TabsContent value="assistant" className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
            <AssistantPanel userId={userId!} open={open && tab === "assistant"} />
          </TabsContent>
          <TabsContent value="support" className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
            <SupportPanel userId={userId!} open={open && tab === "support"} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}

function AssistantPanel({ userId, open }: { userId: string; open: boolean }) {
  const [threadId, setThreadId] = useState<string | undefined>()
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [citations, setCitations] = useState<AssistantCitation[]>([])
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [boot, setBoot] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let live = true
    setBoot(true)
    setError(null)

    void (async () => {
      try {
        const threads = await listAssistantThreads(5)
        const stored = readAssistantThreadId()
        const picked =
          (stored && threads.some((t) => t.id === stored) ? stored : undefined) ??
          threads[0]?.id
        if (!live) return
        if (!picked) {
          setThreadId(undefined)
          setMessages([])
          return
        }
        setThreadId(picked)
        const rows = await listAssistantMessages(picked)
        if (!live) return
        setMessages(rows.filter((m) => m.role === "user" || m.role === "assistant"))
      } catch {
        if (live) setError("No se pudo cargar el historial.")
      } finally {
        if (live) setBoot(false)
      }
    })()

    return () => {
      live = false
    }
  }, [open])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const body = text.trim()
    if (!body || loading) return
    setText("")
    setLoading(true)
    setError(null)
    try {
      const userMsg: AssistantMessage = {
        id: `local-${Date.now()}`,
        threadId: threadId ?? "pending",
        role: "user",
        content: body,
        metadata: {},
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMsg])
      let lat: number | undefined
      let lng: number | undefined
      if (navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (p) => resolve(p),
            () => resolve(null),
            { timeout: 4000, maximumAge: 600_000 },
          )
        })
        if (pos) {
          lat = pos.coords.latitude
          lng = pos.coords.longitude
        }
      }
      const res = await sendAssistantMessage({
        threadId,
        message: body,
        latitude: lat,
        longitude: lng,
      })
      setThreadId(res.threadId)
      writeAssistantThreadId(res.threadId)
      const history = await listAssistantMessages(res.threadId)
      setMessages(history.filter((m) => m.role === "user" || m.role === "assistant"))
      setCitations(res.citations)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo consultar al asistente.")
      setText(body)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {error ? <p className="px-4 text-sm text-destructive">{error}</p> : null}
      <ScrollArea className="min-h-0 flex-1 px-4" viewportClassName="max-h-[50vh]">
        {boot ? (
          <Skeleton className="m-2 h-16 w-3/4 rounded-xl" />
        ) : messages.length === 0 ? (
          <p className="p-2 text-sm text-muted-foreground">
            Preguntá por negocios cercanos, productos, provincias o si un local existe.
          </p>
        ) : (
          <ul className="flex flex-col gap-2 py-2">
            {messages.map((msg) => (
              <li
                key={msg.id}
                className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                  msg.role === "user" ? "ms-auto bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {msg.content}
              </li>
            ))}
          </ul>
        )}
        {citations.length > 0 ? (
          <div className="flex flex-wrap gap-2 pb-2">
            {citations.map((c) =>
              c.href ? (
                <Link key={c.href} to={c.href} className="rounded-full bg-accent px-2 py-1 text-xs">
                  {c.label}
                </Link>
              ) : null,
            )}
          </div>
        ) : null}
      </ScrollArea>
      <form onSubmit={(e) => void submit(e)} className="flex gap-2 border-t border-border p-4">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribí tu pregunta…"
          className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm"
          maxLength={2000}
          disabled={loading}
        />
        <Button type="submit" size="sm" className="rounded-full" disabled={loading || !text.trim()}>
          {loading ? "…" : "Enviar"}
        </Button>
      </form>
    </div>
  )
}

function SupportPanel({ userId, open }: { userId: string; open: boolean }) {
  const [threadId, setThreadId] = useState<string | undefined>()
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let live = true
    setError(null)
    void getMySupportThread()
      .then(async (thread) => {
        if (!live) return
        if (!thread) {
          setThreadId(undefined)
          setMessages([])
          return
        }
        setThreadId(thread.id)
        const rows = await listSupportMessages(thread.id)
        if (live) setMessages(rows)
      })
      .catch(() => {
        if (live) setError("No se pudo cargar soporte.")
      })
    return () => {
      live = false
    }
  }, [open])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const body = text.trim()
    if (!body || loading) return
    setText("")
    setLoading(true)
    setError(null)
    try {
      const res = await sendSupportMessage({ threadId, message: body })
      setThreadId(res.threadId)
      const rows = await listSupportMessages(res.threadId)
      setMessages(rows)
    } catch {
      setError("No se pudo enviar a soporte.")
      setText(body)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="px-4 text-xs text-muted-foreground">
        Chat con administración de TicoApp. Respondemos lo antes posible.
      </p>
      {error ? <p className="px-4 text-sm text-destructive">{error}</p> : null}
      <ScrollArea className="min-h-0 flex-1 px-4" viewportClassName="max-h-[50vh]">
        <ul className="flex flex-col gap-2 py-2">
          {messages.map((msg) => (
            <li
              key={msg.id}
              className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                msg.senderId === userId ? "ms-auto bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              {msg.body}
            </li>
          ))}
        </ul>
      </ScrollArea>
      <form onSubmit={(e) => void submit(e)} className="flex gap-2 border-t border-border p-4">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Mensaje a soporte…"
          className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm"
          maxLength={4000}
          disabled={loading}
        />
        <Button type="submit" size="sm" className="rounded-full" disabled={loading || !text.trim()}>
          Enviar
        </Button>
      </form>
    </div>
  )
}
