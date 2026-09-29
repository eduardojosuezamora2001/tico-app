import { useMemo, useState } from "react"
import { Link } from "react-router"
import {
  Add01Icon,
  Building03Icon,
  LinkSquare02Icon,
  Search01Icon,
  Store03Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { BusinessChain, ChainLocation } from "@workspace/shared"

import { ChainSetupDialog } from "@/components/chain-setup-dialog"
import {
  collaboratorRestrictions,
  filterChains,
  filterMemberships,
  groupMemberships,
  membershipRoleLabel,
  merchantCounts,
  permissionSummary,
  type MerchantSectionFilter,
} from "@/lib/merchant-memberships"
import type { Membership } from "@/services/types"
import { Button } from "@workspace/ui/components/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@workspace/ui/components/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@workspace/ui/components/input-group"
import { Skeleton } from "@workspace/ui/components/skeleton"

const filterOptions: Array<{ id: MerchantSectionFilter; label: string }> = [
  { id: "all", label: "Todos los locales" },
  { id: "chains", label: "Cadenas de negocios" },
  { id: "owned", label: "Dueño / Co-líder" },
  { id: "collaborator", label: "Colaborador / Empleado" },
]

export function MerchantHomeDashboard({
  memberships,
  chains,
  loading,
  onRefresh,
}: {
  memberships: Membership[]
  chains: BusinessChain[]
  loading: boolean
  onRefresh: () => void
}) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<MerchantSectionFilter>("all")
  const [chainDialogOpen, setChainDialogOpen] = useState(false)
  const [chainDialogTarget, setChainDialogTarget] = useState<string | null>(null)

  const groups = useMemo(() => groupMemberships(memberships, chains), [memberships, chains])
  const counts = useMemo(() => merchantCounts(groups), [groups])
  const filteredChains = useMemo(() => filterChains(groups.chains, query), [groups.chains, query])

  const owned = useMemo(
    () => filterMemberships(groups.owned, query),
    [groups.owned, query],
  )
  const collaborator = useMemo(
    () => filterMemberships(groups.collaborator, query),
    [groups.collaborator, query],
  )

  const showChains = filter === "all" || filter === "chains"
  const showOwned = filter === "all" || filter === "owned"
  const showCollaborator = filter === "all" || filter === "collaborator"

  function openChainDialog(chainId?: string | null) {
    setChainDialogTarget(chainId ?? null)
    setChainDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight">Mis Negocios &amp; Sucursales</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Administra tus cadenas multi-sucursal, los comercios donde eres dueño o co-líder y tus
            roles operativos como colaborador.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => openChainDialog()}
          >
            <HugeiconsIcon icon={Building03Icon} strokeWidth={2} data-icon="inline-start" />
            Nueva cadena o sucursal
          </Button>
          <Button className="rounded-full" render={<Link to="/mi-negocio/nuevo" />}>
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} data-icon="inline-start" />
            Crear nuevo negocio
          </Button>
        </div>
      </header>

      <section className="rounded-2xl border border-border bg-card/60 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <InputGroup className="h-11 max-w-md rounded-full">
            <InputGroupAddon>
              <HugeiconsIcon icon={Search01Icon} strokeWidth={2} className="text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filtrar por nombre, categoría o ubicación"
              aria-label="Filtrar negocios"
            />
          </InputGroup>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{counts.all}</span> establecimientos en total
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {filterOptions.map((option) => {
            const count =
              option.id === "all"
                ? counts.all
                : option.id === "chains"
                  ? counts.chains
                  : option.id === "owned"
                    ? counts.owned
                    : counts.collaborator
            const active = filter === option.id
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                className={
                  active
                    ? "rounded-full border border-primary bg-primary/15 px-4 py-2 text-sm font-medium text-primary"
                    : "rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                }
              >
                {option.label}
                <span className="ml-1.5 tabular-nums opacity-80">({count})</span>
              </button>
            )
          })}
        </div>
      </section>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
      ) : (
        <>
          {showChains ? (
            <ChainsSection
              chains={filteredChains}
              total={groups.chains.length}
              onCreateChain={() => openChainDialog()}
              onAddLocation={(chainId) => openChainDialog(chainId)}
            />
          ) : null}

          {showOwned ? (
            <OwnedSection memberships={owned} total={groups.owned.length} />
          ) : null}

          {showCollaborator ? (
            <CollaboratorSection memberships={collaborator} total={groups.collaborator.length} />
          ) : null}

          {!loading && counts.all === 0 ? (
            <Empty className="rounded-2xl border border-border bg-card">
              <EmptyHeader>
                <EmptyTitle>Aún no tienes negocios</EmptyTitle>
                <EmptyDescription>
                  Publica tu primer local o acepta una invitación del equipo para verlo aquí.
                </EmptyDescription>
              </EmptyHeader>
              <Button className="mt-2 rounded-full" render={<Link to="/mi-negocio/nuevo" />}>
                Crear nuevo negocio
              </Button>
            </Empty>
          ) : null}
        </>
      )}

      <footer className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            ¿Necesitas formalizar sucursales o transferir la administración de un local?
          </p>
          <Button variant="outline" className="rounded-full" render={<Link to="/mensajes" />}>
            Contactar soporte
          </Button>
        </div>
      </footer>

      <ChainSetupDialog
        open={chainDialogOpen}
        onOpenChange={setChainDialogOpen}
        chains={groups.chains}
        memberships={memberships}
        initialChainId={chainDialogTarget}
        onSuccess={onRefresh}
      />
    </div>
  )
}

