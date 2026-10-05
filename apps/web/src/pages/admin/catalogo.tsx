import { useEffect, useMemo, useState } from "react"
import type {
  CreateMarketplaceBusinessCategoryInput,
  CreateMarketplaceCatalogTagInput,
  MarketplaceBusinessCategory,
  MarketplaceTag,
} from "@workspace/shared"
import {
  Add01Icon,
  ArrowRight01Icon,
  Edit02Icon,
  PowerIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import {
  createAdminBusinessCategory,
  createAdminMarketplaceTag,
  deactivateAdminBusinessCategory,
  deactivateAdminMarketplaceTag,
  listAdminBusinessCategories,
  listAdminMarketplaceTags,
  updateAdminBusinessCategory,
  updateAdminMarketplaceTag,
} from "@/services/admin.service"
import { clearMarketplaceTagsCache } from "@/services/catalog.service"
import { Badge } from "@workspace/ui/components/badge"
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
import { Label } from "@workspace/ui/components/label"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { cn } from "cn"

type TaxonomyKind = "business" | "tag"

type TreeNode<T> = T & { children: TreeNode<T>[] }

function errorMessage(reason: unknown, fallback: string) {
  if (reason && typeof reason === "object" && "response" in reason) {
    const data = (reason as { response?: { data?: { error?: { message?: string } } } }).response
      ?.data
    if (data?.error?.message) return data.error.message
  }
  if (reason instanceof Error && reason.message) return reason.message
  return fallback
}

function buildTree<T extends { id: string; parentId?: string | null; sortOrder?: number }>(
  items: T[],
): TreeNode<T>[] {
  const byParent = new Map<string | null, T[]>()
  for (const item of items) {
    const key = item.parentId ?? null
    const list = byParent.get(key) ?? []
    list.push(item)
    byParent.set(key, list)
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id.localeCompare(b.id))
  }
  function walk(parentId: string | null): TreeNode<T>[] {
    return (byParent.get(parentId) ?? []).map((item) => ({
      ...item,
      children: walk(item.id),
    }))
  }
  return walk(null)
}

