import { BUSINESS_CATEGORY_OPTIONS } from "@workspace/shared"
import type { MarketplaceBusinessCategory, MarketplaceTag } from "@workspace/shared"

export type ExploreTab = "productos" | "servicios" | "negocios"

export type ExploreGroup = {
  id: string
  label: string
  items: { id: string; label: string }[]
}

export type TagTreeNode = MarketplaceTag & {
  children: TagTreeNode[]
}

export type BusinessCategoryNode = MarketplaceBusinessCategory & {
  children: BusinessCategoryNode[]
}

const serviceLabels = new Set([
  "Salón de belleza",
  "Barbería",
  "Spa",
  "Gimnasio",
  "CrossFit",
  "Yoga y pilates",
  "Clínica médica",
  "Laboratorio clínico",
  "Veterinaria",
  "Taller mecánico",
  "Lavado de autos",
  "Legal y notaría",
  "Contabilidad",
  "Educación y tutorías",
  "Guardería",
  "Inmobiliaria",
  "Agencia de viajes",
  "Turismo y tours",
])

export const SERVICE_EXPLORE_GROUPS: ExploreGroup[] = buildGroups([
  {
    id: "belleza-bienestar",
    label: "Belleza y bienestar",
    labels: ["Salón de belleza", "Barbería", "Spa", "Gimnasio", "CrossFit", "Yoga y pilates"],
  },
  {
    id: "salud",
    label: "Salud",
    labels: ["Clínica médica", "Laboratorio clínico", "Veterinaria", "Farmacia"],
  },
  {
    id: "hogar-auto",
    label: "Hogar y auto",
    labels: ["Taller mecánico", "Lavado de autos", "Ferretería", "Construcción y materiales"],
  },
  {
    id: "profesionales",
    label: "Profesionales",
    labels: ["Legal y notaría", "Contabilidad", "Inmobiliaria", "Educación y tutorías", "Guardería"],
  },
  {
    id: "turismo",
    label: "Turismo",
    labels: ["Agencia de viajes", "Turismo y tours", "Hotel", "Hospedaje"],
  },
])

export const BUSINESS_EXPLORE_GROUPS: ExploreGroup[] = buildGroups([
  {
    id: "comida",
    label: "Comida y bebida",
    labels: ["Restaurante", "Soda", "Cafetería", "Bar", "Licorera"],
  },
  {
    id: "tiendas",
    label: "Tiendas",
    labels: [
      "Pulpería",
      "Supermercado",
      "Minisuper",
      "Farmacia",
      "Ferretería",
      "Tecnología y electrónica",
      "Celulares y accesorios",
      "Ropa y moda",
      "Zapatería",
      "Pet shop",
    ],
  },
  {
    id: "servicios-locales",
    label: "Servicios locales",
    labels: [...serviceLabels],
  },
  {
    id: "entretenimiento",
    label: "Entretenimiento",
    labels: ["Entretenimiento", "Cine y eventos", "Apuestas y lotería", "Casino", "Música e instrumentos", "Arte y galería"],
  },
  {
    id: "viajes-ocio",
    label: "Viajes y ocio",
    labels: ["Hotel", "Hospedaje", "Agencia de viajes", "Turismo y tours", "Flores y regalos", "Sex shop", "Surf y deportes acuáticos", "Deportes y fitness", "Bicicletas", "Joyería", "Auto y repuestos", "Gasolinera"],
  },
])

function buildGroups(
  rows: { id: string; label: string; labels: readonly string[] }[],
): ExploreGroup[] {
  const allowed = new Set<string>(BUSINESS_CATEGORY_OPTIONS)
  return rows
    .map((row) => ({
      id: row.id,
      label: row.label,
      items: row.labels.filter((label) => allowed.has(label)).map((label) => ({ id: label, label })),
    }))
    .filter((group) => group.items.length > 0)
}

export function buildBusinessCategoryTree(categories: MarketplaceBusinessCategory[]): BusinessCategoryNode[] {
  const sorted = [...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  const nodes = new Map(sorted.map((row) => [row.id, { ...row, children: [] as BusinessCategoryNode[] }]))
  const roots: BusinessCategoryNode[] = []
  for (const row of sorted) {
    const node = nodes.get(row.id)!
    const parentId = row.parentId ?? null
    if (parentId && nodes.has(parentId)) {
      nodes.get(parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

export function buildMarketplaceTagTree(tags: MarketplaceTag[]): TagTreeNode[] {
  const sorted = [...tags].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  const nodes = new Map(sorted.map((tag) => [tag.id, { ...tag, children: [] as TagTreeNode[] }]))
  const roots: TagTreeNode[] = []
  for (const tag of sorted) {
    const node = nodes.get(tag.id)!
    const parentId = tag.parentId ?? null
    if (parentId && nodes.has(parentId)) {
      nodes.get(parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

export function flattenTagNodes(nodes: TagTreeNode[]): TagTreeNode[] {
  const rows: TagTreeNode[] = []
  for (const node of nodes) {
    rows.push(node)
    if (node.children.length > 0) rows.push(...flattenTagNodes(node.children))
  }
  return rows
}

const tagTintBySlug: Record<string, string> = {
  bebidas: "from-sky-400/80 to-blue-600/80",
  snacks: "from-amber-400/80 to-orange-600/80",
  abarrotes: "from-yellow-400/80 to-amber-600/80",
  lacteos: "from-indigo-300/80 to-blue-500/80",
  limpieza: "from-teal-400/80 to-emerald-600/80",
  "cuidado-personal": "from-pink-400/80 to-rose-600/80",
  "farmacia-otc": "from-emerald-400/80 to-green-600/80",
  ferreteria: "from-slate-400/80 to-zinc-600/80",
  electronica: "from-violet-400/80 to-purple-600/80",
  hogar: "from-orange-300/80 to-red-500/80",
  alimentos: "from-lime-400/80 to-green-600/80",
  combos: "from-fuchsia-400/80 to-pink-600/80",
}

export function exploreTagTint(slug: string) {
  return tagTintBySlug[slug] ?? "from-primary/70 to-primary"
}

export function exploreHref(tab: ExploreTab, item: { slug?: string; label: string }) {
  if (tab === "productos" && item.slug) {
    const params = new URLSearchParams({ tag: item.slug, label: item.label, kind: "product" })
    return `/buscar?${params.toString()}`
  }
  if (tab === "servicios") {
    return `/buscar?kind=service&label=${encodeURIComponent(item.label)}`
  }
  if (tab === "negocios" && item.slug) {
    const params = new URLSearchParams({ bcat: item.slug, label: item.label })
    return `/buscar?${params.toString()}`
  }
  return `/?category=${encodeURIComponent(item.label)}`
}
