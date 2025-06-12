# Variables de Entorno para Dokploy - Backend

## Variables Obligatorias

```bash
DATABASE_URL=postgresql://dela_owner:npg_o3LMdtgv4PhQ@ep-misty-glade-a8xsx3dv-pooler.eastus2.azure.neon.tech/dela?sslmode=require
JWT_SECRET=tu-jwt-secret-super-seguro
JWT_EXPIRES_IN=7d
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://tu-dominio-frontend.com
```

## Cómo configurar en Dokploy

1. Ve a tu aplicación backend en Dokploy
2. Sección **Environment Variables**
3. Agrega cada variable con su valor
4. **Guarda** y **redespliega**

## Endpoints disponibles

- `GET /` - Mensaje de bienvenida
- `GET /health` - Health check
- `GET /categorias` - Lista de categorías
- `POST /autenticacion/login` - Login de usuarios
- Y más endpoints según la API...

## Logs importantes

Busca en los logs estos mensajes:

- ✅ Database connected successfully
- ✅ CORS configured for origins
- 🚀 API running on port 3001
