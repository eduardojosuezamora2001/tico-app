# Direcciones internacionales

## Modelo

- `countries`: catálogo de países soportados.
- `country_administrative_levels`: metadatos de etiquetas por nivel (Provincia, Estado, Departamento…).
- `administrative_divisions`: árbol genérico con `parent_id`.
- `addresses`: dirección normalizada sin columnas fijas por país.
- `businesses.address_id`: enlace al negocio.

PostGIS guarda `addresses.location` como `geography(Point, 4326)` generada desde lat/lng.

## API

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/countries` | Países activos |
| GET | `/api/countries/:code/administrative-levels` | Niveles del país |
| GET | `/api/administrative-divisions?country=CR&parentId=...` | Raíz si omites `parentId` |
| POST | `/api/addresses` | Crear dirección |
| GET/PATCH/DELETE | `/api/addresses/:id` | CRUD |
| GET | `/api/businesses/nearby?lat=&lng=&radius=` | Proximidad en metros |

## Frontend

`InternationalAddressForm` carga países y niveles dinámicamente desde la API. No hardcodea provincias ni cantones.

## Geocodificación

El dominio usa `GeocodingProvider` + `GeocodingService`. La implementación actual es Google Maps en el backend (`GOOGLE_MAPS_API_KEY`), intercambiable sin tocar el modelo.

## Agregar un nuevo país

1. Insertar fila en `countries`.
2. Insertar filas en `country_administrative_levels` (uno por nivel, con `type` y `label`).
3. Poblar `administrative_divisions` respetando `parent_id` y `level`.
4. No cambiar el esquema ni el frontend: el formulario renderiza los niveles recibidos.

Ejemplo mínimo (un solo nivel):

```sql
insert into countries (code, name, native_name, phone_code, currency_code)
values ('PA', 'Panama', 'Panamá', '+507', 'PAB');

insert into country_administrative_levels (country_id, level, type, label)
select id, 1, 'province', 'Provincia' from countries where code = 'PA';

insert into administrative_divisions (country_id, parent_id, name, type, level, code)
select id, null, 'Panamá', 'province', 1, 'PNM' from countries where code = 'PA';
```

## Migraciones incluidas

- `20260928000000_international_addresses.sql`
- `20260928001000_address_seeds.sql` (CR, CO, MX)
- `20260928001500_backfill_addresses.sql`
- `20260928002000_search_addresses.sql`
- `20260928006100_co_departments.sql` (33 departamentos DIVIPOLA)
- `20260928006200_co_ant_municipalities.sql` (125 municipios Antioquia)
- `20260928006400_mx_co_remove_level3.sql` (MX/CO solo hasta municipio)

Colombia y México usan **2 niveles** (departamento/estado + municipio). Costa Rica mantiene 3 (provincia, cantón, distrito).
