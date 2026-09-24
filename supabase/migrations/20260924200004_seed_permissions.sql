-- ============================================================================
-- Plaza de Comercios Digital - Migracion 4/4
-- Catalogo de permisos. Debe coincidir con PERMISSION_DEFINITIONS en
-- packages/shared/src/constants.ts (verificado por packages/shared tests).
-- Formato de cada fila: ('modulo:accion', 'modulo', 'accion', 'descripcion')
-- ============================================================================

insert into public.permissions (name, module, action, description)
values
  -- Productos
  ('products:view', 'products', 'view', 'Ver productos'),
  ('products:create', 'products', 'create', 'Crear productos'),
  ('products:edit_own', 'products', 'edit_own', 'Editar los propios productos'),
  ('products:edit_all', 'products', 'edit_all', 'Editar todos productos'),
  ('products:delete_own', 'products', 'delete_own', 'Eliminar los propios productos'),
  ('products:delete_all', 'products', 'delete_all', 'Eliminar todos productos'),
  -- Servicios
  ('services:view', 'services', 'view', 'Ver servicios'),
  ('services:create', 'services', 'create', 'Crear servicios'),
  ('services:edit_own', 'services', 'edit_own', 'Editar los propios servicios'),
  ('services:edit_all', 'services', 'edit_all', 'Editar todos servicios'),
  ('services:delete_own', 'services', 'delete_own', 'Eliminar los propios servicios'),
  ('services:delete_all', 'services', 'delete_all', 'Eliminar todos servicios'),
  -- Menu digital
  ('menu:view', 'menu', 'view', 'Ver menu digital'),
  ('menu:create', 'menu', 'create', 'Crear menu digital'),
  ('menu:edit_own', 'menu', 'edit_own', 'Editar los propios menu digital'),
  ('menu:edit_all', 'menu', 'edit_all', 'Editar todos menu digital'),
  ('menu:delete_own', 'menu', 'delete_own', 'Eliminar los propios menu digital'),
  ('menu:delete_all', 'menu', 'delete_all', 'Eliminar todos menu digital'),
  -- Citas
  ('appointments:view', 'appointments', 'view', 'Ver citas'),
  ('appointments:create', 'appointments', 'create', 'Crear citas'),
  ('appointments:edit_own', 'appointments', 'edit_own', 'Editar los propios citas'),
  ('appointments:edit_all', 'appointments', 'edit_all', 'Editar todos citas'),
  ('appointments:delete_own', 'appointments', 'delete_own', 'Eliminar los propios citas'),
  ('appointments:delete_all', 'appointments', 'delete_all', 'Eliminar todos citas'),
  -- Negocio y equipo
  ('business:edit', 'business', 'edit', 'Editar el perfil del negocio (datos, logo, banner, ubicacion)'),
  ('employees:manage', 'employees', 'manage', 'Invitar, editar y remover empleados y sus permisos'),
  ('chat:view_all', 'chat', 'view_all', 'Ver todas las conversaciones del negocio'),
  ('audit:view', 'audit', 'view', 'Ver la bitacora de cambios del negocio'),
  ('gallery:upload', 'gallery', 'upload', 'Subir imagenes a la galeria del negocio'),
  ('events:manage', 'events', 'manage', 'Crear, editar y eliminar eventos'),
  ('hours:edit', 'hours', 'edit', 'Editar horarios y excepciones del negocio'),
  ('reviews:respond', 'reviews', 'respond', 'Responder resenas de clientes')
on conflict (name) do update
  set module = excluded.module,
      action = excluded.action,
      description = excluded.description;
