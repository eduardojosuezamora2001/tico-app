# Equipo del negocio

La tabla `business_users` ya existía. Esta rebanada expone el alta del equipo. El dueño lo crea el trigger al publicar el negocio y no se puede quitar ni reemplazar desde aquí.

## Roles en el negocio

| Rol | Significado |
| --- | ----------- |
| `owner` | Acceso completo implícito (`is_business_owner` / co-dueño). No usa el array de permisos en la UI. |
| `manager` | Encargado. Puede recibir cualquier permiso del catálogo (techo = catálogo completo). |
| `employee` | Empleado. Techo operativo del catálogo + chat/galería/reseñas. **employee ⊆ manager**. |

## Techo de permisos

Fuente de verdad: `BUSINESS_ROLE_PERMISSION_CEILINGS` en `packages/shared/src/constants.ts`.

**Empleado** puede recibir:

- Por módulo (`products`, `services`, `menu`, `appointments`): todas las acciones (`view`, `create`, `edit_own`, `edit_all`, `delete_own`, `delete_all`)
- Extras: `chat:view_all`, `gallery:upload`, `reviews:respond`

**Empleado no puede** (sí puede el encargado): `business:edit`, `employees:manage`, `audit:view`, `events:manage`, `hours:edit`.

En la UI, “Editar y eliminar” activa el grupo completo (propio y todos) tanto para empleado como para encargado.

Validación:

1. Zod (`AddBusinessUserSchema` / `UpdateBusinessUserSchema` cuando viene rol + permisos)
2. API (`clampPermissionsToRoleCeiling` al crear; al bajar de rol se recorta; al enviar permisos fuera de techo → 400)
3. UI (`team-panel`): checkboxes fuera del techo deshabilitados

## API

Todas las rutas exigen sesión. El id es el del negocio.

| Método | Ruta | Qué hace |
| ------ | ---- | -------- |
| GET | `/api/businesses/:id/team` | Miembros que RLS deja ver |
| POST | `/api/businesses/:id/team` | `{ email, role, permissions }`. `role` es `manager` o `employee` |
| PATCH | `/api/businesses/:id/team/:memberId` | Cambia rol o permisos, nunca a dueño |
| DELETE | `/api/businesses/:id/team/:memberId` | Quita a quien no es dueño |

El alta inserta con el cliente del usuario, así que RLS exige ser dueño o tener `employees:manage`. El correo se resuelve en el servidor porque, antes de entrar al equipo, RLS no deja leer el perfil de esa persona. Si no hay cuenta con ese correo, responde 404.

La pantalla está en el panel del negocio, sección **Equipo** (ahí se invita, se elige rol y se asignan permisos). Ya no hay pestaña aparte de Permisos.
