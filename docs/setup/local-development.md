# Desarrollo local

## 1. Requisitos

- Node.js >= 20 (probado con 24).
- pnpm 12: `corepack enable` o `npm i -g pnpm@12`.
- Acceso al proyecto Supabase `tico-app` (`ceafdnvkfziidtgxflyw`, region `us-east-1`).
- (Opcional) Docker si quieres correr el stack de Supabase en local con `supabase start`.

## 2. Instalar dependencias

```bash
pnpm install
```

Esto instala tambien el Supabase CLI como dependencia de desarrollo
(`pnpm exec supabase --version`).

## 3. Variables de entorno

Hay un unico `.env` en la raiz del monorepo que usan `apps/api` (via `dotenv`) y
`apps/web` (via `envDir` de Vite).

```bash
cp .env.example .env
```

Completa desde el dashboard de Supabase (Project Settings > API Keys):

| Variable                        | Valor                                                    |
| ------------------------------- | -------------------------------------------------------- |
| `SUPABASE_URL`                  | `https://ceafdnvkfziidtgxflyw.supabase.co`               |
| `SUPABASE_PUBLISHABLE_KEY`      | Publishable key (`sb_publishable_...`) o anon key legada |
| `SUPABASE_SERVICE_ROLE_KEY`     | Secret / service_role key. Solo backend, nunca al cliente |
| `VITE_SUPABASE_URL`             | Igual a `SUPABASE_URL`                                    |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Igual a `SUPABASE_PUBLISHABLE_KEY`                        |
| `VITE_API_URL`                  | `http://localhost:3001`                                   |
| `PORT`                          | `3001`                                                    |

Las variables de DeepSeek, Google Maps y Redis se llenan en sus fases.

## 4. Levantar el entorno

```bash
pnpm dev
```

Turborepo construye `packages/shared` primero y luego arranca:

- Web: <http://localhost:5173>
- API: <http://localhost:3001/api> (health: `/api/health`)

Para levantar solo una app: `pnpm --filter web dev` o `pnpm --filter api dev`.

## 5. Verificar

```bash
pnpm typecheck   # tipos en todos los paquetes
pnpm test        # tests de shared (schemas, permisos vs seed) y api (health)
pnpm build       # build completo
```

## 6. Base de datos

El schema esta versionado en `supabase/migrations/` y ya aplicado al proyecto remoto.

### Ver estado

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref ceafdnvkfziidtgxflyw
pnpm exec supabase migration list
```

### Nueva migracion

```bash
pnpm exec supabase migration new <nombre_en_snake_case>
# editar supabase/migrations/<timestamp>_<nombre>.sql
pnpm db:push                # aplica al proyecto vinculado
pnpm db:types               # regenera packages/shared/src/database.types.ts
```

Alternativa sin CLI: aplicar el mismo SQL con el MCP de Supabase (`apply_migration`)
usando el mismo nombre que el archivo, y regenerar tipos con `generate_typescript_types`.

Tras cualquier cambio de schema o politica, revisa los advisors de seguridad y
performance (`supabase db advisors` o MCP `get_advisors`).

### Stack local (opcional)

```bash
pnpm exec supabase start     # requiere Docker
pnpm exec supabase db reset  # aplica migrations/ en local
```

## 7. Autenticacion

Ver [supabase-auth.md](./supabase-auth.md) para email/contrasena, Google OAuth y URLs de
redireccion.

## 8. Convenciones

- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`...).
- Todo endpoint valida entrada con Zod (`@workspace/shared` o local).
- Tipos compartidos solo en `packages/shared`; nunca duplicarlos en las apps.
- Cambios de schema siempre con migracion y documentados en `docs/specs/database.md`.
