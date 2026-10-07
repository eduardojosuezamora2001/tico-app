jest.mock("@/components/chain-setup-dialog", () => ({
  ChainSetupDialog: () => null,
}))

import { MerchantHomeDashboard } from "@/components/merchant-home-dashboard"
import { renderWithProviders, screen } from "@/test/test-utils"

describe("MerchantHomeDashboard", () => {
  it("muestra empty state sin negocios", () => {
    renderWithProviders(
      <MerchantHomeDashboard memberships={[]} chains={[]} loading={false} onRefresh={jest.fn()} />,
    )
    expect(screen.getByText(/mis negocios/i)).toBeInTheDocument()
    expect(screen.getByText(/aún no tienes negocios/i)).toBeInTheDocument()
  })
})