function ChainsSection({
  chains,
  total,
  onCreateChain,
  onAddLocation,
}: {
  chains: BusinessChain[]
  total: number
  onCreateChain: () => void
  onAddLocation: (chainId: string) => void
}) {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeader
        icon={Building03Icon}
        title="Cadenas de negocios (Multi-sucursal)"
        subtitle={
          total > 0
            ? `${total} marca${total === 1 ? "" : "s"} con varias sedes`
            : "Agrupa locales bajo una misma marca"
        }
        action={
          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={onCreateChain}>
            Añadir sede a cadena
          </Button>
        }
      />
      {chains.length === 0 ? (
        total === 0 ? (
          <Empty className="rounded-2xl border border-dashed border-border bg-card/40">
            <EmptyHeader>
              <EmptyTitle>Sin cadenas configuradas</EmptyTitle>
              <EmptyDescription>
                Crea una cadena y vincula sedes existentes o registra una nueva sucursal bajo la
                misma marca.
              </EmptyDescription>
            </EmptyHeader>
            <Button type="button" variant="outline" className="mt-2 rounded-full" onClick={onCreateChain}>
              Configurar primera cadena
            </Button>
          </Empty>
        ) : (
          <p className="text-sm text-muted-foreground">Ninguna cadena coincide con el filtro.</p>
        )
      ) : (
        <ul className="flex flex-col gap-4">
          {chains.map((chain) => (
            <ChainCard key={chain.id} chain={chain} onAddLocation={() => onAddLocation(chain.id)} />
          ))}
        </ul>
      )}
    </section>
  )
}

function ChainCard({ chain, onAddLocation }: { chain: BusinessChain; onAddLocation: () => void }) {
  return (
    <li className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <BusinessAvatar name={chain.name} logoUrl={chain.logoUrl} />
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{chain.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {chain.locations.length} sede{chain.locations.length === 1 ? "" : "s"}
              {chain.description ? ` · ${chain.description}` : ""}
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={onAddLocation}>
          Añadir sede
        </Button>
      </div>

      {chain.locations.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
          {chain.locations.map((location) => (
            <ChainLocationRow key={location.businessId} location={location} />
          ))}
        </ul>
      ) : (
        <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
          Esta cadena aún no tiene sedes vinculadas.
        </p>
      )}
    </li>
  )
}

function ChainLocationRow({ location }: { location: ChainLocation }) {
  const status = location.isActive ? "Activo" : location.isDraft ? "Borrador" : "Configurando"
  const statusTone = location.isActive
    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
    : "bg-amber-500/15 text-amber-800 dark:text-amber-200"

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <BusinessAvatar name={location.name} logoUrl={location.logoUrl} />
        <div className="min-w-0">
          <p className="truncate font-medium">{location.name}</p>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {[location.category, location.address].filter(Boolean).join(" · ") || "Sin ubicación"}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge className={statusTone}>{status}</StatusBadge>
        <RoleBadge>{membershipRoleLabel(location.role)}</RoleBadge>
        <Button variant="outline" size="sm" className="rounded-full" render={<Link to={`/mi-negocio/${location.businessId}`} />}>
          Administrar
        </Button>
      </div>
    </li>
  )
}

function OwnedSection({ memberships, total }: { memberships: Membership[]; total: number }) {
  if (total === 0 && memberships.length === 0) return null

  return (
    <section className="flex flex-col gap-4">
      <SectionHeader
        icon={Store03Icon}
        title="Mis negocios propios (Dueño / Co-líder)"
        subtitle={`${total} comercio${total === 1 ? "" : "s"} individual${total === 1 ? "" : "es"}`}
      />
      {memberships.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ningún negocio propio coincide con el filtro.</p>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {memberships.map((row) => (
            <OwnedBusinessCard key={row.businessId} membership={row} />
          ))}
        </ul>
      )}
    </section>
  )
}

