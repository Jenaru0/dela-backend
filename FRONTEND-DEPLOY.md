# 🎨 FRONTEND - RAMA DEPLOYMENT

## ✅ Configuración Lista para Dokploy

Esta rama contiene **SOLO** el frontend (Next.js 15 + Tailwind CSS v4.1)

### 📁 Estructura de la Rama Frontend
<<<<<<< HEAD

```
frontend/production/
├── web/                    # 📱 Frontend Next.js 15
│   ├── src/
│   ├── public/
│   ├── package.json
=======
```
frontend/production/
├── web/                    # 📱 Frontend Next.js 15
│   ├── src/               
│   ├── public/            
│   ├── package.json       
>>>>>>> frontend/production
│   ├── nixpacks.toml      # ⚙️ Configuración Nixpacks
│   └── ...
├── DOKPLOY-FRONTEND.md    # 📋 Guía de configuración
└── FRONTEND-DEPLOY.md     # 📄 Este archivo
```

### 🚀 **PASOS PARA DESPLEGAR EN DOKPLOY**

#### 1. **Crear Aplicación en Dokploy**
<<<<<<< HEAD

=======
>>>>>>> frontend/production
- Nombre: `dela-platform-web`
- Tipo: Application
- Build Provider: Nixpacks

#### 2. **Configurar Repositorio**
<<<<<<< HEAD

=======
>>>>>>> frontend/production
- URL: `https://github.com/Jenaru0/dela-platform.git`
- Branch: `frontend/production`
- Build Directory: `web`

#### 3. **Variables de Entorno**
<<<<<<< HEAD

=======
>>>>>>> frontend/production
```env
NEXT_PUBLIC_API_URL=https://dela-platform-api.dokploy.dev
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

#### 4. **Configuración de Red**
<<<<<<< HEAD

=======
>>>>>>> frontend/production
- Puerto: 3000
- Health Check: `/`

### 🔄 **Después del Deploy**
<<<<<<< HEAD

=======
>>>>>>> frontend/production
1. Obtener URL del frontend
2. Actualizar CORS en el backend
3. Verificar conexión API

---
<<<<<<< HEAD

=======
>>>>>>> frontend/production
**Rama creada**: `frontend/production`
**Fecha**: Mayo 2025
**Estado**: ✅ Lista para deploy
