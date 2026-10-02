import { useEffect, useId, useMemo, useRef, useState, type SubmitEvent } from "react"
import {
  Add01Icon,
  Menu01Icon,
  Search01Icon,
  ShoppingBag01Icon,
  Store03Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  BUSINESS_CATEGORY_COMBO_OPTIONS,
  MAX_BUSINESS_CATEGORIES,
  MODULES,
  serializeBusinessCategories,
  type ModuleName,
  type Product,
} from "@workspace/shared"

import { CategoryMultiCombobox } from "@/components/category-multi-combobox"
import {
  CATALOG_MODULES,
  catalogModule,
  collectStudioItems,
  countPhrase,
  parseCatalogPrice,
  type CatalogBag,
  type StudioItem,
} from "@/lib/catalog-studio"
import { MODULE_CATALOG } from "@/lib/module-catalog"
import { listMarketplaceTags } from "@/services/catalog.service"
import { setBusinessModule } from "@/services/modules.service"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@workspace/ui/components/input-group"
import { Separator } from "@workspace/ui/components/separator"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Spinner } from "@workspace/ui/components/spinner"
import { Switch } from "@workspace/ui/components/switch"
import { ToggleGroup, ToggleGroupItem } from "@workspace/ui/components/toggle-group"

const colones = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 0,
})

const MODULE_ICONS = {
  [MODULES.PRODUCTS]: ShoppingBag01Icon,
  [MODULES.SERVICES]: Store03Icon,
  [MODULES.MENU]: Menu01Icon,
  [MODULES.APPOINTMENTS]: UserGroupIcon,
} as const

type OfferFilter = "all" | "hidden" | ModuleName

function moduleTitle(id: ModuleName) {
  return MODULE_CATALOG.find((entry) => entry.id === id)?.title ?? id
}

