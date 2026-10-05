export type ParsedDsmlCall = {
  name: string
  args: Record<string, unknown>
}

export function parseDsmlToolCalls(text: string): {
  cleanText: string
  calls: ParsedDsmlCall[]
} {
  if (!/DSML|invoke\s+name\s*=/i.test(text)) {
    return { cleanText: text, calls: [] }
  }

  const calls: ParsedDsmlCall[] = []
  const invokeRe = /invoke\s+name="([^"]+)"[^>]*>([\s\S]*?)(?:<\/?[^>]*invoke>|$)/gi
  let invokeMatch: RegExpExecArray | null
  while ((invokeMatch = invokeRe.exec(text))) {
    const name = invokeMatch[1]!
    const body = invokeMatch[2] ?? ""
    const args: Record<string, unknown> = {}
    const paramRe = /parameter\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/?[^>]*parameter>/gi
    let paramMatch: RegExpExecArray | null
    while ((paramMatch = paramRe.exec(body))) {
      args[paramMatch[1]!] = paramMatch[2]?.trim() ?? ""
    }
    calls.push({ name, args })
  }

  const cleanText = text
    .replace(/<\s*[^>]*DSML[^>]*>[\s\S]*?(<\/[^>]*DSML[^>]*>|$)/gi, "")
    .replace(/<\s*[^>]*DSML[\s\S]*$/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim()

  return { cleanText, calls }
}

export function dsmlCallsToToolCalls(calls: ParsedDsmlCall[], idPrefix: string) {
  return calls.map((call, index) => ({
    id: `${idPrefix}_${index}`,
    type: "function" as const,
    function: {
      name: call.name,
      arguments: JSON.stringify(call.args),
    },
  }))
}

export function isCatalogQuestion(message: string) {
  return (
    /\b(productos?|servicios?|cat[aá]logos?|men[uú]|platos?|precios?)\b/i.test(message) &&
    /\b(en|de|del|negocio|local|comercio)\b/i.test(message)
  )
}

export function isBusinessCountQuestion(message: string) {
  return (
    /\b(cu[aá]ntos?|n[uú]mero|total)\b/i.test(message) &&
    /\b(negocios?|comercios?|locales?|tiendas?)\b/i.test(message)
  )
}

export function needsRequiredTool(message: string) {
  return isCatalogQuestion(message) || isBusinessCountQuestion(message)
}
