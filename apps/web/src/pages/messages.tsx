import { useEffect, useMemo, useState, type SubmitEvent } from "react"
import { useNavigate, useParams } from "react-router"
import {
  isPickupOtpEnabled,
  MODULES,
  type Business,
  type ChatOrder,
} from "@workspace/shared"

import { MessagesChatPanel } from "@/components/messages/messages-chat-panel"
import { MessagesConversationSidebar } from "@/components/messages/messages-conversation-sidebar"
import { MessagesOrderSidebar } from "@/components/messages/messages-order-sidebar"
import { MessagesStatusBanner } from "@/components/messages/messages-status-banner"
import { SiteHeader } from "@/components/site-header"
import {
  useBusinessDetailQuery,
  useConversationThreadQuery,
  useConversationsQuery,
  prefetchConversationThread,
} from "@/hooks/use-conversations-query"
import {
  appendThreadMessage,
  patchThreadMessageText,
  patchThreadOrder,
  updateConversationsCache,
  upsertConversationInCaches,
} from "@/lib/message-cache"
import { setViewingConversation } from "@/lib/chat-view"
import { canCompose, errorMessage, foldConversation } from "@/lib/chat-events"
import {
  filterUndeliveredConversationOrders,
  mergeConversationOrders,
  type ConversationTab,
} from "@/lib/messages-ui"
import { useOnlineUsers } from "@/lib/presence"
import { queryClient } from "@/lib/query-client"
import {
  claimConversation,
  findConversationByBusiness,
  replyToConversation,
  sendMessage,
  takeConversation,
} from "@/services/messages.service"
import { listBusinessModules } from "@/services/modules.service"
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
  const authStatus = useAuthStore((s) => s.status)
  const profile = useAuthStore((s) => s.profile)
  const carts = useCartStore((s) => s.carts)
  const online = useOnlineUsers()
  const [query, setQuery] = useState("")
  const [tab, setTab] = useState<ConversationTab>("active")
  const [text, setText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pickupOtpEnabled, setPickupOtpEnabled] = useState(false)
  const [draftReady, setDraftReady] = useState(false)
  const [draftName, setDraftName] = useState<string | null>(null)

  const conversationsQuery = useConversationsQuery(authStatus === "authenticated")
  const items = conversationsQuery.data ?? []
  const listReady = !conversationsQuery.isPending

  const listed = items.find((item) => item.id === conversationId)
  const role = listed?.viewerRole
  const open = Boolean(conversationId || draftBusinessId)
  const activeBusinessId = draftBusinessId || listed?.businessId || ""
  const cartLines = activeBusinessId ? (carts[activeBusinessId] ?? []) : []
  const isCustomerView = listed?.viewerRole === "customer" || Boolean(draftBusinessId)

  const threadEnabled = Boolean(conversationId) && role !== "member"
  const threadQuery = useConversationThreadQuery(conversationId, threadEnabled)
  const messages = threadQuery.data?.messages ?? []
  const orders = threadQuery.data?.orders ?? []
  const threadReady =
    !conversationId || role === "member" || !threadQuery.isPending || Boolean(threadQuery.data)

  const businessQuery = useBusinessDetailQuery(activeBusinessId, Boolean(activeBusinessId) && isCustomerView)
  const business: Business | null = businessQuery.data?.business ?? null
  const businessReady = !isCustomerView || !activeBusinessId || !businessQuery.isPending

  useEffect(() => {
    setViewingConversation(conversationId || null)
    return () => setViewingConversation(null)
  }, [conversationId])

  useEffect(() => {
    if (threadQuery.isError) {
      const message = errorMessage(threadQuery.error, "No se pudo abrir la conversación.")
      if (!message.includes("atiende")) setError(message)
    }
  }, [threadQuery.isError, threadQuery.error])

  useEffect(() => {
    if (!conversationId || !threadQuery.data) return
    updateConversationsCache(queryClient, (current) =>
      foldConversation(current, threadQuery.data.conversation).map((item) =>
        item.id === threadQuery.data!.conversation.id ? { ...item, unreadCount: 0 } : item,
      ),
    )
  }, [conversationId, threadQuery.data])

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
    if (!draftBusinessId) {
      setDraftReady(false)
      setDraftName(null)
      return
    }
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
    return () => {
      live = false
    }
  }, [draftBusinessId, navigate])

  useEffect(() => {
    if (draftBusinessId && business?.name) setDraftName(business.name)
  }, [draftBusinessId, business?.name])

  useEffect(() => {
    if (conversationsQuery.isError) {
      setError("No se pudieron cargar las conversaciones.")
    }
  }, [conversationsQuery.isError])

  async function claim(id: string) {
    setError(null)
    try {
      const conversation = await claimConversation(id)
      upsertConversationInCaches(queryClient, conversation)
      void prefetchConversationThread(id)
      navigate(`/mensajes/${id}`)
    } catch (caught) {
      setError(errorMessage(caught, "No se pudo atender."))
    }
  }

  async function take(id: string) {
    setError(null)
    try {
      const conversation = await takeConversation(id)
      upsertConversationInCaches(queryClient, conversation)
      void prefetchConversationThread(id)
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
        appendThreadMessage(queryClient, result.conversation.id, result.message, result.conversation)
        navigate(`/mensajes/${result.conversation.id}`, { replace: true })
        return
      }
      if (!listed || !canCompose(listed)) return
      const result =
        listed.viewerRole === "customer"
          ? await sendMessage({ businessId: listed.businessId, text: body })
          : await replyToConversation(listed.id, body)
      appendThreadMessage(queryClient, listed.id, result.message, result.conversation)
    } catch (caught) {
      setError(errorMessage(caught, "No se pudo enviar."))
      setText(body)
    }
  }

  const cartByBusiness = useMemo(() => carts, [carts])

  function handleOrderUpdated(messageId: string, textValue: string) {
    if (!conversationId) return
    patchThreadMessageText(queryClient, conversationId, messageId, textValue)
  }

  function handleOrderRecordUpdated(order: ChatOrder) {
    if (!conversationId) return
    patchThreadOrder(queryClient, conversationId, order)
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
              onPrefetch={(id) => void prefetchConversationThread(id)}
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
