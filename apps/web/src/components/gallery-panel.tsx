import { useEffect, useState } from "react"
import type { GalleryImage } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"

import { api } from "@/lib/api"
import { supabase } from "@/lib/supabase"

const allowed = new Set(["image/jpeg", "image/png", "image/webp"])

export function GalleryPanel({ businessId }: { businessId: string }) {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function load() {
    void api.get<{ data: GalleryImage[] }>(`/businesses/${businessId}/gallery`).then((response) => {
      setImages(response.data.data)
    })
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
        const prepared = await api.post<{
          data: { path: string; token: string; publicUrl: string }
        }>(`/businesses/${businessId}/media/upload-url`, {
          kind: "gallery",
          contentType: file.type,
        })
        const { path, token, publicUrl } = prepared.data.data
        const uploaded = await supabase.storage.from("business-media").uploadToSignedUrl(path, token, file)
        if (uploaded.error) {
          setError("No se pudo subir la foto.")
          continue
        }
        await api.post(`/businesses/${businessId}/gallery`, { imageUrl: publicUrl })
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
      await api.delete(`/businesses/${businessId}/gallery/${imageId}`)
      setImages((current) => current.filter((item) => item.id !== imageId))
    } catch {
      setError("No se pudo quitar la foto.")
    }
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">Galería</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Opcional. El dueño y quien tenga permiso de galería pueden publicar las fotos del perfil.
      </p>
      <label className="mt-4 inline-flex">
        <input
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
        <span className="inline-flex h-8 cursor-pointer items-center rounded-md bg-primary px-3 text-sm text-primary-foreground">
          {busy ? "Subiendo…" : "Elegir fotos"}
        </span>
      </label>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      {images.length > 0 ? (
        <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((image) => (
            <li key={image.id} className="space-y-2">
              <img src={image.imageUrl} alt="" className="aspect-square w-full rounded-xl object-cover" />
              <Button type="button" variant="outline" size="sm" onClick={() => void remove(image.id)}>
                Quitar
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
