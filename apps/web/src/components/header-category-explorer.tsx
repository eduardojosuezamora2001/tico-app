import { useEffect, useMemo, useState, type ReactElement, type ReactNode } from "react"
import { Link } from "react-router"
import { ArrowDown01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  BUSINESS_EXPLORE_GROUPS,
  SERVICE_EXPLORE_GROUPS,
  buildBusinessCategoryTree,
  buildMarketplaceTagTree,
  exploreHref,
  exploreTagTint,
  type BusinessCategoryNode,
  type ExploreGroup,
  type ExploreTab,
  type TagTreeNode,
} from "@/lib/explore-catalog"
import { listMarketplaceBusinessCategories, listMarketplaceTags } from "@/services/catalog.service"
import { Button } from "@workspace/ui/components/button"
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@workspace/ui/components/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"

const tabLabels: Record<ExploreTab, string> = {
  productos: "Productos",
  servicios: "Servicios",
  negocios: "Negocios",
}

type ExplorerShellProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: ReactNode
  contentClassName?: string
  side?: "bottom" | "right"
}

export function HeaderCategoryExplorerDesktop({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <CategoryExplorerShell
      open={open}
      onOpenChange={setOpen}
      contentClassName="w-[min(920px,calc(100vw-2rem))] p-0"
      trigger={
        <Button
          type="button"
          variant="ghost"
          className={`hidden h-10 shrink-0 rounded-full px-3 text-sm font-medium lg:inline-flex ${open ? "bg-muted text-foreground" : ""} ${className ?? ""}`}
        >
          Categorías
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            strokeWidth={2}
            data-icon="inline-end"
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </Button>
      }
    />
  )
}

export function HeaderCategoryExplorerMobile({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <CategoryExplorerShell
      open={open}
      onOpenChange={setOpen}
      side="right"
      contentClassName="flex h-full w-full max-w-md flex-col gap-0 p-0 sm:max-w-lg"
      trigger={
        <Button type="button" variant="ghost" className={`h-10 rounded-full px-3 text-sm font-medium lg:hidden ${className ?? ""}`}>
          Categorías
        </Button>
      }
    />
  )
}

function CategoryExplorerShell({ open, onOpenChange, trigger, contentClassName, side = "bottom" }: ExplorerShellProps) {
  const isMobileSheet = side === "right"

  if (isMobileSheet) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger render={trigger as ReactElement} />
        <SheetContent side="right" className="gap-0 p-0">
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle>Explorar categorías</SheetTitle>
          </SheetHeader>
          <CategoryExplorerPanel onNavigate={() => onOpenChange(false)} layout="mobile" />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger render={trigger as ReactElement} />
      <PopoverContent align="start" sideOffset={8} className={contentClassName}>
        <CategoryExplorerPanel onNavigate={() => onOpenChange(false)} layout="desktop" />
      </PopoverContent>
    </Popover>
  )
}

