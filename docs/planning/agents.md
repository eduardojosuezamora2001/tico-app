# Agentes IA para desarrollo de Plaza de Comercios Digital

## Descripción general
Este documento define los agentes IA que participarán en el desarrollo del proyecto Plaza de Comercios Digital. Cada agente tiene responsabilidades específicas y utiliza herramientas especializadas.

---

## 1. Agent: Backend Architect
**Responsabilidad:** Diseñar e implementar la arquitectura backend con Hono + Node.js

### Tareas:
- Crear estructura de carpetas para `apps/api`
- Implementar middleware de autenticación y autorización
- Diseñar e implementar endpoints REST según especificación
- Implementar Socket.io para chat en tiempo real
- Implementar SSE para notificaciones
- Integración con Supabase (conexión, queries)
- Validación con Zod
- Error handling y logging

### Herramientas:
- Node.js + Hono
- Supabase SDK
- Socket.io
- Zod
- TypeScript
-hugeicons

### Output esperado:
- API funcional con autenticación
- Endpoints CRUD para todas las entidades
- Chat y notificaciones funcionando
- Documentación de endpoints (OpenAPI)

---

## 2. Agent: Database Designer
**Responsabilidad:** Diseñar y administrar la base de datos en Supabase

### Tareas:
- Crear schema completo de BD (16 tablas)
- Crear tablas de traducción (_translations)
- Crear índices para búsquedas y geolocalización (PostGIS)
- Implementar RLS (Row Level Security) policies
- Crear funciones de base de datos si es necesario
- Migraciones de BD
- Seed data para testing

### Herramientas:
- Supabase PostgreSQL
- PostGIS (geolocalización)
- SQL + Migrations
- RLS Policies

### Output esperado:
- Schema de BD completo
- RLS policies implementadas
- Índices de performance
- Documentación de modelo de datos

---

## 3. Agent: Frontend Developer
**Responsabilidad:** Implementar interfaz React con Vite

### Tareas:
- Crear estructura de carpetas para `apps/web`
- Implementar autenticación y rutas protegidas
- Crear componentes principales con shadcn/ui
- Integración con backend API
- Formularios con React Hook Form + Zod
- State management con Zustand + Context
- WebSocket client para chat
- SSE client para notificaciones
- Google Maps integration
- UI responsivo con Tailwind CSS

### Herramientas:
- React 18 + Vite
- TypeScript
- React Router v7
- React Hook Form + Zod
- Zustand + Context API
- Axios/Fetch
- Socket.io client
- shadcn/ui + Tailwind CSS

### Output esperado:
- UI funcional para todos los roles
- Chat en vivo funcionando
- Notificaciones en tiempo real
- Responsive en desktop/mobile

---

## 4. Agent: Shared Package Maintainer
**Responsabilidad:** Gestionar tipos, schemas y utilidades compartidas

### Tareas:
- Crear estructura de `packages/shared`
- Definir tipos TypeScript compartidos entre frontend y backend
- Crear Zod schemas para validación
- Definir constantes (roles, permisos, módulos)
- Crear funciones utilitarias
- Mantener sincronización entre apps

### Herramientas:
- TypeScript
- Zod
- pnpm workspaces

### Output esperado:
- Tipos compartidos correctos
- Schemas de validación centralizados
- Constantes y enumeraciones

---

## 5. Agent: DevOps & Infrastructure
**Responsabilidad:** Configurar infraestructura y despliegue

### Tareas:
- Configurar monorepo (pnpm workspaces + Turborepo)
- Setup de Railway para backend
- Configurar Cloudflare Pages para frontend
- Setup de Supabase
- Configurar Redis (Upstash)
- Configurar GitHub Actions para CI/CD
- Variables de entorno y secrets
- Documentación de deployment

### Herramientas:
- pnpm + Turborepo
- Railway CLI
- Cloudflare Pages
- Supabase CLI
- GitHub Actions
- Docker (opcional)

### Output esperado:
- Monorepo funcional
- CI/CD pipeline
- Ambiente de desarrollo local
- Ambiente de staging