export function MerchantCatalogStudio({
  businessId,
  modules,
  modulesLoading,
  bag,
  catalogReady,
  onModulesChanged,
  onCatalogChanged,
  onOpenModuleSettings,
  onCreateFullProduct,
  onEdit,
}: {
  businessId: string
  modules: Record<ModuleName, boolean>
  modulesLoading: boolean
  bag: CatalogBag
  catalogReady: boolean
  onModulesChanged: () => void
  onCatalogChanged: () => void
  onOpenModuleSettings: (moduleId: ModuleName | null) => void
  onCreateFullProduct: () => void
  onEdit: (item: StudioItem, product: Product | null) => void
}) {
  const formId = useId()
  const nameRef = useRef<HTMLInputElement>(null)
  const [selected, setSelected] = useState<ModuleName | null>(null)
  const [filter, setFilter] = useState<OfferFilter>("all")
  const [query, setQuery] = useState("")
  const [name, setName] = useState("")
  const [categories, setCategories] = useState<string[]>([])
  const [section, setSection] = useState("")
  const [tagOptions, setTagOptions] = useState<{ id: string; label: string }[]>([])
  const [price, setPrice] = useState("")
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingModule, setPendingModule] = useState<ModuleName | null>(null)
  const [pendingItem, setPendingItem] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)

  const items = useMemo(() => collectStudioItems(bag), [bag])
  const selectedConfig = selected ? catalogModule(selected) : null
  const enabledCatalog = CATALOG_MODULES.filter((entry) => modules[entry.id])
  const nameInvalid = Boolean(formError && /nombre/i.test(formError))
  const priceInvalid = Boolean(formError && /precio/i.test(formError))

  useEffect(() => {
    if (selected || modulesLoading) return
    const next = CATALOG_MODULES.find((entry) => modules[entry.id]) ?? CATALOG_MODULES[0]
    if (next) setSelected(next.id)
  }, [modules, modulesLoading, selected])

  useEffect(() => {
    setName("")
    setCategories([])
    setSection("")
    setPrice("")
    setFormError(null)
  }, [selected])

  useEffect(() => {
    void listMarketplaceTags()
      .then((tags) => setTagOptions(tags.map((tag) => ({ id: tag.id, label: tag.name }))))
      .catch(() => setTagOptions([]))
  }, [])

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    return items.filter((item) => {
      const entry = CATALOG_MODULES.find((candidate) => candidate.kind === item.module)
      if (!entry) return false
      const viewingModule = filter !== "all" && filter !== "hidden" && entry.id === filter
      if (!modules[entry.id] && !viewingModule) return false
      if (filter === "hidden" && item.listed && item.stock !== 0) return false
      if (filter !== "all" && filter !== "hidden" && entry.id !== filter) return false
      if (!term) return true
      return [item.name, item.description, item.group, item.detail].join(" ").toLowerCase().includes(term)
    })
  }, [filter, items, modules, query])

  const hiddenCount = items.filter((item) => {
    const entry = CATALOG_MODULES.find((candidate) => candidate.kind === item.module)
    return entry && modules[entry.id] && (!item.listed || item.stock === 0)
  }).length

  const totalListed = enabledCatalog.reduce((sum, entry) => sum + entry.collect(bag).length, 0)
  const suggestions = selectedConfig ? selectedConfig.groups(bag) : []
  const listId = `${formId}-groups`
  const nameId = `${formId}-name`
  const groupId = `${formId}-group`
  const priceId = `${formId}-price`

  function focusQuickAdd(moduleId?: ModuleName) {
    if (moduleId) setSelected(moduleId)
    const target = moduleId ? catalogModule(moduleId) : selectedConfig
    if (!target || !modules[target.id]) {
      onOpenModuleSettings(moduleId ?? null)
      return
    }
    nameRef.current?.focus()
    nameRef.current?.scrollIntoView({ block: "center", behavior: "smooth" })
  }

  async function toggleModule(moduleId: ModuleName, next: boolean) {
    setPendingModule(moduleId)
    setActionError(null)
    try {
      await setBusinessModule(businessId, moduleId, next)
      setSelected(moduleId)
      onModulesChanged()
    } catch {
      setActionError(next ? "No se pudo activar el módulo." : "No se pudo desactivar el módulo.")
    } finally {
      setPendingModule(null)
    }
  }

  async function submitQuickAdd(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedConfig) return
    setSaving(true)
    setFormError(null)
    try {
      if (!name.trim()) throw new Error("Escribe el nombre.")
      parseCatalogPrice(price, selectedConfig.quick.priceRequired)
      const marketplaceTagIds =
        selectedConfig.quick.groupMode === "marketplace" ? categories : undefined
      const group =
        selectedConfig.quick.groupMode === "marketplace"
          ? categories
              .map((id) => tagOptions.find((option) => option.id === id)?.label)
              .filter((label): label is string => Boolean(label))
              .join(", ")
          : selectedConfig.quick.groupMode === "business"
            ? (serializeBusinessCategories(categories) ?? "")
            : section
      await selectedConfig.create(businessId, { name, group, price, marketplaceTagIds })
      setName("")
      setCategories([])
      setSection("")
      setPrice("")
      onCatalogChanged()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No se pudo agregar.")
    } finally {
      setSaving(false)
    }
  }

  async function toggleListed(item: StudioItem) {
    const entry = CATALOG_MODULES.find((candidate) => candidate.kind === item.module)
    if (!entry) return
    setPendingItem(item.id)
    setActionError(null)
    try {
      await entry.setListed(businessId, item.id, !item.listed)
      onCatalogChanged()
    } catch {
      setActionError("No se pudo cambiar la visibilidad.")
    } finally {
      setPendingItem(null)
    }
  }

  async function removeItem(item: StudioItem) {
    const entry = CATALOG_MODULES.find((candidate) => candidate.kind === item.module)
    if (!entry) return
    setPendingItem(item.id)
    setActionError(null)
    try {
      await entry.remove(businessId, item.id)
      setConfirmRemove(null)
      onCatalogChanged()
    } catch {
      setActionError("No se pudo quitar ese elemento.")
    } finally {
      setPendingItem(null)
    }
  }

  const filterOptions: { value: OfferFilter; label: string }[] = [
    { value: "all", label: `Todos (${totalListed})` },
    ...enabledCatalog.map((entry) => ({
      value: entry.id as OfferFilter,
      label: `${moduleTitle(entry.id)} (${entry.collect(bag).length})`,
    })),
    { value: "hidden", label: `Ocultos (${hiddenCount})` },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight">Oferta del local</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Activa los módulos que quieres publicar y agrega productos, platos o servicios desde aquí. Lo que queda activo se ve en la página del negocio.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenModuleSettings(null)}>
            Gestionar módulos
          </Button>
          <Button type="button" onClick={() => focusQuickAdd(selected ?? undefined)}>
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} data-icon="inline-start" />
            Nuevo ítem
          </Button>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h3 className="text-lg font-semibold">Módulos del local</h3>
          <Button type="button" variant="link" onClick={() => onOpenModuleSettings(null)}>
            Cómo funcionan
          </Button>
        </div>
        {modulesLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {MODULE_CATALOG.map((entry) => {
              const config = catalogModule(entry.id)
              const enabled = modules[entry.id]
              const count = config ? config.collect(bag).length : 0
              const active = selected === entry.id
              return (
                <li key={entry.id} className="min-w-0">
                  <Card size="sm" className="h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Badge variant="secondary">
                          <HugeiconsIcon icon={MODULE_ICONS[entry.id]} strokeWidth={2} />
                        </Badge>
                        {entry.title}
                      </CardTitle>
                      <CardDescription>{entry.summary}</CardDescription>
                      <CardAction>
                        <Switch
                          checked={enabled}
                          disabled={pendingModule === entry.id}
                          aria-label={`${enabled ? "Desactivar" : "Activar"} ${entry.title}`}
                          onCheckedChange={(checked) => void toggleModule(entry.id, checked)}
                        />
                      </CardAction>
                    </CardHeader>
                    <CardFooter className="mt-auto justify-between">
                      <p className="text-muted-foreground">
                        {config
                          ? enabled
                            ? countPhrase(count, config.itemOne, config.itemMany)
                            : "Apagado en la página"
                          : "Sin ítems de catálogo"}
                      </p>
                      <div className="flex items-center gap-2">
                        {active ? <Badge>En uso</Badge> : null}
                        {config ? (
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            onClick={() => {
                              setSelected(entry.id)
                              setFilter(entry.id)
                            }}
                          >
                            Ver
                          </Button>
                        ) : (
                          <Button type="button" variant="link" size="sm" onClick={() => onOpenModuleSettings(entry.id)}>
                            Configurar
                          </Button>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <Separator />

      {selectedConfig ? (
        <Card>
          <CardHeader>
            <CardTitle>Agregar al instante</CardTitle>
            <CardDescription>
              El formulario cambia según el módulo. Un módulo nuevo se suma aquí al registrarlo en el catálogo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ToggleGroup
              value={selected ? [selected] : []}
              onValueChange={(value) => {
                const next = value[0]
                if (next) setSelected(next as ModuleName)
              }}
              variant="outline"
              size="sm"
              spacing={2}
              aria-label="Módulo del ítem"
              className="flex-wrap"
            >
              {CATALOG_MODULES.map((entry) => (
                <ToggleGroupItem key={entry.id} value={entry.id}>
                  {moduleTitle(entry.id)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </CardContent>
          {modules[selectedConfig.id] ? (
            <form onSubmit={(event) => void submitQuickAdd(event)}>
              <CardContent>
                <FieldGroup className="gap-4 lg:grid lg:grid-cols-3">
                  <Field data-invalid={nameInvalid || undefined}>
                    <FieldLabel htmlFor={nameId}>{selectedConfig.quick.nameLabel}</FieldLabel>
                    <Input
                      ref={nameRef}
                      id={nameId}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder={selectedConfig.quick.namePlaceholder}
                      required
                      aria-invalid={nameInvalid || undefined}
                    />
                    {nameInvalid ? <FieldError>{formError}</FieldError> : null}
                  </Field>
                  {selectedConfig.quick.groupMode === "marketplace" ||
                  selectedConfig.quick.groupMode === "business" ? (
                    <Field>
                      <FieldLabel>{selectedConfig.quick.groupLabel}</FieldLabel>
                      <CategoryMultiCombobox
                        label={selectedConfig.quick.groupLabel ?? "Categorías"}
                        value={categories}
                        onChange={setCategories}
                        options={
                          selectedConfig.quick.groupMode === "marketplace"
                            ? tagOptions
                            : BUSINESS_CATEGORY_COMBO_OPTIONS
                        }
                        allowCreate={false}
                        maxItems={
                          selectedConfig.quick.groupMode === "marketplace" ? 12 : MAX_BUSINESS_CATEGORIES
                        }
                      />
                    </Field>
                  ) : selectedConfig.quick.groupLabel ? (
                    <Field>
                      <FieldLabel htmlFor={groupId}>{selectedConfig.quick.groupLabel}</FieldLabel>
                      <Input
                        id={groupId}
                        value={section}
                        onChange={(event) => setSection(event.target.value)}
                        placeholder={selectedConfig.quick.groupPlaceholder ?? ""}
                        list={listId}
                      />
                      <datalist id={listId}>
                        {suggestions.map((option) => (
                          <option key={option} value={option} />
                        ))}
                      </datalist>
                    </Field>
                  ) : null}
                  <Field data-invalid={priceInvalid || undefined}>
                    <FieldLabel htmlFor={priceId}>
                      {selectedConfig.quick.priceLabel}
                      {selectedConfig.quick.priceRequired ? "" : " (opcional)"}
                    </FieldLabel>
                    <Input
                      id={priceId}
                      value={price}
                      onChange={(event) => setPrice(event.target.value)}
                      placeholder={selectedConfig.quick.priceRequired ? "3800" : "Vacío = cotización"}
                      inputMode="decimal"
                      required={selectedConfig.quick.priceRequired}
                      aria-invalid={priceInvalid || undefined}
                    />
                    {selectedConfig.id === MODULES.SERVICES ? (
                      <FieldDescription>Si lo dejas vacío, en la página se muestra como cotización.</FieldDescription>
                    ) : (
                      <FieldDescription>El cliente lo ve en la página de este local, con este precio.</FieldDescription>
                    )}
                    {priceInvalid ? <FieldError>{formError}</FieldError> : null}
                  </Field>
                </FieldGroup>
                {formError && !nameInvalid && !priceInvalid ? (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTitle>No se pudo agregar</AlertTitle>
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                ) : null}
              </CardContent>
              <CardFooter className="justify-between">
                {selectedConfig.id === MODULES.PRODUCTS ? (
                  <Button type="button" variant="link" onClick={onCreateFullProduct}>
                    Producto con variantes o combo
                  </Button>
                ) : (
                  <span />
                )}
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <HugeiconsIcon icon={Add01Icon} strokeWidth={2} data-icon="inline-start" />
                  )}
                  {saving ? "Agregando…" : selectedConfig.quick.submitLabel}
                </Button>
              </CardFooter>
            </form>
          ) : (
            <CardContent>
              <Alert>
                <AlertTitle>Módulo apagado</AlertTitle>
                <AlertDescription>
                  Activa {moduleTitle(selectedConfig.id)} para publicar desde este formulario.
                </AlertDescription>
              </Alert>
              <Button
                type="button"
                className="mt-4"
                disabled={pendingModule === selectedConfig.id}
                onClick={() => void toggleModule(selectedConfig.id, true)}
              >
                {pendingModule === selectedConfig.id ? <Spinner data-icon="inline-start" /> : null}
                {pendingModule === selectedConfig.id ? "Activando…" : "Activar módulo"}
              </Button>
            </CardContent>
          )}
        </Card>
      ) : null}

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <InputGroup className="min-w-0 flex-1">
            <InputGroupAddon>
              <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
              <span className="sr-only">Buscar en la oferta</span>
            </InputGroupAddon>
            <InputGroupInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre o sección"
            />
          </InputGroup>
          <ToggleGroup
            value={[filter]}
            onValueChange={(value) => {
              const next = value[0]
              if (next) setFilter(next as OfferFilter)
            }}
            variant="outline"
            size="sm"
            spacing={2}
            aria-label="Filtrar oferta"
            className="flex-wrap"
          >
            {filterOptions.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value}>
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {actionError ? (
          <Alert variant="destructive">
            <AlertTitle>No se pudo actualizar</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        ) : null}
        {selectedConfig && filter === selectedConfig.id && !modules[selectedConfig.id] ? (
          <Alert>
            <AlertTitle>Este módulo está apagado</AlertTitle>
            <AlertDescription>Estos ítems no salen en la página pública.</AlertDescription>
          </Alert>
        ) : null}

        {!catalogReady ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-44 rounded-xl" />
            ))}
          </div>
        ) : visible.length === 0 && enabledCatalog.length === 0 && filter === "all" ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon icon={ShoppingBag01Icon} strokeWidth={2} />
              </EmptyMedia>
              <EmptyTitle>Todavía no hay módulos de catálogo activos</EmptyTitle>
              <EmptyDescription>Activa productos, menú o servicios para empezar a publicar.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : visible.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
              </EmptyMedia>
              <EmptyTitle>Nada en esta vista</EmptyTitle>
              <EmptyDescription>
                {query ? "Prueba con otro nombre." : "Agrega el primero con el formulario de arriba."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((item) => {
              const entry = CATALOG_MODULES.find((candidate) => candidate.kind === item.module)
              const title = entry ? moduleTitle(entry.id) : item.module
              const soldOut = item.stock === 0
              return (
                <li key={`${item.module}-${item.id}`} className="min-w-0">
                  <Card size="sm" className="h-full">
                    <CardHeader>
                      <CardTitle className="truncate">{item.name}</CardTitle>
                      {item.description ? (
                        <CardDescription className="line-clamp-2">{item.description}</CardDescription>
                      ) : null}
                      <CardAction>
                        <Badge variant="secondary">{title}</Badge>
                      </CardAction>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {item.group ? <Badge variant="outline">{item.group}</Badge> : null}
                        <Badge variant={soldOut || !item.listed ? "destructive" : "secondary"}>
                          {soldOut ? "Sin stock" : item.listed ? "En la página" : "Oculto"}
                        </Badge>
                        {item.detail ? <Badge variant="outline">{item.detail}</Badge> : null}
                      </div>
                      <p className="tabular-nums">
                        {item.price === null ? "Cotización" : colones.format(item.price)}
                        {item.stock !== null ? ` · Stock ${item.stock}` : ""}
                      </p>
                    </CardContent>
                    <CardFooter className="mt-auto flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pendingItem === item.id}
                        onClick={() => void toggleListed(item)}
                      >
                        {pendingItem === item.id ? <Spinner data-icon="inline-start" /> : null}
                        {item.listed ? "Ocultar" : "Publicar"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          onEdit(
                            item,
                            item.module === "products"
                              ? (bag.products.find((product) => product.id === item.id) ?? null)
                              : null,
                          )
                        }
                      >
                        Editar
                      </Button>
                      {confirmRemove === item.id ? (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={pendingItem === item.id}
                          onClick={() => void removeItem(item)}
                        >
                          Confirmar
                        </Button>
                      ) : (
                        <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmRemove(item.id)}>
                          Quitar
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
