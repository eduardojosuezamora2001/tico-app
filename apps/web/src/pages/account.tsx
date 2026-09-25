import { useState } from "react"
import { Link } from "react-router"

import { SiteHeader } from "@/components/site-header"
import { api } from "@/lib/api"
import { useAuthStore } from "@/stores/auth-store"
import { Button } from "@workspace/ui/components/button"

export function AccountPage() {
  const profile = useAuthStore((s) => s.profile)
  const signOut = useAuthStore((s) => s.signOut)
  const refreshProfile = useAuthStore((s) => s.refreshProfile)
  const [fullName, setFullName] = useState(profile?.fullName ?? "")
  const [saved, setSaved] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    await api.patch("/me", { fullName })
    await refreshProfile()
    setSaved(true)
  }

  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-2xl font-semibold">Mi cuenta</h1>
        <p className="mt-2 text-sm text-muted-foreground">{profile?.email}</p>
        <form className="mt-6 space-y-3" onSubmit={(event) => void onSubmit(event)}>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nombre" className="w-full rounded-xl border border-border bg-card px-3 py-2" />
          <Button type="submit">Guardar</Button>
          {saved ? <p className="text-sm text-muted-foreground">Nombre actualizado.</p> : null}
        </form>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" render={<Link to="/mi-negocio" />}>Mis negocios</Button>
          <Button variant="ghost" onClick={() => void signOut()}>Cerrar sesión</Button>
        </div>
      </main>
    </div>
  )
}
