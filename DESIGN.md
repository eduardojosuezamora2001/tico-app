---
name: TicoApp
description: Directorio de comercios locales. Cada local es un puesto en la plaza.
colors:
  violet-night: "oklch(0.55 0.22 285)"
  violet-night-dark: "oklch(0.62 0.2 285)"
  violet-ink: "oklch(0.99 0.005 280)"
  paper: "oklch(0.985 0.006 280)"
  paper-card: "oklch(1 0 0)"
  ink: "oklch(0.28 0.04 285)"
  ink-muted: "oklch(0.48 0.03 285)"
  line: "oklch(0.91 0.015 285)"
  night: "oklch(0.18 0.03 275)"
  night-card: "oklch(0.23 0.035 275)"
  night-ink: "oklch(0.96 0.01 280)"
  night-muted: "oklch(0.75 0.02 280)"
  night-line: "oklch(0.34 0.03 275)"
  whatsapp: "#128C7E"
  danger: "oklch(0.577 0.245 27.325)"
typography:
  display:
    fontFamily: "Inter Variable, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Inter Variable, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter Variable, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Inter Variable, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter Variable, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.04em"
rounded:
  control: "999px"
  card: "1rem"
  field: "0.75rem"
  mark: "0.5rem"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2.5rem"
components:
  button-primary:
    backgroundColor: "{colors.violet-night}"
    textColor: "{colors.violet-ink}"
    rounded: "{rounded.control}"
    padding: "0 1rem"
    height: "2.25rem"
  button-primary-hover:
    backgroundColor: "{colors.violet-night}"
    textColor: "{colors.violet-ink}"
    rounded: "{rounded.control}"
    padding: "0 1rem"
    height: "2.25rem"
  button-whatsapp:
    backgroundColor: "{colors.whatsapp}"
    textColor: "{colors.violet-ink}"
    rounded: "{rounded.control}"
    padding: "0 1rem"
    height: "2.5rem"
  chip-selected:
    backgroundColor: "{colors.violet-night}"
    textColor: "{colors.violet-ink}"
    rounded: "{rounded.control}"
    padding: "0.375rem 0.75rem"
  chip-idle:
    backgroundColor: "{colors.paper-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0.375rem 0.75rem"
  card:
    backgroundColor: "{colors.paper-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "1rem"
  input:
    backgroundColor: "{colors.paper-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 1rem 0 2.5rem"
    height: "2.5rem"
---

# Design System: TicoApp

## Overview

**Creative North Star: "La plaza del barrio"**

TicoApp es una plaza, no un almacén y no un marketplace inflado. Cada comercio tiene su puesto. El visitante recorre, entra a un local y ve solo la oferta de ese local. La voz es de feria: invita, nombra el oficio y empuja a escribir o a pedir, en español de Costa Rica.

El acento es la violeta de noche. En claro se apoya sobre papel casi blanco; en oscuro, sobre un fondo marino. Las fichas no flotan como tarjetas de catálogo: son una capa apenas distinta del fondo, con borde fino y una sombra suave desplazada. Los botones de acción son píldoras táctiles. WhatsApp tiene su propio verde y no compite con la violeta.

**Key Characteristics:**

- Un local, un puesto. Nunca la oferta de otro al lado.
- Violeta de noche solo en la acción principal, el filtro activo y el enlace.
- Verde de WhatsApp solo para escribirle a ese negocio.
- Capas tonales más que sombras duras.
- Píldoras en botones, filtros y búsqueda.
- Claro y oscuro comparten la misma estructura.

## Colors

La plaza se lee en dos luces: papel de día y noche marina. La violeta es la misma familia en las dos.

### Primary

- **Violeta de noche** (`oklch(0.55 0.22 285)` en claro, `oklch(0.62 0.2 285)` en oscuro): botones de publicar, agregar y explorar; filtro activo; texto de énfasis en el título. Tinta sobre el botón: `oklch(0.99 0.005 280)`.

### Secondary

- **Verde de WhatsApp** (`#128C7E`): solo el contacto o el pedido por WhatsApp de ese local. No es un segundo acento de marca.

### Neutral

- **Papel** (`oklch(0.985 0.006 280)`): fondo de día.
- **Ficha de día** (`oklch(1 0 0)`): superficie de tarjeta e input.
- **Tinta** (`oklch(0.28 0.04 285)`): texto.
- **Tinta apagada** (`oklch(0.48 0.03 285)`): apoyo, placeholders.
- **Línea** (`oklch(0.91 0.015 285)`): bordes de día.
- **Noche** (`oklch(0.18 0.03 275)`): fondo oscuro.
- **Ficha de noche** (`oklch(0.23 0.035 275)`): tarjeta en oscuro.
- **Tinta de noche** (`oklch(0.96 0.01 280)`): texto en oscuro.
- **Línea de noche** (`oklch(0.34 0.03 275)`): bordes en oscuro.
- **Peligro** (`oklch(0.577 0.245 27.325)`): error. En oscuro, `oklch(0.704 0.191 22.216)`.

