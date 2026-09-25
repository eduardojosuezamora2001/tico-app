# Equipo del negocio

La tabla `business_users` ya existía. Esta rebanada expone el alta del equipo. El dueño lo crea el trigger al publicar el negocio y no se puede quitar ni reemplazar desde aquí.

## API

Todas las rutas exigen sesión. El id es el del negocio.

| Método | Ruta | Qué hace |
| ------ | ---- | -------- |
| GET | `/api/businesses/:id/team` | Miembros que RLS deja ver |
| POST | `/api/businesses/:id/team` | `{ email, role, permissions }`. `role` es `manager` o `employee` |
| PATCH | `/api/businesses/:id/team/:memberId` | Cambia rol o permisos, nunca a dueño |
| DELETE | `/api/businesses/:id/team/:memberId` | Quita a quien no es dueño |

El alta inserta con el cliente del usuario, así que RLS exige ser dueño o tener `employees:manage`. El correo se resuelve en el servidor porque, antes de entrar al equipo, RLS no deja leer el perfil de esa persona. Si no hay cuenta con ese correo, responde 404.

La pantalla está en el panel del negocio, sección Equipo.
