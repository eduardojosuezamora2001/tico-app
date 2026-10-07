import { ORDER_FULFILLMENT_STAGE, ORDER_STATUS } from "@workspace/shared"

import { isOrderOpen, orderFingerprint } from "@/lib/orders-inbox"

describe("orders-inbox helpers", () => {
  it("arma fingerprint estable", () => {
    expect(
      orderFingerprint({
        status: ORDER_STATUS.accepted,
        fulfillmentStage: ORDER_FULFILLMENT_STAGE.preparing,
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toContain(ORDER_STATUS.accepted)
  })

  it("detecta pedidos abiertos", () => {
    expect(
      isOrderOpen({
        status: ORDER_STATUS.accepted,
        fulfillmentStage: ORDER_FULFILLMENT_STAGE.preparing,
      }),
    ).toBe(true)
    expect(
      isOrderOpen({
        status: ORDER_STATUS.denied,
        fulfillmentStage: null,
      }),
    ).toBe(false)
  })
})
