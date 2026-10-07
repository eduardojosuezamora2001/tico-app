jest.mock("@/services/businesses.service", () => ({
  suggestCatalog: jest.fn().mockResolvedValue([]),
}))

import { HeaderSearch } from "@/components/header-search"
import { renderWithProviders, screen } from "@/test/test-utils"

describe("HeaderSearch", () => {
  it("renderiza el buscador del header", () => {
    renderWithProviders(<HeaderSearch />)
    expect(screen.getByRole("combobox")).toBeInTheDocument()
  })
})
