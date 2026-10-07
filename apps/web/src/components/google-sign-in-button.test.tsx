const signInWithOAuth = jest.fn().mockResolvedValue({ error: null })

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithOAuth: (...args: unknown[]) => signInWithOAuth(...args),
    },
  },
}))

import { GoogleSignInButton } from "@/components/google-sign-in-button"
import { render, screen, userEvent } from "@/test/test-utils"

describe("GoogleSignInButton", () => {
  beforeEach(() => {
    signInWithOAuth.mockClear()
  })

  it("muestra el CTA de Google", () => {
    render(<GoogleSignInButton />)
    expect(screen.getByRole("button", { name: /continuar con google/i })).toBeInTheDocument()
  })

  it("inicia OAuth al hacer click", async () => {
    const user = userEvent.setup()
    render(<GoogleSignInButton />)
    await user.click(screen.getByRole("button", { name: /continuar con google/i }))
    expect(signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "google",
      }),
    )
  })
})
