import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { useNavigate } from "react-router"
import type { CatalogSuggestion } from "@workspace/shared"

import { suggestCatalog } from "@/services/businesses.service"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@workspace/ui/components/input-group"

const kindLabel: Record<CatalogSuggestion["kind"], string> = {
  business: "Local",
  product: "Producto",
  service: "Servicio",
  menu: "Menú",
}

export function HeaderSearch() {
  const navigate = useNavigate()
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [term, setTerm] = useState("")
  const [items, setItems] = useState<CatalogSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const query = term.trim()
    if (query.length < 2) {
      setItems([])
      setOpen(false)
      return
    }
    const handle = window.setTimeout(() => {
      setLoading(true)
      void suggestCatalog(query)
        .then((rows) => {
          setItems(rows)
          setActive(0)
          setOpen(true)
        })
        .catch(() => {
          setItems([])
          setOpen(false)
        })
        .finally(() => setLoading(false))
    }, 200)
    return () => window.clearTimeout(handle)
  }, [term])

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [])

  function openSuggestion(item: CatalogSuggestion) {
    setOpen(false)
    if (item.kind === "business") {
      navigate(`/n/${item.id}`)
      return
    }
    const params = new URLSearchParams({ kind: item.kind, label: item.label })
    navigate(`/buscar?${params.toString()}`)
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const item = items[active]
    if (open && item) openSuggestion(item)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      if (items.length === 0) return
      setOpen(true)
      setActive((index) => Math.min(index + 1, items.length - 1))
    }
    if (event.key === "ArrowUp") {
      event.preventDefault()
      setActive((index) => Math.max(index - 1, 0))
    }
    if (event.key === "Escape") setOpen(false)
  }

  const showList = open && (loading || items.length > 0 || term.trim().length >= 2)

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1 sm:max-w-md">
      <form onSubmit={onSubmit}>
        <InputGroup className="h-10 rounded-full">
          <InputGroupAddon>
            <SearchIcon />
            <span className="sr-only">Buscar locales, productos y servicios</span>
          </InputGroupAddon>
          <InputGroupInput
            value={term}
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            autoComplete="off"
            onChange={(event) => setTerm(event.target.value)}
            onFocus={() => {
              if (items.length > 0) setOpen(true)
            }}
            onKeyDown={onKeyDown}
            placeholder="Buscar locales, productos, servicios..."
          />
        </InputGroup>
      </form>
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-[calc(100%+0.4rem)] z-30 max-h-80 w-full overflow-auto rounded-2xl border border-border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {items.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              {loading ? "Buscando…" : "Nada coincide."}
            </li>
          ) : (
            items.map((item, index) => (
              <li key={`${item.kind}-${item.id}`} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm ${
                    index === active ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                  }`}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => openSuggestion(item)}
                >
                  <span className="truncate font-medium">{item.label}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{item.hint ?? kindLabel[item.kind]}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}