**The One Stall Rule.** La violeta marca una acción o un puesto activo. No tiñe fondos enteros ni se degrada en el texto.

## Typography

**Display Font:** Inter Variable (sans-serif)
**Body Font:** Inter Variable (sans-serif)
**Label/Mono Font:** Inter Variable para etiquetas. Mono solo para un identificador real, como el UUID del negocio.

**Character:** Una sola voz sans, apretada en los títulos y cómoda en el cuerpo. La feria se oye en el copy, no en una segunda familia.

### Hierarchy

- **Display** (600, `clamp(2.25rem, 5vw, 3rem)`, line-height 1.1): el título de la plaza.
- **Headline** (600, 1.5rem, line-height 1.25): secciones como negocios cerca o el nombre del local.
- **Title** (600, 1.125rem, line-height 1.3): nombre de un comercio en su ficha.
- **Body** (400, 0.875rem, line-height 1.5): descripciones, hasta unas 65–75ch.
- **Label** (500, 0.75rem, tracking amplio): categorías en mayúsculas pequeñas y metadatos.

**The One Voice Rule.** No se introduce otra familia para “verse más local”. El español y los nombres de los oficios hacen ese trabajo.

## Layout

El directorio vive en un contenedor de `72rem`, con `1rem` de aire lateral. El encabezado es una barra de `4rem`, pegada arriba. En el inicio, el título va al centro y las fichas en grilla de una, dos o tres columnas. En el perfil del negocio, los datos del local quedan en una columna de `18rem` y la oferta al lado; en pantallas chicas esa columna pasa arriba. El ritmo es 0.5rem dentro de un control, 1rem dentro de una ficha, 1.5rem entre bloques y 2.5rem entre secciones.

## Elevation & Depth

La profundidad es una capa: la ficha es un paso más clara o más oscura que el fondo, cerrada por un borde de 1px. La sombra es baja, suave y desplazada hacia abajo. No hay halo de color ni sombra dura de bloque.

### Shadow Vocabulary

- **Sombra de puesto** (`0 16px 40px -28px oklch(0.2 0.04 275)`): fichas del directorio y el buscador del inicio.
- **Sombra de avatar** (`0 12px 30px -16px oklch(0.2 0.04 275)`): la marca circular del negocio sobre la portada.

**The Layer Rule.** Si el borde ya separa la ficha, no se le suma otra sombra más oscura. La sombra solo asienta.

## Shapes

Los controles que se tocan son píldoras (`999px`): buscar, publicar, agregar, filtros. Las fichas son esquinas amplias, cerca de `1rem` (`--radius: 0.9rem`). La marca del logo es un cuadrado de `0.5rem`. Los campos del perfil pueden ser un poco menos redondos (`0.75rem`) cuando no son la búsqueda principal.

## Components

### Buttons

- **Shape:** píldora (`999px`), alto de `2.25rem` a `2.5rem`.
- **Primary:** violeta de noche, tinta clara, padding horizontal `1rem`.
- **Hover / Focus:** el primario baja un poco de opacidad; el foco es un anillo de 3px con el mismo violeta.
- **WhatsApp:** verde `#128C7E`, solo para escribirle a ese negocio.
- **Ghost:** sin fondo, para Entrar y enlaces de barra.

### Chips

- **Style:** píldora con borde. Idle sobre la ficha; activo en violeta con tinta clara.
- **State:** `aria-pressed` cambia el fondo. Un toque otra vez suelta el filtro.

### Cards / Containers

- **Corner Style:** `1rem`.
- **Background:** ficha de día o ficha de noche.
- **Shadow Strategy:** sombra de puesto.
- **Border:** 1px, línea o línea de noche.
- **Internal Padding:** `1rem`.

### Inputs / Fields

- **Style:** píldora en la búsqueda; borde de línea; icono de lupa a `0.75rem` del borde.
- **Focus:** anillo de 3px en violeta.
- **Error / Disabled:** el error usa el color de peligro. Lo deshabilitado baja la opacidad y no recibe el puntero.

### Navigation

Barra de `4rem`. Marca T a la izquierda, búsqueda flexible, enlaces con icono en pantallas grandes, campana, iniciales y Publicar negocio. En estrecho se esconden las etiquetas de navegación y queda el acceso a mensajes.

## Do's and Don'ts

### Do:

- **Do** tratar cada comercio como un puesto: su nombre, su dirección, su WhatsApp, su catálogo.
- **Do** usar la violeta de noche para la acción principal y el filtro activo.
- **Do** mantener claro y oscuro con la misma estructura.
- **Do** escribir en español de Costa Rica, con invitación de feria y sin inflar la oferta.

### Don't:

- **Don't** usar estética de bodega, almacén o industrial.
- **Don't** mostrar estrellas, seguidores, “abierto ahora” o conteos que el negocio no publicó.
- **Don't** comparar precios entre locales.
- **Don't** degradar el título ni inventar una segunda familia tipográfica.
- **Don't** usar el verde de WhatsApp como color de marca.
