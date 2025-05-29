# 🚀 BACKEND API - DESPLIEGUE DOKPLOY

## 📋 CONFIGURACIÓN RÁPIDA

### **Información del Servicio**

- **Nombre**: `dela-platform-api`
- **Tipo**: Application
- **Build**: Nixpacks
- **Puerto**: 3000

### **Repositorio GitHub**

- **URL**: `https://github.com/Jenaru0/dela-platform.git`
- **Branch**: `backend/production`
- **Build Directory**: `api` ⚠️ **IMPORTANTE**

### **Variables de Entorno** (copiar exactamente):

```
DATABASE_URL=postgresql://dela_owner:npg_o3LMdtgv4PhQ@ep-misty-glade-a8xsx3dv-pooler.eastus2.azure.neon.tech/dela?sslmode=require
JWT_SECRET=bb2626ceae438c9d0679c4185c39c4283c5f6051c8fb3a4946e9a294a77dad74
JWT_EXPIRES_IN=7d
SESSION_SECRET=1805c1a99017fc57fa3906e68966ef8c5db0cbb68b971a2cb3bce56356025111
BCRYPT_SALT_ROUNDS=12
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://dela-platform-web.dokploy.dev
ALLOWED_ORIGINS=https://dela-platform-web.dokploy.dev
CORS_ENABLED=true
UPLOAD_MAX_SIZE=10485760
MAX_FILE_SIZE=5mb
UPLOAD_PATH=./uploads
DEFAULT_PAGE_SIZE=10
MAX_PAGE_SIZE=100
LOG_LEVEL=info
```

### **Comandos Build**:

- **Install**: `npm ci --prefer-offline --no-audit`
- **Build**: `npm run build`
- **Start**: `npm run start:prod`

### **Health Check**: `/health`

### **Endpoints API**:

- **Health**: `https://tu-backend.dokploy.dev/health`
- **API Docs**: `https://tu-backend.dokploy.dev/api`

---

## ⚠️ IMPORTANTE

Este backend incluye:

- ✅ NestJS con TypeScript
- ✅ Prisma ORM con PostgreSQL
- ✅ JWT Authentication
- ✅ CORS configurado
- ✅ Migraciones automáticas
- ✅ Validación de datos

**⏱️ Tiempo de despliegue**: 5-8 minutos
