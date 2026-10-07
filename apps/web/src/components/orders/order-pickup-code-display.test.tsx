import {
  OrderPickupCodeDisplay,
  OrderPickupCodePending,
} from "@/components/orders/order-pickup-code-display"
import { render, screen } from "@/test/test-utils"

describe("OrderPickupCodeDisplay", () => {
  it("muestra el código de retiro", () => {
    render(<OrderPickupCodeDisplay code="4821" />)
    expect(screen.getByText("Código de retiro")).toBeInTheDocument()
    expect(screen.getByText("4821")).toBeInTheDocument()
  })
})

describe("OrderPickupCodePending", () => {
  it("explica que el código aún no está listo", () => {
    render(<OrderPickupCodePending />)
    expect(
      screen.getByText(/aparecerá cuando el local marque tu pedido/i),
    ).toBeInTheDocument()
  })
})
