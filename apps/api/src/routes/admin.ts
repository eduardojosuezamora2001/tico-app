import {
  AdminBusinessStatusActionSchema,
  AdminCreateUserSchema,
  AdminUpdateUserRoleSchema,
  CreateMarketplaceBusinessCategorySchema,
  CreateMarketplaceCatalogTagSchema,
  ListAdminBusinessesSchema,
  ListAdminUsersSchema,
  MODULES,
  ROLES,
  UpdateMarketplaceBusinessCategorySchema,
  UpdateMarketplaceCatalogTagSchema,
  type AdminBusinessListItem,
  type AdminBusinessPlatformStatus,
  type AdminStats,
  type AdminUserListItem,
  type MarketplaceBusinessCategory,
  type MarketplaceTag,
  type ModuleName,
  type TablesUpdate,
  type UserRole,
} from "@workspace/shared"
import { Hono } from "hono"

import { dbFail, fail, validationError } from "../lib/http.js"
import { slugifyTaxonomy } from "../lib/slugify.js"
import { supabaseAdmin } from "../lib/supabase.js"
import { requireAdmin } from "../middleware/admin.js"
import { requireAuth } from "../middleware/auth.js"
import type { AppEnv } from "../types.js"

export const adminRoutes = new Hono<AppEnv>()

adminRoutes.use("*", requireAuth, requireAdmin)

function mapBusinessCategory(row: {
  id: string
  slug: string
  name: string
  legacy_label: string
  sort_order: number
  parent_id: string | null
  is_active: boolean
}): MarketplaceBusinessCategory {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    legacyLabel: row.legacy_label,
    sortOrder: row.sort_order,
    parentId: row.parent_id,
    isActive: row.is_active,
  }
}

function mapCatalogTag(row: {
  id: string
  slug: string
  name: string
  sort_order: number
  parent_id: string | null
  is_active: boolean
}): MarketplaceTag {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    sortOrder: row.sort_order,
    parentId: row.parent_id,
    isActive: row.is_active,
  }
}

adminRoutes.get("/stats", async (c) => {
  const head = { count: "exact" as const, head: true }
  const [
    bizTotal,
    bizActive,
    bizDraft,
    bizInactive,
    usersTotal,
    usersAdmin,
    usersOwner,
    usersEmployee,
    usersClient,
    productsRes,
    servicesRes,
    menuRes,
    tagsRes,
    categoriesRes,
  ] = await Promise.all([
    supabaseAdmin.from("businesses").select("id", head),
    supabaseAdmin.from("businesses").select("id", head).eq("is_active", true).eq("is_draft", false),
    supabaseAdmin.from("businesses").select("id", head).eq("is_draft", true),
    supabaseAdmin.from("businesses").select("id", head).eq("is_active", false).eq("is_draft", false),
    supabaseAdmin.from("users").select("id", head),
    supabaseAdmin.from("users").select("id", head).eq("role", ROLES.ADMIN),
    supabaseAdmin.from("users").select("id", head).eq("role", ROLES.BUSINESS_OWNER),
    supabaseAdmin.from("users").select("id", head).eq("role", ROLES.BUSINESS_EMPLOYEE),
    supabaseAdmin.from("users").select("id", head).eq("role", ROLES.CLIENT),
    supabaseAdmin.from("products").select("id", head),
    supabaseAdmin.from("services").select("id", head),
    supabaseAdmin.from("menus").select("id", head),
    supabaseAdmin
      .from("catalog_tags")
      .select("id", head)
      .eq("scope", "marketplace")
      .is("business_id", null),
    supabaseAdmin.from("marketplace_business_categories").select("id", head),
  ])

  for (const res of [
    bizTotal,
    bizActive,
    bizDraft,
    bizInactive,
    usersTotal,
    usersAdmin,
    usersOwner,
    usersEmployee,
    usersClient,
    productsRes,
    servicesRes,
    menuRes,
    tagsRes,
    categoriesRes,
  ]) {
    if (res.error) return dbFail(c, res.error)
  }

  const stats: AdminStats = {
    businesses: {
      total: bizTotal.count ?? 0,
      active: bizActive.count ?? 0,
      draft: bizDraft.count ?? 0,
      inactive: bizInactive.count ?? 0,
    },
    users: {
      total: usersTotal.count ?? 0,
      admin: usersAdmin.count ?? 0,
      businessOwner: usersOwner.count ?? 0,
      businessEmployee: usersEmployee.count ?? 0,
      client: usersClient.count ?? 0,
    },
    catalog: {
      products: productsRes.count ?? 0,
      services: servicesRes.count ?? 0,
      menuItems: menuRes.count ?? 0,
      marketplaceTags: tagsRes.count ?? 0,
      businessCategories: categoriesRes.count ?? 0,
    },
  }

  return c.json({ data: stats })
})

