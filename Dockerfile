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

# Construimos la aplicación
RUN npm run build

# FALLBACK: Si main.js no existe, intentar build manual
RUN if [ ! -f dist/main.js ] && [ ! -f dist/src/main.js ]; then \
        echo "=== INTENTANDO BUILD MANUAL ===" && \
        npx tsc --project tsconfig.build.json && \
        echo "=== RESULTADO BUILD MANUAL ===" && \
        find dist -name "*.js" -type f | head -10; \
    fi

# Verificamos que el build se haya completado correctamente
RUN echo "=== VERIFICANDO BUILD ===" && \
    ls -la . && \
    echo "=== CONTENIDO DE DIST ===" && \
    ls -la dist/ && \
    echo "=== CONTENIDO DE DIST/SRC ===" && \
    ls -la dist/src/ || echo "No existe dist/src/" && \
    echo "=== BUSCANDO ARCHIVOS JS ===" && \
    find dist -name "*.js" -type f | head -10 && \
    echo "=== VERIFICANDO MAIN.JS ===" && \
    test -f dist/main.js && echo "✅ main.js encontrado" || echo "❌ main.js NO encontrado" && \
    echo "=== VERIFICANDO MAIN.JS EN SRC ===" && \
    test -f dist/src/main.js && echo "✅ dist/src/main.js encontrado" || echo "❌ dist/src/main.js NO encontrado" && \
    echo "=== CONFIGURACIÓN TYPESCRIPT ===" && \
    cat tsconfig.json && \
    echo "=== CONFIGURACIÓN NEST ===" && \
    cat nest-cli.json

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

# Comando de inicio con detección automática
CMD ["sh", "-c", "if [ -f dist/main.js ]; then echo 'Ejecutando dist/main.js' && node dist/main.js; elif [ -f dist/src/main.js ]; then echo 'Ejecutando dist/src/main.js' && node dist/src/main.js; else echo 'ERROR: main.js no encontrado' && echo 'Contenido de dist:' && ls -la dist/ && echo 'Buscando archivos JS:' && find dist -name '*.js' -type f | head -5 && exit 1; fi"]
