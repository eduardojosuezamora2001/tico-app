import { useCallback, useEffect, useState } from "react"
import type { BusinessModule, ModuleName } from "@workspace/shared"

import {
  emptyModuleState,
  filterModuleCatalog,
  moduleCatalogEntry,
  type ModuleCatalogEntry,
} from "@/lib/module-catalog"
import { listBusinessModules, patchBusinessModule, setBusinessModule } from "@/services/modules.service"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@workspace/ui/components/empty"
import { Input } from "@workspace/ui/components/input"

function modulesToState(rows: BusinessModule[]) {
  const enabled = emptyModuleState()
  const settings: Partial<Record<ModuleName, Record<string, unknown>>> = {}
  for (const row of rows) {
    enabled[row.moduleName] = row.enabled
    settings[row.moduleName] = row.settings
  }
  return { enabled, settings }
}

export function useBusinessModules(businessId: string) {
  const [modules, setModules] = useState<Record<ModuleName, boolean>>(emptyModuleState)
  const [moduleSettings, setModuleSettings] = useState<
    Partial<Record<ModuleName, Record<string, unknown>>>
  >({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(() => {
    if (!businessId) return Promise.resolve()
    setLoading(true)
    return listBusinessModules(businessId)
      .then((rows) => {
        const next = modulesToState(rows)
        setModules(next.enabled)
        setModuleSettings(next.settings)
        setError(null)
      })
      .catch(() => setError("No se pudieron cargar los módulos."))
      .finally(() => setLoading(false))
  }, [businessId])

  useEffect(() => {
    void reload()
  }, [reload])

  return { modules, moduleSettings, loading, error, reload, isEnabled: (name: ModuleName) => modules[name] }
}

function ModuleCard({
  entry,
  enabled,
  onOpen,
}: {
  entry: ModuleCatalogEntry
  enabled: boolean
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-col gap-2 rounded-2xl border border-border bg-card px-4 py-4 text-left transition-colors hover:bg-muted/40"
    >
      <span className="flex items-center justify-between gap-3">
        <span className="font-medium">{entry.title}</span>
        <span
          className={
            enabled
              ? "rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary"
              : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
          }
        >
          {enabled ? "Activo" : "Inactivo"}
        </span>
      </span>
      <span className="text-sm text-muted-foreground">{entry.summary}</span>
    </button>
  )
}

function ModuleDetail({
  businessId,
  entry,
  enabled,
  settings,
  onBack,
  onChanged,
}: {
  businessId: string
  entry: ModuleCatalogEntry
  enabled: boolean
  settings: Record<string, unknown>
  onBack: () => void
  onChanged: () => void
}) {
  const [pending, setPending] = useState(false)
  const [featurePending, setFeaturePending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function toggle(nextEnabled: boolean) {
    setPending(true)
    setError(null)
    try {
      await setBusinessModule(businessId, entry.id, nextEnabled)
      onChanged()
    } catch {
      setError(nextEnabled ? "No se pudo activar el módulo." : "No se pudo desactivar el módulo.")
    } finally {
      setPending(false)
    }
  }

  async function toggleFeature(featureKey: string, next: boolean) {
    setFeaturePending(featureKey)
    setError(null)
    try {
      await patchBusinessModule(businessId, entry.id, {
        settings: { [featureKey]: next },
      })
      onChanged()
    } catch {
      setError("No se pudo guardar la funcionalidad.")
    } finally {
      setFeaturePending(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <button type="button" onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">
          Volver a módulos
        </button>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{entry.title}</h2>
          <span
            className={
              enabled
                ? "rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary"
                : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
            }
          >
            {enabled ? "Activo" : "Inactivo"}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
        <div>
          <h3 className="text-sm font-medium">Para qué sirve</h3>
          <p className="mt-2 text-sm text-muted-foreground">{entry.description}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium">Ideal para</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {entry.categories.map((category) => (
              <li
                key={category}
                className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground"
              >
                {category}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <h3 className="text-sm font-medium">Funcionalidades extra</h3>
        {entry.features.length === 0 ? (
          <p className="text-sm text-muted-foreground">Próximamente habrá más opciones para este módulo.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {entry.features.map((feature) => {
              const on = settings[feature.settingsKey] === true
              return (
                <li key={feature.id} className="flex gap-3">
                  <Checkbox
                    checked={on}
                    disabled={!enabled || featurePending === feature.settingsKey}
                    onCheckedChange={(checked) => void toggleFeature(feature.settingsKey, checked === true)}
                    aria-label={feature.title}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{feature.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        {!enabled && entry.features.length > 0 ? (
          <p className="text-xs text-muted-foreground">Activa el módulo para configurar estas opciones.</p>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        {enabled ? (
          <Button type="button" variant="outline" className="rounded-full" disabled={pending} onClick={() => void toggle(false)}>
            {pending ? "Guardando…" : "Desactivar módulo"}
          </Button>
        ) : (
          <Button type="button" className="rounded-full" disabled={pending} onClick={() => void toggle(true)}>
            {pending ? "Activando…" : "Activar módulo"}
          </Button>
        )}
      </div>
    </div>
  )
}

export function ModulesPanel({
  businessId,
  modules,
  moduleSettings,
  loading,
  error,
  onReload,
}: {
  businessId: string
  modules: Record<ModuleName, boolean>
  moduleSettings: Partial<Record<ModuleName, Record<string, unknown>>>
  loading: boolean
  error: string | null
  onReload: () => void
}) {
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<ModuleName | null>(null)

  const filtered = filterModuleCatalog(query)
  const selectedEntry = selected ? moduleCatalogEntry(selected) : null

  if (selectedEntry) {
    return (
      <ModuleDetail
        businessId={businessId}
        entry={selectedEntry}
        enabled={modules[selectedEntry.id]}
        settings={moduleSettings[selectedEntry.id] ?? {}}
        onBack={() => setSelected(null)}
        onChanged={onReload}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Buscar y activar módulos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Elige qué partes de tu local quieres publicar. Cada módulo explica para qué sirve y a qué tipo de negocio le conviene.
        </p>
      </div>

      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar módulos…"
        aria-label="Buscar módulos"
        className="h-11 rounded-xl"
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando módulos…</p>
      ) : filtered.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyTitle>Sin coincidencias</EmptyTitle>
            <EmptyDescription>Prueba con otro nombre, categoría o tipo de negocio.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((entry) => (
            <li key={entry.id}>
              <ModuleCard entry={entry} enabled={modules[entry.id]} onOpen={() => setSelected(entry.id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
