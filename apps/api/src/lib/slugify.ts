/** Convierte texto a slug URL-safe (`Comida Rápida` → `comida-rapida`). */
export function slugifyTaxonomy(input: string): string {
  const slug = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
  return slug || "item"
}
