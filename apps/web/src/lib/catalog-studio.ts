import {
  MODULES,
  formatMarketplaceTagLabels,
  type CreateMenuItemInput,
  type CreateProductInput,
  type CreateServiceInput,
  type MenuItem,
  type ModuleName,
  type Product,
  type Service,
} from "@workspace/shared"

import {
  createMenuItem,
  createProduct,
  createService,
  deleteMenuItem,
  deleteProduct,
  deleteService,
  updateMenuItem,
  updateProduct,
  updateService,
} from "@/services/catalog.service"
import type { CatalogKind } from "@/services/types"

/**
 * Un módulo de catálogo se registra aquí para aparecer en el alta rápida y en la grilla.
 * Si solo existe en MODULE_CATALOG, la tarjeta se muestra con el interruptor, sin ítems.
 * Para sumar un módulo nuevo: agrega una entrada a CATALOG_MODULES con collect, create,
 * setListed y remove. La pantalla no necesita otro layout.
 */
export type StudioItem = {
  id: string
  module: CatalogKind
  name: string
  description: string | null
  price: number | null
  group: string | null
  listed: boolean
  stock: number | null
  detail: string | null
}

export type CatalogBag = {
  products: Product[]
  services: Service[]
  menu: MenuItem[]
}

export type CatalogDraft = {
  name: string
  group: string
  price: string
  /** Ids de tags marketplace cuando el alta es de productos. */
  marketplaceTagIds?: string[]
}

export type CatalogGroupMode = "marketplace" | "business" | "text"

export type CatalogQuickAdd = {
  nameLabel: string
  namePlaceholder: string
  groupLabel: string | null
  groupPlaceholder: string | null
  /** marketplace y business usan combobox múltiple; text es una sección libre (menú). */
  groupMode: CatalogGroupMode | null
  priceLabel: string
  priceRequired: boolean
  submitLabel: string
}

export type CatalogModuleConfig = {
  id: ModuleName
  kind: CatalogKind
  itemOne: string
  itemMany: string
  quick: CatalogQuickAdd
  collect: (bag: CatalogBag) => StudioItem[]
  groups: (bag: CatalogBag) => string[]
  create: (businessId: string, draft: CatalogDraft) => Promise<void>
  setListed: (businessId: string, itemId: string, listed: boolean) => Promise<void>
  remove: (businessId: string, itemId: string) => Promise<void>
}

function uniqueGroups(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))]
}

function productGroup(item: Product) {
  return formatMarketplaceTagLabels(item.marketplaceTags) ?? ""
}

export function parseCatalogPrice(raw: string, required: boolean) {
  const trimmed = raw.trim().replace(",", ".")
  if (!trimmed) {
    if (required) throw new Error("Indica el precio en colones.")
    return undefined
  }
  const value = Number(trimmed)
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("El precio tiene que ser mayor a 0.")
  }
  return value
}

