import { useEffect, useState, type ReactNode } from "react"
import { Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@workspace/ui/components/combobox"
import { Empty, EmptyDescription, EmptyHeader } from "@workspace/ui/components/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@workspace/ui/components/input-group"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@workspace/ui/components/pagination"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Skeleton } from "@workspace/ui/components/skeleton"

export type ListFilterEntry<T> = {
  id: string
  label: string
  empty: string
  items: T[]
  text: (item: T) => string
  group: (item: T) => string | null
  render: (items: T[]) => ReactNode
}

export function ListFilter<T>({
  lists,
  placeholder = "Buscar en esta lista",
  listLabel = "Lista",
  groupLabel = "Grupo",
  activeIds,
  onActiveChange,
  query: controlledQuery,
  onQueryChange,
  group: controlledGroup,
  onGroupChange,
  groups: controlledGroups,
  showCount = true,
  loading = false,
  footer,
  pageSize = 6,
  page: controlledPage,
  hasNext,
  hasPrevious,
  onPageChange,
}: {
  lists: ListFilterEntry<T>[]
  placeholder?: string
  listLabel?: string
  groupLabel?: string
  /** Selected list ids. Empty means every list. */
  activeIds?: string[]
  onActiveChange?: (ids: string[]) => void
  /** When set, search and groups are applied by the parent (cursor pages, not in memory). */
  query?: string
  onQueryChange?: (value: string) => void
  /** Selected group ids. Empty means every group. */
  group?: string[]
  onGroupChange?: (values: string[]) => void
  groups?: string[]
  showCount?: boolean
  loading?: boolean
  footer?: ReactNode
  pageSize?: number
  /** Remote pages: the parent already sliced `items`. */
  page?: number
  hasNext?: boolean
  hasPrevious?: boolean
  onPageChange?: (page: number) => void
}) {
  const remote = onQueryChange !== undefined
  const remotePage = onPageChange !== undefined
  const [localIds, setLocalIds] = useState<string[]>([])
  const [localQuery, setLocalQuery] = useState("")
  const [localGroup, setLocalGroup] = useState<string[]>([])
  const [localPage, setLocalPage] = useState(0)
  const selectedIds = activeIds ?? localIds
  const query = controlledQuery ?? localQuery
  const selectedGroups = controlledGroup ?? localGroup
  const selectionKey = `${selectedIds.join("\u001f")}|${selectedGroups.join("\u001f")}|${query}`

  useEffect(() => {
    setLocalPage(0)
  }, [selectionKey])

  const listClearId = lists.some((list) => list.id === "todas") ? "todas" : "todos"
  const chosenLists = lists.filter((list) => selectedIds.includes(list.id) && list.id !== listClearId)
  const sourceLists = chosenLists.length > 0 ? chosenLists : lists.filter((list) => list.id !== listClearId)
  const groupNames = controlledGroups ?? [
    ...new Set(
      sourceLists.flatMap((list) => list.items.map(list.group)).filter((item): item is string => Boolean(item)),
    ),
  ]

  if (lists.length === 0 || !lists[0]) return null

  const needle = query.trim().toLocaleLowerCase("es")
  const rows = remote
    ? lists[0].items.map((item) => ({ list: lists[0], item }))
    : sourceLists.flatMap((list) =>
        list.items
          .filter((item) => {
            const matchesQuery = list.text(item).toLocaleLowerCase("es").includes(needle)
            const itemGroup = list.group(item)
            const matchesGroup = selectedGroups.length === 0 || (itemGroup !== null && selectedGroups.includes(itemGroup))
            return matchesQuery && matchesGroup
          })
          .map((item) => ({ list, item })),
      )

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const page = remotePage ? (controlledPage ?? 0) : Math.min(localPage, pageCount - 1)
  const pageRows = remotePage ? rows : rows.slice(page * pageSize, page * pageSize + pageSize)
  const canGoBack = remotePage ? Boolean(hasPrevious) : page > 0
  const canGoForward = remotePage ? Boolean(hasNext) : page < pageCount - 1
  const catalogEmpty = sourceLists.every((list) => list.items.length === 0)

  function changePage(next: number) {
    if (remotePage) onPageChange?.(next)
    else setLocalPage(next)
  }

  function changeQuery(value: string) {
    setLocalQuery(value)
    onQueryChange?.(value)
  }

  function changeLists(ids: string[]) {
    setLocalIds(ids)
    onActiveChange?.(ids)
  }

  function changeGroups(ids: string[]) {
    setLocalGroup(ids)
    onGroupChange?.(ids)
  }

  const clearList = lists.find((list) => list.id === listClearId)
  const listOptions = [
    clearList
      ? { id: clearList.id, label: clearList.label }
      : { id: listClearId, label: "Todos" },
    ...lists
      .filter((list) => list.id !== listClearId)
      .map((list) => ({
        id: list.id,
        label: showCount ? `${list.label} ${list.items.length}` : list.label,
      })),
  ]
  const groupOptions = [{ id: "todos", label: "Todos" }, ...groupNames.map((item) => ({ id: item, label: item }))]
  const chunks = chunkRows(pageRows)

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
        <FilterCombobox
          label={listLabel}
          items={listOptions}
          value={selectedIds}
          clearId={listClearId}
          onChange={changeLists}
        />
        {groupNames.length > 0 ? (
          <FilterCombobox
            label={groupLabel}
            items={groupOptions}
            value={selectedGroups}
            onChange={changeGroups}
          />
        ) : null}
      </div>

      <InputGroup className="h-11 rounded-full">
        <InputGroupAddon>
          <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
          <span className="sr-only">Buscar</span>
        </InputGroupAddon>
        <InputGroupInput
          value={query}
          onChange={(event) => changeQuery(event.target.value)}
          placeholder={placeholder}
        />
      </InputGroup>

      {loading && rows.length === 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : catalogEmpty ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyDescription>{sourceLists[0]?.empty ?? "Nada publicado."}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : rows.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyDescription>Nada coincide con esa búsqueda.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ScrollArea key={`${selectionKey}-${page}`} viewportClassName="h-auto max-h-[min(32rem,70vh)]">
          <div className="flex flex-col gap-4">
            {chunks.map((chunk) => (
              <div key={chunk.list.id}>{chunk.list.render(chunk.items)}</div>
            ))}
          </div>
        </ScrollArea>
      )}
      {rows.length > 0 && (canGoBack || canGoForward || pageCount > 1) ? (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                text="Anterior"
                href="#lista"
                aria-label="Página anterior"
                aria-disabled={!canGoBack || loading}
                className={!canGoBack || loading ? "pointer-events-none opacity-40" : undefined}
                onClick={(event) => {
                  event.preventDefault()
                  if (canGoBack && !loading) changePage(page - 1)
                }}
              />
            </PaginationItem>
            {remotePage ? (
              <PaginationItem>
                <span className="px-2 text-sm text-muted-foreground">Página {page + 1}</span>
              </PaginationItem>
            ) : (
              Array.from({ length: pageCount }, (_, index) => (
                <PaginationItem key={index}>
                  <PaginationLink
                    href="#lista"
                    isActive={index === page}
                    aria-label={`Página ${index + 1}`}
                    onClick={(event) => {
                      event.preventDefault()
                      changePage(index)
                    }}
                  >
                    {index + 1}
                  </PaginationLink>
                </PaginationItem>
              ))
            )}
            <PaginationItem>
              <PaginationNext
                text="Siguiente"
                href="#lista"
                aria-label="Página siguiente"
                aria-disabled={!canGoForward || loading}
                className={!canGoForward || loading ? "pointer-events-none opacity-40" : undefined}
                onClick={(event) => {
                  event.preventDefault()
                  if (canGoForward && !loading) changePage(page + 1)
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
      {footer}
    </div>
  )
}

function chunkRows<T>(rows: { list: ListFilterEntry<T>; item: T }[]) {
  const chunks: { list: ListFilterEntry<T>; items: T[] }[] = []
  for (const row of rows) {
    const last = chunks.at(-1)
    if (last && last.list.id === row.list.id) last.items.push(row.item)
    else chunks.push({ list: row.list, items: [row.item] })
  }
  return chunks
}

type FilterOption = { id: string; label: string }

export function FilterCombobox({
  label,
  items,
  value,
  onChange,
  clearId = "todos",
  emptyLabel = "Todos",
}: {
  label: string
  items: FilterOption[]
  value: string[]
  onChange: (ids: string[]) => void
  clearId?: string
  emptyLabel?: string
}) {
  const anchor = useComboboxAnchor()
  const selected = items.filter((item) => value.includes(item.id) && item.id !== clearId)

  return (
    <Combobox
      multiple
      items={items}
      value={selected}
      isItemEqualToValue={(item, selectedItem) => item.id === selectedItem.id}
      itemToStringLabel={(item) => item.label}
      itemToStringValue={(item) => item.id}
      onValueChange={(next) => {
        if (next.some((item) => item.id === clearId)) {
          onChange([])
          return
        }
        onChange(next.map((item) => item.id))
      }}
    >
      <ComboboxChips ref={anchor} className="h-auto min-h-11 w-full rounded-xl">
        <ComboboxValue>
          {(values: FilterOption[]) => (
            <>
              {values.map((item) => (
                <ComboboxChip key={item.id}>{item.label}</ComboboxChip>
              ))}
              <ComboboxChipsInput
                aria-label={label}
                placeholder={values.length === 0 ? `${label} · ${emptyLabel}` : ""}
              />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>Nada coincide.</ComboboxEmpty>
        <ComboboxList>
          {(item) => (
            <ComboboxItem key={item.id} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
