# Etapa de construcción
FROM node:18-alpine AS builder

# Instalar dependencias del sistema
RUN apk add --no-cache libc6-compat

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./
COPY turbo.json ./
COPY api/package*.json ./api/

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Generar Prisma Client
RUN cd api && npx prisma generate

# Construir aplicación
RUN npm run build --filter=api

# Etapa de producción
FROM node:18-alpine AS runner

# Instalar dependencias del sistema
RUN apk add --no-cache libc6-compat

# Crear usuario no-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos necesarios
COPY --from=builder --chown=nestjs:nodejs /app/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/api/package*.json ./
COPY --from=builder --chown=nestjs:nodejs /app/api/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

# Cambiar a usuario no-root
USER nestjs

# Exponer puerto
EXPOSE 3000

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000

# Comando de inicio
CMD ["node", "dist/main.js"]
