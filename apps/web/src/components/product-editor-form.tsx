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

import { CatalogImageUpload } from "@/components/catalog-image-upload"
import { CategoryMultiCombobox } from "@/components/category-multi-combobox"
import { createProduct, listMarketplaceTags, updateProduct } from "@/services/catalog.service"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Separator } from "@workspace/ui/components/separator"
import { Spinner } from "@workspace/ui/components/spinner"
import { Textarea } from "@workspace/ui/components/textarea"
import { ToggleGroup, ToggleGroupItem } from "@workspace/ui/components/toggle-group"

type Props = {
  businessId: string
  product?: Product | null
  componentVariants?: { id: string; label: string }[]
  onSaved: () => void
  onCancel?: () => void
}

const emptyVariant = (price: number): ProductVariantInput => ({
  price,
  stock: null,
  options: {},
  isDefault: true,
  isAvailable: true,
  sortOrder: 0,
})

export function ProductEditorForm({
  businessId,
  product = null,
  componentVariants = [],
  onSaved,
  onCancel,
}: Props) {
  const [name, setName] = useState(product?.name ?? "")
  const [description, setDescription] = useState(product?.description ?? "")
  const [tagIds, setTagIds] = useState<string[]>(() => product?.marketplaceTags?.map((tag) => tag.id) ?? [])
  const [tagOptions, setTagOptions] = useState<{ id: string; label: string }[]>([])
  const [productKind, setProductKind] = useState<ProductKind>(product?.productKind ?? "simple")
  const [pricingMode, setPricingMode] = useState<"fixed" | "sum_components">(
    product?.bundleConfig?.pricingMode ?? "fixed",
  )
  const [price, setPrice] = useState(String(product?.price ?? ""))
  const [stock, setStock] = useState(product?.stock != null ? String(product.stock) : "")
  const [imageUrl, setImageUrl] = useState<string | null>(product?.imageUrl ?? null)
  const [optionGroups] = useState<ProductOptionGroup[]>(product?.optionGroups ?? [])
  const [specSchema] = useState<SpecField[]>(product?.specSchema ?? [])
  const [specifications, setSpecifications] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(product?.specifications ?? {}).map(([k, v]) => [k, String(v)])),
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

  const kindLabel = useMemo(
    () =>
      ({
        simple: "Producto simple",
        variant: "Con variantes",
        bundle: "Combo o promoción",
      }) satisfies Record<ProductKind, string>,
    [],
  )

  useEffect(() => {
    void listMarketplaceTags()
      .then((tags) => setTagOptions(tags.map((tag) => ({ id: tag.id, label: tag.name }))))
      .catch(() => setTagOptions([]))
  }, [])

  useEffect(() => {
    setName(product?.name ?? "")
    setDescription(product?.description ?? "")
    setTagIds(product?.marketplaceTags?.map((tag) => tag.id) ?? [])
    setProductKind(product?.productKind ?? "simple")
    setPricingMode(product?.bundleConfig?.pricingMode ?? "fixed")
    setPrice(String(product?.price ?? ""))
    setStock(product?.stock != null ? String(product.stock) : "")
    setImageUrl(product?.imageUrl ?? null)
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
    setError(null)
  }, [product])

  async function handleSave() {
    setSaving(true)
    setError(null)
    const payload: CreateProductInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      marketplaceTagIds: tagIds,
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
      imageUrl: imageUrl ?? undefined,
      isAvailable: true,
      bundleConfig: { pricingMode },
      variants: productKind === "variant" ? variants : undefined,
      bundleItems: productKind === "bundle" ? bundleItems : undefined,
    }
    try {
      if (product) {
        await updateProduct(businessId, product.id, payload)
      } else {
        await createProduct(businessId, payload)
      }
      onSaved()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo guardar el producto.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel>Nombre</FieldLabel>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field>
          <FieldLabel>Categorías de catálogo</FieldLabel>
          <CategoryMultiCombobox value={tagIds} onChange={setTagIds} options={tagOptions} allowCreate={false} />
        </Field>
        <Field>
          <FieldLabel>Descripción</FieldLabel>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-20" />
        </Field>
        <CatalogImageUpload businessId={businessId} value={imageUrl} onChange={setImageUrl} kind="product" />
        <Field>
          <FieldLabel>Tipo de producto</FieldLabel>
          <ToggleGroup
            value={[productKind]}
            onValueChange={(value) => {
              const next = value[0] as ProductKind | undefined
              if (next) setProductKind(next)
            }}
            variant="outline"
            size="sm"
            spacing={2}
            className="flex-wrap"
          >
            {(Object.keys(kindLabel) as ProductKind[]).map((kind) => (
              <ToggleGroupItem key={kind} value={kind}>
                {kindLabel[kind]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <FieldDescription>
            Usa combo o promoción para paquetes con precio fijo o suma de componentes.
          </FieldDescription>
        </Field>
      </FieldGroup>

      {productKind === "simple" ? (
        <FieldGroup className="gap-4 sm:grid sm:grid-cols-2">
          <Field>
            <FieldLabel>Precio (₡)</FieldLabel>
            <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" required />
          </Field>
          <Field>
            <FieldLabel>Stock</FieldLabel>
            <Input value={stock} onChange={(e) => setStock(e.target.value)} inputMode="numeric" />
          </Field>
        </FieldGroup>
      ) : null}

      {productKind === "variant" ? (
        <>
          <Separator />
          <FieldGroup className="gap-4">
            <p className="text-sm font-medium">Variantes</p>
            {variants.map((variant, index) => (
              <div key={index} className="rounded-xl border border-border p-3">
                <FieldGroup className="gap-3 sm:grid sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Precio</FieldLabel>
                    <Input
                      value={String(variant.price)}
                      onChange={(e) => {
                        const next = [...variants]
                        next[index] = { ...variant, price: Number(e.target.value) || 0 }
                        setVariants(next)
                      }}
                      inputMode="decimal"
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Stock</FieldLabel>
                    <Input
                      value={variant.stock != null ? String(variant.stock) : ""}
                      onChange={(e) => {
                        const next = [...variants]
                        next[index] = { ...variant, stock: e.target.value ? Number(e.target.value) : null }
                        setVariants(next)
                      }}
                      inputMode="numeric"
                    />
                  </Field>
                </FieldGroup>
                {optionGroups.map((group) => (
                  <Field key={group.key} className="mt-2">
                    <FieldLabel>{group.label}</FieldLabel>
                    <select
                      className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
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
                      <option value="">Elegir…</option>
                      {group.values.map((v) => (
                        <option key={v.value} value={v.value}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </Field>
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
          </FieldGroup>
        </>
      ) : null}

      {productKind === "bundle" ? (
        <>
          <Separator />
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel>Precio del combo (₡)</FieldLabel>
              <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
            </Field>
            <Field>
              <FieldLabel>Modo de precio</FieldLabel>
              <ToggleGroup
                value={[pricingMode]}
                onValueChange={(value) => {
                  const next = value[0] as "fixed" | "sum_components" | undefined
                  if (next) setPricingMode(next)
                }}
                variant="outline"
                size="sm"
                spacing={2}
              >
                <ToggleGroupItem value="fixed">Precio fijo</ToggleGroupItem>
                <ToggleGroupItem value="sum_components">Suma componentes</ToggleGroupItem>
              </ToggleGroup>
            </Field>
            {bundleItems.map((item, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-4">
                <select
                  className="h-9 rounded-md border border-input bg-transparent px-2 text-sm sm:col-span-2"
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
                  placeholder="Cant."
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
          </FieldGroup>
        </>
      ) : null}

      {specSchema.length > 0 ? (
        <>
          <Separator />
          <FieldGroup className="gap-4">
            {specSchema.map((field) => (
              <Field key={field.key}>
                <FieldLabel>{field.label}</FieldLabel>
                <Input
                  value={specifications[field.key] ?? ""}
                  onChange={(e) => setSpecifications((prev) => ({ ...prev, [field.key]: e.target.value }))}
                />
              </Field>
            ))}
          </FieldGroup>
        </>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudo guardar</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
        <Button type="button" disabled={saving || !name.trim()} onClick={() => void handleSave()}>
          {saving ? <Spinner data-icon="inline-start" /> : null}
          {saving ? "Guardando…" : product ? "Guardar cambios" : "Agregar producto"}
        </Button>
      </div>
    </div>
  )
}
