# Plaza de Comercios Digital

Marketplace multi-negocio con chat en vivo, permisos granulares, modulos funcionales
(productos, servicios, menu digital, citas) y traduccion con IA.

## Stack

| Capa           | Tecnologia                                                        |
| -------------- | ----------------------------------------------------------------- |
| Frontend       | React 19 + Vite 8 + TypeScript, Tailwind v4, shadcn/ui, React Router v7, Zustand, React Hook Form + Zod |
| Backend        | Node.js 20+ + Hono, Zod, Socket.io (Fase 3), SSE (Fase 5)         |
| Base de datos  | Supabase (Postgres 17 + PostGIS), RLS, Supabase Auth              |
| Cache / chat   | Redis (Upstash) - Fase 3                                          |
| Traduccion IA  | DeepSeek - Fase 6                                                 |
| Mapas          | Google Maps - Fase 7                                              |
| Monorepo       | pnpm workspaces + Turborepo                                       |

## Estructura

```
apps/
  web/          React + Vite (frontend)
  api/          Hono + Node.js (backend)
packages/
  shared/       Tipos, schemas Zod y constantes compartidas (@workspace/shared)
  ui/           Componentes shadcn/ui (@workspace/ui)
supabase/
  config.toml   Configuracion del proyecto Supabase
  migrations/   Migraciones SQL (schema, RLS, seed)
docs/
  planning/     Planeamiento arquitectonico (PDF) y agents.md
  setup/        Guias de setup local y de Supabase Auth
  specs/        Modelo de datos y especificaciones
```

## Setup local

Requisitos: Node >= 20, pnpm 12 (`corepack enable`).

```bash
git clone <repo>
cd tico-app
pnpm install

cp .env.example .env      # y completa las credenciales de Supabase
pnpm dev                  # web en http://localhost:5173, api en http://localhost:3001/api
```

Guia completa: [docs/setup/local-development.md](docs/setup/local-development.md).

## Scripts

| Comando           | Que hace                                                    |
| ----------------- | ----------------------------------------------------------- |
| `pnpm dev`        | Levanta web + api (Turborepo, construye `shared` primero)   |
| `pnpm build`      | Compila todos los paquetes                                  |
| `pnpm typecheck`  | `tsc --noEmit` en todos los paquetes                        |
| `pnpm test`       | Vitest en `shared` y `api`                                  |
| `pnpm lint`       | ESLint (web, ui)                                            |
| `pnpm db:push`    | Aplica `supabase/migrations` al proyecto vinculado (CLI)    |
| `pnpm db:types`   | Regenera `packages/shared/src/database.types.ts`            |

## Base de datos

El schema (16 tablas, RLS, triggers y seed de permisos) vive en `supabase/migrations/`
y ya esta aplicado al proyecto Supabase `tico-app`. Documentacion del modelo:
[docs/specs/database.md](docs/specs/database.md).

## Autenticacion

Supabase Auth con email + contrasena (activo) y Google OAuth (requiere credenciales,
ver [docs/setup/supabase-auth.md](docs/setup/supabase-auth.md)). Al registrarse un usuario,
un trigger crea su perfil en `public.users` con rol `client`.

## Arquitectura y agentes

- Planeamiento: `docs/planning/Planeamiento_Arquitectonico_Plaza_Comercios.pdf`
- Agentes de desarrollo: [docs/planning/agents.md](docs/planning/agents.md)

## Componentes UI

Los componentes shadcn/ui se agregan al paquete `ui` desde la app `web`:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

y se importan como `import { Button } from "@workspace/ui/components/button"`.
