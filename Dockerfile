# ========================================
# 🔨 Stage 1: Builder
# ========================================
FROM node:20-alpine AS builder
WORKDIR /app

# Instalamos dependencias del sistema necesarias
RUN apk add --no-cache libc6-compat

# Copiamos package.json primero para optimizar cache de Docker
COPY api/package*.json ./

# Instalamos dependencias
RUN npm ci --no-audit --no-fund --silent

# Copiamos el código fuente
COPY api/ ./

# Generamos el Prisma Client
RUN npx prisma generate

# Construimos la aplicación y forzamos generación de main.js
RUN npm run build && \
    echo "=== FORZANDO GENERACIÓN DE MAIN.JS SI NO EXISTE ===" && \
    if [ ! -f dist/main.js ]; then \
        echo "main.js no encontrado, compilando directamente..." && \
        npx tsc src/main.ts --outDir dist --module commonjs --target es2020 --experimentalDecorators --emitDecoratorMetadata; \
    fi

# Verificamos que el build se haya completado correctamente
RUN echo "=== VERIFICANDO BUILD ===" && \
    ls -la . && \
    echo "=== CONTENIDO DE DIST ===" && \
    ls -la dist/ && \
    echo "=== VERIFICANDO MAIN.JS ===" && \
    test -f dist/main.js && echo "✅ main.js encontrado" || echo "❌ main.js NO encontrado" && \
    echo "=== ESTRUCTURA COMPLETA ===" && \
    find dist -type f -name "*.js" | head -10

# ========================================
# 🚀 Stage 2: Runner (Imagen final)
# ========================================
FROM node:20-alpine AS runner
WORKDIR /app

# Variables de entorno para producción
ENV NODE_ENV=production
ENV PORT=3001

# Creamos usuario no-root por seguridad
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copiamos solo lo necesario para ejecutar
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

# Exponemos el puerto
EXPOSE 3001

# Cambiamos al usuario no-root
USER nestjs

# Comando de inicio optimizado con fallback
CMD ["sh", "-c", "if [ -f dist/main.js ]; then node dist/main.js; else echo 'Error: main.js no encontrado' && ls -la dist/ && exit 1; fi"]
