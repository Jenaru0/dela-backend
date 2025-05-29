# 🎨 DELA Platform - Frontend

## 📱 Aplicación Web React/Next.js

**Stack Tecnológico:**

- Next.js 15 (App Router)
- React 19
- Tailwind CSS v4.1
- TypeScript
- Lucide React (iconos)

## 🚀 Despliegue en Dokploy

### Configuración:

- **Rama**: `frontend/production`
- **Build Directory**: `web`
- **Puerto**: 3000
- **Build Provider**: Nixpacks
- **Auto-Deploy**: ✅ Configurado (webhooks + GitHub Actions)

### Variables de Entorno:

```env
NEXT_PUBLIC_API_URL=https://tu-backend.dokploy.dev
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

## 🛠️ Desarrollo Local

```bash
# Instalar dependencias
npm install

# Modo desarrollo
npm run dev

# Compilar para producción
npm run build

# Ejecutar versión de producción
npm start
```

## 📁 Estructura del Proyecto

```
src/
├── app/                    # App Router de Next.js
│   ├── layout.tsx         # Layout principal
│   ├── page.tsx           # Página de inicio
│   └── productos/         # Páginas de productos
├── components/            # Componentes reutilizables
│   ├── common/           # Componentes comunes
│   ├── layout/           # Componentes de layout
│   ├── sections/         # Secciones de páginas
│   └── ui/               # Componentes de UI
├── lib/                  # Utilidades y configuraciones
├── hooks/                # React hooks personalizados
├── services/             # Servicios de API
└── types/                # Definiciones de TypeScript
```

## 🎯 Características

- ✅ Diseño responsive
- ✅ SEO optimizado
- ✅ Accesibilidad (a11y)
- ✅ Componentes modulares
- ✅ TypeScript estricto
- ✅ Tailwind CSS v4.1
- ✅ Optimización de imágenes
- ✅ Carga diferida (lazy loading)

## 🔗 Enlaces

- **Sitio Web**: En producción en Dokploy
- **API Backend**: Conectado via `NEXT_PUBLIC_API_URL`
- **Documentación**: `/docs`

---

**Estado**: ✅ Desplegado en producción
