import { useEffect, useMemo, useState, type SubmitEvent } from "react"
import { useNavigate, useParams } from "react-router"
import {
  isPickupOtpEnabled,
  MODULES,
  parseMessageContent,
  type Business,
  type ChatOrder,
  type Conversation,
  type Message,
} from "@workspace/shared"

import { MessagesChatPanel } from "@/components/messages/messages-chat-panel"
import { MessagesConversationSidebar } from "@/components/messages/messages-conversation-sidebar"
import { MessagesOrderSidebar } from "@/components/messages/messages-order-sidebar"
import { MessagesStatusBanner } from "@/components/messages/messages-status-banner"
import { SiteHeader } from "@/components/site-header"
import { getBusiness } from "@/services/businesses.service"
import {
  claimConversation,
  findConversationByBusiness,
  getConversation,
  listConversations,
  markConversationRead,
  replyToConversation,
  sendMessage,
  takeConversation,
} from "@/services/messages.service"
import { listBusinessModules } from "@/services/modules.service"
import { listConversationOrders } from "@/services/orders.service"
import {
  canCompose,
  errorMessage,
  foldConversation,
  foldMessage,
  type IncomingMessage,
  type IncomingOrder,
} from "@/lib/chat-events"
import {
  filterUndeliveredConversationOrders,
  mergeConversationOrders,
  type ConversationTab,
} from "@/lib/messages-ui"
import { useOnlineUsers } from "@/lib/presence"
import { chatSocket } from "@/lib/socket"
import { useAuthStore } from "@/stores/auth-store"
import { useCartStore } from "@/stores/cart-store"

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
  const carts = useCartStore((s) => s.carts)
  const online = useOnlineUsers()
  const [items, setItems] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [orders, setOrders] = useState<ChatOrder[]>([])
  const [business, setBusiness] = useState<Business | null>(null)
  const [listReady, setListReady] = useState(false)
  const [threadReady, setThreadReady] = useState(false)
  const [businessReady, setBusinessReady] = useState(false)
  const [draftReady, setDraftReady] = useState(false)
  const [draftName, setDraftName] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [tab, setTab] = useState<ConversationTab>("active")
  const [text, setText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pickupOtpEnabled, setPickupOtpEnabled] = useState(false)

  const open = Boolean(conversationId || draftBusinessId)
  const listed = items.find((item) => item.id === conversationId)
  const role = listed?.viewerRole
  const activeBusinessId = draftBusinessId || listed?.businessId || ""
  const cartLines = activeBusinessId ? (carts[activeBusinessId] ?? []) : []
  const isCustomerView = listed?.viewerRole === "customer" || Boolean(draftBusinessId)

  useEffect(() => {
    if (!activeBusinessId) {
      setPickupOtpEnabled(false)
      return
    }
    void listBusinessModules(activeBusinessId)
      .then((rows) => {
        const products = rows.find((row) => row.moduleName === MODULES.PRODUCTS)
        setPickupOtpEnabled(isPickupOtpEnabled(products))
      })
      .catch(() => setPickupOtpEnabled(false))
  }, [activeBusinessId])

  useEffect(() => {
    void listConversations()
      .then(setItems)
      .catch(() => setError("No se pudieron cargar las conversaciones."))
      .finally(() => setListReady(true))
  }, [])

  useEffect(() => {
    if (!draftBusinessId) return
    let live = true
    setDraftReady(false)
    void findConversationByBusiness(draftBusinessId)
      .then((existing) => {
        if (!live) return
        const id = existing?.id
        if (id) navigate(`/mensajes/${id}`, { replace: true })
        else setDraftReady(true)
      })
      .catch(() => {
        if (live) setError("No se pudo abrir el chat del local.")
      })
    void getBusiness(draftBusinessId)
      .then((detail) => {
        if (live) setDraftName(detail.business.name)
      })
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [draftBusinessId, navigate])

  useEffect(() => {
    if (!activeBusinessId || !isCustomerView) {
      setBusiness(null)
      setBusinessReady(true)
      return
    }
    let live = true
    setBusinessReady(false)
    void getBusiness(activeBusinessId)
      .then((detail) => {
        if (live) setBusiness(detail.business)
      })
      .catch(() => {
        if (live) setBusiness(null)
      })
      .finally(() => {
        if (live) setBusinessReady(true)
      })
    return () => {
      live = false
    }
  }, [activeBusinessId, isCustomerView])

  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      setOrders([])
      setThreadReady(false)
      return
    }
    if (!listReady) return
    if (role === "member") {
      setMessages([])
      setOrders([])
      setThreadReady(true)
      return
    }
    let live = true
    setThreadReady(false)
    void getConversation(conversationId)
      .then((payload) => {
        if (!live) return
        setMessages(payload.messages)
        setOrders(payload.orders ?? [])
        setItems((current) =>
          foldConversation(current, payload.conversation).map((item) =>
            item.id === payload.conversation.id ? { ...item, unreadCount: 0 } : item,
          ),
        )
      })
      .catch((caught) => {
        if (!live) return
        setMessages([])
        setOrders([])
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
        if (parseMessageContent(event.message.text).kind === "order") {
          void listConversationOrders(conversationId)
            .then(setOrders)
            .catch(() => undefined)
        }
        const counts = event.conversation.viewerRole === "customer" || event.conversation.viewerRole === "assignee"
        if (counts && event.message.senderId !== userId) {
          void markConversationRead(conversationId)
        }
      }
      const onConversation = (conversation: Conversation) => {
        setItems((current) => foldConversation(current, conversation))
        if (conversation.id === conversationId && conversation.viewerRole === "member") setMessages([])
      }
      const onMessageUpdated = (event: IncomingMessage) => {
        setItems((current) => foldConversation(current, event.conversation))
        if (event.conversation.id !== conversationId) return
        setMessages((current) =>
          current.map((item) => (item.id === event.message.id ? event.message : item)),
        )
      }
      const onOrderUpdated = (event: IncomingOrder) => {
        setItems((current) => foldConversation(current, event.conversation))
        if (event.conversation.id !== conversationId) return
        setOrders((current) => {
          const index = current.findIndex((item) => item.id === event.order.id)
          if (index === -1) return [...current, event.order]
          return current.map((item) => (item.id === event.order.id ? event.order : item))
        })
        if (event.message) {
          setMessages((current) =>
            current.map((item) => (item.id === event.message!.id ? event.message! : item)),
          )
        }
      }
      socket.on("message:new", onMessage)
      socket.on("message:updated", onMessageUpdated)
      socket.on("order:updated", onOrderUpdated)
      socket.on("conversation:updated", onConversation)
      detach = () => {
        socket.off("message:new", onMessage)
        socket.off("message:updated", onMessageUpdated)
        socket.off("order:updated", onOrderUpdated)
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
      const conversation = await claimConversation(id)
      setItems((current) => foldConversation(current, conversation))
      navigate(`/mensajes/${id}`)
    } catch (caught) {
      setError(errorMessage(caught, "No se pudo atender."))
    }
  }

  async function take(id: string) {
    setError(null)
    try {
      const conversation = await takeConversation(id)
      setItems((current) => foldConversation(current, conversation))
      navigate(`/mensajes/${id}`)
    } catch (caught) {
      setError(errorMessage(caught, "No se pudo tomar el chat."))
    }
  }

  async function send(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = text.trim()
    if (!body) return
    setText("")
    try {
      if (draftBusinessId) {
        const result = await sendMessage({
          businessId: draftBusinessId,
          text: body,
        })
        navigate(`/mensajes/${result.conversation.id}`, { replace: true })
        return
      }
      if (!listed || !canCompose(listed)) return
      const result =
        listed.viewerRole === "customer"
          ? await sendMessage({ businessId: listed.businessId, text: body })
          : await replyToConversation(listed.id, body)
      const message = result.message
      setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]))
      setItems((current) => foldConversation(current, result.conversation))
    } catch (caught) {
      setError(errorMessage(caught, "No se pudo enviar."))
      setText(body)
    }
  }

  const cartByBusiness = useMemo(() => carts, [carts])

  function handleOrderUpdated(messageId: string, text: string) {
    setMessages((current) => current.map((item) => (item.id === messageId ? { ...item, text } : item)))
  }

  function handleOrderRecordUpdated(order: ChatOrder) {
    setOrders((current) => {
      const index = current.findIndex((item) => item.id === order.id)
      if (index === -1) return [...current, order]
      return current.map((item) => (item.id === order.id ? order : item))
    })
  }

  const conversationOrders = useMemo(() => mergeConversationOrders(orders, messages), [orders, messages])
  const activeConversationOrders = useMemo(
    () => filterUndeliveredConversationOrders(conversationOrders),
    [conversationOrders],
  )
  const ordersByMessageId = useMemo(
    () => Object.fromEntries(conversationOrders.map((order) => [order.messageId, order])),
    [conversationOrders],
  )

  const orderPanelProps =
    isCustomerView || draftBusinessId
      ? {
          conversation: listed ?? null,
          business,
          orders: activeConversationOrders,
          cartLines,
          loading: !businessReady || (!!conversationId && !threadReady),
          pickupOtpEnabled,
        }
      : null

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <div className={open ? "max-md:hidden" : undefined}>
        <SiteHeader />
        <MessagesStatusBanner />
      </div>
      <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <aside
            className={`${open ? "hidden md:flex" : "flex"} h-full min-h-0 w-full shrink-0 overflow-hidden md:w-auto`}
          >
            <MessagesConversationSidebar
              items={items}
              selectedId={conversationId}
              loading={!listReady}
              query={query}
              tab={tab}
              online={online}
              cartByBusiness={cartByBusiness}
              onQueryChange={setQuery}
              onTabChange={setTab}
              onClaim={(id) => void claim(id)}
              onTake={(id) => void take(id)}
            />
          </aside>

          <MessagesChatPanel
            conversationId={conversationId}
            draftBusinessId={draftBusinessId}
            draftName={draftName}
            draftReady={draftReady}
            active={listed}
            messages={messages}
            business={business}
            cartLines={cartLines}
            threadReady={threadReady}
            userId={userId}
            profileName={profile?.fullName ?? null}
            profileAvatar={profile?.avatarUrl}
            text={text}
            error={error}
            online={Boolean(listed?.assigneeId && online.has(listed.assigneeId))}
            onTextChange={setText}
            onSend={(event) => void send(event)}
            onClaim={(id) => void claim(id)}
            onTake={(id) => void take(id)}
            ordersByMessageId={ordersByMessageId}
            onOrderUpdated={handleOrderUpdated}
            onOrderRecordUpdated={handleOrderRecordUpdated}
            orderPanel={orderPanelProps}
            pickupOtpEnabled={pickupOtpEnabled}
          />
        </div>

        {orderPanelProps ? <MessagesOrderSidebar {...orderPanelProps} /> : null}
      </div>
    </div>
  )
}
