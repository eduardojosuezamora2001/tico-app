jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn().mockResolvedValue({ error: null }),
      signInWithOAuth: jest.fn().mockResolvedValue({ error: null }),
    },
  },
}))

jest.mock("@/stores/auth-store", () => ({
  useAuthStore: (selector: (state: { status: string }) => unknown) =>
    selector({ status: "anonymous" }),
}))

jest.mock("@/components/google-sign-in-button", () => ({
  GoogleSignInButton: () => <div>Google</div>,
}))

import { LoginPage } from "@/pages/login"
import { renderWithProviders, screen } from "@/test/test-utils"

describe("LoginPage", () => {
  it("renderiza el formulario de acceso", () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByRole("heading", { name: /entrar/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/correo/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/contraseña/i)).toBeInTheDocument()
  })
})
