import type { FormEvent } from "react"
import type { Message as ChatMessage } from "@workspace/shared"
import { SentIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Bubble, BubbleContent } from "@workspace/ui/components/bubble"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@workspace/ui/components/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
import { Marker, MarkerContent } from "@workspace/ui/components/marker"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
} from "@workspace/ui/components/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@workspace/ui/components/message-scroller"

export function initials(name: string | null) {
  const parts = (name ?? "C").trim().split(/\s+/).slice(0, 2)
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "C"
}

function dayKey(iso: string) {
  const date = new Date(iso)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function dayLabel(iso: string) {
  const date = new Date(iso)
  const start = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()
  const diff = Math.round((start(new Date()) - start(date)) / 86_400_000)
  if (diff === 0) return "Hoy"
  if (diff === 1) return "Ayer"
  return new Intl.DateTimeFormat("es-CR", { day: "numeric", month: "short" }).format(date)
}

function clock(iso: string) {
  return new Intl.DateTimeFormat("es-CR", { hour: "numeric", minute: "2-digit" }).format(new Date(iso))
}

type ThreadEntry =
  | { kind: "day"; id: string; label: string }
  | { kind: "message"; message: ChatMessage; showAvatar: boolean }

function entriesOf(messages: ChatMessage[]): ThreadEntry[] {
  const entries: ThreadEntry[] = []
  let day = ""
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index]
    if (!message) continue
    const nextDay = dayKey(message.createdAt)
    if (nextDay !== day) {
      day = nextDay
      entries.push({ kind: "day", id: `day:${nextDay}`, label: dayLabel(message.createdAt) })
    }
    const next = messages[index + 1]
    const showAvatar =
      !next || next.senderId !== message.senderId || dayKey(next.createdAt) !== nextDay
    entries.push({ kind: "message", message, showAvatar })
  }
  return entries
}

export function PersonAvatar({
  name,
  src,
  size = "default",
}: {
  name: string | null
  src?: string | null
  size?: "sm" | "default" | "lg"
}) {
  return (
    <Avatar size={size}>
      {src ? <AvatarImage src={src} alt={name ?? "Contacto"} /> : null}
      <AvatarFallback>{initials(name)}</AvatarFallback>
    </Avatar>
  )
}

export function MessageThread({
  threadKey,
  messages,
  userId,
  peerName,
  selfName,
  selfAvatar,
  nameFor,
}: {
  threadKey: string
  messages: ChatMessage[]
  userId: string | undefined
  peerName: string | null
  selfName: string | null
  selfAvatar?: string | null
  nameFor?: (message: ChatMessage) => string | null
}) {
  if (messages.length === 0) {
    return (
      <Empty className="min-h-0 flex-1 border-0">
        <EmptyHeader>
          <EmptyTitle>Sin mensajes</EmptyTitle>
          <EmptyDescription>Escribe el primer mensaje de esta conversación.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <MessageScrollerProvider key={threadKey} autoScroll defaultScrollPosition="end">
      <MessageScroller className="min-h-0 flex-1">
        <MessageScrollerViewport>
          <MessageScrollerContent className="gap-3 px-4 py-4 [&>[data-slot=message-scroller-item]:first-child]:mt-auto">
            {entriesOf(messages).map((entry) =>
              entry.kind === "day" ? (
                <MessageScrollerItem key={entry.id} messageId={entry.id}>
                  <Marker variant="separator">
                    <MarkerContent>{entry.label}</MarkerContent>
                  </Marker>
                </MessageScrollerItem>
              ) : (
                <ThreadMessage
                  key={entry.message.id}
                  message={entry.message}
                  showAvatar={entry.showAvatar}
                  mine={entry.message.senderId === userId}
                  peerName={nameFor?.(entry.message) ?? peerName}
                  selfName={selfName}
                  selfAvatar={selfAvatar}
                />
              ),
            )}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  )
}

function ThreadMessage({
  message,
  showAvatar,
  mine,
  peerName,
  selfName,
  selfAvatar,
}: {
  message: ChatMessage
  showAvatar: boolean
  mine: boolean
  peerName: string | null
  selfName: string | null
  selfAvatar?: string | null
}) {
  const align = mine ? "end" : "start"
  return (
    <MessageScrollerItem messageId={message.id}>
      <Message align={align}>
        {showAvatar ? (
          <MessageAvatar>
            <PersonAvatar
              name={mine ? selfName : peerName}
              src={mine ? selfAvatar : null}
              size="sm"
            />
          </MessageAvatar>
        ) : (
          <MessageAvatar />
        )}
        <MessageContent>
          <Bubble variant={mine ? "default" : "muted"} align={align}>
            <BubbleContent className="whitespace-pre-wrap">{message.text}</BubbleContent>
          </Bubble>
          {showAvatar ? (
            <MessageFooter>
              {clock(message.createdAt)}
              {mine && message.isRead ? " · Leído" : ""}
            </MessageFooter>
          ) : null}
        </MessageContent>
      </Message>
    </MessageScrollerItem>
  )
}

export function MessageComposer({
  value,
  onChange,
  onSubmit,
  placeholder = "Escribe un mensaje",
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
  placeholder?: string
}) {
  return (
    <form className="px-4 py-3" onSubmit={onSubmit}>
      <InputGroup className="h-10 rounded-full">
        <InputGroupInput
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-label="Mensaje"
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton type="submit" size="icon-sm" disabled={!value.trim()} aria-label="Enviar">
            <HugeiconsIcon icon={SentIcon} strokeWidth={2} />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}
