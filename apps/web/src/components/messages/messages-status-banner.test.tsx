import { MessagesStatusBanner } from "@/components/messages/messages-status-banner"
import { render, screen } from "@/test/test-utils"

describe("MessagesStatusBanner", () => {
  it("muestra el canal oficial", () => {
    render(<MessagesStatusBanner />)
    expect(screen.getByText("Canal oficial TicoApp CR")).toBeInTheDocument()
  })
})
