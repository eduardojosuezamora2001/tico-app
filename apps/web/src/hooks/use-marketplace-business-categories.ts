import { useEffect, useState } from "react"
import type { MarketplaceBusinessCategory } from "@workspace/shared"

import { listMarketplaceBusinessCategories } from "@/services/catalog.service"

export function useMarketplaceBusinessCategories() {
  const [categories, setCategories] = useState<MarketplaceBusinessCategory[] | null>(null)

  useEffect(() => {
    let cancelled = false
    void listMarketplaceBusinessCategories()
      .then((rows) => {
        if (!cancelled) setCategories(rows)
      })
      .catch(() => {
        if (!cancelled) setCategories([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  return categories
}
