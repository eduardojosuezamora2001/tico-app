import {
  BankIcon,
  Cash01Icon,
  CreditCardIcon,
  MoneySend01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  PAYMENT_METHOD_KEYS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_SHORT_LABELS,
  type Business,
  type PaymentMethodKey,
} from "@workspace/shared"

import { Checkbox } from "@workspace/ui/components/checkbox"

const PAYMENT_METHOD_ICONS: Record<PaymentMethodKey, IconSvgElement> = {
  paymentSinpe: MoneySend01Icon,
  paymentCash: Cash01Icon,
  paymentCard: CreditCardIcon,
  paymentIban: BankIcon,
}

export function PaymentMethodIcon({
  method,
  className = "size-5",
}: {
  method: PaymentMethodKey
  className?: string
}) {
  return (
    <HugeiconsIcon
      icon={PAYMENT_METHOD_ICONS[method]}
      strokeWidth={2}
      className={className}
      aria-hidden
    />
  )
}

export function PaymentMethodOptions<T extends Record<PaymentMethodKey, boolean>>({
  value,
  onChange,
}: {
  value: T
  onChange: (key: PaymentMethodKey, checked: boolean) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {PAYMENT_METHOD_KEYS.map((key) => (
        <label
          key={key}
          className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <PaymentMethodIcon method={key} className="size-5" />
          </span>
          <span className="min-w-0 flex-1 font-medium">{PAYMENT_METHOD_LABELS[key]}</span>
          <Checkbox
            checked={value[key]}
            onCheckedChange={(checked) => onChange(key, Boolean(checked))}
            aria-label={PAYMENT_METHOD_LABELS[key]}
          />
        </label>
      ))}
    </div>
  )
}

export function PaymentMethodBadgeList({ business }: { business: Business }) {
  const active = PAYMENT_METHOD_KEYS.filter((key) => business[key])

  if (active.length === 0) return null

  return (
    <ul className="flex flex-wrap gap-2">
      {active.map((key) => (
        <li
          key={key}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-sm"
        >
          <PaymentMethodIcon method={key} className="size-4 text-primary" />
          <span>{PAYMENT_METHOD_SHORT_LABELS[key]}</span>
        </li>
      ))}
    </ul>
  )
}
