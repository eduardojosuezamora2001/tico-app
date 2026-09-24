import type { Session } from "@supabase/supabase-js"
import type { User } from "@workspace/shared"
import { create } from "zustand"

import { toUser } from "@/lib/mappers"
import { supabase } from "@/lib/supabase"

export type AuthStatus = "loading" | "authenticated" | "unauthenticated"

interface AuthState {
  status: AuthStatus
  session: Session | null
  /** Perfil de `public.users` (rol global, nombre, idioma). */
  profile: User | null
  /** Suscribe al estado de Supabase Auth. Devuelve la funcion para desuscribir. */
  initialize: () => () => void
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

async function fetchProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    console.error("No se pudo cargar el perfil", error)
    return null
  }
  return data ? toUser(data) : null
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "loading",
  session: null,
  profile: null,

  initialize: () => {
    const applySession = async (session: Session | null) => {
      if (!session) {
        set({ status: "unauthenticated", session: null, profile: null })
        return
      }
      const profile = await fetchProfile(session.user.id)
      set({ status: "authenticated", session, profile })
    }

    void supabase.auth.getSession().then(({ data }) => applySession(data.session))

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session)
    })

    return () => data.subscription.unsubscribe()
  },

  refreshProfile: async () => {
    const userId = get().session?.user.id
    if (!userId) return
    set({ profile: await fetchProfile(userId) })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ status: "unauthenticated", session: null, profile: null })
  },
}))
