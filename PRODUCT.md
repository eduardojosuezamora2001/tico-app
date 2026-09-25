# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

El usuario principal es el cliente: busca un comercio y quiere ver qué ofrece. Entra desde el celular o el escritorio, a menudo con una zona en mente, y elige un negocio para contactarlo.

El comerciante es el segundo usuario. Registra su negocio y publica productos, servicios y menú para que esa página exista. No es quien manda la primera pantalla.

## Product Purpose

TicoApp es un directorio de comercios locales. El cliente descubre negocios y entra a la página de uno. El éxito es que encuentre un comercio y sepa qué ofrece y cómo contactarlo, sin salir a comparar precios.

## Positioning

Cada negocio controla su catálogo y sus precios. El cliente ve la oferta de un solo negocio a la vez. Comparar precios entre tiendas no es una función: ni en esta fase ni como evolución del producto.

## Operating Context

- Interfaz y contenido en español.
- El contacto con el comercio es por WhatsApp.
- El público asociado al nombre es de Costa Rica.
- Web responsive. No hay app nativa.

## Capabilities and Constraints

- Fase 2: login y registro, alta y edición del negocio, módulos Productos, Servicios y Menú, directorio y página pública del negocio.
- Fuera de esta fase: chat, empleados, citas, eventos, reseñas, traducción, mapa de Google y panel de administración.
- Los datos de negocio pasan por la API (Hono). Supabase Auth y la subida de imágenes usan el cliente de Supabase. RLS sigue aplicando.
- El repositorio se llama `tico-app`. El nombre público es TicoApp.

## Brand Commitments

Nombre público: **TicoApp**. Reemplaza a "Plaza de Comercios Digital" en la interfaz. No hay logo, paleta ni voz visual confirmados.

## Evidence on Hand

- Planeamiento: `docs/planning/Planeamiento_Arquitectonico_Plaza_Comercios.pdf` y `docs/planning/agents.md`.
- Modelo de datos: `docs/specs/database.md`.
- No hay testimonios, fotos de comercios reales ni logo. No inventarlos.

## Product Principles

- El cliente encuentra un negocio; no una tabla de precios.
- La página del negocio es el producto. El panel del comerciante existe para llenarla.
- Un negocio, una oferta. Los precios de otro local no aparecen al lado.
- Español claro, contacto por WhatsApp, usable en el celular.
