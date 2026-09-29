import { useEffect, useRef, useState } from "react"
import type { GalleryImage } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"

import { createMediaUploadUrl } from "@/services/businesses.service"
import {
  addGalleryImage,
  listGalleryImages,
  removeGalleryImage,
} from "@/services/gallery.service"
import { supabase } from "@/lib/supabase"

const allowed = new Set(["image/jpeg", "image/png", "image/webp"])

export function GalleryPanel({ businessId }: { businessId: string }) {
  const inputId = `gallery-${businessId}`
  const inputRef = useRef<HTMLInputElement>(null)
  const [images, setImages] = useState<GalleryImage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function load() {
    void listGalleryImages(businessId).then(setImages)
  }

  useEffect(() => {
    load()
  }, [businessId])

  async function onFiles(list: FileList | null) {
    if (!list?.length) return
    setBusy(true)
    setError(null)
    try {
      for (const file of list) {
        if (!allowed.has(file.type)) {
          setError("Solo fotos JPG, PNG o WebP.")
          continue
        }
        const { path, token, publicUrl } = await createMediaUploadUrl(businessId, {
          kind: "gallery",
          contentType: file.type,
        })
        const uploaded = await supabase.storage.from("business-media").uploadToSignedUrl(path, token, file)
        if (uploaded.error) {
          setError("No se pudo subir la foto.")
          continue
        }
        await addGalleryImage(businessId, { imageUrl: publicUrl })
      }
      load()
    } catch {
      setError("No tienes permiso para subir fotos a este negocio.")
    } finally {
      setBusy(false)
    }
  }

  async function remove(imageId: string) {
    setError(null)
    try {
      await removeGalleryImage(businessId, imageId)
      setImages((current) => current.filter((item) => item.id !== imageId))
    } catch {
      setError("No se pudo quitar la foto.")
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Galería</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            El dueño y quien tenga permiso de galería pueden publicar las fotos del perfil.
          </p>
        </div>
        <Button className="rounded-full" disabled={busy} type="button" onClick={() => inputRef.current?.click()}>
          {busy ? "Subiendo…" : "Subir fotos"}
        </Button>
      </div>
      <input
        ref={inputRef}
        id={inputId}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={busy}
        onChange={(event) => {
          void onFiles(event.target.files)
          event.target.value = ""
        }}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((image) => (
          <li key={image.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-2">
            <img src={image.imageUrl} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" />
            <div className="flex items-center justify-between gap-2 px-1 pb-1">
              <span className="min-w-0 truncate text-xs text-muted-foreground">{fileName(image.imageUrl)}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => void remove(image.id)}>
                Quitar
              </Button>
            </div>
          </li>
        ))}
        <li>
          <label
            htmlFor={inputId}
            className="flex h-full min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-4 text-center text-sm text-muted-foreground"
          >
            Subir una foto
          </label>
        </li>
      </ul>
    </section>
  )
}

function fileName(url: string) {
  const piece = url.split("/").pop()?.split("?")[0]
  return piece && piece.length < 40 ? piece : "Foto"
}
