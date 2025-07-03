import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

export interface Activity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: Date;
  icon: string;
  color: string;
}

export interface DashboardStats {
  usuarios: {
    total: number;
    clientes: number;
    admins: number;
    nuevosHoy: number;
    nuevosEstaSemana: number;
  };
  productos: {
    total: number;
    activos: number;
    agotados: number;
    destacados: number;
    sinStock: number;
  };
  pedidos: {
    total: number;
    pendientes: number;
    completados: number;
    ventasHoy: number;
    ventasEstaSemana: number;
    ingresosTotales: number;
  };
  reclamos: {
    total: number;
    pendientes: number;
    resueltos: number;
    nuevosHoy: number;
  };
}

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getDashboardStats() {
    try {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const inicioSemana = new Date(hoy);
      inicioSemana.setDate(hoy.getDate() - hoy.getDay());

      // Estadísticas de usuarios
      const usuariosTotal = await this.prisma.usuario.count();
      const usuariosClientes = await this.prisma.usuario.count({
        where: { tipoUsuario: 'CLIENTE' },
      });
      const usuariosAdmin = await this.prisma.usuario.count({
        where: { tipoUsuario: 'ADMIN' },
      });
      const usuariosNuevosHoy = await this.prisma.usuario.count({
        where: { creadoEn: { gte: hoy } },
      });
      const usuariosNuevosSemana = await this.prisma.usuario.count({
        where: { creadoEn: { gte: inicioSemana } },
      });

      // Estadísticas de productos
      const productosTotal = await this.prisma.producto.count();
      const productosActivos = await this.prisma.producto.count({
        where: { estado: 'ACTIVO' },
      });
      const productosAgotados = await this.prisma.producto.count({
        where: { estado: 'AGOTADO' },
      });
      const productosDestacados = await this.prisma.producto.count({
        where: { destacado: true },
      });
      const productosSinStock = await this.prisma.producto.count({
        where: { stock: { lte: 0 } },
      });

      // Estadísticas de pedidos
      const pedidosTotal = await this.prisma.pedido.count();
      const pedidosPendientes = await this.prisma.pedido.count({
        where: { estado: { in: ['PENDIENTE', 'CONFIRMADO', 'PROCESANDO'] } },
      });
      const pedidosCompletados = await this.prisma.pedido.count({
        where: { estado: 'ENTREGADO' },
      });
      const ventasHoy = await this.prisma.pedido.count({
        where: { creadoEn: { gte: hoy } },
      });
      const ventasSemana = await this.prisma.pedido.count({
        where: { creadoEn: { gte: inicioSemana } },
      });

      const ingresosTotalesResult = await this.prisma.pedido.aggregate({
        _sum: { total: true },
        where: { estado: 'ENTREGADO' },
      });

      // Estadísticas de reclamos
      const reclamosTotal = await this.prisma.reclamo.count();
      const reclamosPendientes = await this.prisma.reclamo.count({
        where: { estado: { in: ['ABIERTO', 'EN_PROCESO'] } },
      });
      const reclamosResueltos = await this.prisma.reclamo.count({
        where: { estado: 'RESUELTO' },
      });
      const reclamosNuevosHoy = await this.prisma.reclamo.count({
        where: { creadoEn: { gte: hoy } },
      });

      const stats: DashboardStats = {
        usuarios: {
          total: usuariosTotal,
          clientes: usuariosClientes,
          admins: usuariosAdmin,
          nuevosHoy: usuariosNuevosHoy,
          nuevosEstaSemana: usuariosNuevosSemana,
        },
        productos: {
          total: productosTotal,
          activos: productosActivos,
          agotados: productosAgotados,
          destacados: productosDestacados,
          sinStock: productosSinStock,
        },
        pedidos: {
          total: pedidosTotal,
          pendientes: pedidosPendientes,
          completados: pedidosCompletados,
          ventasHoy: ventasHoy,
          ventasEstaSemana: ventasSemana,
          ingresosTotales: Number(ingresosTotalesResult._sum.total) || 0,
        },
        reclamos: {
          total: reclamosTotal,
          pendientes: reclamosPendientes,
          resueltos: reclamosResueltos,
          nuevosHoy: reclamosNuevosHoy,
        },
      };

      return {
        mensaje: 'Estadísticas del dashboard obtenidas correctamente',
        data: stats,
      };
    } catch (error) {
      console.error('Error al obtener estadísticas del dashboard:', error);
      throw error;
    }
  }

  async getCriticalAlerts() {
    try {
      const alerts: any[] = [];

      // Productos sin stock o con stock bajo
      const productosStockBajo = await this.prisma.producto.findMany({
        where: {
          OR: [
            { stock: { lte: 0 } },
            {
              AND: [
                { stock: { gt: 0 } },
                { stock: { lte: 5 } }, // Consideramos stock bajo si es <= 5
              ],
            },
          ],
        },
        select: {
          id: true,
          nombre: true,
          stock: true,
          stockMinimo: true,
        },
        take: 5,
      });

      productosStockBajo.forEach((producto) => {
        if (producto.stock <= 0) {
          alerts.push({
            id: `stock-out-${producto.id}`,
            type: 'critical',
            title: 'Producto sin stock',
            description: `${producto.nombre} está agotado`,
            action: `/admin/productos/${producto.id}`,
            icon: 'AlertTriangle',
            color: 'text-red-600',
          });
        } else if (producto.stock <= 5) {
          alerts.push({
            id: `stock-low-${producto.id}`,
            type: 'warning',
            title: 'Stock bajo',
            description: `${producto.nombre} tiene stock bajo (${producto.stock})`,
            action: `/admin/productos/${producto.id}`,
            icon: 'AlertTriangle',
            color: 'text-yellow-600',
          });
        }
      });

      // Reclamos sin resolver
      const reclamosPendientes = await this.prisma.reclamo.count({
        where: { estado: { in: ['ABIERTO', 'EN_PROCESO'] } },
      });

      if (reclamosPendientes > 0) {
        alerts.push({
          id: 'complaints-pending',
          type: 'warning',
          title: 'Reclamos pendientes',
          description: `Tienes ${reclamosPendientes} reclamos por atender`,
          action: '/admin/reclamos',
          icon: 'MessageSquare',
          color: 'text-orange-600',
        });
      }

      // Pedidos pendientes de hace más de 2 días
      const dosDiasAtras = new Date();
      dosDiasAtras.setDate(dosDiasAtras.getDate() - 2);

      const pedidosAtrasados = await this.prisma.pedido.count({
        where: {
          estado: 'PENDIENTE',
          creadoEn: { lt: dosDiasAtras },
        },
      });

      if (pedidosAtrasados > 0) {
        alerts.push({
          id: 'orders-delayed',
          type: 'critical',
          title: 'Pedidos atrasados',
          description: `${pedidosAtrasados} pedidos llevan más de 2 días pendientes`,
          action: '/admin/pedidos',
          icon: 'Clock',
          color: 'text-red-600',
        });
      }

      return {
        mensaje: 'Alertas críticas obtenidas correctamente',
        data: alerts.slice(0, 5), // Máximo 5 alertas
      };
    } catch (error) {
      console.error('Error al obtener alertas críticas:', error);
      return {
        mensaje: 'Error al obtener alertas críticas',
        data: [],
      };
    }
  }

  async getSalesOverview(period: string) {
    try {
      const hoy = new Date();
      let fechaInicio: Date;

      switch (period) {
        case 'day':
          fechaInicio = new Date(hoy);
          fechaInicio.setHours(0, 0, 0, 0);
          break;
        case 'week':
          fechaInicio = new Date(hoy);
          fechaInicio.setDate(hoy.getDate() - 7);
          break;
        case 'month':
          fechaInicio = new Date(hoy);
          fechaInicio.setMonth(hoy.getMonth() - 1);
          break;
        default:
          fechaInicio = new Date(hoy);
          fechaInicio.setDate(hoy.getDate() - 7);
      }

      const ventas = await this.prisma.pedido.findMany({
        where: {
          creadoEn: { gte: fechaInicio },
          estado: { not: 'CANCELADO' },
        },
        select: {
          total: true,
          estado: true,
          creadoEn: true,
        },
      });

      const ingresosTotales = ventas.reduce(
        (sum, venta) => sum + Number(venta.total),
        0
      );
      const ventasCompletadas = ventas.filter(
        (v) => v.estado === 'ENTREGADO'
      ).length;
      const ventasPendientes = ventas.filter((v) =>
        ['PENDIENTE', 'CONFIRMADO', 'PROCESANDO', 'ENVIADO'].includes(v.estado)
      ).length;

      return {
        mensaje: 'Resumen de ventas obtenido correctamente',
        data: {
          period,
          totalVentas: ventas.length,
          ventasCompletadas,
          ventasPendientes,
          ingresosTotales,
          promedioVenta:
            ventas.length > 0 ? ingresosTotales / ventas.length : 0,
        },
      };
    } catch (error) {
      console.error('Error al obtener resumen de ventas:', error);
      throw error;
    }
  }

  async getRecentActivity() {
    try {
      const activities: Activity[] = [];

      // Obtener usuarios recientes (últimos 3)
      const recentUsers = await this.prisma.usuario.findMany({
        take: 3,
        orderBy: { creadoEn: 'desc' },
        select: {
          id: true,
          nombres: true,
          apellidos: true,
          email: true,
          creadoEn: true,
        },
      });

      // Obtener pedidos recientes (últimos 3)
      const recentOrders = await this.prisma.pedido.findMany({
        take: 3,
        orderBy: { creadoEn: 'desc' },
        select: {
          id: true,
          total: true,
          estado: true,
          creadoEn: true,
          usuario: {
            select: {
              nombres: true,
              apellidos: true,
            },
          },
        },
      });

      // Obtener reclamos recientes (últimos 3)
      const recentComplaints = await this.prisma.reclamo.findMany({
        take: 3,
        orderBy: { creadoEn: 'desc' },
        select: {
          id: true,
          asunto: true,
          estado: true,
          creadoEn: true,
          usuario: {
            select: {
              nombres: true,
              apellidos: true,
            },
          },
        },
      });

      // Obtener productos actualizados recientemente (últimos 3)
      const recentProducts = await this.prisma.producto.findMany({
        take: 3,
        orderBy: { actualizadoEn: 'desc' },
        select: {
          id: true,
          nombre: true,
          stock: true,
          actualizadoEn: true,
        },
      });

      // Agregar usuarios recientes
      recentUsers.forEach((user) => {
        activities.push({
          id: `user-${user.id}`,
          type: 'user',
          title: 'Nuevo usuario registrado',
          description: `${user.nombres || ''} ${user.apellidos || ''} se registró en la plataforma`,
          timestamp: user.creadoEn,
          icon: 'User',
          color: 'text-blue-600',
        });
      });

      // Agregar pedidos recientes
      recentOrders.forEach((order) => {
        activities.push({
          id: `order-${order.id}`,
          type: 'order',
          title: 'Nuevo pedido realizado',
          description: `Pedido #${order.id} por S/ ${order.total.toString()} - ${order.usuario?.nombres || 'Usuario'}`,
          timestamp: order.creadoEn,
          icon: 'ShoppingBag',
          color: 'text-green-600',
        });
      });

      // Agregar reclamos recientes
      recentComplaints.forEach((complaint) => {
        activities.push({
          id: `complaint-${complaint.id}`,
          type: 'complaint',
          title: 'Nuevo reclamo recibido',
          description: `${complaint.asunto} - ${complaint.usuario?.nombres || 'Usuario'}`,
          timestamp: complaint.creadoEn,
          icon: 'AlertTriangle',
          color: 'text-red-600',
        });
      });

      // Agregar productos actualizados
      recentProducts.forEach((product) => {
        activities.push({
          id: `product-${product.id}`,
          type: 'product',
          title: 'Producto actualizado',
          description: `${product.nombre} - Stock: ${product.stock}`,
          timestamp: product.actualizadoEn,
          icon: 'Package',
          color: 'text-yellow-600',
        });
      });

      // Ordenar por fecha más reciente y tomar los primeros 8
      activities.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      const recentActivities = activities.slice(0, 8);

      return {
        mensaje: 'Actividad reciente obtenida correctamente',
        data: recentActivities,
      };
    } catch (error) {
      console.error('Error al obtener actividad reciente:', error);
      return {
        mensaje: 'Error al obtener actividad reciente',
        data: [],
      };
    }
  }
}