export const CATALOG_MODULES: CatalogModuleConfig[] = [
  {
    id: MODULES.PRODUCTS,
    kind: "products",
    itemOne: "producto",
    itemMany: "productos",
    quick: {
      nameLabel: "Nombre del producto",
      namePlaceholder: "Ej: Café de Tarrazú molido 500 g",
      groupLabel: "Categorías",
      groupPlaceholder: null,
      groupMode: "marketplace",
      priceLabel: "Precio en colones",
      priceRequired: true,
      submitLabel: "Agregar producto",
    },
    collect: (bag) =>
      bag.products.map((item) => ({
        id: item.id,
        module: "products",
        name: item.name,
        description: item.description,
        price: item.price,
        group: productGroup(item),
        listed: item.isAvailable,
        stock: item.stock,
        detail: item.productKind === "simple" ? null : item.productKind === "bundle" ? "Combo" : "Con variantes",
      })),
    groups: (bag) => uniqueGroups(bag.products.map((item) => productGroup(item))),
    create: async (businessId, draft) => {
      if (!draft.marketplaceTagIds?.length) {
        throw new Error("Elige al menos una categoría.")
      }
      const price = parseCatalogPrice(draft.price, true)
      const input: CreateProductInput = {
        name: draft.name.trim(),
        price,
        marketplaceTagIds: draft.marketplaceTagIds,
        productKind: "simple",
        isAvailable: true,
        optionGroups: [],
        specSchema: [],
        specifications: {},
        bundleConfig: { pricingMode: "fixed" },
      }
      await createProduct(businessId, input)
    },
    setListed: (businessId, itemId, listed) => updateProduct(businessId, itemId, { isAvailable: listed }).then(() => undefined),
    remove: deleteProduct,
  },
  {
    id: MODULES.SERVICES,
    kind: "services",
    itemOne: "servicio",
    itemMany: "servicios",
    quick: {
      nameLabel: "Nombre del servicio",
      namePlaceholder: "Ej: Catering para reuniones",
      groupLabel: "Categorías",
      groupPlaceholder: null,
      groupMode: "business",
      priceLabel: "Precio de referencia",
      priceRequired: false,
      submitLabel: "Agregar servicio",
    },
    collect: (bag) =>
      bag.services.map((item) => ({
        id: item.id,
        module: "services",
        name: item.name,
        description: item.description,
        price: item.price,
        group: item.category,
        listed: item.isActive,
        stock: null,
        detail: item.durationMinutes ? `${item.durationMinutes} min` : null,
      })),
    groups: (bag) => uniqueGroups(bag.services.map((item) => item.category)),
    create: async (businessId, draft) => {
      const price = parseCatalogPrice(draft.price, false)
      const input: CreateServiceInput = {
        name: draft.name.trim(),
        category: draft.group.trim() || undefined,
        price,
        isActive: true,
      }
      await createService(businessId, input)
    },
    setListed: (businessId, itemId, listed) => updateService(businessId, itemId, { isActive: listed }).then(() => undefined),
    remove: deleteService,
  },
  {
    id: MODULES.MENU,
    kind: "menu",
    itemOne: "plato",
    itemMany: "platos",
    quick: {
      nameLabel: "Nombre del plato",
      namePlaceholder: "Ej: Casado típico con bistec encebollado",
      groupLabel: "Sección",
      groupPlaceholder: "Ej: Casados y almuerzos",
      groupMode: "text",
      priceLabel: "Precio en colones",
      priceRequired: true,
      submitLabel: "Agregar al menú",
    },
    collect: (bag) =>
      bag.menu.map((item) => ({
        id: item.id,
        module: "menu",
        name: item.name,
        description: item.description,
        price: item.price,
        group: item.section,
        listed: item.isAvailable,
        stock: null,
        detail: null,
      })),
    groups: (bag) => uniqueGroups(bag.menu.map((item) => item.section)),
    create: async (businessId, draft) => {
      const price = parseCatalogPrice(draft.price, true)
      if (price === undefined) throw new Error("Indica el precio en colones.")
      const input: CreateMenuItemInput = {
        name: draft.name.trim(),
        section: draft.group.trim() || undefined,
        price,
        isAvailable: true,
        sortOrder: 0,
      }
      await createMenuItem(businessId, input)
    },
    setListed: (businessId, itemId, listed) => updateMenuItem(businessId, itemId, { isAvailable: listed }).then(() => undefined),
    remove: deleteMenuItem,
  },
]

export const CATALOG_MODULE_BY_KIND = new Map(CATALOG_MODULES.map((entry) => [entry.kind, entry]))

export function catalogModule(id: ModuleName) {
  return CATALOG_MODULES.find((entry) => entry.id === id) ?? null
}

export function collectStudioItems(bag: CatalogBag) {
  return CATALOG_MODULES.flatMap((entry) => entry.collect(bag))
}

export function countPhrase(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`
}
