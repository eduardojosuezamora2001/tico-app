import { render, type RenderOptions } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import type { ReactElement, ReactNode } from "react"

import { ThemeProvider } from "@/components/theme-provider"

type Options = Omit<RenderOptions, "wrapper"> & {
  route?: string
  routes?: string[]
}

function Providers({
  children,
  route = "/",
  routes,
}: {
  children: ReactNode
  route?: string
  routes?: string[]
}) {
  return (
    <MemoryRouter initialEntries={routes ?? [route]}>
      <ThemeProvider defaultTheme="light" storageKey="tico-test-theme">
        {children}
      </ThemeProvider>
    </MemoryRouter>
  )
}

export function renderWithProviders(ui: ReactElement, options: Options = {}) {
  const { route, routes, ...rest } = options
  return render(ui, {
    wrapper: ({ children }) => (
      <Providers route={route} routes={routes}>
        {children}
      </Providers>
    ),
    ...rest,
  })
}

export * from "@testing-library/react"
export { default as userEvent } from "@testing-library/user-event"
