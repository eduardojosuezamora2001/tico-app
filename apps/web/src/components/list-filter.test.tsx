import { ListFilter } from "@/components/list-filter"
import { render, screen } from "@/test/test-utils"

describe("ListFilter", () => {
  it("muestra empty cuando no hay ítems", () => {
    render(
      <ListFilter
        lists={[
          {
            id: "productos",
            label: "Productos",
            empty: "Sin productos.",
            items: [],
            text: (item: { name: string }) => item.name,
            group: () => null,
            render: () => null,
          },
        ]}
      />,
    )
    expect(screen.getByText("Sin productos.")).toBeInTheDocument()
  })

  it("renderiza ítems filtrables", () => {
    render(
      <ListFilter
        lists={[
          {
            id: "productos",
            label: "Productos",
            empty: "Sin productos.",
            items: [{ id: "1", name: "Café" }],
            text: (item) => item.name,
            group: () => null,
            render: (items) => (
              <ul>
                {items.map((item) => (
                  <li key={item.id}>{item.name}</li>
                ))}
              </ul>
            ),
          },
        ]}
      />,
    )
    expect(screen.getByText("Café")).toBeInTheDocument()
  })
})
