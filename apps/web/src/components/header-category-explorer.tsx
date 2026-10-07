import { useEffect, useEffectEvent, useMemo, useRef, useState, type ReactElement, type ReactNode } from "react"
import { Link } from "react-router"
import { ArrowDown01Icon, ArrowLeft01Icon, ArrowRight01Icon, Menu01Icon } from "@hugeicons/core-free-icons"
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
import { listMarketplaceBusinessCategories, listMarketplaceTags, prefetchMarketplaceTags } from "@/services/catalog.service"
import { Button } from "@workspace/ui/components/button"
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@workspace/ui/components/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { cn } from "cn"

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
          className={cn(
            "hidden h-10 shrink-0 rounded-full px-3 text-sm font-medium lg:inline-flex",
            open && "bg-muted text-foreground",
            className,
          )}
          onMouseEnter={prefetchMarketplaceTags}
          onFocus={prefetchMarketplaceTags}
        >
          Categorías
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            strokeWidth={2}
            data-icon="inline-end"
            className={cn("transition-transform", open && "rotate-180")}
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
      contentClassName="flex h-full w-full max-w-none flex-col gap-0 p-0 sm:max-w-lg md:max-w-xl"
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "shrink-0 rounded-full lg:hidden",
            open && "bg-muted text-foreground",
            className,
          )}
          aria-label="Explorar categorías"
          onMouseEnter={prefetchMarketplaceTags}
          onFocus={prefetchMarketplaceTags}
        >
          <HugeiconsIcon icon={Menu01Icon} strokeWidth={2} />
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
        <SheetContent side="right" className={cn("gap-0 p-0", contentClassName)}>
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
        <div className="border-b border-border px-3 pt-2 sm:px-4">
          <TabsList variant="line" className="h-11 w-full justify-start gap-1 bg-transparent">
            {(Object.keys(tabLabels) as ExploreTab[]).map((key) => (
              <TabsTrigger
                key={key}
                value={key}
                className="flex-1 data-active:text-primary after:bg-primary sm:flex-none"
              >
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
          variant={layout === "mobile" ? "chips" : "rail"}
          items={sidebarItems}
          activeId={activeId}
          onSelect={setActiveId}
          loading={loading}
        />
      }
      content={
        <SubcategoryGrid
          layout={layout}
          title={
            activeId === "destacado"
              ? "Comprar por categoría"
              : (sidebarItems.find((item) => item.id === activeId)?.label ?? "Categorías")
          }
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
        <SidebarList
          variant={layout === "mobile" ? "chips" : "rail"}
          items={sidebarItems}
          activeId={activeId}
          onSelect={setActiveId}
          loading={loading}
        />
      }
      content={
        <SubcategoryGrid
          layout={layout}
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
          variant={layout === "mobile" ? "chips" : "rail"}
          items={groups.map((group) => ({ id: group.id, label: group.label }))}
          activeId={activeGroup.id}
          onSelect={setActiveId}
        />
      }
      content={
        <SubcategoryGrid
          layout={layout}
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
  if (layout === "mobile") {
    return (
      <div className="flex min-h-0 flex-1 flex-col" style={{ height: "calc(100dvh - 5.75rem)" }}>
        <div className="shrink-0 border-b border-border bg-background px-3 py-2.5 sm:px-4">
          {sidebar}
        </div>
        <div className="min-h-0 flex-1">{content}</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0" style={{ height: "min(420px,70vh)" }}>
      <aside className="w-40 shrink-0 border-r border-border bg-muted/20">{sidebar}</aside>
      <div className="min-w-0 flex-1">{content}</div>
    </div>
  )
}

function SidebarList({
  items,
  activeId,
  onSelect,
  loading,
  variant = "rail",
}: {
  items: { id: string; label: string }[]
  activeId: string
  onSelect: (id: string) => void
  loading?: boolean
  variant?: "rail" | "chips"
}) {
  if (variant === "chips") {
    return (
      <ScrollableCategoryChips loading={loading}>
        {items.map((item) => {
          const active = item.id === activeId
          return (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant={active ? "default" : "outline"}
              className="h-8 shrink-0 rounded-full px-3"
              onClick={() => onSelect(item.id)}
            >
              {item.label}
            </Button>
          )
        })}
      </ScrollableCategoryChips>
    )
  }

  return (
    <ScrollArea className="h-full" viewportClassName="h-full">
      <ul className="flex flex-col gap-0.5 py-2">
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
                  className={cn(
                    "relative flex w-full items-center px-3 py-2.5 text-left text-sm leading-snug",
                    active
                      ? "bg-background font-semibold text-foreground"
                      : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
                  )}
                >
                  {active ? (
                    <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary" aria-hidden />
                  ) : null}
                  <span className="line-clamp-2">{item.label}</span>
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
  layout,
  title,
  items,
  viewAllHref,
  tab,
  onNavigate,
  loading,
  empty,
}: {
  layout: "desktop" | "mobile"
  title: string
  items: { id: string; label: string; slug?: string; tint: string }[]
  viewAllHref: string
  tab: ExploreTab
  onNavigate: () => void
  loading?: boolean
  empty: string
}) {
  const isMobile = layout === "mobile"

  return (
    <ScrollArea className="h-full" viewportClassName="h-full">
      <div className={cn("px-4 py-4", isMobile ? "sm:px-5 sm:py-5" : "sm:px-4")}>
        <div className="flex items-end justify-between gap-3">
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          <Link
            to={viewAllHref}
            onClick={onNavigate}
            className="shrink-0 text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Ver todo
          </Link>
        </div>
        {loading ? <p className="mt-6 text-sm text-muted-foreground">Cargando categorías…</p> : null}
        {!loading && items.length === 0 ? <p className="mt-6 text-sm text-muted-foreground">{empty}</p> : null}
        <ul
          className={cn(
            "mt-5 grid",
            isMobile
              ? "grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-5 md:grid-cols-3"
              : "grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 md:gap-4",
          )}
        >
          {isMobile ? null : (
            <li>
              <ExploreTile
                layout={layout}
                label="Ver todo"
                href={viewAllHref}
                onNavigate={onNavigate}
                tint="from-muted to-accent"
                icon="grid"
              />
            </li>
          )}
          {items.map((item) => (
            <li key={item.id}>
              <ExploreTile
                layout={layout}
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

function ScrollableCategoryChips({
  children,
  loading,
}: {
  children: React.ReactNode
  loading?: boolean
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateOverflow = useEffectEvent(() => {
    const node = scrollerRef.current
    if (!node) return
    const maxScroll = node.scrollWidth - node.clientWidth
    const left = node.scrollLeft
    setCanScrollLeft(left > 4)
    setCanScrollRight(maxScroll > 4 && left < maxScroll - 4)
  })

  useEffect(() => {
    const node = scrollerRef.current
    if (!node) return
    updateOverflow()
    const onScroll = () => updateOverflow()
    node.addEventListener("scroll", onScroll, { passive: true })
    const observer = new ResizeObserver(() => updateOverflow())
    observer.observe(node)
    return () => {
      node.removeEventListener("scroll", onScroll)
      observer.disconnect()
    }
  }, [children, loading])

  function scrollByDir(direction: "left" | "right") {
    const node = scrollerRef.current
    if (!node) return
    node.scrollBy({ left: direction === "left" ? -160 : 160, behavior: "smooth" })
  }

  if (loading) {
    return <p className="px-1 py-1.5 text-xs text-muted-foreground">Cargando…</p>
  }

  return (
    <div className="relative">
      <p className="sr-only">Deslizá horizontalmente para ver más categorías.</p>

      {canScrollLeft ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-background to-transparent"
          />
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            className="absolute top-1/2 left-0 z-20 size-7 -translate-y-1/2 rounded-full bg-background/95 shadow-sm"
            aria-label="Ver categorías anteriores"
            onClick={() => scrollByDir("left")}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
          </Button>
        </>
      ) : null}

      {canScrollRight ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background to-transparent"
          />
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            className="absolute top-1/2 right-0 z-20 size-7 -translate-y-1/2 rounded-full bg-background/95 shadow-sm"
            aria-label="Ver más categorías"
            onClick={() => scrollByDir("right")}
          >
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
          </Button>
        </>
      ) : null}

      <div
        ref={scrollerRef}
        className={cn(
          "flex gap-2 overflow-x-auto scroll-smooth pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          canScrollLeft && "ps-8",
          canScrollRight && "pe-8",
        )}
        aria-label="Categorías. Deslizá a izquierda o derecha."
      >
        {children}
      </div>

      {canScrollRight ? (
        <p className="mt-1.5 text-[11px] text-muted-foreground" aria-hidden>
          Deslizá para ver más →
        </p>
      ) : canScrollLeft ? (
        <p className="mt-1.5 text-[11px] text-muted-foreground" aria-hidden>
          ← Deslizá para volver
        </p>
      ) : null}
    </div>
  )
}

function ExploreTile({
  layout = "desktop",
  label,
  href,
  onNavigate,
  tint,
  icon,
}: {
  layout?: "desktop" | "mobile"
  label: string
  href: string
  onNavigate: () => void
  tint: string
  icon?: "grid"
}) {
  const isMobile = layout === "mobile"

  return (
    <Link
      to={href}
      onClick={onNavigate}
      className={cn(
        "group flex text-left",
        isMobile
          ? "flex-row items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-muted/60 sm:flex-col sm:items-center sm:gap-2.5 sm:px-1 sm:py-2 sm:text-center"
          : "flex-col items-center gap-2 text-center",
      )}
    >
      <span
        className={cn(
          "grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br font-semibold text-white shadow-sm ring-1 ring-border/40",
          isMobile ? "size-11 text-sm sm:size-14" : "size-14 text-sm sm:size-16",
          tint,
        )}
      >
        {icon === "grid" ? <GridIcon /> : <span aria-hidden>{label.slice(0, 1)}</span>}
      </span>
      <span
        className={cn(
          "text-foreground group-hover:text-primary",
          isMobile
            ? "line-clamp-2 min-w-0 flex-1 text-sm leading-snug font-medium sm:flex-none sm:text-xs sm:font-normal"
            : "line-clamp-2 text-[11px] leading-tight sm:text-xs",
        )}
      >
        {label}
      </span>
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
