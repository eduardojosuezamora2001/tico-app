import { useEffect, useState } from "react"
import { Link } from "react-router"
import { MODULES, type CreateBusinessInput, type UpdateBusinessInput } from "@workspace/shared"

import {
  deepestDivisionId,
  InternationalAddressForm,
} from "@/components/international-address-form"
import {
  initialBusinessProfileForm,
  loadBusinessProfileForm,
  payloadFromProfileForm,
  PROFILE_STEPS,
  syncModulesForBusiness,
  type BusinessProfileFormState,
} from "@/lib/business-profile"
import {
  ONBOARDING_CATEGORIES,
  ONBOARDING_MODULE_LABELS,
  schedulesToHours,
} from "@/lib/business-onboarding"
import { getApiErrorMessage } from "@/lib/api"
import { toast } from "sonner"
import {
  createBusiness,
  publishBusiness,
  updateBusiness,
  upsertBusinessAddress,
} from "@/services/businesses.service"
import { updateBusinessHours } from "@/services/hours.service"
import { addCoOwner } from "@/services/team.service"
import { PaymentMethodOptions } from "@/components/payment-methods"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"

type Props = {
  mode: "create" | "edit"
  businessId?: string | null
  embedded?: boolean
  title: string
  subtitle: string
  backLink: { to: string; label: string }
  onDraftCreated?: (businessId: string) => void
  onPublished?: (businessId: string) => void
  onSaved?: () => void
}

function StepCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
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

