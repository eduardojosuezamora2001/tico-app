/** Rubros de negocio para onboarding (máx. 50 en el selector). */
export const MAX_BUSINESS_CATEGORIES = 50

export const BUSINESS_CATEGORY_OPTIONS = [
  "Restaurante",
  "Soda",
  "Cafetería",
  "Bar",
  "Licorera",
  "Pulpería",
  "Supermercado",
  "Minisuper",
  "Farmacia",
  "Gimnasio",
  "CrossFit",
  "Yoga y pilates",
  "Spa",
  "Salón de belleza",
  "Barbería",
  "Clínica médica",
  "Laboratorio clínico",
  "Veterinaria",
  "Ferretería",
  "Construcción y materiales",
  "Tecnología y electrónica",
  "Celulares y accesorios",
  "Ropa y moda",
  "Zapatería",
  "Joyería",
  "Sex shop",
  "Surf y deportes acuáticos",
  "Deportes y fitness",
  "Bicicletas",
  "Entretenimiento",
  "Cine y eventos",
  "Apuestas y lotería",
  "Casino",
  "Hotel",
  "Hospedaje",
  "Turismo y tours",
  "Agencia de viajes",
  "Auto y repuestos",
  "Taller mecánico",
  "Lavado de autos",
  "Gasolinera",
  "Inmobiliaria",
  "Legal y notaría",
  "Contabilidad",
  "Educación y tutorías",
  "Guardería",
  "Pet shop",
  "Flores y regalos",
  "Música e instrumentos",
  "Arte y galería",
] as const

export type BusinessCategoryOption = (typeof BUSINESS_CATEGORY_OPTIONS)[number]

/** Opciones estables para combobox (misma referencia de objetos entre renders). */
export const BUSINESS_CATEGORY_COMBO_OPTIONS: { id: string; label: string }[] =
  BUSINESS_CATEGORY_OPTIONS.map((label) => ({ id: label, label }))

export function parseBusinessCategories(value: string | null | undefined): string[] {
  if (!value?.trim()) return []
  return [...new Set(value.split(",").map((part) => part.trim()).filter(Boolean))]
}

export function serializeBusinessCategories(categories: string[]): string | undefined {
  const unique = [...new Set(categories.map((c) => c.trim()).filter(Boolean))]
  if (unique.length === 0) return undefined
  return unique.join(", ")
}