// --------------------------------------------------------------------------
// Rubros de negocio (marketplace_business_categories)
// --------------------------------------------------------------------------

adminRoutes.get("/business-categories", async (c) => {
  const { data, error } = await supabaseAdmin
    .from("marketplace_business_categories")
    .select("id, slug, name, legacy_label, sort_order, parent_id, is_active")
    .order("sort_order", { ascending: true })
  if (error) return dbFail(c, error)
  return c.json({ data: (data ?? []).map(mapBusinessCategory) })
})

adminRoutes.post("/business-categories", async (c) => {
  const parsed = CreateMarketplaceBusinessCategorySchema.safeParse(await c.req.json())
  if (!parsed.success) return validationError(c, parsed.error)

  const body = parsed.data
  const slug = body.slug ?? slugifyTaxonomy(body.name)

  if (body.parentId) {
    const parent = await supabaseAdmin
      .from("marketplace_business_categories")
      .select("id")
      .eq("id", body.parentId)
      .maybeSingle()
    if (parent.error) return dbFail(c, parent.error)
    if (!parent.data) return fail(c, 400, "VALIDATION_ERROR", "La categoria padre no existe")
  }

  const { data, error } = await supabaseAdmin
    .from("marketplace_business_categories")
    .insert({
      name: body.name,
      slug,
      legacy_label: body.legacyLabel,
      parent_id: body.parentId ?? null,
      sort_order: body.sortOrder ?? 0,
      is_active: body.isActive ?? true,
    })
    .select("id, slug, name, legacy_label, sort_order, parent_id, is_active")
    .single()
  if (error) return dbFail(c, error)
  return c.json({ data: mapBusinessCategory(data) }, 201)
})

adminRoutes.patch("/business-categories/:id", async (c) => {
  const id = c.req.param("id")
  const parsed = UpdateMarketplaceBusinessCategorySchema.safeParse(await c.req.json())
  if (!parsed.success) return validationError(c, parsed.error)

  const body = parsed.data
  if (body.parentId === id) {
    return fail(c, 400, "VALIDATION_ERROR", "Una categoria no puede ser padre de si misma")
  }

  if (body.parentId) {
    const parent = await supabaseAdmin
      .from("marketplace_business_categories")
      .select("id")
      .eq("id", body.parentId)
      .maybeSingle()
    if (parent.error) return dbFail(c, parent.error)
    if (!parent.data) return fail(c, 400, "VALIDATION_ERROR", "La categoria padre no existe")
  }

  const patch: TablesUpdate<"marketplace_business_categories"> = {}
  if (body.name !== undefined) patch.name = body.name
  if (body.slug !== undefined) patch.slug = body.slug
  if (body.legacyLabel !== undefined) patch.legacy_label = body.legacyLabel
  if (body.parentId !== undefined) patch.parent_id = body.parentId
  if (body.sortOrder !== undefined) patch.sort_order = body.sortOrder
  if (body.isActive !== undefined) patch.is_active = body.isActive

  if (Object.keys(patch).length === 0) {
    return fail(c, 400, "VALIDATION_ERROR", "No hay campos para actualizar")
  }

  const { data, error } = await supabaseAdmin
    .from("marketplace_business_categories")
    .update(patch)
    .eq("id", id)
    .select("id, slug, name, legacy_label, sort_order, parent_id, is_active")
    .maybeSingle()
  if (error) return dbFail(c, error)
  if (!data) return fail(c, 404, "NOT_FOUND", "Categoria no encontrada")
  return c.json({ data: mapBusinessCategory(data) })
})

