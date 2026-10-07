import { OrderStepTimeline } from "@/components/orders/order-step-timeline"
import type { OrderStep } from "@/lib/messages-ui"
import { render, screen } from "@/test/test-utils"

const steps: OrderStep[] = [
  { id: "placed", label: "Pedido enviado", state: "done", at: "2026-10-01T12:00:00.000Z" },
  { id: "prep", label: "Preparando", state: "current", at: "2026-10-01T12:10:00.000Z" },
  { id: "ready", label: "Listo", state: "pending", at: null },
]

describe("OrderStepTimeline", () => {
  it("renderiza etiquetas en variante detallada", () => {
    render(<OrderStepTimeline steps={steps} />)
    expect(screen.getByText("Pedido enviado")).toBeInTheDocument()
    expect(screen.getByText("Preparando")).toBeInTheDocument()
    expect(screen.getByText("Listo")).toBeInTheDocument()
  })

  it("renderiza etiquetas en variante compacta", () => {
    render(<OrderStepTimeline steps={steps} variant="compact" />)
    expect(screen.getByText("Pedido enviado")).toBeInTheDocument()
    expect(screen.getByText("Preparando")).toBeInTheDocument()
  })
})
