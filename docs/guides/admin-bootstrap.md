# Super admin (bootstrap)

No hay registro público de admin. El alta siempre crea `users.role = 'client'`.
El primer super admin se promueve a mano en la base.

## Promover un usuario existente

1. Regístrate o inicia sesión con la cuenta que será admin (email/password o Google).
2. En el SQL Editor de Supabase (o `psql` local):

```sql
update public.users
set role = 'admin'
where email = 'tu-email@ejemplo.com';
```

3. Cierra sesión y vuelve a entrar (o recarga) para que el frontend lea el rol nuevo.
4. Abre `/admin`. Solo `users.role = 'admin'` entra; el resto redirige a `/`.

## Qué controla el super admin

- **Catálogo global** (`/admin/catalogo`):
  - Rubros / subrubros de negocio (`marketplace_business_categories`)
  - Tags / subtags de producto marketplace (`catalog_tags` con `scope = marketplace`)
- Los comercios **eligen** categorías y tags; **no** pueden crearlos.

## API

Todas bajo `/api/admin/*`, con Bearer JWT y `requireAdmin`:

| Método | Ruta | Uso |
| ------ | ---- | --- |
| GET | `/admin/stats` | Contadores del resumen |
| GET/POST | `/admin/business-categories` | Listar / crear rubros |
| PATCH/DELETE | `/admin/business-categories/:id` | Editar / desactivar (`is_active = false`) |
| GET/POST | `/admin/marketplace-tags` | Listar / crear tags |
| PATCH/DELETE | `/admin/marketplace-tags/:id` | Editar / desactivar |

`DELETE` es soft-delete (desactiva). Reactiva con `PATCH { "isActive": true }`.

## Seguridad

- `private.is_admin()` ya existe para RLS.
- Las mutaciones del panel van por la API con `service_role` tras verificar el rol.
- No expongas un endpoint de “hacer admin” sin control adicional.