adminRoutes.delete("/business-categories/:id", async (c) => {
  const id = c.req.param("id")
  const { data, error } = await supabaseAdmin
    .from("marketplace_business_categories")
    .update({ is_active: false })
    .eq("id", id)
    .select("id, slug, name, legacy_label, sort_order, parent_id, is_active")
    .maybeSingle()
  if (error) return dbFail(c, error)
  if (!data) return fail(c, 404, "NOT_FOUND", "Categoria no encontrada")
  return c.json({ data: mapBusinessCategory(data) })
})

// --------------------------------------------------------------------------
// Tags de producto marketplace (catalog_tags scope=marketplace)
// --------------------------------------------------------------------------

adminRoutes.get("/marketplace-tags", async (c) => {
  const { data, error } = await supabaseAdmin
    .from("catalog_tags")
    .select("id, slug, name, sort_order, parent_id, is_active")
    .eq("scope", "marketplace")
    .is("business_id", null)
    .order("sort_order", { ascending: true })
  if (error) return dbFail(c, error)
  return c.json({ data: (data ?? []).map(mapCatalogTag) })
})

adminRoutes.post("/marketplace-tags", async (c) => {
  const parsed = CreateMarketplaceCatalogTagSchema.safeParse(await c.req.json())
  if (!parsed.success) return validationError(c, parsed.error)

  const body = parsed.data
  const slug = body.slug ?? slugifyTaxonomy(body.name)

  if (body.parentId) {
    const parent = await supabaseAdmin
      .from("catalog_tags")
      .select("id, scope, business_id")
      .eq("id", body.parentId)
      .maybeSingle()
    if (parent.error) return dbFail(c, parent.error)
    if (!parent.data || parent.data.scope !== "marketplace" || parent.data.business_id) {
      return fail(c, 400, "VALIDATION_ERROR", "El tag padre no es un tag marketplace valido")
    }
  }

  const { data, error } = await supabaseAdmin
    .from("catalog_tags")
    .insert({
      scope: "marketplace",
      business_id: null,
      name: body.name,
      slug,
      parent_id: body.parentId ?? null,
      sort_order: body.sortOrder ?? 0,
      is_active: body.isActive ?? true,
    })
    .select("id, slug, name, sort_order, parent_id, is_active")
    .single()
  if (error) return dbFail(c, error)
  return c.json({ data: mapCatalogTag(data) }, 201)
})

adminRoutes.patch("/marketplace-tags/:id", async (c) => {
  const id = c.req.param("id")
  const parsed = UpdateMarketplaceCatalogTagSchema.safeParse(await c.req.json())
  if (!parsed.success) return validationError(c, parsed.error)

  const body = parsed.data
  if (body.parentId === id) {
    return fail(c, 400, "VALIDATION_ERROR", "Un tag no puede ser padre de si mismo")
  }

  if (body.parentId) {
    const parent = await supabaseAdmin
      .from("catalog_tags")
      .select("id, scope, business_id")
      .eq("id", body.parentId)
      .maybeSingle()
    if (parent.error) return dbFail(c, parent.error)
    if (!parent.data || parent.data.scope !== "marketplace" || parent.data.business_id) {
      return fail(c, 400, "VALIDATION_ERROR", "El tag padre no es un tag marketplace valido")
    }
  }

  const patch: TablesUpdate<"catalog_tags"> = {}
  if (body.name !== undefined) patch.name = body.name
  if (body.slug !== undefined) patch.slug = body.slug
  if (body.parentId !== undefined) patch.parent_id = body.parentId
  if (body.sortOrder !== undefined) patch.sort_order = body.sortOrder
  if (body.isActive !== undefined) patch.is_active = body.isActive

  if (Object.keys(patch).length === 0) {
    return fail(c, 400, "VALIDATION_ERROR", "No hay campos para actualizar")
  }

  const { data, error } = await supabaseAdmin
    .from("catalog_tags")
    .update(patch)
    .eq("id", id)
    .eq("scope", "marketplace")
    .is("business_id", null)
    .select("id, slug, name, sort_order, parent_id, is_active")
    .maybeSingle()
  if (error) return dbFail(c, error)
  if (!data) return fail(c, 404, "NOT_FOUND", "Tag no encontrado")
  return c.json({ data: mapCatalogTag(data) })
})

