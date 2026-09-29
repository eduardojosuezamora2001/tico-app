import { MessagesOrderPanel, type MessagesOrderPanelProps } from "@/components/messages/messages-order-panel"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@workspace/ui/components/empty"

export function MessagesOrderSidebar(props: MessagesOrderPanelProps) {
  if (!props.conversation) {
    return (
      <aside className="hidden w-[22rem] shrink-0 flex-col border-l border-border bg-card/30 xl:flex">
        <Empty className="m-4 flex-1 border border-dashed border-border">
          <EmptyHeader>
            <EmptyTitle>Sin pedido seleccionado</EmptyTitle>
            <EmptyDescription>
              El detalle del pedido aparece cuando chateas con un comercio y envías productos al chat.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </aside>
    )
  }

  return (
    <aside className="hidden w-[22rem] shrink-0 flex-col border-l border-border bg-card/30 xl:flex">
      <MessagesOrderPanel {...props} />
    </aside>
  )
}
