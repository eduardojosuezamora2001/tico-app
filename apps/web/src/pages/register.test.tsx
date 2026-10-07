/// <reference types="jest" />

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signUp: jest.fn().mockResolvedValue({ error: null }),
      signInWithOAuth: jest.fn().mockResolvedValue({ error: null }),
    },
  },
}))

jest.mock("@/components/google-sign-in-button", () => ({
  GoogleSignInButton: () => <div>Google</div>,
}))

import { RegisterPage } from "@/pages/register"
import { renderWithProviders, screen } from "@/test/test-utils"

describe("RegisterPage", () => {
  it("renderiza el registro", () => {
    renderWithProviders(<RegisterPage />)
    expect(screen.getByRole("heading", { name: /crear cuenta/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/correo/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /registrarme/i })).toBeInTheDocument()
  })
})
