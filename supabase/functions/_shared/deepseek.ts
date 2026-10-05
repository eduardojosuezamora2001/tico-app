const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool"
  content: string | null
  tool_call_id?: string
  name?: string
  tool_calls?: ToolCall[]
}

function toDeepseekMessages(messages: ChatMessage[]) {
  return messages.map((msg) => {
    if (msg.role === "tool") {
      return {
        role: "tool" as const,
        tool_call_id: msg.tool_call_id!,
        content: msg.content ?? "",
        ...(msg.name ? { name: msg.name } : {}),
      }
    }
    if (msg.role === "assistant" && msg.tool_calls?.length) {
      return {
        role: "assistant" as const,
        content: msg.content ?? null,
        tool_calls: msg.tool_calls,
      }
    }
    return { role: msg.role, content: msg.content ?? "" }
  })
}

export type ToolDef = {
  type: "function"
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export type ToolCall = {
  id: string
  type: "function"
  function: { name: string; arguments: string }
}

export async function deepseekChat(params: {
  messages: ChatMessage[]
  tools?: ToolDef[]
  toolChoice?: "auto" | "none" | "required"
  temperature?: number
}): Promise<{
  content: string | null
  toolCalls: ToolCall[]
}> {
  const key = Deno.env.get("DEEPSEEK_API_KEY")
  if (!key) throw new Error("Missing DEEPSEEK_API_KEY")

  const body: Record<string, unknown> = {
    model: "deepseek-chat",
    messages: toDeepseekMessages(params.messages),
    temperature: params.temperature ?? 0.2,
  }
  if (params.tools?.length) {
    body.tools = params.tools
    body.tool_choice = params.toolChoice ?? "auto"
  }

  const res = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`DeepSeek failed: ${res.status} ${err}`)
  }

  const payload = (await res.json()) as {
    choices: {
      message: {
        content: string | null
        tool_calls?: ToolCall[]
      }
    }[]
  }

  const message = payload.choices[0]?.message
  return {
    content: message?.content ?? null,
    toolCalls: message?.tool_calls ?? [],
  }
}