function CategoryExplorerPanel({
  onNavigate,
  layout,
}: {
  onNavigate: () => void
  layout: "desktop" | "mobile"
}) {
  const [tab, setTab] = useState<ExploreTab>("productos")
  const [tags, setTags] = useState<TagTreeNode[]>([])
  const [businessCategories, setBusinessCategories] = useState<BusinessCategoryNode[]>([])
  const [loadingTags, setLoadingTags] = useState(true)
  const [loadingBusinessCategories, setLoadingBusinessCategories] = useState(true)

  useEffect(() => {
    void listMarketplaceTags()
      .then((rows) => setTags(buildMarketplaceTagTree(rows)))
      .catch(() => setTags([]))
      .finally(() => setLoadingTags(false))
    void listMarketplaceBusinessCategories()
      .then((rows) => setBusinessCategories(buildBusinessCategoryTree(rows)))
      .catch(() => setBusinessCategories(buildBusinessCategoryTree([])))
      .finally(() => setLoadingBusinessCategories(false))
  }, [])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Tabs value={tab} onValueChange={(value) => setTab(value as ExploreTab)} className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-border px-3 pt-3 sm:px-4">
          <TabsList variant="line" className="h-10 w-full justify-start bg-transparent">
            {(Object.keys(tabLabels) as ExploreTab[]).map((key) => (
              <TabsTrigger key={key} value={key} className="data-active:text-primary after:bg-primary">
                {tabLabels[key]}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="productos" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
          <ProductExplore
            layout={layout}
            loading={loadingTags}
            tree={tags}
            onNavigate={onNavigate}
          />
        </TabsContent>
        <TabsContent value="servicios" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
          <GroupedExplore layout={layout} groups={SERVICE_EXPLORE_GROUPS} tab="servicios" onNavigate={onNavigate} />
        </TabsContent>
        <TabsContent value="negocios" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
          {businessCategories.length > 0 ? (
            <BusinessExplore
              layout={layout}
              loading={loadingBusinessCategories}
              tree={businessCategories}
              onNavigate={onNavigate}
            />
          ) : (
            <GroupedExplore layout={layout} groups={BUSINESS_EXPLORE_GROUPS} tab="negocios" onNavigate={onNavigate} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ProductExplore({
  layout,
  loading,
  tree,
  onNavigate,
}: {
  layout: "desktop" | "mobile"
  loading: boolean
  tree: TagTreeNode[]
  onNavigate: () => void
}) {
  const [activeId, setActiveId] = useState<string>("destacado")
  const flat = useMemo(() => tree.flatMap((node) => [node, ...node.children]), [tree])

  const sidebarItems = useMemo(
    () => [{ id: "destacado", label: "Destacado" }, ...tree.map((node) => ({ id: node.id, label: node.name }))],
    [tree],
  )

  const gridItems = useMemo(() => {
    if (activeId === "destacado") return flat.length > 0 ? flat : tree
    const node = tree.find((item) => item.id === activeId)
    if (!node) return flat
    return node.children.length > 0 ? node.children : [node]
  }, [activeId, flat, tree])

  const viewAllHref =
    activeId === "destacado"
      ? "/buscar?kind=product"
      : (() => {
          const node = tree.find((item) => item.id === activeId)
          return node ? exploreHref("productos", { slug: node.slug, label: node.name }) : "/buscar?kind=product"
        })()

  return (
    <ExploreSplitLayout
      layout={layout}
      sidebar={
        <SidebarList
          items={sidebarItems}
          activeId={activeId}
          onSelect={setActiveId}
          loading={loading}
        />
      }
      content={
        <SubcategoryGrid
          title={activeId === "destacado" ? "Comprar por categoría" : sidebarItems.find((item) => item.id === activeId)?.label ?? "Categorías"}
          items={gridItems.map((item) => ({
            id: item.id,
            label: item.name,
            slug: item.slug,
            tint: exploreTagTint(item.slug),
          }))}
          viewAllHref={viewAllHref}
          tab="productos"
          onNavigate={onNavigate}
          loading={loading}
          empty="Todavía no hay categorías de producto publicadas."
        />
      }
    />
  )
}

function BusinessExplore({
  layout,
  loading,
  tree,
  onNavigate,
}: {
  layout: "desktop" | "mobile"
  loading: boolean
  tree: BusinessCategoryNode[]
  onNavigate: () => void
}) {
  const [activeId, setActiveId] = useState<string>(() => tree[0]?.id ?? "destacado")

  useEffect(() => {
    if (!tree.some((node) => node.id === activeId) && tree[0]) {
      setActiveId(tree[0].id)
    }
  }, [activeId, tree])

  const sidebarItems = useMemo(() => tree.map((node) => ({ id: node.id, label: node.name })), [tree])

  const gridItems = useMemo(() => {
    const node = tree.find((item) => item.id === activeId)
    if (!node) return tree
    return node.children.length > 0 ? node.children : [node]
  }, [activeId, tree])

  const activeNode = tree.find((item) => item.id === activeId)
  const viewAllHref = activeNode
    ? exploreHref("negocios", { slug: activeNode.slug, label: activeNode.name })
    : "/buscar"

  return (
    <ExploreSplitLayout
      layout={layout}
      sidebar={
        <SidebarList items={sidebarItems} activeId={activeId} onSelect={setActiveId} loading={loading} />
      }
      content={
        <SubcategoryGrid
          title={activeNode?.name ?? "Rubros"}
          items={gridItems.map((item) => ({
            id: item.id,
            label: item.name,
            slug: item.slug,
            tint: "from-muted to-primary/40",
          }))}
          viewAllHref={viewAllHref}
          tab="negocios"
          onNavigate={onNavigate}
          loading={loading}
          empty="Todavía no hay rubros publicados."
        />
      }
    />
  )
}

function GroupedExplore({
  layout,
  groups,
  tab,
  onNavigate,
}: {
  layout: "desktop" | "mobile"
  groups: ExploreGroup[]
  tab: ExploreTab
  onNavigate: () => void
}) {
  const [activeId, setActiveId] = useState(groups[0]?.id ?? "")
  const activeGroup = groups.find((group) => group.id === activeId) ?? groups[0]

  useEffect(() => {
    if (!groups.some((group) => group.id === activeId) && groups[0]) {
      setActiveId(groups[0].id)
    }
  }, [activeId, groups])

  if (!activeGroup) {
    return <p className="p-4 text-sm text-muted-foreground">No hay categorías configuradas.</p>
  }

  return (
    <ExploreSplitLayout
      layout={layout}
      sidebar={
        <SidebarList
          items={groups.map((group) => ({ id: group.id, label: group.label }))}
          activeId={activeGroup.id}
          onSelect={setActiveId}
        />
      }
      content={
        <SubcategoryGrid
          title={activeGroup.label}
          items={activeGroup.items.map((item) => ({
            id: item.id,
            label: item.label,
            tint: "from-muted to-muted-foreground/30",
          }))}
          viewAllHref={exploreHref(tab, { label: activeGroup.label })}
          tab={tab}
          onNavigate={onNavigate}
          empty="No hay rubros en esta sección."
        />
      }
    />
  )
}

function ExploreSplitLayout({
  layout,
  sidebar,
  content,
}: {
  layout: "desktop" | "mobile"
  sidebar: React.ReactNode
  content: React.ReactNode
}) {
  const height = layout === "mobile" ? "min(100dvh-4.5rem,720px)" : "min(420px,70vh)"
  return (
    <div className="flex min-h-0" style={{ height }}>
      <aside className="w-[7.25rem] shrink-0 border-r border-border bg-muted/20 sm:w-36 md:w-40">{sidebar}</aside>
      <div className="min-w-0 flex-1">{content}</div>
    </div>
  )
}

function SidebarList({
  items,
  activeId,
  onSelect,
  loading,
}: {
  items: { id: string; label: string }[]
  activeId: string
  onSelect: (id: string) => void
  loading?: boolean
}) {
  return (
    <ScrollArea className="h-full" viewportClassName="h-full">
      <ul className="py-2">
        {loading ? (
          <li className="px-3 py-2 text-xs text-muted-foreground">Cargando…</li>
        ) : (
          items.map((item) => {
            const active = item.id === activeId
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={`relative flex w-full items-center px-3 py-2.5 text-left text-xs leading-snug sm:text-sm ${
                    active ? "bg-background font-semibold text-foreground" : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
                  }`}
                >
                  {active ? <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary" aria-hidden /> : null}
                  <span className="line-clamp-3">{item.label}</span>
                </button>
              </li>
            )
          })
        )}
      </ul>
    </ScrollArea>
  )
}

function SubcategoryGrid({
  title,
  items,
  viewAllHref,
  tab,
  onNavigate,
  loading,
  empty,
}: {
  title: string
  items: { id: string; label: string; slug?: string; tint: string }[]
  viewAllHref: string
  tab: ExploreTab
  onNavigate: () => void
  loading?: boolean
  empty: string
}) {
  return (
    <ScrollArea className="h-full" viewportClassName="h-full">
      <div className="px-3 py-3 sm:px-4 sm:py-4">
        <h3 className="text-sm font-semibold sm:text-base">{title}</h3>
        {loading ? <p className="mt-4 text-sm text-muted-foreground">Cargando categorías…</p> : null}
        {!loading && items.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">{empty}</p> : null}
        <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 md:gap-4">
          <li>
            <ExploreTile
              label="Ver todo"
              href={viewAllHref}
              onNavigate={onNavigate}
              tint="from-muted to-accent"
              icon="grid"
            />
          </li>
          {items.map((item) => (
            <li key={item.id}>
              <ExploreTile
                label={item.label}
                href={exploreHref(tab, { slug: item.slug, label: item.label })}
                onNavigate={onNavigate}
                tint={item.tint}
              />
            </li>
          ))}
        </ul>
      </div>
    </ScrollArea>
  )
}

function ExploreTile({
  label,
  href,
  onNavigate,
  tint,
  icon,
}: {
  label: string
  href: string
  onNavigate: () => void
  tint: string
  icon?: "grid"
}) {
  return (
    <Link
      to={href}
      onClick={onNavigate}
      className="group flex flex-col items-center gap-2 text-center"
    >
      <span
        className={`grid size-14 place-items-center overflow-hidden rounded-full bg-gradient-to-br text-sm font-semibold text-white shadow-sm ring-1 ring-border/40 sm:size-16 ${tint}`}
      >
        {icon === "grid" ? (
          <GridIcon />
        ) : (
          <span aria-hidden>{label.slice(0, 1)}</span>
        )}
      </span>
      <span className="line-clamp-2 text-[11px] leading-tight text-foreground group-hover:text-primary sm:text-xs">{label}</span>
    </Link>
  )
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 text-foreground/80" fill="currentColor">
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </svg>
  )
}
