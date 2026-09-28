import { MODULES, type ModuleName } from "@workspace/shared"

export type ModuleCatalogEntry = {
  id: ModuleName
  title: string
  summary: string
  description: string
  categories: string[]
  keywords: string[]
}

export const MODULE_CATALOG: ModuleCatalogEntry[] = [
  {
    id: MODULES.PRODUCTS,
    title: "Productos",
    summary: "Publica lo que vendes con precio en colones.",
    description:
      "Lista artículos con nombre y precio para que los clientes los vean en tu página. Cada local controla su propio catálogo; no hay comparación entre comercios.",
    categories: ["Sodas", "Pulperías", "Farmacias", "Ferreterías", "Belleza"],
    keywords: ["producto", "venta", "precio", "inventario", "artículo"],
  },
  {
    id: MODULES.SERVICES,
    title: "Servicios",
    summary: "Ofrece servicios con un precio de referencia.",
    description:
      "Ideal para cortes, reparaciones, consultas u otros trabajos que cobras por servicio. Los clientes ven qué ofreces antes de escribirte por WhatsApp.",
    categories: ["Belleza", "Servicios", "Ferreterías"],
    keywords: ["servicio", "corte", "reparación", "consulta", "trabajo"],
  },
  {
    id: MODULES.MENU,
    title: "Menú digital",
    summary: "Muestra platos y bebidas por sección.",
    description:
      "Organiza tu oferta por secciones como bebidas, casados o postres. Pensado para sodas, cafeterías y restaurantes de barrio.",
    categories: ["Sodas", "Restaurantes", "Cafeterías"],
    keywords: ["menú", "plato", "comida", "bebida", "casado", "soda"],
  },
  {
    id: MODULES.APPOINTMENTS,
    title: "Citas y reservas",
    summary: "Agenda citas con tus clientes.",
    description:
      "Permite que los clientes soliciten una cita en horarios que definas. Funciona bien con salones, consultorios y negocios que trabajan con cita previa.",
    categories: ["Belleza", "Servicios", "Consultorios"],
    keywords: ["cita", "reserva", "agenda", "horario", "turno"],
  },
]

export function moduleCatalogEntry(id: ModuleName) {
  return MODULE_CATALOG.find((entry) => entry.id === id)
}

export function filterModuleCatalog(query: string) {
  const term = query.trim().toLowerCase()
  if (!term) return MODULE_CATALOG
  return MODULE_CATALOG.filter((entry) => {
    const haystack = [
      entry.title,
      entry.summary,
      entry.description,
      ...entry.categories,
      ...entry.keywords,
    ]
      .join(" ")
      .toLowerCase()
    return haystack.includes(term)
  })
}

export function emptyModuleState(): Record<ModuleName, boolean> {
  return {
    [MODULES.PRODUCTS]: false,
    [MODULES.SERVICES]: false,
    [MODULES.MENU]: false,
    [MODULES.APPOINTMENTS]: false,
  }
}
