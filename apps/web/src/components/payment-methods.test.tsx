import { PaymentMethodOptions } from "@/components/payment-methods"
import { render, screen } from "@/test/test-utils"

describe("PaymentMethodOptions", () => {
  it("lista los métodos de pago disponibles", () => {
    render(
      <PaymentMethodOptions
        value={{
          paymentSinpe: false,
          paymentCash: true,
          paymentCard: false,
          paymentIban: false,
        }}
        onChange={jest.fn()}
      />,
    )
    expect(screen.getByText("Transferencia móvil")).toBeInTheDocument()
    expect(screen.getByText("Efectivo")).toBeInTheDocument()
    expect(screen.getByText("Tarjeta y datáfono")).toBeInTheDocument()
    expect(screen.getByText("Cuenta IBAN")).toBeInTheDocument()
  })
})
