import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router"
import type { BusinessChain } from "@workspace/shared"
import { toast } from "sonner"

import { getApiErrorMessage } from "@/lib/api"
import { eligibleBusinessesForChain } from "@/lib/merchant-memberships"
import { attachChainLocation, createChain } from "@/services/chains.service"
import type { Membership } from "@/services/types"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"

type LocationMode = "new" | "existing"
type ChainMode = "new" | "existing"

export function ChainSetupDialog({
  open,
  onOpenChange,
  chains,
  memberships,
  initialChainId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  chains: BusinessChain[]
  memberships: Membership[]
  initialChainId?: string | null
  onSuccess: () => void
}) {
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  const [chainMode, setChainMode] = useState<ChainMode>(initialChainId ? "existing" : "new")
  const [chainName, setChainName] = useState("")
  const [selectedChainId, setSelectedChainId] = useState(initialChainId ?? "")
  const [locationMode, setLocationMode] = useState<LocationMode>("new")
  const [selectedBusinessId, setSelectedBusinessId] = useState("")

  const linkable = useMemo(
    () => eligibleBusinessesForChain(memberships),
    [memberships],
  )

  const canUseExistingChain = chains.length > 0

  useEffect(() => {
    if (!open) return
    if (initialChainId) {
      setChainMode("existing")
      setSelectedChainId(initialChainId)
    } else {
      setChainMode("new")
      setSelectedChainId("")
    }
    setChainName("")
    setLocationMode("new")
    setSelectedBusinessId("")
  }, [open, initialChainId])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (chainMode === "new" && !chainName.trim()) {
      toast.error("Nombre requerido", { description: "Escribe el nombre de la cadena." })
      return
    }

    if (chainMode === "existing" && !selectedChainId) {
      toast.error("Selecciona una cadena", { description: "Elige la marca a la que quieres añadir la sede." })
      return
    }

    if (locationMode === "existing" && !selectedBusinessId) {
      toast.error("Selecciona un local", { description: "Elige el negocio que quieres vincular." })
      return
    }

    setPending(true)
    try {
      let chainId = selectedChainId

      if (chainMode === "new") {
        const created = await createChain({ name: chainName.trim() })
        chainId = created.id
      }

      if (!chainId) {
        toast.error("No se pudo determinar la cadena")
        return
      }

      if (locationMode === "existing") {
        await attachChainLocation(chainId, { businessId: selectedBusinessId })
        toast.success("Sede vinculada", {
          description: "El local ya forma parte de la cadena.",
        })
        onOpenChange(false)
        onSuccess()
        return
      }

      onOpenChange(false)
      navigate(`/mi-negocio/nuevo?chainId=${encodeURIComponent(chainId)}`)
    } catch (error) {
      toast.error("No se pudo completar", {
        description: getApiErrorMessage(error, "Intenta de nuevo en unos segundos."),
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(100%-2rem,32rem)]">
        <DialogHeader>
          <DialogTitle>Cadena o sucursal</DialogTitle>
          <DialogDescription>
            Crea una marca multi-sucursal o añade una sede a una cadena existente. Solo puedes
            vincular locales donde eres dueño o co-líder.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-5" onSubmit={(event) => void handleSubmit(event)}>
          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-medium">Cadena</legend>
            <div className="flex flex-wrap gap-2">
              <ChoiceChip
                active={chainMode === "new"}
                onClick={() => setChainMode("new")}
                label="Nueva cadena"
              />
              {canUseExistingChain ? (
                <ChoiceChip
                  active={chainMode === "existing"}
                  onClick={() => setChainMode("existing")}
                  label="Cadena existente"
                />
              ) : null}
            </div>

            {chainMode === "new" ? (
              <Field label="Nombre de la cadena">
                <Input
                  value={chainName}
                  onChange={(event) => setChainName(event.target.value)}
                  placeholder="Ej. Café Central"
                  className="h-11 rounded-xl"
                  required
                />
              </Field>
            ) : (
              <Field label="Seleccionar cadena">
                <select
                  value={selectedChainId}
                  onChange={(event) => setSelectedChainId(event.target.value)}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  required
                >
                  <option value="">Elige una cadena…</option>
                  {chains.map((chain) => (
                    <option key={chain.id} value={chain.id}>
                      {chain.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </fieldset>

          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-medium">Sede</legend>
            <div className="flex flex-wrap gap-2">
              <ChoiceChip
                active={locationMode === "new"}
                onClick={() => setLocationMode("new")}
                label="Crear sede nueva"
              />
              <ChoiceChip
                active={locationMode === "existing"}
                onClick={() => setLocationMode("existing")}
                label="Vincular local existente"
                disabled={linkable.length === 0}
              />
            </div>

            {locationMode === "existing" ? (
              linkable.length > 0 ? (
                <Field label="Local a vincular">
                  <select
                    value={selectedBusinessId}
                    onChange={(event) => setSelectedBusinessId(event.target.value)}
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                    required
                  >
                    <option value="">Elige un negocio…</option>
                    {linkable.map((row) => (
                      <option key={row.businessId} value={row.businessId}>
                        {row.business?.name}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No tienes locales independientes disponibles. Crea uno nuevo o desvincúlalo de otra
                  cadena primero.
                </p>
              )
            ) : (
              <p className="text-sm text-muted-foreground">
                Al continuar irás al asistente de publicación para registrar la nueva sede bajo esta
                cadena.
              </p>
            )}
          </fieldset>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="rounded-full" disabled={pending}>
              {pending ? "Guardando…" : locationMode === "new" ? "Continuar" : "Vincular sede"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  )
}

function ChoiceChip({
  active,
  onClick,
  label,
  disabled,
}: {
  active: boolean
  onClick: () => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={
        active
          ? "rounded-full border border-primary bg-primary/15 px-4 py-2 text-sm font-medium text-primary"
          : "rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      }
    >
      {label}
    </button>
  )
}
