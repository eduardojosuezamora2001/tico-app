import { render, screen } from "@testing-library/react"

import { OrderTabBadge } from "@/components/orders/order-tab-badge"

describe("OrderTabBadge", () => {
  it("no renderiza cuando el conteo es 0", () => {
    const { container } = render(<OrderTabBadge count={0} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("muestra el conteo cuando hay pedidos", () => {
    render(<OrderTabBadge count={3} />)
    expect(screen.getByText("3")).toBeInTheDocument()
  })

  it("capá el conteo en 99+", () => {
    render(<OrderTabBadge count={120} />)
    expect(screen.getByText("99+")).toBeInTheDocument()
  })
})
