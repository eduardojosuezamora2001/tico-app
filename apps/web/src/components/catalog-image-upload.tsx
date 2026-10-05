import { useId, useState } from "react"
import { Image01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { createMediaUploadUrl } from "@/services/businesses.service"
import { supabase } from "@/lib/supabase"
import { Button } from "@workspace/ui/components/button"
import { Field, FieldDescription, FieldLabel } from "@workspace/ui/components/field"

const allowed = new Set(["image/jpeg", "image/png", "image/webp"])

type CatalogMediaKind = "product" | "service" | "menu"

export function CatalogImageUpload({
  businessId,
  label = "Foto",
  description = "JPG, PNG o WebP. Opcional.",
  value,
  onChange,
  kind = "product",
}: {
  businessId: string
  label?: string
  description?: string
  value: string | null
  onChange: (url: string | null) => void
  kind?: CatalogMediaKind
}) {
  const inputId = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onPick(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    if (!allowed.has(file.type)) {
      setError("Solo JPG, PNG o WebP.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const { path, token, publicUrl } = await createMediaUploadUrl(businessId, {
        kind,
        contentType: file.type as "image/jpeg" | "image/png" | "image/webp",
      })
      const uploaded = await supabase.storage.from("business-media").uploadToSignedUrl(path, token, file)
      if (uploaded.error) throw uploaded.error
      onChange(publicUrl)
    } catch {
      setError("No se pudo subir la imagen.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Field>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-muted">
          {value ? (
            <img src={value} alt="" className="size-full object-cover" />
          ) : (
            <HugeiconsIcon icon={Image01Icon} strokeWidth={2} className="text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={busy}
            onChange={(event) => void onPick(event.target.files)}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => document.getElementById(inputId)?.click()}>
              {busy ? "Subiendo…" : value ? "Cambiar foto" : "Subir foto"}
            </Button>
            {value ? (
              <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onChange(null)}>
                Quitar
              </Button>
            ) : null}
          </div>
          <FieldDescription>{description}</FieldDescription>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      </div>
    </Field>
  )
}
