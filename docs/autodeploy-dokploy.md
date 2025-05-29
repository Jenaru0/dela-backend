# 🚀 Auto-Deploy a Dokploy - Guía Completa

## 🎯 Objetivo

Configurar deploy automático en Dokploy cuando se hace push a las ramas de producción.

## 🔧 Métodos de Configuración

### **MÉTODO 1: Webhooks Nativos de Dokploy (Recomendado)**

#### ✅ **Ventajas:**

- ✓ Configuración simple y rápida
- ✓ Sin dependencias externas
- ✓ Deploy inmediato al push
- ✓ Logs integrados en Dokploy

#### 📋 **Pasos:**

1. **En cada aplicación de Dokploy:**

   ```
   Aplicación → Settings → General → Auto Deploy: ✓
   ```

2. **Copiar Webhook URL:**

   ```
   https://tu-dokploy.com/api/deploy/webhook/[app-id]
   ```

3. **En GitHub Repository → Settings → Webhooks:**
   ```
   Payload URL: [Webhook URL copiada]
   Content type: application/json
   Events: Just the push event
   Branches: frontend/production, backend/production
   ```

#### 🔄 **Configuración por Aplicación:**

**Frontend:**

- **Rama**: `frontend/production`
- **Webhook**: Configure para esta rama específica

**Backend:**

- **Rama**: `backend/production`
- **Webhook**: Configure para esta rama específica

---

### **MÉTODO 2: GitHub Actions (Avanzado)**

#### ✅ **Ventajas:**

- ✓ Control granular del proceso
- ✓ Ejecución de tests pre-deploy
- ✓ Notificaciones personalizadas
- ✓ Múltiples ambientes

#### 📋 **Configuración:**

1. **Agregar Secrets en GitHub:**

   ```
   Repository → Settings → Secrets and variables → Actions

   DOKPLOY_FRONTEND_WEBHOOK: https://tu-dokploy.com/api/webhook/frontend-app-id
   DOKPLOY_BACKEND_WEBHOOK: https://tu-dokploy.com/api/webhook/backend-app-id
   ```

2. **El workflow ya está creado en:**
   ```
   .github/workflows/dokploy-deploy.yml
   ```

---

## 🛡️ Mejores Prácticas de Seguridad

### **1. Branch Protection**

```bash
# Proteger ramas principales
main → Settings → Branch protection rules
develop → Settings → Branch protection rules
```

### **2. Webhooks Seguros**

- ✓ Usar HTTPS únicamente
- ✓ Configurar solo para ramas específicas
- ✓ Monitorear logs de webhooks

### **3. Control de Acceso**

- ✓ Solo admins pueden configurar webhooks
- ✓ Revisar permisos de repository
- ✓ Activar 2FA en GitHub

### **4. Monitoreo**

```bash
# Revisar logs en Dokploy
Applications → [App] → Deployments → View Logs

# Revisar webhooks en GitHub
Repository → Settings → Webhooks → Recent Deliveries
```

---

## 🔄 Flujo de Trabajo Recomendado

### **Para Desarrollo:**

```bash
# 1. Trabajar en feature branches
git checkout -b feature/nueva-funcionalidad

# 2. Hacer commits con buenas prácticas
git commit -m "feat: agregar carrito de compras"

# 3. Push a GitHub
git push origin feature/nueva-funcionalidad

# 4. Crear Pull Request a develop
```

### **Para Staging:**

```bash
# 1. Merge a develop para pruebas
git checkout develop
git merge feature/nueva-funcionalidad

# 2. Deploy manual a staging (opcional)
```

### **Para Producción:**

```bash
# 1. Merge a rama de producción
git checkout frontend/production
git merge develop

# 2. Push activa auto-deploy 🚀
git push origin frontend/production
```

---

## 🚨 Troubleshooting

### **Webhook no funciona:**

1. ✅ Verificar URL del webhook
2. ✅ Comprobar permisos de GitHub
3. ✅ Revisar logs en Dokploy
4. ✅ Verificar rama configurada

### **Deploy falla:**

1. ✅ Revisar logs de build en Dokploy
2. ✅ Verificar variables de entorno
3. ✅ Comprobar configuración de Nixpacks
4. ✅ Verificar conectividad de base de datos

### **Build muy lento:**

1. ✅ Optimizar `nixpacks.toml`
2. ✅ Usar caché de dependencias
3. ✅ Reducir tamaño de imagen

---

## 📊 Monitoreo y Métricas

### **KPIs a Monitorear:**

- ⏱️ **Tiempo de deploy**: < 5 minutos objetivo
- 📈 **Tasa de éxito**: > 95%
- 🔄 **Frecuencia**: Según necesidad del proyecto
- 🚨 **Rollbacks**: < 5% de deploys

### **Alertas Recomendadas:**

- 🚨 Deploy fallido
- ⏰ Deploy muy lento (> 10 min)
- 🔄 Múltiples rollbacks

---

## 🎯 Siguiente Paso

**Ejecutar configuración:**

```bash
# En Windows:
.\scripts\setup-autodeploy.bat

# En Linux/Mac:
chmod +x scripts/setup-autodeploy.sh
./scripts/setup-autodeploy.sh
```

**Luego configurar webhooks según el método elegido.**
