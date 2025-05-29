#!/bin/bash
# 🔧 Script para configurar Auto-Deploy en Dokploy
# Este script te ayuda a configurar webhooks para deploy automático

echo "🚀 Configuración de Auto-Deploy para Dokploy"
echo "============================================"
echo ""

echo "📋 Pasos para configurar Auto-Deploy:"
echo ""

echo "1️⃣ CONFIGURAR EN DOKPLOY:"
echo "   • Ir a tu aplicación → Settings → General"
echo "   • Activar 'Auto Deploy'"
echo "   • Copiar la 'Webhook URL'"
echo ""

echo "2️⃣ CONFIGURAR EN GITHUB:"
echo "   • Ir a tu repo → Settings → Webhooks"
echo "   • Add webhook con:"
echo "     - Payload URL: [Webhook URL de Dokploy]"
echo "     - Content type: application/json"
echo "     - Events: Just the push event"
echo "     - Active: ✓"
echo ""

echo "3️⃣ CONFIGURAR SECRETS (Si usas GitHub Actions):"
echo "   • Ir a tu repo → Settings → Secrets and variables → Actions"
echo "   • Agregar:"
echo "     - DOKPLOY_FRONTEND_WEBHOOK: [URL del webhook frontend]"
echo "     - DOKPLOY_BACKEND_WEBHOOK: [URL del webhook backend]"
echo ""

echo "4️⃣ BRANCH CONFIGURATION:"
echo "   • Frontend: rama 'frontend/production'"
echo "   • Backend: rama 'backend/production'"
echo ""

echo "✅ VENTAJAS DEL AUTO-DEPLOY:"
echo "   ✓ Deploy inmediato al hacer push"
echo "   ✓ Sin intervención manual"
echo "   ✓ Historial de deploys automático"
echo "   ✓ Rollback fácil desde Dokploy"
echo ""

echo "⚠️  CONSIDERACIONES DE SEGURIDAD:"
echo "   • Solo configurar en ramas de producción"
echo "   • Usar webhooks seguros (HTTPS)"
echo "   • Monitorear logs de deploy"
echo "   • Tener branch protection en main/develop"
echo ""

echo "🔗 URLs ÚTILES:"
echo "   • Dokploy Docs: https://docs.dokploy.com"
echo "   • GitHub Webhooks: https://docs.github.com/webhooks"
echo ""

echo "💡 RECOMENDACIÓN:"
echo "   Usa webhooks simples de Dokploy para comenzar."
echo "   GitHub Actions es para configuraciones más avanzadas."