adminRoutes.delete("/marketplace-tags/:id", async (c) => {
  const id = c.req.param("id")
  const { data, error } = await supabaseAdmin
    .from("catalog_tags")
    .update({ is_active: false })
    .eq("id", id)
    .eq("scope", "marketplace")
    .is("business_id", null)
    .select("id, slug, name, sort_order, parent_id, is_active")
    .maybeSingle()
  if (error) return dbFail(c, error)
  if (!data) return fail(c, 404, "NOT_FOUND", "Tag no encontrado")
  return c.json({ data: mapCatalogTag(data) })
})

// --------------------------------------------------------------------------
// Comercios (gestión global)
// --------------------------------------------------------------------------

const MODULE_NAME_SET = new Set<string>(Object.values(MODULES))

function platformStatus(isActive: boolean, isDraft: boolean): AdminBusinessPlatformStatus {
  if (isDraft) return "draft"
  if (isActive) return "active"
  return "suspended"
}

type AdminBusinessRow = {
  id: string
  name: string
  slug: string
  category: string
  address: string | null
  logo_url: string | null
  phone: string | null
  whatsapp_number: string | null
  is_active: boolean
  is_draft: boolean
  created_at: string
  addresses:
    | {
        formatted_address: string | null
        address_line_1: string | null
        administrative_divisions: { name: string } | null
      }
    | {
        formatted_address: string | null
        address_line_1: string | null
        administrative_divisions: { name: string } | null
      }[]
    | null
  owner:
    | { id: string; full_name: string | null; email: string }
    | { id: string; full_name: string | null; email: string }[]
    | null
  business_modules: { module_name: string; enabled: boolean }[] | null
}

const ADMIN_BUSINESS_SELECT = `
  id, name, slug, category, address, logo_url, phone, whatsapp_number,
  is_active, is_draft, created_at,
  addresses (
    formatted_address,
    address_line_1,
    administrative_divisions ( name )
  ),
  owner:users!businesses_owner_id_fkey ( id, full_name, email ),
  business_modules ( module_name, enabled )
`

function adminLocationLabel(row: AdminBusinessRow): string | null {
  const addrRaw = Array.isArray(row.addresses) ? row.addresses[0] : row.addresses
  const divisionName = addrRaw?.administrative_divisions?.name ?? null
  return (
    addrRaw?.formatted_address ??
    addrRaw?.address_line_1 ??
    row.address ??
    divisionName
  )
}

function mapAdminBusiness(row: AdminBusinessRow): AdminBusinessListItem {
  const ownerRaw = Array.isArray(row.owner) ? row.owner[0] : row.owner
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    category: row.category,
    locationLabel: adminLocationLabel(row),
    logoUrl: row.logo_url,
    phone: row.phone,
    whatsappNumber: row.whatsapp_number,
    isActive: row.is_active,
    isDraft: row.is_draft,
    platformStatus: platformStatus(row.is_active, row.is_draft),
    modules: (row.business_modules ?? [])
      .filter((m) => m.enabled && MODULE_NAME_SET.has(m.module_name))
      .map((m) => m.module_name as ModuleName),
    owner: ownerRaw
      ? { id: ownerRaw.id, fullName: ownerRaw.full_name, email: ownerRaw.email }
      : null,
    createdAt: row.created_at,
  }
}