export function AdminCatalogoPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white">Catálogo global</h2>
        <p className="mt-1 text-sm text-[oklch(0.7_0.02_280)]">
          Los comercios eligen rubros y tags existentes. Solo el super admin crea categorías y
          subcategorías.
        </p>
      </div>

      <Tabs defaultValue="rubros">
        <TabsList className="bg-[oklch(0.22_0.03_275)]">
          <TabsTrigger value="rubros">Rubros de negocio</TabsTrigger>
          <TabsTrigger value="tags">Tags de producto</TabsTrigger>
        </TabsList>
        <TabsContent value="rubros" className="mt-4">
          <BusinessCategoriesPanel />
        </TabsContent>
        <TabsContent value="tags" className="mt-4">
          <MarketplaceTagsPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function BusinessCategoriesPanel() {
  const [items, setItems] = useState<MarketplaceBusinessCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{
    mode: "create" | "edit"
    parentId: string | null
    item?: MarketplaceBusinessCategory
  } | null>(null)

  async function reload() {
    const data = await listAdminBusinessCategories()
    setItems(data)
  }

  useEffect(() => {
    let active = true
    void reload()
      .then(() => {
        if (active) setLoading(false)
      })
      .catch((reason: unknown) => {
        if (!active) return
        setError(errorMessage(reason, "No se pudieron cargar los rubros."))
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const tree = useMemo(() => buildTree(items), [items])

  return (
    <TaxonomyPanel
      kind="business"
      title="Rubros y subrubros"
      description="Se usan en el explorador y en el alta de negocios (legacy_label)."
      loading={loading}
      error={error}
      tree={tree}
      onAddRoot={() => setDialog({ mode: "create", parentId: null })}
      onAddChild={(parentId) => setDialog({ mode: "create", parentId })}
      onEdit={(item) =>
        setDialog({
          mode: "edit",
          parentId: item.parentId ?? null,
          item: item as MarketplaceBusinessCategory,
        })
      }
      onDeactivate={async (id) => {
        await toast.promise(deactivateAdminBusinessCategory(id).then(reload), {
          loading: "Desactivando…",
          success: "Rubro desactivado",
          error: (reason) => errorMessage(reason, "No se pudo desactivar"),
        })
      }}
      onReactivate={async (id) => {
        await toast.promise(updateAdminBusinessCategory(id, { isActive: true }).then(reload), {
          loading: "Reactivando…",
          success: "Rubro reactivado",
          error: (reason) => errorMessage(reason, "No se pudo reactivar"),
        })
      }}
      renderMeta={(item) => (
        <span className="text-[oklch(0.6_0.02_280)]">
          legacy: {(item as MarketplaceBusinessCategory).legacyLabel}
        </span>
      )}
      dialog={
        dialog ? (
          <BusinessCategoryDialog
            open
            mode={dialog.mode}
            parentId={dialog.parentId}
            item={dialog.item}
            parents={items}
            onClose={() => setDialog(null)}
            onSaved={async () => {
              setDialog(null)
              await reload()
            }}
          />
        ) : null
      }
    />
  )
}

function MarketplaceTagsPanel() {
  const [items, setItems] = useState<MarketplaceTag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{
    mode: "create" | "edit"
    parentId: string | null
    item?: MarketplaceTag
  } | null>(null)

  async function reload() {
    const data = await listAdminMarketplaceTags()
    setItems(data)
    clearMarketplaceTagsCache()
  }

  useEffect(() => {
    let active = true
    void reload()
      .then(() => {
        if (active) setLoading(false)
      })
      .catch((reason: unknown) => {
        if (!active) return
        setError(errorMessage(reason, "No se pudieron cargar los tags."))
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const tree = useMemo(() => buildTree(items), [items])

  return (
    <TaxonomyPanel
      kind="tag"
      title="Tags de producto"
      description="Categorías/subcategorías que los comercios asignan a productos (no las crean ellos)."
      loading={loading}
      error={error}
      tree={tree}
      onAddRoot={() => setDialog({ mode: "create", parentId: null })}
      onAddChild={(parentId) => setDialog({ mode: "create", parentId })}
      onEdit={(item) =>
        setDialog({
          mode: "edit",
          parentId: item.parentId ?? null,
          item: item as MarketplaceTag,
        })
      }
      onDeactivate={async (id) => {
        await toast.promise(deactivateAdminMarketplaceTag(id).then(reload), {
          loading: "Desactivando…",
          success: "Tag desactivado",
          error: (reason) => errorMessage(reason, "No se pudo desactivar"),
        })
      }}
      onReactivate={async (id) => {
        await toast.promise(updateAdminMarketplaceTag(id, { isActive: true }).then(reload), {
          loading: "Reactivando…",
          success: "Tag reactivado",
          error: (reason) => errorMessage(reason, "No se pudo reactivar"),
        })
      }}
      dialog={
        dialog ? (
          <MarketplaceTagDialog
            open
            mode={dialog.mode}
            parentId={dialog.parentId}
            item={dialog.item}
            parents={items}
            onClose={() => setDialog(null)}
            onSaved={async () => {
              setDialog(null)
              await reload()
            }}
          />
        ) : null
      }
    />
  )
}

function TaxonomyPanel<T extends { id: string; name: string; slug: string; isActive?: boolean; parentId?: string | null }>({
  title,
  description,
  loading,
  error,
  tree,
  onAddRoot,
  onAddChild,
  onEdit,
  onDeactivate,
  onReactivate,
  renderMeta,
  dialog,
}: {
  kind: TaxonomyKind
  title: string
  description: string
  loading: boolean
  error: string | null
  tree: TreeNode<T>[]
  onAddRoot: () => void
  onAddChild: (parentId: string) => void
  onEdit: (item: T) => void
  onDeactivate: (id: string) => Promise<void>
  onReactivate: (id: string) => Promise<void>
  renderMeta?: (item: T) => React.ReactNode
  dialog: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-[oklch(0.3_0.03_275)] bg-[oklch(0.2_0.03_275)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-white">{title}</h3>
          <p className="mt-1 text-sm text-[oklch(0.65_0.02_280)]">{description}</p>
        </div>
        <Button size="sm" onClick={onAddRoot}>
          <HugeiconsIcon icon={Add01Icon} strokeWidth={2} data-icon="inline-start" />
          Nueva categoría
        </Button>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="mt-4 space-y-1">
        {loading ? (
          <>
            <Skeleton className="h-10 w-full bg-[oklch(0.28_0.03_275)]" />
            <Skeleton className="h-10 w-full bg-[oklch(0.28_0.03_275)]" />
            <Skeleton className="h-10 w-5/6 bg-[oklch(0.28_0.03_275)]" />
          </>
        ) : tree.length === 0 ? (
          <p className="py-8 text-center text-sm text-[oklch(0.6_0.02_280)]">
            Aún no hay categorías. Crea la primera.
          </p>
        ) : (
          tree.map((node) => (
            <TreeRow
              key={node.id}
              node={node}
              depth={0}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDeactivate={onDeactivate}
              onReactivate={onReactivate}
              renderMeta={renderMeta}
            />
          ))
        )}
      </div>
      {dialog}
    </section>
  )
}

function TreeRow<T extends { id: string; name: string; slug: string; isActive?: boolean }>({
  node,
  depth,
  onAddChild,
  onEdit,
  onDeactivate,
  onReactivate,
  renderMeta,
}: {
  node: TreeNode<T>
  depth: number
  onAddChild: (parentId: string) => void
  onEdit: (item: T) => void
  onDeactivate: (id: string) => Promise<void>
  onReactivate: (id: string) => Promise<void>
  renderMeta?: (item: T) => React.ReactNode
}) {
  const [open, setOpen] = useState(depth < 1)
  const hasChildren = node.children.length > 0
  const inactive = node.isActive === false

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-[oklch(0.24_0.03_275)]",
          inactive && "opacity-55",
        )}
        style={{ paddingLeft: `${0.5 + depth * 1.25}rem` }}
      >
        <button
          type="button"
          className={cn(
            "inline-flex size-6 items-center justify-center rounded text-[oklch(0.65_0.02_280)]",
            !hasChildren && "invisible",
          )}
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Colapsar" : "Expandir"}
        >
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            strokeWidth={2}
            className={cn("size-4 transition-transform", open && "rotate-90")}
          />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium text-white">{node.name}</span>
            <code className="truncate text-xs text-[oklch(0.6_0.05_285)]">{node.slug}</code>
            {inactive ? (
              <Badge variant="outline" className="border-amber-500/40 text-amber-200">
                Inactiva
              </Badge>
            ) : null}
          </div>
          {renderMeta ? <div className="mt-0.5 text-xs">{renderMeta(node)}</div> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
          <Button
            size="icon-sm"
            variant="ghost"
            className="text-[oklch(0.8_0.02_280)]"
            onClick={() => onAddChild(node.id)}
            title="Agregar subcategoría"
          >
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            className="text-[oklch(0.8_0.02_280)]"
            onClick={() => onEdit(node)}
            title="Editar"
          >
            <HugeiconsIcon icon={Edit02Icon} strokeWidth={2} />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            className="text-[oklch(0.8_0.02_280)]"
            onClick={() => void (inactive ? onReactivate(node.id) : onDeactivate(node.id))}
            title={inactive ? "Reactivar" : "Desactivar"}
          >
            <HugeiconsIcon icon={PowerIcon} strokeWidth={2} />
          </Button>
        </div>
      </div>
      {open && hasChildren
        ? node.children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDeactivate={onDeactivate}
              onReactivate={onReactivate}
              renderMeta={renderMeta}
            />
          ))
        : null}
    </div>
  )
}

function BusinessCategoryDialog({
  open,
  mode,
  parentId,
  item,
  parents,
  onClose,
  onSaved,
}: {
  open: boolean
  mode: "create" | "edit"
  parentId: string | null
  item?: MarketplaceBusinessCategory
  parents: MarketplaceBusinessCategory[]
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [name, setName] = useState(item?.name ?? "")
  const [slug, setSlug] = useState(item?.slug ?? "")
  const [legacyLabel, setLegacyLabel] = useState(item?.legacyLabel ?? "")
  const [sortOrder, setSortOrder] = useState(String(item?.sortOrder ?? 0))
  const [selectedParent, setSelectedParent] = useState(parentId ?? "")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setName(item?.name ?? "")
    setSlug(item?.slug ?? "")
    setLegacyLabel(item?.legacyLabel ?? item?.name ?? "")
    setSortOrder(String(item?.sortOrder ?? 0))
    setSelectedParent(parentId ?? "")
  }, [item, parentId, open])

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    const payload: CreateMarketplaceBusinessCategoryInput = {
      name: name.trim(),
      legacyLabel: legacyLabel.trim() || name.trim(),
      parentId: selectedParent || null,
      sortOrder: Number(sortOrder) || 0,
    }
    if (slug.trim()) payload.slug = slug.trim().toLowerCase()

    try {
      await toast.promise(
        (async () => {
          if (mode === "edit" && item) {
            await updateAdminBusinessCategory(item.id, payload)
          } else {
            await createAdminBusinessCategory(payload)
          }
          await onSaved()
        })(),
        {
          loading: "Guardando…",
          success: mode === "edit" ? "Rubro actualizado" : "Rubro creado",
          error: (reason) => errorMessage(reason, "No se pudo guardar"),
        },
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="border-[oklch(0.3_0.03_275)] bg-[oklch(0.18_0.03_275)] text-white sm:max-w-md">
        <form onSubmit={(e) => void onSubmit(e)}>
          <DialogHeader>
            <DialogTitle>{mode === "edit" ? "Editar rubro" : "Nuevo rubro"}</DialogTitle>
            <DialogDescription className="text-[oklch(0.65_0.02_280)]">
              El slug se genera del nombre si lo dejas vacío. legacy_label alimenta el onboarding.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-3">
            <Field label="Nombre">
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (mode === "create" && !slug) setLegacyLabel(e.target.value)
                }}
                required
                maxLength={80}
                className="border-[oklch(0.32_0.03_275)] bg-[oklch(0.22_0.03_275)]"
              />
            </Field>
            <Field label="Slug (opcional)">
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="auto desde el nombre"
                className="border-[oklch(0.32_0.03_275)] bg-[oklch(0.22_0.03_275)] font-mono text-sm"
              />
            </Field>
            <Field label="Etiqueta legacy">
              <Input
                value={legacyLabel}
                onChange={(e) => setLegacyLabel(e.target.value)}
                required
                maxLength={60}
                className="border-[oklch(0.32_0.03_275)] bg-[oklch(0.22_0.03_275)]"
              />
            </Field>
            <Field label="Categoría padre">
              <select
                className="h-9 w-full rounded-lg border border-[oklch(0.32_0.03_275)] bg-[oklch(0.22_0.03_275)] px-3 text-sm"
                value={selectedParent}
                onChange={(e) => setSelectedParent(e.target.value)}
              >
                <option value="">— Raíz —</option>
                {parents
                  .filter((p) => p.id !== item?.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Orden">
              <Input
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="border-[oklch(0.32_0.03_275)] bg-[oklch(0.22_0.03_275)]"
              />
            </Field>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function MarketplaceTagDialog({
  open,
  mode,
  parentId,
  item,
  parents,
  onClose,
  onSaved,
}: {
  open: boolean
  mode: "create" | "edit"
  parentId: string | null
  item?: MarketplaceTag
  parents: MarketplaceTag[]
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [name, setName] = useState(item?.name ?? "")
  const [slug, setSlug] = useState(item?.slug ?? "")
  const [sortOrder, setSortOrder] = useState(String(item?.sortOrder ?? 0))
  const [selectedParent, setSelectedParent] = useState(parentId ?? "")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setName(item?.name ?? "")
    setSlug(item?.slug ?? "")
    setSortOrder(String(item?.sortOrder ?? 0))
    setSelectedParent(parentId ?? "")
  }, [item, parentId, open])

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    const payload: CreateMarketplaceCatalogTagInput = {
      name: name.trim(),
      parentId: selectedParent || null,
      sortOrder: Number(sortOrder) || 0,
    }
    if (slug.trim()) payload.slug = slug.trim().toLowerCase()

    try {
      await toast.promise(
        (async () => {
          if (mode === "edit" && item) {
            await updateAdminMarketplaceTag(item.id, payload)
          } else {
            await createAdminMarketplaceTag(payload)
          }
          await onSaved()
        })(),
        {
          loading: "Guardando…",
          success: mode === "edit" ? "Tag actualizado" : "Tag creado",
          error: (reason) => errorMessage(reason, "No se pudo guardar"),
        },
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="border-[oklch(0.3_0.03_275)] bg-[oklch(0.18_0.03_275)] text-white sm:max-w-md">
        <form onSubmit={(e) => void onSubmit(e)}>
          <DialogHeader>
            <DialogTitle>{mode === "edit" ? "Editar tag" : "Nuevo tag"}</DialogTitle>
            <DialogDescription className="text-[oklch(0.65_0.02_280)]">
              Tags marketplace para clasificar productos. Los comercios solo eligen, no crean.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-3">
            <Field label="Nombre">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={80}
                className="border-[oklch(0.32_0.03_275)] bg-[oklch(0.22_0.03_275)]"
              />
            </Field>
            <Field label="Slug (opcional)">
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="auto desde el nombre"
                className="border-[oklch(0.32_0.03_275)] bg-[oklch(0.22_0.03_275)] font-mono text-sm"
              />
            </Field>
            <Field label="Tag padre">
              <select
                className="h-9 w-full rounded-lg border border-[oklch(0.32_0.03_275)] bg-[oklch(0.22_0.03_275)] px-3 text-sm"
                value={selectedParent}
                onChange={(e) => setSelectedParent(e.target.value)}
              >
                <option value="">— Raíz —</option>
                {parents
                  .filter((p) => p.id !== item?.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Orden">
              <Input
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="border-[oklch(0.32_0.03_275)] bg-[oklch(0.22_0.03_275)]"
              />
            </Field>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <Label className="text-[oklch(0.75_0.02_280)]">{label}</Label>
      {children}
    </label>
  )
}
