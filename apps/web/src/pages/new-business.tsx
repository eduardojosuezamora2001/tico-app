import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { MODULES, type Business, type ModuleName } from "@workspace/shared"

import { BusinessMapPicker } from "@/components/business-map-picker"
import { SiteHeader } from "@/components/site-header"
import {
  COSTA_RICA_PROVINCES,
  defaultModuleSelection,
  defaultScheduleGroups,
  ONBOARDING_CATEGORIES,
  ONBOARDING_MODULE_LABELS,
  schedulesToHours,
  type ScheduleGroup,
} from "@/lib/business-onboarding"
import { api } from "@/lib/api"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"

const steps = [
  { id: 1, label: "Identidad y propuesta" },
  { id: 2, label: "Ubicación y señas" },
  { id: 3, label: "Contacto y pagos" },
  { id: 4, label: "Fotos y módulos" },
] as const

type FormState = {
  name: string
  tagline: string
  category: string
  description: string
  coOwnerEmails: string[]
  province: string
  canton: string
  district: string
  address: string
  latitude: number | null
  longitude: number | null
  whatsappNumber: string
  phone: string
  facebookUrl: string
  instagramUrl: string
  tiktokUrl: string
  website: string
  offersDelivery: boolean
  deliveryCost: string
  deliveryRadiusKm: string
  schedules: ScheduleGroup[]
  paymentCash: boolean
  paymentCard: boolean
  paymentSinpe: boolean
  paymentIban: boolean
  sinpePhone: string
  sinpeHolder: string
  iban: string
  bannerUrl: string
  modules: Record<ModuleName, boolean>
}

function initialForm(): FormState {
  return {
    name: "",
    tagline: "",
    category: ONBOARDING_CATEGORIES[0],
    description: "",
    coOwnerEmails: [""],
    province: COSTA_RICA_PROVINCES[0],
    canton: "",
    district: "",
    address: "",
    latitude: null,
    longitude: null,
    whatsappNumber: "",
    phone: "",
    facebookUrl: "",
    instagramUrl: "",
    tiktokUrl: "",
    website: "",
    offersDelivery: false,
    deliveryCost: "",
    deliveryRadiusKm: "",
    schedules: defaultScheduleGroups(),
    paymentCash: true,
    paymentCard: false,
    paymentSinpe: false,
    paymentIban: false,
    sinpePhone: "",
    sinpeHolder: "",
    iban: "",
    bannerUrl: "",
    modules: defaultModuleSelection(),
  }
}

function businessToForm(business: Business): FormState {
  const base = initialForm()
  return {
    ...base,
    name: business.name,
    tagline: business.tagline ?? "",
    category: business.category,
    description: business.description ?? "",
    province: business.province ?? base.province,
    canton: business.canton ?? "",
    district: business.district ?? "",
    address: business.address ?? "",
    latitude: business.latitude,
    longitude: business.longitude,
    whatsappNumber: business.whatsappNumber ?? "",
    phone: business.phone ?? "",
    facebookUrl: business.facebookUrl ?? "",
    instagramUrl: business.instagramUrl ?? "",
    tiktokUrl: business.tiktokUrl ?? "",
    website: business.website ?? "",
    offersDelivery: business.offersDelivery,
    deliveryCost: business.deliveryCost != null ? String(business.deliveryCost) : "",
    deliveryRadiusKm: business.deliveryRadiusKm != null ? String(business.deliveryRadiusKm) : "",
    paymentCash: business.paymentCash,
    paymentCard: business.paymentCard,
    paymentSinpe: business.paymentSinpe,
    paymentIban: business.paymentIban,
    sinpePhone: business.sinpePhone ?? "",
    sinpeHolder: business.sinpeHolder ?? "",
    iban: business.iban ?? "",
    bannerUrl: business.bannerUrl ?? "",
  }
}