---

## 6. Agent: QA & Testing
**Responsabilidad:** Testing y aseguramiento de calidad

### Tareas:
- Crear tests unitarios (backend + frontend jest)
- Tests de integración
- Tests end-to-end
- Testing de seguridad (RLS, autorización)
- Testing de performance
- Manual testing de features
- Bug tracking y reporte

### Herramientas:
- Vitest (unit testing)
- Playwright (E2E testing)
- Jest
- Postman/Thunder Client (API testing)

### Output esperado:
- Suite de tests funcional
- Cobertura de código >80%
- Documentación de test cases

---

## 7. Agent: Documentation Writer
**Responsabilidad:** Documentar código y procesos

### Tareas:
- README.md para el proyecto
- Documentación de API (endpoints)
- Guía de desarrollo local
- Documentación de arquitectura
- Guía de contribución
- Comentarios en código complejo
- Documentación de componentes

### Herramientas:
- Markdown
- OpenAPI/Swagger (opcional)
- Figma (para diagramas)

### Output esperado:
- README completo
- API documentation
- Developer guide
- Arquitecture docs

---

## 8. Agent: Security & Compliance
**Responsabilidad:** Asegurar seguridad de la aplicación

### Tareas:
- Revisar RLS policies
- Validar autenticación y autorización
- Revisar manejo de secretos
- CORS configuration
- Rate limiting
- Input validation
- SQL injection prevention
- HTTPS/TLS setup

### Herramientas:
- OWASP guidelines
- Security audits
- Dependency scanning

### Output esperado:
- Aplicación segura
- Checklist de seguridad completado
- Vulnerabilidades identificadas y corregidas

---

## Flujo de coordinación entre agentes

```
┌─────────────────────────────────────────────────────┐
│          Backend Architect + Database Designer       │ 
│     (Crean esquema de BD y endpoints API)            │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │  Shared Package Maintainer  │
        │  (Definen tipos compartidos)│
        └────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
   ┌─────────────┐         ┌──────────────┐
   │   Frontend  │         │ DevOps &     │
   │   Developer │         │ Infrastructure│
   └──────┬──────┘         └──────┬───────┘
          │                       │
          └───────────┬───────────┘
                      ▼
            ┌─────────────────────┐
            │   QA & Testing      │
            │ Security & Compliance│
            │ Documentation Writer│
            └─────────────────────┘
                      │
                      ▼
            ┌─────────────────────┐
            │  MVP Ready to Ship  │
            └─────────────────────┘
```

---

## Herramientas compartidas por todos los agentes

1. **Git + GitHub** - Control de versiones
2. **TypeScript** - Type safety en todo el proyecto
3. **ESLint + Prettier** - Código limpio y consistente
4. **Zod** - Validación de datos
5. **Logger** - Winston o Pino para logging
6. **Environment variables** - dotenv para config

---

## Comunicación entre agentes

Todos los agentes deben:
- Seguir el **planeamiento arquitectónico** como referencia
- Usar el **schema de BD** del Database Designer
- Usar los **tipos compartidos** del Shared Package Maintainer
- Respetar las **políticas de seguridad** del Security agent
- Documentar sus cambios

---

## Fases de desarrollo

### Fase 1: Setup (1 semana)
- DevOps: Monorepo setup + infraestructura
- Database Designer: Schema inicial
- Shared Package Maintainer: Tipos base

### Fase 2-9: Development (18-24 semanas)
- Backend Architect: API endpoints
- Frontend Developer: UI components
- Database Designer: Optimizaciones
- QA: Validación continua
- Documentation Writer: Docs

### Fase 10: Release (1 semana)
- Security: Audit final
- QA: Testing final
- DevOps: Production deployment

---

## Métricas de éxito

- ✅ Todos los endpoints funcionando según spec
- ✅ UI responde y es intuitivo
- ✅ Chat en vivo sin latencia
- ✅ Cobertura de tests >80%
- ✅ 0 vulnerabilidades de seguridad criticas
- ✅ Documentación completa
- ✅ Deployment en producción exitoso