function CollaboratorSection({ memberships, total }: { memberships: Membership[]; total: number }) {
  if (total === 0 && memberships.length === 0) return null

  return (
    <section className="flex flex-col gap-4">
      <SectionHeader
        icon={UserGroupIcon}
        title="Negocios donde colaboro (Empleado / Delegado)"
        subtitle={`${total} negocio${total === 1 ? "" : "s"} asignado${total === 1 ? "" : "s"}`}
        action={
          <Button variant="outline" size="sm" className="rounded-full" render={<Link to="/cuenta" />}>
            Unirme con código de invitación
          </Button>
        }
      />
      {memberships.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ninguna colaboración coincide con el filtro.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {memberships.map((row) => (
            <CollaboratorBusinessCard key={row.businessId} membership={row} />
          ))}
        </ul>
      )}
    </section>
  )
}

function OwnedBusinessCard({ membership }: { membership: Membership }) {
  const business = membership.business
  const label = business?.name ?? "Negocio sin ficha"

  const status = business?.isActive ? "Activo" : "Configurando"
  const statusTone = business?.isActive
    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
    : "bg-amber-500/15 text-amber-800 dark:text-amber-200"

  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <BusinessAvatar name={label} logoUrl={business?.logoUrl ?? null} />
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{label}</h3>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {business
                ? [business.category, business.address].filter(Boolean).join(" · ") || "Sin ubicación"
                : "Datos del local no disponibles"}
            </p>
          </div>
        </div>
        <StatusBadge className={statusTone}>{status}</StatusBadge>
      </div>

      <div className="flex flex-wrap gap-2">
        <RoleBadge>{membershipRoleLabel(membership.role)}</RoleBadge>
        {business?.category ? <RoleBadge muted>{business.category}</RoleBadge> : null}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <Metric label="Estado" value={business?.isActive ? "Publicado" : "Borrador"} />
        <Metric label="Rol" value={membership.role === "owner" ? "Dueño" : membershipRoleLabel(membership.role)} />
        <Metric label="Acceso" value={membership.isActive ? "Activo" : "Inactivo"} />
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Button variant="outline" size="sm" className="rounded-full" render={<Link to={`/mi-negocio/${membership.businessId}`} />}>
          Administrar
        </Button>
        {business ? (
          <Button variant="ghost" size="sm" className="rounded-full" render={<Link to={`/n/${business.id}`} />}>
            <HugeiconsIcon icon={LinkSquare02Icon} strokeWidth={2} data-icon="inline-start" />
            Ver página
          </Button>
        ) : null}
      </div>
    </li>
  )
}

function CollaboratorBusinessCard({ membership }: { membership: Membership }) {
  const business = membership.business
  const label = business?.name ?? "Negocio asignado"

  const granted = permissionSummary(membership.permissions)
  const restrictions = collaboratorRestrictions(membership.permissions)

  return (
    <li className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <BusinessAvatar name={label} logoUrl={business?.logoUrl ?? null} />
            <div className="min-w-0">
              <h3 className="truncate font-semibold">{label}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {business?.address ?? "Ubicación no registrada"}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-border bg-muted/30 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Tu rol asignado
            </p>
            <p className="mt-1 font-medium">{membershipRoleLabel(membership.role)}</p>
          </div>
        </div>

        <div className="w-full max-w-md rounded-xl border border-border bg-background/60 p-4">
          <p className="text-sm font-medium">Matriz de permisos</p>
          <ul className="mt-3 flex flex-col gap-2">
            {granted.length > 0 ? (
              granted.map((item) => (
                <li key={item.name} className="flex items-start gap-2 text-sm">
                  <span className="text-emerald-600 dark:text-emerald-400" aria-hidden>
                    ✓
                  </span>
                  <span>{item.label}</span>
                </li>
              ))
            ) : (
              <li className="text-sm text-muted-foreground">Permisos básicos de lectura.</li>
            )}
            {restrictions.map((item) => (
              <li key={item.label} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className={item.allowed ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"} aria-hidden>
                  {item.allowed ? "✓" : "×"}
                </span>
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
        {membership.isActive ? (
          <Button className="rounded-full" render={<Link to={`/mi-negocio/${membership.businessId}`} />}>
            Entrar al panel
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Tu acceso a este local está inactivo.</p>
        )}
        {business ? (
          <Button variant="outline" className="rounded-full" render={<Link to={`/n/${business.id}`} />}>
            Ver ficha pública
          </Button>
        ) : null}
      </div>
    </li>
  )
}

function SectionHeader({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: typeof Store03Icon
  title: string
  subtitle: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <HugeiconsIcon icon={icon} strokeWidth={2} />
        </span>
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
  )
}

function BusinessAvatar({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  return (
    <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/15 text-base font-semibold text-primary">
      {logoUrl ? (
        <img src={logoUrl} alt="" className="size-full object-cover" />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </span>
  )
}

function StatusBadge({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      {children}
    </span>
  )
}

function RoleBadge({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span
      className={
        muted
          ? "rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
          : "rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary"
      }
    >
      {children}
    </span>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 px-2 py-2">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium text-foreground">{value}</p>
    </div>
  )
}