export function BusinessProfileWizard({
  mode,
  businessId: initialBusinessId = null,
  embedded = false,
  title,
  subtitle,
  backLink,
  onDraftCreated,
  onPublished,
  onSaved,
}: Props) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<BusinessProfileFormState>(initialBusinessProfileForm)
  const [businessId, setBusinessId] = useState<string | null>(initialBusinessId)
  const [loading, setLoading] = useState(mode === "edit" || Boolean(initialBusinessId))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    const id = initialBusinessId
    if (!id) {
      setLoading(false)
      return
    }
    setBusinessId(id)
    setLoading(true)
    void loadBusinessProfileForm(id)
      .then(({ form: next }) => setForm(next))
      .catch(() => {
        const message = "No se pudo cargar la ficha del negocio."
        setError(message)
        toast.error("Error al cargar", { description: message })
      })
      .finally(() => setLoading(false))
  }, [initialBusinessId])

  function patchForm<K extends keyof BusinessProfileFormState>(
    key: K,
    value: BusinessProfileFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function syncAddressForBusiness(id: string) {
    const { address } = form
    if (!address.countryId || !address.addressLine1.trim()) return form.addressId

    const saved = await upsertBusinessAddress(id, {
      countryId: address.countryId,
      administrativeDivisionId: deepestDivisionId(address) ?? undefined,
      postalCode: address.postalCode || undefined,
      addressLine1: address.addressLine1.trim(),
      addressLine2: address.addressLine2.trim() || undefined,
      reference: address.reference.trim() || undefined,
      latitude: address.latitude ?? undefined,
      longitude: address.longitude ?? undefined,
      formattedAddress: address.formattedAddress ?? undefined,
      placeId: address.placeId ?? undefined,
    })
    const nextId = saved.id
    patchForm("addressId", nextId)
    return nextId
  }

  async function persistChanges(options?: { publish?: boolean }) {
    const publishing = options?.publish ?? false
    const creating = !businessId

    if (creating && (!form.name.trim() || !form.category)) {
      const message = "Escribe al menos el nombre y la categoría para guardar."
      setError(message)
      toast.error("Datos incompletos", { description: message })
      return
    }

    if (publishing && !form.name.trim()) {
      const message = "El nombre comercial es obligatorio."
      setError(message)
      toast.error("Nombre obligatorio", { description: message })
      return
    }

    const loadingMessage = publishing
      ? "Publicando negocio…"
      : mode === "edit"
        ? "Guardando cambios…"
        : creating
          ? "Creando borrador…"
          : "Guardando borrador…"

    setPending(true)
    setError(null)

    try {
      await toast.promise(
        (async () => {
          const body = payloadFromProfileForm(form, {
            preserveDraftStatus: mode === "edit",
          })

          let id = businessId
          const wasCreating = !id

          if (!id) {
            const created = await createBusiness(body as CreateBusinessInput)
            id = created.id
            setBusinessId(id)
            onDraftCreated?.(id)
          } else {
            await updateBusiness(id, body as UpdateBusinessInput)
          }

          await syncAddressForBusiness(id)
          await updateBusinessHours(id, schedulesToHours(form.schedules))
          await syncModulesForBusiness(id, form.modules)

          if (publishing) {
            for (const email of form.coOwnerEmails.map((item) => item.trim()).filter(Boolean)) {
              await addCoOwner(id, { email }).catch(() => null)
            }
            await publishBusiness(id)
            patchForm("isDraft", false)
            onPublished?.(id)
          } else {
            onSaved?.()
          }

          setSavedAt(new Date().toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" }))
          return { wasCreating, publishing }
        })(),
        {
          loading: loadingMessage,
          success: ({ wasCreating, publishing: published }) => {
            if (published) {
              return {
                message: "Negocio publicado",
                description: "Tu local ya es visible para clientes.",
              }
            }
            if (mode === "edit") {
              return {
                message: "Cambios guardados",
                description: "La ficha del negocio quedó actualizada.",
              }
            }
            if (wasCreating) {
              return {
                message: "Borrador creado",
                description: "Puedes seguir completando la ficha cuando quieras.",
              }
            }
            return {
              message: "Borrador guardado",
              description: "Tus cambios quedaron almacenados.",
            }
          },
          error: (err) => ({
            message: publishing ? "No se pudo publicar" : "No se pudo guardar",
            description: getApiErrorMessage(
              err,
              publishing
                ? "Revisa los datos e intenta publicar de nuevo."
                : mode === "create"
                  ? "Revisa los datos e intenta guardar el borrador de nuevo."
                  : "Revisa los datos e intenta guardar de nuevo.",
            ),
          }),
        },
      )
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          publishing
            ? "No se pudo publicar el negocio."
            : mode === "create"
              ? "No se pudo guardar el borrador."
              : "No se pudieron guardar los cambios.",
        ),
      )
    } finally {
      setPending(false)
    }
  }

  function requestPublish() {
    toast("¿Publicar tu negocio?", {
      description: "Tu local quedará visible para clientes en el directorio.",
      action: {
        label: "Sí, publicar",
        onClick: () => void persistChanges({ publish: true }),
      },
      cancel: {
        label: "Ahora no",
        onClick: () => undefined,
      },
    })
  }

  const saveLabel =
    mode === "edit"
      ? pending
        ? "Guardando…"
        : "Guardar cambios"
      : pending
        ? "Guardando…"
        : "Guardar borrador"

  const content = (
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {!embedded ? (
            <p className="text-sm text-muted-foreground">
              <Link to={backLink.to} className="hover:text-foreground">
                {backLink.label}
              </Link>
            </p>
          ) : null}
          <h1 className={`${embedded ? "text-xl" : "mt-2 text-2xl"} font-semibold tracking-tight`}>
            {title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={pending || loading}
            onClick={() => void persistChanges()}
          >
            {saveLabel}
          </Button>
          {savedAt ? (
            <span className="self-center text-xs text-muted-foreground">Guardado {savedAt}</span>
          ) : null}
        </div>
      </header>

      <ol className="grid gap-2 sm:grid-cols-4">
        {PROFILE_STEPS.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => setStep(item.id)}
              className={`flex w-full flex-col rounded-2xl border px-3 py-3 text-left transition-colors ${
                step === item.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:bg-muted/40"
              }`}
            >
              <span className="text-xs text-muted-foreground">Paso {item.id}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          </li>
        ))}
      </ol>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando ficha del negocio…</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!loading && step === 1 ? (
        <StepCard
          title="Identidad básica del negocio"
          description="Nombre, categoría y una propuesta clara para quien visite tu local."
        >
          <Field label="Nombre comercial">
            <Input
              value={form.name}
              onChange={(e) => patchForm("name", e.target.value)}
              placeholder="Soda Típica Isabella"
              className="h-11 rounded-xl"
              required
            />
          </Field>
          <Field label="Eslogan o descripción corta">
            <Input
              value={form.tagline}
              onChange={(e) => patchForm("tagline", e.target.value)}
              placeholder="El gallo pinto de la esquina"
              className="h-11 rounded-xl"
            />
          </Field>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Categoría principal</span>
            <div className="flex flex-wrap gap-2">
              {ONBOARDING_CATEGORIES.map((category) => (
                <Button
                  key={category}
                  type="button"
                  variant={form.category === category ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => patchForm("category", category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
          <Field label="Descripción completa">
            <Textarea
              value={form.description}
              onChange={(e) => patchForm("description", e.target.value)}
              placeholder="Cuenta qué ofrece tu local y qué lo hace especial en el barrio."
              className="min-h-28 rounded-xl"
            />
          </Field>
          {mode === "create" ? (
            <div className="flex flex-col gap-3">
              <div>
                <span className="text-sm font-medium">Socios o co-dueños</span>
                <p className="mt-1 text-sm text-muted-foreground">
                  Agrega el correo de quien compartirá el mismo nivel de dueño. Debe tener cuenta
                  en TicoApp.
                </p>
              </div>
              {form.coOwnerEmails.map((email, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={email}
                    onChange={(e) => {
                      const next = [...form.coOwnerEmails]
                      next[index] = e.target.value
                      patchForm("coOwnerEmails", next)
                    }}
                    placeholder="correo@ejemplo.com"
                    type="email"
                    className="h-11 flex-1 rounded-xl"
                  />
                  {form.coOwnerEmails.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        patchForm(
                          "coOwnerEmails",
                          form.coOwnerEmails.filter((_, i) => i !== index),
                        )
                      }
                    >
                      Quitar
                    </Button>
                  ) : null}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="self-start rounded-full"
                onClick={() => patchForm("coOwnerEmails", [...form.coOwnerEmails, ""])}
              >
                Agregar co-dueño
              </Button>
            </div>
          ) : null}
        </StepCard>
      ) : null}

      {!loading && step === 2 ? (
        <StepCard
          title="Ubicación geográfica y señas"
          description="Selecciona país, divisiones administrativas y marca el local en el mapa."
        >
          <InternationalAddressForm
            value={form.address}
            onChange={(address) => patchForm("address", address)}
          />
        </StepCard>
      ) : null}

      {!loading && step === 3 ? (
        <>
          <StepCard
            title="Canales de contacto directo"
            description="WhatsApp, teléfono y redes donde te encuentran."
          >
            <Field label="WhatsApp para pedidos">
              <Input
                value={form.whatsappNumber}
                onChange={(e) => patchForm("whatsappNumber", e.target.value)}
                placeholder="+50688887777"
                className="h-11 rounded-xl"
              />
            </Field>
            <Field label="Teléfono fijo">
              <Input
                value={form.phone}
                onChange={(e) => patchForm("phone", e.target.value)}
                className="h-11 rounded-xl"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Facebook">
                <Input
                  value={form.facebookUrl}
                  onChange={(e) => patchForm("facebookUrl", e.target.value)}
                  placeholder="https://facebook.com/..."
                  className="h-11 rounded-xl"
                />
              </Field>
              <Field label="Instagram">
                <Input
                  value={form.instagramUrl}
                  onChange={(e) => patchForm("instagramUrl", e.target.value)}
                  placeholder="https://instagram.com/..."
                  className="h-11 rounded-xl"
                />
              </Field>
              <Field label="TikTok">
                <Input
                  value={form.tiktokUrl}
                  onChange={(e) => patchForm("tiktokUrl", e.target.value)}
                  placeholder="https://..."
                  className="h-11 rounded-xl"
                />
              </Field>
              <Field label="Sitio web">
                <Input
                  value={form.website}
                  onChange={(e) => patchForm("website", e.target.value)}
                  placeholder="https://..."
                  className="h-11 rounded-xl"
                />
              </Field>
            </div>
          </StepCard>

          <StepCard title="Horarios de atención y servicio express">
            <label className="flex items-center gap-3 text-sm">
              <Checkbox
                checked={form.offersDelivery}
                onCheckedChange={(checked) => patchForm("offersDelivery", Boolean(checked))}
              />
              Ofrecemos servicio express o domicilio por nuestra cuenta
            </label>
            <div className="flex flex-col gap-3">
              {form.schedules.map((group) => (
                <div
                  key={group.id}
                  className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center"
                >
                  <div>
                    <p className="font-medium">{group.label}</p>
                    <label className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Checkbox
                        checked={group.closed}
                        onCheckedChange={(checked) =>
                          patchForm(
                            "schedules",
                            form.schedules.map((item) =>
                              item.id === group.id ? { ...item, closed: Boolean(checked) } : item,
                            ),
                          )
                        }
                      />
                      Cerrado
                    </label>
                  </div>
                  <Input
                    type="time"
                    value={group.open}
                    disabled={group.closed}
                    onChange={(e) =>
                      patchForm(
                        "schedules",
                        form.schedules.map((item) =>
                          item.id === group.id ? { ...item, open: e.target.value } : item,
                        ),
                      )
                    }
                    aria-label={`Apertura ${group.label}`}
                    className="h-11 rounded-xl"
                  />
                  <Input
                    type="time"
                    value={group.close}
                    disabled={group.closed}
                    onChange={(e) =>
                      patchForm(
                        "schedules",
                        form.schedules.map((item) =>
                          item.id === group.id ? { ...item, close: e.target.value } : item,
                        ),
                      )
                    }
                    aria-label={`Cierre ${group.label}`}
                    className="h-11 rounded-xl"
                  />
                </div>
              ))}
            </div>
            {form.offersDelivery ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Costo servicio express (₡)">
                  <Input
                    value={form.deliveryCost}
                    onChange={(e) => patchForm("deliveryCost", e.target.value)}
                    inputMode="decimal"
                    className="h-11 rounded-xl"
                  />
                </Field>
                <Field label="Radio de entrega aproximado (km)">
                  <Input
                    value={form.deliveryRadiusKm}
                    onChange={(e) => patchForm("deliveryRadiusKm", e.target.value)}
                    inputMode="decimal"
                    className="h-11 rounded-xl"
                  />
                </Field>
              </div>
            ) : null}
          </StepCard>

          <StepCard title="Métodos de pago aceptados">
            <PaymentMethodOptions
              value={form}
              onChange={(key, checked) => patchForm(key, checked)}
            />
            {form.paymentSinpe ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Número de transferencia móvil">
                  <Input
                    value={form.sinpePhone}
                    onChange={(e) => patchForm("sinpePhone", e.target.value)}
                    placeholder="+50688887777"
                    className="h-11 rounded-xl"
                  />
                </Field>
                <Field label="Titular de la cuenta">
                  <Input
                    value={form.sinpeHolder}
                    onChange={(e) => patchForm("sinpeHolder", e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </Field>
              </div>
            ) : null}
            {form.paymentIban ? (
              <Field label="IBAN">
                <Input
                  value={form.iban}
                  onChange={(e) => patchForm("iban", e.target.value)}
                  className="h-11 rounded-xl"
                />
              </Field>
            ) : null}
          </StepCard>
        </>
      ) : null}

      {!loading && step === 4 ? (
        <>
          <StepCard title="Fotos de portada y fachada">
            <Field label="URL de portada">
              <Input
                value={form.bannerUrl}
                onChange={(e) => patchForm("bannerUrl", e.target.value)}
                placeholder="https://..."
                className="h-11 rounded-xl"
              />
            </Field>
            {form.bannerUrl ? (
              <img
                src={form.bannerUrl}
                alt=""
                className="aspect-[21/9] w-full rounded-2xl border border-border object-cover"
              />
            ) : (
              <div className="flex aspect-[21/9] items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 text-sm text-muted-foreground">
                También puedes subir fotos desde la pestaña Galería.
              </div>
            )}
          </StepCard>
          <StepCard
            title="Módulos y herramientas para tu local"
            description="Activa solo lo que vas a usar. Puedes cambiarlos después en el panel."
          >
            <ul className="flex flex-col gap-3">
              {Object.values(MODULES).map((moduleName) => (
                <li key={moduleName}>
                  <label className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-sm">
                    <span>{ONBOARDING_MODULE_LABELS[moduleName]}</span>
                    <Checkbox
                      checked={form.modules[moduleName]}
                      onCheckedChange={(checked) =>
                        patchForm("modules", {
                          ...form.modules,
                          [moduleName]: Boolean(checked),
                        })
                      }
                    />
                  </label>
                </li>
              ))}
            </ul>
          </StepCard>
        </>
      ) : null}

      <footer className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {step < 4
            ? mode === "edit"
              ? "Avanza por pasos o guarda los cambios cuando quieras."
              : "Puedes avanzar paso a paso o guardar borrador."
            : form.isDraft
              ? "¿Listo para publicar tu negocio?"
              : "Revisa la ficha antes de guardar."}
        </p>
        <div className="flex flex-wrap gap-2">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => setStep(step - 1)}
            >
              Anterior
            </Button>
          ) : null}
          {step < 4 ? (
            <Button type="button" className="rounded-full" onClick={() => setStep(step + 1)}>
              Siguiente
            </Button>
          ) : (
            <>
              {businessId && mode === "create" ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  render={<Link to={`/mi-negocio/${businessId}`} />}
                  nativeButton={false}
                >
                  Revisar panel
                </Button>
              ) : null}
              {form.isDraft ? (
                <Button
                  type="button"
                  className="rounded-full"
                  disabled={pending}
                  onClick={requestPublish}
                >
                  {pending ? "Publicando…" : "Publicar negocio"}
                </Button>
              ) : (
                <Button
                  type="button"
                  className="rounded-full"
                  disabled={pending}
                  onClick={() => void persistChanges()}
                >
                  {pending ? "Guardando…" : "Guardar cambios"}
                </Button>
              )}
            </>
          )}
        </div>
      </footer>
    </>
  )

  if (embedded) {
    return <div className="flex flex-col gap-6">{content}</div>
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">{content}</main>
  )
}
