# 🏪 DELA Platform - E-commerce de Productos Lácteos

## 📱 Plataforma Moderna con Arquitectura Separada

**Estado**: ✅ Frontend desplegado en Dokploy | ⏳ Backend listo para despliegue

### 🏗️ Arquitectura del Sistema

```
Internet
    ↓
[Frontend Web] ←→ [Backend API] ←→ [PostgreSQL]
Next.js 15         NestJS          Neon Cloud
React 19           Prisma ORM      SSL/TLS
Tailwind v4.1      TypeScript      Backups
```

## 🚀 Servicios y Ramas

### **Frontend (Aplicación Web)**

- **Tecnologías**: Next.js 15, React 19, Tailwind CSS v4.1
- **Rama GitHub**: `frontend/production`
- **Directorio**: `web/`
- **Estado**: ✅ **Desplegado en Dokploy**

### **Backend (API REST)**

- **Tecnologías**: NestJS, Prisma ORM, PostgreSQL
- **Rama GitHub**: `backend/production`
- **Directorio**: `api/`
- **Estado**: ⏳ **Configurado y listo para despliegue**

## ⚡ Configuración Rápida para Dokploy

### 1. Frontend (Ya desplegado):

```
Repositorio: https://github.com/Jenaru0/dela-platform.git
Rama: frontend/production
Build Directory: web
Puerto: 3000
```

### 2. Backend (Listo para desplegar):

```
Repositorio: https://github.com/Jenaru0/dela-platform.git
Rama: backend/production
Build Directory: api
Puerto: 3000
Variables: Ver FRONTEND-DEPLOY.md
```

## 🛠️ Desarrollo Local

### Requisitos:

- Node.js 18+
- PostgreSQL (o usar Neon Cloud)

### Inicio Rápido:

```bash
# Clonar repositorio
git clone https://github.com/Jenaru0/dela-platform.git

# Frontend
cd web
npm install && npm run dev

# Backend (nueva terminal)
cd api
npm install && npm run start:dev
```

## 📁 Estructura del Proyecto

```
dela-platform/
├── web/                   # 🎨 Frontend Next.js
│   ├── src/app/          # App Router
│   ├── src/components/   # Componentes React
│   └── src/lib/         # Utilidades
├── api/                  # 🔧 Backend NestJS
│   ├── src/             # Código fuente
│   └── prisma/          # Base de datos
├── docs/                # 📚 Documentación
└── scripts/             # 🔨 Scripts utilidad
```

## 🎯 Funcionalidades Implementadas

### Frontend:

- ✅ Página de inicio con hero section
- ✅ Catálogo de productos con filtros
- ✅ Diseño responsive mobile-first
- ✅ Componentes reutilizables UI
- ✅ SEO optimizado

### Backend:

- ✅ API REST completa
- ✅ Autenticación JWT
- ✅ CRUD de productos
- ✅ Base de datos PostgreSQL
- ✅ Documentación Swagger

## 🔐 Variables de Entorno

### Frontend:

```env
NEXT_PUBLIC_API_URL=https://tu-backend-url.dokploy.dev
NODE_ENV=production
```

### Backend:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=tu_secret_seguro
SESSION_SECRET=tu_session_secret
```

## 📚 Documentación Adicional

- **Frontend**: `web/README.md`
- **Despliegue**: `FRONTEND-DEPLOY.md`
- **Configuración**: `RAMAS-SEPARADAS-RESUMEN.md`

## 🔄 Flujo de Trabajo

1. **Desarrollo**: Ramas `feature/*` desde `develop`
2. **Staging**: Rama `develop` para pruebas
3. **Producción**: Ramas separadas `frontend/production` y `backend/production`

## 🎉 Estado Actual

- **✅ Frontend**: Desplegado y funcionando en Dokploy
- **⏳ Backend**: Configurado, listo para el siguiente despliegue
- **✅ Base de Datos**: PostgreSQL en Neon Cloud configurada
- **✅ Documentación**: Guías completas disponibles

---

**Equipo**: Desarrollo Full-Stack  
**Última actualización**: Mayo 2025  
**Próximo paso**: Desplegar backend en Dokploy
