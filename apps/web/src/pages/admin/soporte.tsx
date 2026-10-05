import { AdminSupportInbox } from "@/components/admin/admin-support-inbox"

export function AdminSoportePage() {
  return (
    <div className="flex h-[calc(100svh-7rem)] min-h-[32rem] flex-col gap-4">
      <div>
        <h2 className="text-2xl font-semibold text-white">Soporte plataforma</h2>
        <p className="mt-1 text-sm text-[oklch(0.7_0.02_280)]">
          Mensajes de usuarios con el equipo TicoApp (misma experiencia que Mensajes).
        </p>
      </div>
      <AdminSupportInbox />
    </div>
  )
}
