import { CheckmarkCircle02Icon, ShoppingBag01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { formatOrderStepTimestamp, type OrderStep } from "@/lib/messages-ui"

export function OrderStepTimeline({
  steps,
  variant = "detailed",
}: {
  steps: OrderStep[]
  variant?: "compact" | "detailed"
}) {
  if (variant === "compact") {
    return (
      <ol className="flex flex-col gap-2">
        {steps.map((step) => (
          <li key={step.id} className="flex items-start justify-between gap-3 text-sm">
            <span className={stepLabelClass(step.state)}>{step.label}</span>
            <StepTimestamp step={step} />
          </li>
        ))}
      </ol>
    )
  }

  return (
    <ol className="flex flex-col gap-3">
      {steps.map((step) => (
        <li key={step.id} className="flex gap-3">
          <StepIcon state={step.state} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <p className={`text-sm ${step.state === "current" ? "font-semibold text-primary" : "text-foreground"}`}>
                {step.label}
              </p>
              <StepTimestamp step={step} className="text-end" />
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}

function StepTimestamp({ step, className }: { step: OrderStep; className?: string }) {
  if (!step.at || step.state === "pending") return null
  return (
    <time
      dateTime={step.at}
      className={`shrink-0 text-xs text-muted-foreground tabular-nums ${className ?? ""}`}
    >
      {formatOrderStepTimestamp(step.at)}
    </time>
  )
}

function stepLabelClass(state: OrderStep["state"]) {
  if (state === "done") return "text-emerald-600 dark:text-emerald-400"
  if (state === "current") return "font-medium text-primary"
  return "text-muted-foreground"
}

function StepIcon({ state }: { state: OrderStep["state"] }) {
  if (state === "done") {
    return (
      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
        <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-3.5" />
      </span>
    )
  }
  if (state === "current") {
    return (
      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
        <HugeiconsIcon icon={ShoppingBag01Icon} strokeWidth={2} className="size-3.5" />
      </span>
    )
  }
  return <span className="mt-0.5 size-5 shrink-0 rounded-full border-2 border-muted" />
}
