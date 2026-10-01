import { useEffect, useId, useState } from "react"
import type { GalleryImage } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"

import { supabase } from "@/lib/supabase"
import { createMediaUploadUrl, updateBusiness } from "@/services/businesses.service"
import { addGalleryImage, listGalleryImages, removeGalleryImage } from "@/services/gallery.service"

const allowed = new Set(["image/jpeg", "image/png", "image/webp"])

type Kind = "banner" | "logo" | "gallery"

export function BusinessMediaFields({
  businessId,
  bannerUrl,
  logoUrl,
  onBannerUrl,
  onLogoUrl,
  ensureBusinessId,
}: {
  businessId: string | null
  bannerUrl: string
  logoUrl: string
  onBannerUrl: (url: string) => void
  onLogoUrl: (url: string) => void
  ensureBusinessId: () => Promise<string>
}) {
  const [gallery, setGallery] = useState<GalleryImage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<Kind | "clear" | null>(null)

  useEffect(() => {
    if (!businessId) {
      setGallery([])
      return
    }
    let live = true
    void listGalleryImages(businessId)
      .then((rows) => {
        if (live) setGallery(rows)
      })
      .catch(() => {
        if (live) setGallery([])
      })
    return () => {
      live = false
    }
  }, [businessId])

  async function storeFile(id: string, kind: Kind, file: File) {
    if (!allowed.has(file.type)) {
      setError("Solo fotos JPG, PNG o WebP.")
      return
    }
    const { path, token, publicUrl } = await createMediaUploadUrl(id, {
      kind,
      contentType: file.type,
    })
    const uploaded = await supabase.storage.from("business-media").uploadToSignedUrl(path, token, file)
    if (uploaded.error) throw new Error("upload")
    if (kind === "banner") {
      onBannerUrl(publicUrl)
      await updateBusiness(id, { bannerUrl: publicUrl })
    } else if (kind === "logo") {
      onLogoUrl(publicUrl)
      await updateBusiness(id, { logoUrl: publicUrl })
    } else {
      const image = await addGalleryImage(id, { imageUrl: publicUrl })
      setGallery((current) => [...current, image])
    }
  }

  async function upload(kind: Kind, files: File[]) {
    if (files.length === 0) return
    setBusy(kind)
    setError(null)
    try {
      const id = await ensureBusinessId()
      for (const file of files) await storeFile(id, kind, file)
    } catch (caught) {
      const message =
        caught instanceof Error && caught.message && caught.message !== "upload"
          ? caught.message
          : "No se pudo subir la foto."
      setError(message)
    } finally {
      setBusy(null)
    }
  }

  async function clearSingle(kind: "banner" | "logo") {
    if (!businessId) {
      if (kind === "banner") onBannerUrl("")
      else onLogoUrl("")
      return
    }
    setBusy("clear")
    setError(null)
    try {
      if (kind === "banner") {
        onBannerUrl("")
        await updateBusiness(businessId, { bannerUrl: null })
      } else {
        onLogoUrl("")
        await updateBusiness(businessId, { logoUrl: null })
      }
    } catch {
      setError("No se pudo quitar la foto.")
    } finally {
      setBusy(null)
    }
  }

  async function removeGallery(imageId: string) {
    if (!businessId) return
    setError(null)
    try {
      await removeGalleryImage(businessId, imageId)
      setGallery((current) => current.filter((item) => item.id !== imageId))
    } catch {
      setError("No se pudo quitar la foto de la galería.")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ImageDropzone
        title="Portada"
        hint="La foto ancha que se ve arriba del local."
        preview={bannerUrl}
        previewClass="aspect-[21/9] w-full rounded-2xl"
        busy={busy === "banner"}
        disabled={busy !== null}
        onFile={(file) => void upload("banner", [file])}
        onClear={bannerUrl ? () => void clearSingle("banner") : undefined}
      />
      <ImageDropzone
        title="Perfil"
        hint="El avatar del negocio en la ficha pública."
        preview={logoUrl}
        previewClass="size-28 rounded-full"
        busy={busy === "logo"}
        disabled={busy !== null}
        onFile={(file) => void upload("logo", [file])}
        onClear={logoUrl ? () => void clearSingle("logo") : undefined}
      />
      <div className="flex flex-col gap-3">
        <ImageDropzone
          title="Galería"
          hint="Fotos que los clientes ven al visitar el negocio. Puedes soltar varias a la vez."
          multiple
          busy={busy === "gallery"}
          disabled={busy !== null}
          onFiles={(files) => void upload("gallery", files)}
        />
        {gallery.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {gallery.map((image) => (
              <li key={image.id} className="flex flex-col gap-2 rounded-2xl border border-border p-2">
                <img src={image.imageUrl} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" />
                <Button type="button" variant="ghost" size="sm" onClick={() => void removeGallery(image.id)}>
                  Quitar
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}

function ImageDropzone({
  title,
  hint,
  preview,
  previewClass = "aspect-[21/9]",
  multiple = false,
  busy,
  disabled,
  onFile,
  onFiles,
  onClear,
}: {
  title: string
  hint: string
  preview?: string
  previewClass?: string
  multiple?: boolean
  busy: boolean
  disabled: boolean
  onFile?: (file: File) => void
  onFiles?: (files: File[]) => void
  onClear?: () => void
}) {
  const inputId = useId()
  const [over, setOver] = useState(false)

  function take(list: FileList | null) {
    const files = list ? [...list] : []
    if (files.length === 0) return
    if (multiple) onFiles?.(files)
    else onFile?.(files[0])
  }

  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      {preview ? (
        <img src={preview} alt="" className={`border border-border object-cover ${previewClass}`} />
      ) : null}
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled) setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setOver(false)
          if (!disabled) take(event.dataTransfer.files)
        }}
        className={`flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground ${
          over ? "border-primary bg-primary/5" : "border-border bg-muted/30"
        } ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        {busy ? "Subiendo…" : "Arrastra una imagen o haz clic para elegirla"}
        <span className="text-xs">JPG, PNG o WebP</span>
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          take(event.target.files)
          event.target.value = ""
        }}
      />
      {onClear ? (
        <Button type="button" variant="ghost" size="sm" className="w-fit" disabled={disabled} onClick={onClear}>
          Quitar {title.toLowerCase()}
        </Button>
      ) : null}
    </div>
  )
}
