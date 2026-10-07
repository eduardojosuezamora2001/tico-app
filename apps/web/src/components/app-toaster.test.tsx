import { AppToaster } from "@/components/app-toaster"
import { renderWithProviders } from "@/test/test-utils"

describe("AppToaster", () => {
  it("monta el toaster sin fallar", () => {
    const { container } = renderWithProviders(<AppToaster />)
    expect(container).toBeTruthy()
  })
})
