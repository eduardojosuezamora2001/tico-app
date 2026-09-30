export function OrderPickupCodeDisplay({ code }: { code: string }) {
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Código de retiro</p>
      <p className="mt-1 font-mono text-3xl font-bold tracking-[0.35em] text-foreground">{code}</p>
      <p className="mt-2 text-xs text-muted-foreground">Dicta este código en el mostrador para retirar tu pedido.</p>
    </div>
  )
}

export function OrderPickupCodePending() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-3">
      <p className="text-sm text-muted-foreground">
        El código de retiro aparecerá cuando el local marque tu pedido como listo para retiro.
      </p>
    </div>
  )
}
