import { Button } from "@workspace/ui/components/button"

import { useAuthStore } from "@/stores/auth-store"

/** Ruta protegida de ejemplo: muestra el perfil y permite cerrar sesion. */
export function AccountPage() {
  const profile = useAuthStore((s) => s.profile)
  const signOut = useAuthStore((s) => s.signOut)

  return (
    <main className="flex min-h-svh flex-col gap-4 p-6 text-sm leading-loose">
      <h1 className="font-medium">Mi cuenta</h1>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4">
        <dt className="text-muted-foreground">Email</dt>
        <dd>{profile?.email}</dd>
        <dt className="text-muted-foreground">Nombre</dt>
        <dd>{profile?.fullName ?? "—"}</dd>
        <dt className="text-muted-foreground">Rol</dt>
        <dd>{profile?.role}</dd>
      </dl>
      <Button className="w-fit" onClick={() => void signOut()}>
        Cerrar sesion
      </Button>
    </main>
  )
}
