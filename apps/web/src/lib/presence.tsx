import { useEffect, useState } from "react"

import { chatSocket } from "@/lib/socket"
import { useAuthStore } from "@/stores/auth-store"

export function useOnlineUsers() {
  const status = useAuthStore((s) => s.status)
  const token = useAuthStore((s) => s.session?.access_token)
  const [online, setOnline] = useState<ReadonlySet<string>>(new Set())

  useEffect(() => {
    if (status !== "authenticated") {
      setOnline(new Set())
      return
    }
    let live = true
    let detach = () => {}
    void chatSocket().then((socket) => {
      if (!socket || !live) return
      const onState = (payload: { userIds?: string[] }) => {
        setOnline(new Set(payload.userIds ?? []))
      }
      const onPresence = (payload: { userId?: string; online?: boolean }) => {
        const id = payload.userId
        if (!id) return
        setOnline((current) => {
          const next = new Set(current)
          if (payload.online) next.add(id)
          else next.delete(id)
          return next
        })
      }
      const hello = () => socket.emit("presence:hello")
      socket.on("presence:state", onState)
      socket.on("presence", onPresence)
      socket.on("connect", hello)
      hello()
      detach = () => {
        socket.off("presence:state", onState)
        socket.off("presence", onPresence)
        socket.off("connect", hello)
      }
    })
    return () => {
      live = false
      detach()
    }
  }, [status, token])

  return online
}

export function OnlineDot({ on }: { on: boolean }) {
  if (!on) return null
  return (
    <span
      className="inline-block size-2 shrink-0 rounded-full bg-emerald-600"
      title="En línea"
      aria-label="En línea"
    />
  )
}
