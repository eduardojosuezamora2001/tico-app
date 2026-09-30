-- Funcionalidades extra por módulo + código de retiro en pedidos.

alter table public.business_modules
  add column if not exists settings jsonb not null default '{}'::jsonb;

comment on column public.business_modules.settings is
  'Opciones activables por módulo (p. ej. products.pickup_otp). Validadas en la API.';

alter table public.orders
  add column if not exists pickup_code text
    check (pickup_code is null or pickup_code ~ '^\d{4}$'),
  add column if not exists pickup_code_hash text,
  add column if not exists pickup_code_issued_at timestamptz,
  add column if not exists pickup_verify_attempts smallint not null default 0;

comment on column public.orders.pickup_code is
  'Código de retiro (solo lectura vía API para el cliente). Se borra al entregar.';
comment on column public.orders.pickup_code_hash is
  'Hash del código de retiro; verificación en servidor.';
comment on column public.orders.pickup_code_issued_at is
  'Momento en que se emitió el código de retiro.';
comment on column public.orders.pickup_verify_attempts is
  'Intentos fallidos de verificación de código (reset al éxito o nueva emisión).';
