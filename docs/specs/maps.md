# Planeamiento — Direcciones internacionales para TuPlaza

## Objetivo
Diseñar un sistema de direcciones internacional que no dependa de una estructura fija como `país → provincia → cantón → distrito`.

Debe soportar estructuras distintas por país:
- Costa Rica: Provincia → Cantón → Distrito
- Colombia: Departamento → Municipio
- México: Estado → Municipio/Alcaldía
- Otros países: cualquier cantidad y tipo de niveles administrativos.

## Principio principal
No crear columnas específicas como `province`, `canton` o `district` en `addresses`.

Usar un árbol genérico:

```text
Country
  └── Administrative Division
        └── Administrative Division
              └── ...
```

La relación entre divisiones se representa mediante `parent_id`.

---

## Modelo de datos

### countries

```text
id
code
name
native_name
phone_code
currency_code
default_language
is_active
created_at
updated_at
```

`code` debe ser único y utilizar ISO 3166-1 alpha-2 cuando corresponda.

### administrative_divisions

```text
id
country_id
parent_id
name
type
level
code
is_active
created_at
updated_at
```

Requisitos:
- `country_id` referencia el país.
- `parent_id` referencia la división superior.
- Soportar cualquier cantidad de niveles.
- `type` puede ser `province`, `state`, `department`, `municipality`, `canton`, `district`, `colony`, etc.
- No asumir los mismos tipos para todos los países.
- Agregar índices.
- Evitar ciclos e inconsistencias.

### addresses

```text
id
country_id
administrative_division_id
postal_code
address_line_1
address_line_2
reference
latitude
longitude
formatted_address
place_id
created_at
updated_at
```

`postal_code`, `address_line_2`, `reference`, coordenadas y `place_id` pueden ser opcionales.

### businesses

Relacionar el negocio con una dirección:

```text
businesses.address_id → addresses.id
```

Un usuario puede tener múltiples negocios y cada negocio puede tener su propia dirección.

---

## PostGIS

Preparar PostgreSQL + PostGIS para búsquedas geográficas.

La ubicación debe permitir:
- Buscar negocios cercanos.
- Buscar dentro de un radio.
- Ordenar por distancia.
- Mostrar negocios en mapas.

Preferir `geography(Point, 4326)` para búsquedas por distancia y agregar índice espacial.

---

## Backend

Crear/adaptar endpoints:

```http
GET /api/countries
GET /api/countries/:countryCode/administrative-levels
GET /api/administrative-divisions?country=CR&parentId=...
POST /api/addresses
GET /api/addresses/:id
PATCH /api/addresses/:id
DELETE /api/addresses/:id
```

Las rutas deben seguir las convenciones actuales del proyecto.

Si no existe `parentId`, devolver las divisiones raíz del país.

---

## Configuración de niveles

El frontend debe obtener dinámicamente cómo se llaman los niveles.

Ejemplo Costa Rica:

```json
{
  "country": "CR",
  "divisions": [
    { "level": 1, "type": "province", "label": "Provincia" },
    { "level": 2, "type": "canton", "label": "Cantón" },
    { "level": 3, "type": "district", "label": "Distrito" }
  ]
}
```

Ejemplo Colombia:

```json
{
  "country": "CO",
  "divisions": [
    { "level": 1, "type": "department", "label": "Departamento" },
    { "level": 2, "type": "municipality", "label": "Municipio" }
  ]
}
```

Ejemplo México:

```json
{
  "country": "MX",
  "divisions": [
    { "level": 1, "type": "state", "label": "Estado" },
    { "level": 2, "type": "municipality", "label": "Municipio" }
  ]
}
```

No hardcodear estos labels dentro del componente React.

---

## Frontend

Crear un componente reutilizable:

```text
InternationalAddressForm
```

Flujo:

```text
País
 ↓
Nivel administrativo 1
 ↓
Nivel administrativo 2
 ↓
Nivel administrativo 3...
 ↓
Dirección
 ↓
Código postal
 ↓
Referencia
 ↓
Ubicación en mapa
```

Los niveles administrativos deben renderizarse dinámicamente según la configuración del país.

No implementar componentes rígidos como:

```tsx
<ProvinceSelect />
<CantonSelect />
<DistrictSelect />
```

como solución universal.

---

## Geocodificación

Crear una abstracción independiente del proveedor:

```ts
interface GeocodingProvider {
  geocode(address: string): Promise<GeocodingResult>
  reverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<GeocodingResult>
}
```

Y un `GeocodingService`.

Resultado esperado:

```ts
interface GeocodingResult {
  formattedAddress: string
  latitude: number
  longitude: number
  countryCode?: string
  postalCode?: string
  placeId?: string
  administrativeDivisions?: Array<{
    name: string
    type?: string
    level?: number
    code?: string
  }>
}
```

Así se podrá cambiar de proveedor sin modificar el dominio.

---

## Seeds

Preparar seeds iniciales para:
- Costa Rica
- Colombia
- México

La estructura debe permitir agregar países posteriormente sin modificar el esquema.

---

## Validaciones

Usar Zod o el sistema existente.

Validar:
- País existente.
- División perteneciente al país.
- División hija coherente con `parent_id`.
- `latitude` entre -90 y 90.
- `longitude` entre -180 y 180.
- Código postal opcional.
- Dirección principal válida.
- Relaciones administrativas consistentes.

---

## Seguridad

Un usuario solo debe poder crear/modificar/eliminar direcciones de negocios que tenga autorización para administrar.

Las operaciones administrativas sobre países y divisiones deben restringirse según el sistema de roles existente.

---

## Búsqueda por proximidad

Preparar una función equivalente a:

```text
findBusinessesNearby(latitude, longitude, radius)
```

y una ruta compatible con el proyecto, por ejemplo:

```http
GET /api/businesses/nearby?lat=9.93&lng=-84.08&radius=5000
```

El radio se expresa en metros.

---

## Fases

### Fase 1
- Migraciones.
- Countries.
- Administrative divisions.
- Addresses.
- Relación con businesses.
- PostGIS.
- Índices.

### Fase 2
- Seeds de Costa Rica, Colombia y México.
- Validación de jerarquías.

### Fase 3
- API Hono.
- Servicios.
- Validaciones.
- Autorización.

### Fase 4
- `InternationalAddressForm`.
- Hooks/cliente API.
- Selección jerárquica dinámica.

### Fase 5
- Geocoding.
- Reverse geocoding.
- Mapa.
- Coordenadas.

### Fase 6
- Búsqueda por radio.
- Ordenamiento por distancia.
- Filtros geográficos.

### Fase 7
- Tests.
- Typecheck.
- Lint.
- Documentación.

---

## Reglas

### No hacer

```ts
interface Address {
  country: string
  province: string
  canton: string
  district: string
}
```

### Sí hacer

```ts
interface Address {
  countryId: string
  administrativeDivisionId?: string
  postalCode?: string
  addressLine1: string
  addressLine2?: string
  latitude?: number
  longitude?: number
}
```

La solución debe ser internacional, extensible, compatible con PostGIS y desacoplada de cualquier proveedor de geocodificación.