adminRoutes.get("/businesses", async (c) => {
  const parsed = ListAdminBusinessesSchema.safeParse({
    q: c.req.query("q") || undefined,
    status: c.req.query("status") || undefined,
    limit: c.req.query("limit") || undefined,
    cursor: c.req.query("cursor") || undefined,
  })
  if (!parsed.success) return validationError(c, parsed.error)

  const { q, status, limit, cursor } = parsed.data
  let query = supabaseAdmin
    .from("businesses")
    .select(ADMIN_BUSINESS_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit + 1)

  if (status === "active") {
    query = query.eq("is_active", true).eq("is_draft", false)
  } else if (status === "draft") {
    query = query.eq("is_draft", true)
  } else if (status === "suspended") {
    query = query.eq("is_active", false).eq("is_draft", false)
  }

  if (q) {
    const term = q.replace(/[%_,]/g, " ").trim()
    if (term) {
      query = query.or(`name.ilike.%${term}%,slug.ilike.%${term}%,address.ilike.%${term}%`)
    }
  }

  if (cursor) {
    query = query.lt("created_at", cursor)
  }

  const { data, error } = await query
  if (error) return dbFail(c, error)

  const rows = (data ?? []) as unknown as AdminBusinessRow[]
  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? (page[page.length - 1]?.created_at ?? null) : null

  return c.json({ data: page.map(mapAdminBusiness), nextCursor })
})

adminRoutes.patch("/businesses/:id/status", async (c) => {
  const id = c.req.param("id")
  const parsed = AdminBusinessStatusActionSchema.safeParse(await c.req.json())
  if (!parsed.success) return validationError(c, parsed.error)

  const { data: existing, error: loadError } = await supabaseAdmin
    .from("businesses")
    .select(ADMIN_BUSINESS_SELECT)
    .eq("id", id)
    .maybeSingle()
  if (loadError) return dbFail(c, loadError)
  if (!existing) return fail(c, 404, "NOT_FOUND", "Comercio no encontrado")

  const current = existing as unknown as AdminBusinessRow

  if (parsed.data.action === "suspend") {
    if (current.is_draft) {
      return fail(c, 400, "VALIDATION_ERROR", "No se puede suspender un borrador")
    }
    if (!current.is_active) {
      return c.json({ data: mapAdminBusiness(current) })
    }
    const { data, error } = await supabaseAdmin
      .from("businesses")
      .update({ is_active: false })
      .eq("id", id)
      .select(ADMIN_BUSINESS_SELECT)
      .single()
    if (error) return dbFail(c, error)
    return c.json({ data: mapAdminBusiness(data as unknown as AdminBusinessRow) })
  }

  if (current.is_draft) {
    return fail(c, 400, "VALIDATION_ERROR", "Publica el borrador desde el panel del comercio")
  }
  if (current.is_active) {
    return c.json({ data: mapAdminBusiness(current) })
  }
  const { data, error } = await supabaseAdmin
    .from("businesses")
    .update({ is_active: true })
    .eq("id", id)
    .select(ADMIN_BUSINESS_SELECT)
    .single()
  if (error) return dbFail(c, error)
  return c.json({ data: mapAdminBusiness(data as unknown as AdminBusinessRow) })
})

function mapAdminUser(row: {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: string
  created_at: string
}, ownedBusinessCount: number): AdminUserListItem {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    role: row.role as UserRole,
    ownedBusinessCount,
    createdAt: row.created_at,
  }
}

async function ownedBusinessCounts(ownerIds: string[]) {
  const counts = new Map<string, number>()
  if (ownerIds.length === 0) return counts
  const { data, error } = await supabaseAdmin
    .from("businesses")
    .select("owner_id")
    .in("owner_id", ownerIds)
  if (error) throw error
  for (const row of data ?? []) {
    counts.set(row.owner_id, (counts.get(row.owner_id) ?? 0) + 1)
  }
  return counts
}

adminRoutes.get("/users", async (c) => {
  const parsed = ListAdminUsersSchema.safeParse({
    q: c.req.query("q") || undefined,
    role: c.req.query("role") || undefined,
    limit: c.req.query("limit") || undefined,
    cursor: c.req.query("cursor") || undefined,
  })
  if (!parsed.success) return validationError(c, parsed.error)

  const { q, role, limit, cursor } = parsed.data
  let query = supabaseAdmin
    .from("users")
    .select("id, email, full_name, avatar_url, role, created_at")
    .order("created_at", { ascending: false })
    .limit(limit + 1)

  if (role !== "all") {
    query = query.eq("role", role)
  }

  if (q) {
    const term = q.replace(/[%_,]/g, " ").trim()
    if (term) {
      query = query.or(`email.ilike.%${term}%,full_name.ilike.%${term}%`)
    }
  }

  if (cursor) {
    query = query.lt("created_at", cursor)
  }

  const { data, error } = await query
  if (error) return dbFail(c, error)

  const rows = data ?? []
  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? (page[page.length - 1]?.created_at ?? null) : null

  let counts: Map<string, number>
  try {
    counts = await ownedBusinessCounts(page.map((row) => row.id))
  } catch (countError) {
    return dbFail(c, countError as { message: string })
  }

  return c.json({
    data: page.map((row) => mapAdminUser(row, counts.get(row.id) ?? 0)),
    nextCursor,
  })
})

