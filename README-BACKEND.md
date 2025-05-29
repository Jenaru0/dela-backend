# 🔧 DELA PLATFORM - BACKEND API

## 📖 Descripción

API RESTful para la plataforma Dela Platform, construida con NestJS, Prisma y PostgreSQL.

## 🚀 Stack Tecnológico

- **Framework**: NestJS 10
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Auth**: JWT + bcrypt
- **Validation**: class-validator
- **Documentation**: Swagger/OpenAPI

## 📁 Estructura del Proyecto

```
api/
├── src/
│   ├── autenticacion/     # Módulo de autenticación
│   ├── productos/         # Módulo de productos
│   ├── usuarios/         # Módulo de usuarios
│   └── prisma/           # Configuración Prisma
├── prisma/
│   ├── schema.prisma     # Esquema de base de datos
│   └── migrations/       # Migraciones
└── package.json
```

## 🛠️ Desarrollo Local

### Prerrequisitos

- Node.js 18+
- npm o yarn
- PostgreSQL

### Instalación

```bash
cd api
npm install
```

### Variables de Entorno

Crear `.env` en `api/`:

```
DATABASE_URL=postgresql://usuario:password@localhost:5432/dela
JWT_SECRET=tu_jwt_secret_aqui
SESSION_SECRET=tu_session_secret_aqui
```

### Comandos

```bash
# Desarrollo
npm run start:dev

# Build
npm run build

# Producción
npm run start:prod

# Migraciones
npx prisma migrate dev
npx prisma generate
```

## 📚 API Endpoints

### Autenticación

- `POST /auth/registro` - Registro de usuario
- `POST /auth/login` - Inicio de sesión
- `GET /auth/perfil` - Perfil del usuario

### Productos

- `GET /productos` - Listar productos
- `GET /productos/:id` - Obtener producto
- `POST /productos` - Crear producto (admin)
- `PUT /productos/:id` - Actualizar producto (admin)
- `DELETE /productos/:id` - Eliminar producto (admin)

### Health Check

- `GET /health` - Estado del servicio

## 🔒 Seguridad

- JWT para autenticación
- bcrypt para hash de passwords
- CORS configurado
- Validación de entrada
- Rate limiting
- Helmet para headers de seguridad

## 📊 Base de Datos

- PostgreSQL hospedado en Neon
- Migraciones con Prisma
- Seed data incluido
- Backup automático

## 🚀 Despliegue

Ver `BACKEND-DEPLOY.md` para instrucciones de despliegue en Dokploy.

## 📝 Logs

Los logs se configuran según `LOG_LEVEL`:

- `error`: Solo errores
- `warn`: Errores y advertencias
- `info`: Información general (default)
- `debug`: Información detallada

## ⚡ Performance

- Conexión pooling con Prisma
- Compresión gzip
- Caché en memoria para consultas frecuentes
- Optimización de queries

---

**Estado**: ✅ Listo para producción
