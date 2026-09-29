export function OrderTabBadge({
  count,
  active,
  highlight,
}: {
  count: number
  active?: boolean
  highlight?: boolean
}) {
  if (count <= 0) return null
  return (
    <span
      className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
        active
          ? "bg-primary/15 text-primary"
          : highlight
            ? "bg-amber-500/20 text-amber-900 dark:text-amber-100"
            : "bg-primary text-primary-foreground"
      }`}
    >
      {count > 99 ? "99+" : count}
    </span>
  )
}