adminRoutes.post("/users", async (c) => {
  const parsed = AdminCreateUserSchema.safeParse(await c.req.json())
  if (!parsed.success) return validationError(c, parsed.error)

  const { email, password, fullName, role, emailConfirm } = parsed.data

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: emailConfirm,
    user_metadata: { full_name: fullName },
  })
  if (createError) {
    const message = createError.message.toLowerCase()
    if (message.includes("already") || message.includes("registered") || message.includes("exists")) {
      return fail(c, 409, "CONFLICT", "Ya existe una cuenta con ese correo")
    }
    return fail(c, 400, "VALIDATION_ERROR", createError.message)
  }

  const userId = created.user?.id
  if (!userId) {
    return fail(c, 500, "INTERNAL", "No se pudo crear el usuario en Auth")
  }

  // El trigger handle_new_user crea la fila; sincronizamos nombre y rol.
  const { data, error } = await supabaseAdmin
    .from("users")
    .update({
      full_name: fullName,
      role,
    })
    .eq("id", userId)
    .select("id, email, full_name, avatar_url, role, created_at")
    .single()

  if (error) {
    // Si el trigger aún no corrió, insertamos el perfil.
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("users")
      .upsert({
        id: userId,
        email,
        full_name: fullName,
        role,
      })
      .select("id, email, full_name, avatar_url, role, created_at")
      .single()
    if (insertError) return dbFail(c, insertError)
    return c.json({ data: mapAdminUser(inserted, 0) }, 201)
  }

  return c.json({ data: mapAdminUser(data, 0) }, 201)
})

adminRoutes.patch("/users/:id/role", async (c) => {
  const id = c.req.param("id")
  const actorId = c.get("userId")
  const parsed = AdminUpdateUserRoleSchema.safeParse(await c.req.json())
  if (!parsed.success) return validationError(c, parsed.error)

  const { data: existing, error: loadError } = await supabaseAdmin
    .from("users")
    .select("id, email, full_name, avatar_url, role, created_at")
    .eq("id", id)
    .maybeSingle()
  if (loadError) return dbFail(c, loadError)
  if (!existing) return fail(c, 404, "NOT_FOUND", "Usuario no encontrado")

  if (id === actorId && parsed.data.role !== ROLES.ADMIN) {
    return fail(c, 400, "VALIDATION_ERROR", "No podés quitarte el rol de administrador a vos mismo")
  }

  if (existing.role === ROLES.ADMIN && parsed.data.role !== ROLES.ADMIN) {
    const { count, error: countError } = await supabaseAdmin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", ROLES.ADMIN)
    if (countError) return dbFail(c, countError)
    if ((count ?? 0) <= 1) {
      return fail(c, 400, "VALIDATION_ERROR", "Debe quedar al menos un administrador en la plataforma")
    }
  }

  if (existing.role === parsed.data.role) {
    let counts: Map<string, number>
    try {
      counts = await ownedBusinessCounts([existing.id])
    } catch (countError) {
      return dbFail(c, countError as { message: string })
    }
    return c.json({ data: mapAdminUser(existing, counts.get(existing.id) ?? 0) })
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .update({ role: parsed.data.role })
    .eq("id", id)
    .select("id, email, full_name, avatar_url, role, created_at")
    .single()
  if (error) return dbFail(c, error)

  let counts: Map<string, number>
  try {
    counts = await ownedBusinessCounts([data.id])
  } catch (countError) {
    return dbFail(c, countError as { message: string })
  }

  return c.json({ data: mapAdminUser(data, counts.get(data.id) ?? 0) })
})
