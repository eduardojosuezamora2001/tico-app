import { supabaseAdmin } from "./supabase.js"

export async function expandBusinessCategoryLabels(slugs: string[]): Promise<string[]> {
  if (slugs.length === 0) return []
  const { data, error } = await supabaseAdmin.rpc("expand_marketplace_business_category_labels", {
    p_slugs: slugs,
  })
  if (error) throw error
  return (data as string[] | null) ?? []
}

export async function expandMarketplaceTagSlugs(slugs: string[]): Promise<string[]> {
  if (slugs.length === 0) return []
  const { data, error } = await supabaseAdmin.rpc("expand_marketplace_catalog_tag_slugs", {
    p_slugs: slugs,
  })
  if (error) throw error
  return (data as string[] | null) ?? []
}
