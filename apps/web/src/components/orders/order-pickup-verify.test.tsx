jest.mock("@/services/orders.service", () => ({
  verifyOrderPickup: jest.fn(),
}))

import { OrderPickupVerify } from "@/components/orders/order-pickup-verify"
import { verifyOrderPickup } from "@/services/orders.service"
import { render, screen, userEvent } from "@/test/test-utils"

const verifyMock = verifyOrderPickup as jest.MockedFunction<typeof verifyOrderPickup>

describe("OrderPickupVerify", () => {
  beforeEach(() => {
    verifyMock.mockReset()
  })

  it("muestra instrucciones y botón deshabilitado sin código completo", () => {
    render(<OrderPickupVerify orderId="o1" onVerified={jest.fn()} />)
    expect(screen.getByText(/código de retiro de 4 dígitos/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /confirmar entrega/i })).toBeDisabled()
  })

  it("verifica el código cuando tiene 4 dígitos", async () => {
    const user = userEvent.setup()
    const onVerified = jest.fn()
    verifyMock.mockResolvedValue({ id: "o1" } as never)

    render(<OrderPickupVerify orderId="o1" onVerified={onVerified} />)
    await user.type(screen.getByRole("textbox"), "1234")
    await user.click(screen.getByRole("button", { name: /confirmar entrega/i }))

    expect(verifyMock).toHaveBeenCalledWith("o1", "1234")
    expect(onVerified).toHaveBeenCalled()
  })
})
