import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router"
import type { Review } from "@workspace/shared"

import {
  listBusinessReviews,
  removeBusinessReview,
  upsertBusinessReview,
} from "@/services/reviews.service"
import { useAuthStore } from "@/stores/auth-store"
import { Button } from "@workspace/ui/components/button"
import { Progress } from "@workspace/ui/components/progress"
import { Rating } from "@workspace/ui/components/reui/rating"
import { Separator } from "@workspace/ui/components/separator"
import { Textarea } from "@workspace/ui/components/textarea"

type Props = {
  businessId: string
  businessName: string
  onReviewsChange?: (reviews: Review[]) => void
}

function averageRating(rows: Review[]) {
  if (rows.length === 0) return 0
  return rows.reduce((sum, row) => sum + row.rating, 0) / rows.length
}

function ratingDistribution(rows: Review[]) {
  const counts = [0, 0, 0, 0, 0]
  for (const row of rows) {
    const star = Math.min(5, Math.max(1, Math.round(row.rating)))
    counts[star - 1] += 1
  }
  const total = rows.length || 1
  return [5, 4, 3, 2, 1].map((stars) => {
    const count = counts[stars - 1] ?? 0
    return {
      stars,
      count,
      percentage: Math.round((count / total) * 100),
    }
  })
}

function formatReviewDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("es-CR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

export function BusinessReviewsPanel({ businessId, businessName, onReviewsChange }: Props) {
  const signedIn = useAuthStore((s) => s.status) === "authenticated"
  const userId = useAuthStore((s) => s.session?.user.id)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const reload = useCallback(() => {
    setLoading(true)
    void listBusinessReviews(businessId)
      .then((rows) => {
        setReviews(rows)
        onReviewsChange?.(rows)
        setError(null)
        const mine = rows.find((row) => row.userId === userId)
        if (mine) {
          setRating(mine.rating)
          setComment(mine.comment ?? "")
        }
      })
      .catch(() => setError("No se pudieron cargar las reseñas."))
      .finally(() => setLoading(false))
  }, [businessId, onReviewsChange, userId])

  useEffect(() => {
    reload()
  }, [reload])

  const avg = useMemo(() => averageRating(reviews), [reviews])
  const distribution = useMemo(() => ratingDistribution(reviews), [reviews])
  const myReview = useMemo(
    () => (userId ? reviews.find((row) => row.userId === userId) ?? null : null),
    [reviews, userId],
  )

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!signedIn) return
    setSaving(true)
    setFormError(null)
    try {
      await upsertBusinessReview(businessId, {
        rating,
        comment: comment.trim() || undefined,
      })
      reload()
    } catch {
      setFormError("No se pudo guardar tu reseña. Intenta de nuevo.")
    } finally {
      setSaving(false)
    }
  }

  async function removeMine() {
    if (!myReview) return
    setSaving(true)
    setFormError(null)
    try {
      await removeBusinessReview(businessId, myReview.id)
      setComment("")
      setRating(5)
      reload()
    } catch {
      setFormError("No se pudo eliminar tu reseña.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-start">
      <aside className="w-full shrink-0 rounded-2xl border border-border bg-card p-5 lg:w-72">
        <div className="flex flex-col items-center gap-2">
          <span className="text-3xl font-semibold tabular-nums">
            {reviews.length === 0 ? "—" : avg.toFixed(1)}
          </span>
          <Rating rating={reviews.length === 0 ? 0 : avg} size="sm" />
          <span className="text-xs text-muted-foreground">
            {reviews.length === 0
              ? `Sin reseñas aún para ${businessName}`
              : `Basado en ${reviews.length} reseña${reviews.length === 1 ? "" : "s"}`}
          </span>
        </div>
        <Separator className="my-4" />
        <div className="flex flex-col gap-2">
          {distribution.map((row) => (
            <div key={row.stars} className="flex items-center gap-3 text-sm">
              <span className="w-3 text-right text-xs text-muted-foreground">{row.stars}</span>
              <Progress
                value={row.percentage}
                className="flex-1 **:data-[slot=progress-indicator]:bg-yellow-400 **:data-[slot=progress-track]:h-1.5"
              />
              <span className="w-7 text-right text-xs text-muted-foreground">{row.count}</span>
            </div>
          ))}
        </div>
      </aside>

      <div className="min-w-0 flex-1 flex flex-col gap-4">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">
            {myReview ? "Tu reseña" : "Escribe una reseña"}
          </h2>
          {!signedIn ? (
            <p className="mt-2 text-sm text-muted-foreground">
              <Link className="text-primary underline-offset-4 hover:underline" to={`/login?next=/n/${businessId}`}>
                Inicia sesión
              </Link>{" "}
              para calificar este local.
            </p>
          ) : (
            <form className="mt-4 flex flex-col gap-4" onSubmit={(event) => void submit(event)}>
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">Tu calificación</p>
                <Rating
                  rating={rating}
                  size="lg"
                  editable
                  onRatingChange={setRating}
                  aria-label="Calificación de 1 a 5 estrellas"
                />
              </div>
              <Textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Cuéntanos cómo fue tu experiencia (opcional)"
                maxLength={2000}
                rows={4}
                className="min-h-24 rounded-xl"
              />
              {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" className="rounded-full px-5" disabled={saving}>
                  {saving ? "Guardando…" : myReview ? "Actualizar reseña" : "Publicar reseña"}
                </Button>
                {myReview ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    disabled={saving}
                    onClick={() => void removeMine()}
                  >
                    Eliminar
                  </Button>
                ) : null}
              </div>
            </form>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Opiniones de clientes</h2>
          {loading ? (
            <p className="mt-3 text-sm text-muted-foreground">Cargando reseñas…</p>
          ) : error ? (
            <p className="mt-3 text-sm text-destructive">{error}</p>
          ) : reviews.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Todavía no hay reseñas. Sé el primero en compartir tu experiencia.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col divide-y divide-border">
              {reviews.map((row) => (
                <li key={row.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <p className="font-medium">{row.authorName?.trim() || "Cliente"}</p>
                      <Rating rating={row.rating} size="sm" />
                    </div>
                    <time className="text-xs text-muted-foreground" dateTime={row.createdAt}>
                      {formatReviewDate(row.createdAt)}
                    </time>
                  </div>
                  {row.comment ? (
                    <p className="max-w-[65ch] text-sm text-muted-foreground">{row.comment}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