function payloadFromForm(form: FormState, partial?: boolean) {
  const body: Record<string, unknown> = {
    name: form.name.trim(),
    tagline: form.tagline.trim() || undefined,
    category: form.category,
    description: form.description.trim() || undefined,
    province: form.province || undefined,
    canton: form.canton.trim() || undefined,
    district: form.district.trim() || undefined,
    address: form.address.trim() || undefined,
    latitude: form.latitude ?? undefined,
    longitude: form.longitude ?? undefined,
    whatsappNumber: form.whatsappNumber.trim() || undefined,
    phone: form.phone.trim() || undefined,
    facebookUrl: form.facebookUrl.trim() || undefined,
    instagramUrl: form.instagramUrl.trim() || undefined,
    tiktokUrl: form.tiktokUrl.trim() || undefined,
    website: form.website.trim() || undefined,
    offersDelivery: form.offersDelivery,
    deliveryCost: form.deliveryCost ? Number(form.deliveryCost) : undefined,
    deliveryRadiusKm: form.deliveryRadiusKm ? Number(form.deliveryRadiusKm) : undefined,
    paymentCash: form.paymentCash,
    paymentCard: form.paymentCard,
    paymentSinpe: form.paymentSinpe,
    paymentIban: form.paymentIban,
    sinpePhone: form.sinpePhone.trim() || undefined,
    sinpeHolder: form.sinpeHolder.trim() || undefined,
    iban: form.iban.trim() || undefined,
    bannerUrl: form.bannerUrl.trim() || undefined,
    isDraft: true,
  }
  if (partial && !form.name.trim()) delete body.name
  return body
}

function StepCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
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

