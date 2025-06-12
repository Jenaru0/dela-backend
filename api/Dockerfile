# Etapa de construcción
FROM node:20-alpine AS builder

# Establecer directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema
RUN apk add --no-cache libc6-compat

# Copiar archivos de configuración del paquete
COPY api/package*.json ./

# Instalar dependencias
RUN npm ci --no-audit --no-fund --silent

# Copiar el código fuente
COPY api/ ./

# Generar Prisma Client
RUN npx prisma generate

# Construir aplicación
RUN npm run build

# Etapa de producción
FROM node:20-alpine AS runner

# Instalar dependencias del sistema en una sola capa
RUN apk add --no-cache libc6-compat && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs && \
    apk cache clean

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos necesarios desde la etapa de construcción en una sola operación
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# Instalar solo dependencias de producción
RUN npm ci --only=production --no-audit --no-fund --silent && \
    npm cache clean --force

# Cambiar a usuario no-root
USER nestjs

# Variables de entorno por defecto
ENV NODE_ENV=production \
    PORT=3000 \
    NODE_OPTIONS="--max-old-space-size=1024"

# Exponer puerto
EXPOSE 3000

# Comando de inicio optimizado
CMD ["node", "dist/main.js"]
