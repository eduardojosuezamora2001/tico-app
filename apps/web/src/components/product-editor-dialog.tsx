import { useEffect, useMemo, useState } from "react"
import {
  type CreateProductInput,
  type Product,
  type ProductBundleItemInput,
  type ProductKind,
  type ProductOptionGroup,
  type ProductVariantInput,
  type SpecField,
} from "@workspace/shared"

import { CategoryMultiCombobox } from "@/components/category-multi-combobox"
import { createProduct, listMarketplaceTags, updateProduct } from "@/services/catalog.service"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"

type Props = {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
  componentVariants?: { id: string; label: string }[]
  onSaved: () => void
}

const emptyVariant = (price: number): ProductVariantInput => ({
  price,
  stock: null,
  options: {},
  isDefault: true,
  isAvailable: true,
  sortOrder: 0,
})

export function ProductEditorDialog({
  businessId,
  open,
  onOpenChange,
  product,
  componentVariants = [],
  onSaved,
}: Props) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState(product?.name ?? "")
  const [description, setDescription] = useState(product?.description ?? "")
  const [tagIds, setTagIds] = useState<string[]>(() => product?.marketplaceTags?.map((tag) => tag.id) ?? [])
  const [tagOptions, setTagOptions] = useState<{ id: string; label: string }[]>([])
  const [productKind, setProductKind] = useState<ProductKind>(product?.productKind ?? "simple")
  const [price, setPrice] = useState(String(product?.price ?? ""))
  const [stock, setStock] = useState(product?.stock != null ? String(product.stock) : "")
  const [optionGroups, setOptionGroups] = useState<ProductOptionGroup[]>(product?.optionGroups ?? [])
  const [specSchema, setSpecSchema] = useState<SpecField[]>(product?.specSchema ?? [])
  const [specifications, setSpecifications] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(product?.specifications ?? {}).map(([k, v]) => [k, String(v)]),
    ),
  )
  const [variants, setVariants] = useState<ProductVariantInput[]>(
    product?.variants?.map((v) => ({
      id: v.id,
      price: v.price,
      stock: v.stock,
      imageUrl: v.imageUrl,
      options: v.options,
      sku: v.sku,
      sortOrder: v.sortOrder,
      isDefault: v.isDefault,
      isAvailable: v.isAvailable,
    })) ?? [],
  )
  const [bundleItems, setBundleItems] = useState<ProductBundleItemInput[]>(
    product?.bundleItems?.map((b) => ({
      id: b.id,
      componentVariantId: b.componentVariantId,
      defaultQty: b.defaultQty,
      minQty: b.minQty,
      maxQty: b.maxQty,
      sortOrder: b.sortOrder,
    })) ?? [],
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const steps = useMemo(
    () =>
      productKind === "bundle"
        ? ["Básico", "Ficha", "Paquete"]
        : productKind === "variant"
          ? ["Básico", "Ficha", "Variantes"]
          : ["Básico", "Ficha"],
    [productKind],
  )

  useEffect(() => {
    void listMarketplaceTags()
      .then((tags) => setTagOptions(tags.map((tag) => ({ id: tag.id, label: tag.name }))))
      .catch(() => setTagOptions([]))
  }, [])

  useEffect(() => {
    if (!open) return
    setName(product?.name ?? "")
    setDescription(product?.description ?? "")
    setTagIds(product?.marketplaceTags?.map((tag) => tag.id) ?? [])
    setProductKind(product?.productKind ?? "simple")
    setPrice(String(product?.price ?? ""))
    setStock(product?.stock != null ? String(product.stock) : "")
    setOptionGroups(product?.optionGroups ?? [])
    setSpecSchema(product?.specSchema ?? [])
    setSpecifications(
      Object.fromEntries(
        Object.entries(product?.specifications ?? {}).map(([k, v]) => [k, String(v)]),
      ),
    )
    setVariants(
      product?.variants?.map((v) => ({
        id: v.id,
        price: v.price,
        stock: v.stock,
        imageUrl: v.imageUrl,
        options: v.options,
        sku: v.sku,
        sortOrder: v.sortOrder,
        isDefault: v.isDefault,
        isAvailable: v.isAvailable,
      })) ?? [],
    )
    setBundleItems(
      product?.bundleItems?.map((b) => ({
        id: b.id,
        componentVariantId: b.componentVariantId,
        defaultQty: b.defaultQty,
        minQty: b.minQty,
        maxQty: b.maxQty,
        sortOrder: b.sortOrder,
      })) ?? [],
    )
    setStep(0)
    setError(null)
  }, [open, product])

  async function handleSave() {
    setSaving(true)
    setError(null)
    const payload: CreateProductInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      marketplaceTagIds: tagIds,
      category:
        tagOptions
          .filter((option) => tagIds.includes(option.id))
          .map((option) => option.label)
          .join(", ") || undefined,
      productKind,
      optionGroups,
      specSchema,
      specifications: Object.fromEntries(
        specSchema.map((field) => {
          const raw = specifications[field.key] ?? ""
          if (field.type === "number") return [field.key, Number(raw) || 0]
          if (field.type === "boolean") return [field.key, raw === "true"]
          return [field.key, raw]
        }),
      ),
      price: price ? Number(price) : undefined,
      stock: stock ? Number(stock) : undefined,
      variants: productKind === "variant" ? variants : undefined,
      bundleItems: productKind === "bundle" ? bundleItems : undefined,
    }
    try {
      if (product) {
        await updateProduct(businessId, product.id, payload)
      } else {
        if (productKind === "simple" && !payload.price) {
          throw new Error("Indica el precio.")
        }
        if (productKind === "variant" && variants.length === 0 && !payload.price) {
          throw new Error("Agrega variantes o un precio base.")
        }
        await createProduct(businessId, payload)
      }
      onSaved()
      onOpenChange(false)
    } catch {
      setError("No se pudo guardar el producto. Revisa los datos.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{product ? "Editar producto" : "Nuevo producto"}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 text-xs">
          {steps.map((label, index) => (
            <button
              key={label}
              type="button"
              className={index === step ? "font-semibold text-primary" : "text-muted-foreground"}
              onClick={() => setStep(index)}
            >
              {index + 1}. {label}
            </button>
          ))}
        </div>

        {step === 0 ? (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Nombre
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-xl" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Categorías
              <CategoryMultiCombobox
                value={tagIds}
                onChange={setTagIds}
                options={tagOptions}
                allowCreate={false}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Descripción
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-20 rounded-xl" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Tipo
              <select
                className="h-10 rounded-xl border border-input bg-transparent px-2 text-sm"
                value={productKind}
                onChange={(e) => setProductKind(e.target.value as ProductKind)}
              >
                <option value="simple">Simple</option>
                <option value="variant">Con variantes</option>
                <option value="bundle">Combo / paquete</option>
              </select>
            </label>
            {productKind === "simple" ? (
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  Precio (₡)
                  <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" className="h-10 rounded-xl" />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Stock
                  <Input value={stock} onChange={(e) => setStock(e.target.value)} inputMode="numeric" className="h-10 rounded-xl" />
                </label>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="flex flex-col gap-3">
            {specSchema.map((field) => (
              <label key={field.key} className="flex flex-col gap-1 text-sm">
                {field.label}
                <Input
                  value={specifications[field.key] ?? ""}
                  onChange={(e) => setSpecifications((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  className="h-10 rounded-xl"
                />
              </label>
            ))}
            {specSchema.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Configura la ficha técnica al crear variantes o combos con opciones personalizadas.
              </p>
            ) : null}
          </div>
        ) : null}

        {step === 2 && productKind === "variant" ? (
          <div className="flex flex-col gap-3">
            {variants.map((variant, index) => (
              <div key={index} className="rounded-xl border border-border p-3">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Precio"
                    value={String(variant.price)}
                    onChange={(e) => {
                      const next = [...variants]
                      next[index] = { ...variant, price: Number(e.target.value) || 0 }
                      setVariants(next)
                    }}
                  />
                  <Input
                    placeholder="Stock"
                    value={variant.stock != null ? String(variant.stock) : ""}
                    onChange={(e) => {
                      const next = [...variants]
                      next[index] = { ...variant, stock: e.target.value ? Number(e.target.value) : null }
                      setVariants(next)
                    }}
                  />
                </div>
                {optionGroups.map((group) => (
                  <select
                    key={group.key}
                    className="mt-2 h-9 w-full rounded-md border border-input px-2 text-sm"
                    value={variant.options[group.key] ?? ""}
                    onChange={(e) => {
                      const next = [...variants]
                      next[index] = {
                        ...variant,
                        options: { ...variant.options, [group.key]: e.target.value },
                      }
                      setVariants(next)
                    }}
                  >
                    <option value="">{group.label}</option>
                    {group.values.map((v) => (
                      <option key={v.value} value={v.value}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                ))}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setVariants((prev) => [
                  ...prev.map((v) => ({ ...v, isDefault: false })),
                  emptyVariant(Number(price) || 0),
                ])
              }
            >
              Agregar variante
            </Button>
          </div>
        ) : null}

        {step === 2 && productKind === "bundle" ? (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Precio del combo (₡)
              <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" className="h-10 rounded-xl" />
            </label>
            {bundleItems.map((item, index) => (
              <div key={index} className="grid grid-cols-4 gap-2">
                <select
                  className="col-span-2 h-9 rounded-md border border-input px-2 text-sm"
                  value={item.componentVariantId}
                  onChange={(e) => {
                    const next = [...bundleItems]
                    next[index] = { ...item, componentVariantId: e.target.value }
                    setBundleItems(next)
                  }}
                >
                  <option value="">Componente</option>
                  {componentVariants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="Def."
                  value={String(item.defaultQty)}
                  onChange={(e) => {
                    const next = [...bundleItems]
                    next[index] = { ...item, defaultQty: Number(e.target.value) || 0 }
                    setBundleItems(next)
                  }}
                />
                <Input
                  placeholder="Máx."
                  value={String(item.maxQty)}
                  onChange={(e) => {
                    const next = [...bundleItems]
                    next[index] = { ...item, maxQty: Number(e.target.value) || 1 }
                    setBundleItems(next)
                  }}
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setBundleItems((prev) => [
                  ...prev,
                  { componentVariantId: "", defaultQty: 1, minQty: 0, maxQty: 99, sortOrder: prev.length },
                ])
              }
            >
              Agregar ítem al combo
            </Button>
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={saving || !name.trim()} onClick={() => void handleSave()}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