export function NewBusinessPage() {
  const navigate = useNavigate()
  const { draftId } = useParams()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormState>(initialForm)
  const [businessId, setBusinessId] = useState<string | null>(draftId ?? null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    if (!draftId) return
    setBusinessId(draftId)
    void api.get<{ data: { business: Business } }>(`/businesses/${draftId}`).then((response) => {
      setForm(businessToForm(response.data.data.business))
    })
  }, [draftId])

  function patchForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function persistDraft() {
    setPending(true)
    setError(null)
    try {
      const body = payloadFromForm(form)
      if (!businessId) {
        if (!form.name.trim() || !form.category) {
          setError("Escribe al menos el nombre y la categoría para guardar el borrador.")
          return
        }
        const created = await api.post<{ data: Business }>("/businesses", body)
        const id = created.data.data.id
        setBusinessId(id)
        navigate(`/mi-negocio/nuevo/${id}`, { replace: true })
      } else {
        await api.patch(`/businesses/${businessId}`, body)
      }
      if (businessId) {
        await api.put(`/businesses/${businessId}/hours`, schedulesToHours(form.schedules))
      }
      setSavedAt(new Date().toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" }))
    } catch {
      setError("No se pudo guardar el borrador. Revisa los datos e intenta de nuevo.")
    } finally {
      setPending(false)
    }
  }

  async function publish() {
    if (!form.name.trim()) {
      setError("El nombre comercial es obligatorio.")
      return
    }
    setPending(true)
    setError(null)
    try {
      let id = businessId
      const body = payloadFromForm(form)
      if (!id) {
        const created = await api.post<{ data: Business }>("/businesses", body)
        id = created.data.data.id
        setBusinessId(id)
      } else {
        await api.patch(`/businesses/${id}`, body)
      }
      await api.put(`/businesses/${id}/hours`, schedulesToHours(form.schedules))
      for (const moduleName of Object.values(MODULES)) {
        await api.put(`/businesses/${id}/modules/${moduleName}`, { enabled: form.modules[moduleName] })
      }
      for (const email of form.coOwnerEmails.map((item) => item.trim()).filter(Boolean)) {
        await api.post(`/businesses/${id}/team/co-owners`, { email }).catch(() => null)
      }
      await api.post(`/businesses/${id}/publish`)
      navigate(`/mi-negocio/${id}`)
    } catch {
      setError("No se pudo publicar el negocio. Guarda el borrador y revisa WhatsApp, mapa y pagos.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              <Link to="/mi-negocio" className="hover:text-foreground">Mis negocios</Link>
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Publicar mi negocio</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Completa la ficha de tu local. Puedes guardar borrador y seguir después.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="rounded-full" disabled={pending} onClick={() => void persistDraft()}>
              {pending ? "Guardando…" : "Guardar borrador"}
            </Button>
            {savedAt ? <span className="self-center text-xs text-muted-foreground">Guardado {savedAt}</span> : null}
          </div>
        </header>

        <ol className="grid gap-2 sm:grid-cols-4">
          {steps.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setStep(item.id)}
                className={`flex w-full flex-col rounded-2xl border px-3 py-3 text-left transition-colors ${
                  step === item.id ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted/40"
                }`}
              >
                <span className="text-xs text-muted-foreground">Paso {item.id}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            </li>
          ))}
        </ol>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {step === 1 ? (
          <StepCard title="Identidad básica del negocio" description="Nombre, categoría y una propuesta clara para quien visite tu local.">
            <Field label="Nombre comercial">
              <Input value={form.name} onChange={(e) => patchForm("name", e.target.value)} placeholder="Soda Típica Isabella" className="h-11 rounded-xl" required />
            </Field>
            <Field label="Eslogan o descripción corta">
              <Input value={form.tagline} onChange={(e) => patchForm("tagline", e.target.value)} placeholder="El gallo pinto de la esquina" className="h-11 rounded-xl" />
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
              <Textarea value={form.description} onChange={(e) => patchForm("description", e.target.value)} placeholder="Cuenta qué ofrece tu local y qué lo hace especial en el barrio." className="min-h-28 rounded-xl" />
            </Field>
            <div className="flex flex-col gap-3">
              <div>
                <span className="text-sm font-medium">Socios o co-dueños</span>
                <p className="mt-1 text-sm text-muted-foreground">
                  Agrega el correo de quien compartirá el mismo nivel de dueño. Debe tener cuenta en TicoApp.
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
                      onClick={() => patchForm("coOwnerEmails", form.coOwnerEmails.filter((_, i) => i !== index))}
                    >
                      Quitar
                    </Button>
                  ) : null}
                </div>
              ))}
              <Button type="button" variant="outline" className="self-start rounded-full" onClick={() => patchForm("coOwnerEmails", [...form.coOwnerEmails, ""])}>
                Agregar co-dueño
              </Button>
            </div>
          </StepCard>
        ) : null}

        {step === 2 ? (
          <StepCard title="Ubicación geográfica y señas" description="Marca el local en el mapa y escribe cómo llegar.">
            <BusinessMapPicker
              latitude={form.latitude}
              longitude={form.longitude}
              searchPlaceholder="Buscar dirección en Costa Rica"
              onChange={({ lat, lng }) => {
                patchForm("latitude", lat)
                patchForm("longitude", lng)
              }}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Provincia">
                <select value={form.province} onChange={(e) => patchForm("province", e.target.value)} className="h-11 rounded-xl border border-border bg-background px-3">
                  {COSTA_RICA_PROVINCES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
              <Field label="Cantón">
                <Input value={form.canton} onChange={(e) => patchForm("canton", e.target.value)} className="h-11 rounded-xl" />
              </Field>
              <Field label="Distrito">
                <Input value={form.district} onChange={(e) => patchForm("district", e.target.value)} className="h-11 rounded-xl" />
              </Field>
            </div>
            <Field label="Dirección escrita y señas">
              <Textarea value={form.address} onChange={(e) => patchForm("address", e.target.value)} placeholder="200 metros sur del parque, casa blanca con portón verde." className="min-h-24 rounded-xl" />
            </Field>
          </StepCard>
        ) : null}

        {step === 3 ? (
          <>
            <StepCard title="Canales de contacto directo" description="WhatsApp, teléfono y redes donde te encuentran.">
              <Field label="WhatsApp para pedidos">
                <Input value={form.whatsappNumber} onChange={(e) => patchForm("whatsappNumber", e.target.value)} placeholder="+50688887777" className="h-11 rounded-xl" />
              </Field>
              <Field label="Teléfono fijo">
                <Input value={form.phone} onChange={(e) => patchForm("phone", e.target.value)} className="h-11 rounded-xl" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Facebook">
                  <Input value={form.facebookUrl} onChange={(e) => patchForm("facebookUrl", e.target.value)} placeholder="https://facebook.com/..." className="h-11 rounded-xl" />
                </Field>
                <Field label="Instagram">
                  <Input value={form.instagramUrl} onChange={(e) => patchForm("instagramUrl", e.target.value)} placeholder="https://instagram.com/..." className="h-11 rounded-xl" />
                </Field>
                <Field label="TikTok o sitio web">
                  <Input value={form.tiktokUrl} onChange={(e) => patchForm("tiktokUrl", e.target.value)} placeholder="https://..." className="h-11 rounded-xl" />
                </Field>
                <Field label="Sitio web">
                  <Input value={form.website} onChange={(e) => patchForm("website", e.target.value)} placeholder="https://..." className="h-11 rounded-xl" />
                </Field>
              </div>
            </StepCard>

            <StepCard title="Horarios de atención y servicio express">
              <label className="flex items-center gap-3 text-sm">
                <Checkbox checked={form.offersDelivery} onCheckedChange={(checked) => patchForm("offersDelivery", Boolean(checked))} />
                Ofrecemos servicio express o domicilio por nuestra cuenta
              </label>
              <div className="flex flex-col gap-3">
                {form.schedules.map((group) => (
                  <div key={group.id} className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
                    <div>
                      <p className="font-medium">{group.label}</p>
                      <label className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Checkbox
                          checked={group.closed}
                          onCheckedChange={(checked) =>
                            patchForm(
                              "schedules",
                              form.schedules.map((item) => (item.id === group.id ? { ...item, closed: Boolean(checked) } : item)),
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
                          form.schedules.map((item) => (item.id === group.id ? { ...item, open: e.target.value } : item)),
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
                          form.schedules.map((item) => (item.id === group.id ? { ...item, close: e.target.value } : item)),
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
                    <Input value={form.deliveryCost} onChange={(e) => patchForm("deliveryCost", e.target.value)} inputMode="decimal" className="h-11 rounded-xl" />
                  </Field>
                  <Field label="Radio de entrega aproximado (km)">
                    <Input value={form.deliveryRadiusKm} onChange={(e) => patchForm("deliveryRadiusKm", e.target.value)} inputMode="decimal" className="h-11 rounded-xl" />
                  </Field>
                </div>
              ) : null}
            </StepCard>

            <StepCard title="Métodos de pago aceptados">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { key: "paymentSinpe" as const, label: "SINPE Móvil" },
                  { key: "paymentCash" as const, label: "Efectivo" },
                  { key: "paymentCard" as const, label: "Tarjeta y datáfono" },
                  { key: "paymentIban" as const, label: "Cuenta IBAN" },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm">
                    <Checkbox checked={form[item.key]} onCheckedChange={(checked) => patchForm(item.key, Boolean(checked))} />
                    {item.label}
                  </label>
                ))}
              </div>
              {form.paymentSinpe ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Número SINPE Móvil">
                    <Input value={form.sinpePhone} onChange={(e) => patchForm("sinpePhone", e.target.value)} className="h-11 rounded-xl" />
                  </Field>
                  <Field label="Titular de la cuenta">
                    <Input value={form.sinpeHolder} onChange={(e) => patchForm("sinpeHolder", e.target.value)} className="h-11 rounded-xl" />
                  </Field>
                </div>
              ) : null}
              {form.paymentIban ? (
                <Field label="IBAN">
                  <Input value={form.iban} onChange={(e) => patchForm("iban", e.target.value)} className="h-11 rounded-xl" />
                </Field>
              ) : null}
            </StepCard>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <StepCard title="Fotos de portada y fachada">
              <Field label="URL de portada">
                <Input value={form.bannerUrl} onChange={(e) => patchForm("bannerUrl", e.target.value)} placeholder="https://..." className="h-11 rounded-xl" />
              </Field>
              {form.bannerUrl ? (
                <img src={form.bannerUrl} alt="" className="aspect-[21/9] w-full rounded-2xl border border-border object-cover" />
              ) : (
                <div className="flex aspect-[21/9] items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 text-sm text-muted-foreground">
                  La portada se puede subir también desde Galería después de publicar.
                </div>
              )}
            </StepCard>
            <StepCard title="Módulos y herramientas para tu local" description="Activa solo lo que vas a usar. Puedes cambiarlos después en el panel.">
              <ul className="flex flex-col gap-3">
                {Object.values(MODULES).map((moduleName) => (
                  <li key={moduleName}>
                    <label className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-sm">
                      <span>{ONBOARDING_MODULE_LABELS[moduleName]}</span>
                      <Checkbox
                        checked={form.modules[moduleName]}
                        onCheckedChange={(checked) =>
                          patchForm("modules", { ...form.modules, [moduleName]: Boolean(checked) })
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
            {step < 4 ? "Puedes avanzar paso a paso o guardar borrador." : "¿Todo listo para abrir?"}
          </p>
          <div className="flex flex-wrap gap-2">
            {step > 1 ? (
              <Button type="button" variant="outline" className="rounded-full" onClick={() => setStep(step - 1)}>
                Anterior
              </Button>
            ) : null}
            {step < 4 ? (
              <Button type="button" className="rounded-full" onClick={() => setStep(step + 1)}>
                Siguiente
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" className="rounded-full" disabled={!businessId} render={<Link to={businessId ? `/mi-negocio/${businessId}` : "#"} />} nativeButton={false}>
                  Revisar panel
                </Button>
                <Button type="button" className="rounded-full" disabled={pending} onClick={() => void publish()}>
                  {pending ? "Publicando…" : "Crear y publicar mi negocio"}
                </Button>
              </>
            )}
          </div>
        </footer>
      </main>
    </div>
  )
}
