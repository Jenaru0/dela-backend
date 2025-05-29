# 🎨 FRONTEND - RAMA DEPLOYMENT

## ✅ Configuración Lista para Dokploy

Esta rama contiene **SOLO** el frontend (Next.js 15 + Tailwind CSS v4.1)

### 📁 Estructura de la Rama Frontend

```
frontend/production/
├── web/                    # 📱 Frontend Next.js 15
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── nixpacks.toml      # ⚙️ Configuración Nixpacks
│   └── ...
├── DOKPLOY-FRONTEND.md    # 📋 Guía de configuración
└── FRONTEND-DEPLOY.md     # 📄 Este archivo
```

### 🚀 **PASOS PARA DESPLEGAR EN DOKPLOY**

#### 1. **Crear Aplicación en Dokploy**

- Nombre: `dela-platform-web`
- Tipo: Application
- Build Provider: Nixpacks

#### 2. **Configurar Repositorio**

- URL: `https://github.com/Jenaru0/dela-platform.git`
- Branch: `frontend/production`
- Build Directory: `web`

#### 3. **Variables de Entorno**

```env
NEXT_PUBLIC_API_URL=https://dela-platform-api.dokploy.dev
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

#### 4. **Configuración de Red**

- Puerto: 3000
- Health Check: `/`

### 🔄 **Después del Deploy**

1. Obtener URL del frontend
2. Actualizar CORS en el backend
3. Verificar conexión API

---

**Rama creada**: `frontend/production`
**Fecha**: Mayo 2025
**Estado**: ✅ Lista para deploy
