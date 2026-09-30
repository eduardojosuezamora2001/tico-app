import { useState } from "react"

import { verifyOrderPickup } from "@/services/orders.service"
import { Button } from "@workspace/ui/components/button"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@workspace/ui/components/input-otp"

export function OrderPickupVerify({
  orderId,
  disabled,
  onVerified,
}: {
  orderId: string
  disabled?: boolean
  onVerified: (order: Awaited<ReturnType<typeof verifyOrderPickup>>) => void
}) {
  const [code, setCode] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (code.length !== 4) return
    setPending(true)
    setError(null)
    try {
      const order = await verifyOrderPickup(orderId, code)
      setCode("")
      onVerified(order)
    } catch {
      setError("Código incorrecto o no válido.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">Pide al cliente el código de retiro de 4 dígitos.</p>
      <InputOTP
        maxLength={4}
        value={code}
        onChange={setCode}
        disabled={disabled || pending}
        inputMode="numeric"
        pattern="[0-9]*"
      >
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
        </InputOTPGroup>
      </InputOTP>
      <Button
        type="button"
        size="sm"
        className="w-fit rounded-full"
        disabled={disabled || pending || code.length !== 4}
        onClick={() => void submit()}
      >
        {pending ? "Verificando…" : "Confirmar entrega"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
