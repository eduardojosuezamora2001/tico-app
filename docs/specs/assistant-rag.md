# Asistente RAG + soporte plataforma

## Resumen

- **Asistente IA** (FAB inferior izquierdo): RAG híbrido con **pgvector** (Voyage `voyage-3-lite`, 512d) + herramientas sobre RPCs Postgres (sin SQL generado por el LLM).
- **Soporte humano**: chat usuario ↔ super admin (`/admin/soporte`).
- **Runtime**: Supabase Edge Functions (`assistant-chat`, `assistant-embed-sync`, `support-send`).

## Desarrollo local (recomendado)

El asistente en la web llama a **`POST /api/assistant/chat`** (Hono), que lee las keys del **`.env` en la raíz**:

```env
VOYAGE_API_KEY=...
DEEPSEEK_API_KEY=...
```

Reiniciá `pnpm dev` después de agregarlas. Si falta una key, la API responde con el mensaje exacto (ej. `Falta VOYAGE_API_KEY en .env`).

Aplicá la migración `20261005130000_assistant_rag_support.sql` en Supabase (`supabase db push`).

## Secretos Edge (producción / embed-sync)

Configurar en Supabase Dashboard → Edge Functions → Secrets (no usa el `.env` del repo):

| Secreto | Uso |
|--------|-----|
| `VOYAGE_API_KEY` | Embeddings (Dashboard **y** `supabase secrets set`; el `.env` local no alimenta Edge) |
| `DEEPSEEK_API_KEY` | Respuestas chat |
| `SUPABASE_URL` | Auto en Edge |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto / sync |
| `SUPABASE_ANON_KEY` | Validar JWT usuario |

Rotar keys si se expusieron en chat o commits.

## Indexación

1. Aplicar migración `20261005130000_assistant_rag_support.sql`.
2. Invocar sync (service role):

```bash
curl -X POST "$SUPABASE_URL/functions/v1/assistant-embed-sync" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit":500}'
```

Programar cron (Supabase) cada hora o tras jobs de catálogo.

## Herramientas allowlisted

| Tool | RPC / acción |
|------|----------------|
| `count_businesses_by_zone` | `assistant_count_active_businesses` (sin provincias = todo CR) |
| `business_exists` | `assistant_business_exists` |
| `list_business_catalog` | `list_business_catalog` (por UUID o nombre) |
| `search_nearby` | `find_businesses_nearby` |
| `search_businesses` | `discover_businesses_v2` |
| `escalate_to_support` | upsert `support_threads` + mensaje |

## Seguridad

- Límite de requests: `assistant_check_rate_limit` (40/h por usuario).
- Mensajes acotados (2000 asistente / 4000 soporte).
- Contexto RAG delimitado en `<context>`; system prompt fijo.
- Chunks solo de negocios activos publicados.

## Frontend

- [`AssistantMessengerFab`](../../apps/web/src/components/assistant-messenger-fab.tsx): pestañas Asistente / Soporte.
- Admin: [`/admin/soporte`](../../apps/web/src/pages/admin/soporte.tsx).

## Chat comercio

El chat negocio–cliente sigue en [`docs/specs/chat.md`](chat.md) y `FloatChat` (derecha). No mezclar con soporte plataforma.
