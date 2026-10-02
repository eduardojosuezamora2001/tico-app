import { useEffect, useState } from "react"
import type { MarketplaceTag } from "@workspace/shared"

import { listMarketplaceTags } from "@/services/catalog.service"

export function useMarketplaceTags() {
  const [tags, setTags] = useState<MarketplaceTag[] | null>(null)

  useEffect(() => {
    let cancelled = false
    void listMarketplaceTags()
      .then((rows) => {
        if (!cancelled) setTags(rows)
      })
      .catch(() => {
        if (!cancelled) setTags([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  return tags
}
