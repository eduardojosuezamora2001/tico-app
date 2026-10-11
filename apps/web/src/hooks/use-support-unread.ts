import { useEffect, useState } from "react"

import { supabase } from "@/lib/supabase"
import { countSupportUnreadForAdmin } from "@/services/support.service"
import { useAuthStore } from "@/stores/auth-store"

/** Contador global de no leídos de soporte para el shell admin. */
export function useSupportUnread() {
  const role = useAuthStore((s) => s.profile?.role)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (role !== "admin") {
      setUnread(0)
      return
    }

    let live = true
    const refresh = () => {
      void countSupportUnreadForAdmin()
        .then((total) => {
          if (live) setUnread(total)
        })
        .catch(() => {
          if (live) setUnread(0)
        })
    }

    refresh()

    const channel = supabase
      .channel("admin-support-unread")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_messages" },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_threads" },
        () => refresh(),
      )
      .subscribe()

    return () => {
      live = false
      void supabase.removeChannel(channel)
    }
  }, [role])

  return unread
}
