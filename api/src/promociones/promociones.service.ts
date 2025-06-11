import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromocionDto } from './dto/crear-promocion.dto';
import { UpdatePromocionDto } from './dto/update-promocion.dto';
import { FiltrosPromocionesDto } from './dto/filtros-promociones.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PromocionesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePromocionDto) {
    const existeCodigo = await this.prisma.promocion.findUnique({
      where: { codigo: dto.codigo },
    });

    if (existeCodigo) {
      throw new BadRequestException('Ya existe una promoción con este código');
    }

    const inicio = new Date(dto.inicioValidez);
    const fin = new Date(dto.finValidez);

    if (fin <= inicio) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      );
    }

    return this.prisma.promocion.create({
      data: {
        ...dto,
        inicioValidez: inicio,
        finValidez: fin,
      },
    });
  }

  async findAll(filtros: FiltrosPromocionesDto = {}) {
    const { codigo, tipo, activo, vigente } = filtros;

    const where: Prisma.PromocionWhereInput = {};

    if (codigo) {
      where.codigo = { contains: codigo, mode: 'insensitive' };
    }

    if (tipo) {
      where.tipo = tipo;
    }

    if (activo !== undefined) {
      where.activo = activo;
    }

    if (vigente) {
      const ahora = new Date();
      where.AND = [
        { inicioValidez: { lte: ahora } },
        { finValidez: { gte: ahora } },
        { activo: true },
      ];
    }

    return this.prisma.promocion.findMany({
      where,
      orderBy: { creadoEn: 'desc' },
    });
  }

  async findOne(id: number) {
    const promocion = await this.prisma.promocion.findUnique({
      where: { id },
    });

    if (!promocion) {
      throw new NotFoundException('Promoción no encontrada');
    }

    return promocion;
  }

  async findByCodigo(codigo: string) {
    const promocion = await this.prisma.promocion.findUnique({
      where: { codigo },
    });

    if (!promocion) {
      throw new NotFoundException('Promoción no encontrada');
    }

    return promocion;
  }

  async update(id: number, dto: UpdatePromocionDto) {
    const promocion = await this.findOne(id);

    if (dto.codigo && dto.codigo !== promocion.codigo) {
      const existeCodigo = await this.prisma.promocion.findUnique({
        where: { codigo: dto.codigo },
      });

      if (existeCodigo) {
        throw new BadRequestException(
          'Ya existe una promoción con este código',
        );
      }
    }

    if (dto.inicioValidez || dto.finValidez) {
      const inicio = dto.inicioValidez
        ? new Date(dto.inicioValidez)
        : promocion.inicioValidez;
      const fin = dto.finValidez
        ? new Date(dto.finValidez)
        : promocion.finValidez;

      if (fin <= inicio) {
        throw new BadRequestException(
          'La fecha de fin debe ser posterior a la fecha de inicio',
        );
      }
    }
    const updateData: Prisma.PromocionUpdateInput = {};

    if (dto.codigo) updateData.codigo = dto.codigo;
    if (dto.nombre) updateData.nombre = dto.nombre;
    if (dto.descripcion) updateData.descripcion = dto.descripcion;
    if (dto.tipo) updateData.tipo = dto.tipo;
    if (dto.valor !== undefined) updateData.valor = dto.valor;
    if (dto.montoMinimo !== undefined) updateData.montoMinimo = dto.montoMinimo;
    if (dto.usoMaximo !== undefined) updateData.usoMaximo = dto.usoMaximo;
    if (dto.activo !== undefined) updateData.activo = dto.activo;
    if (dto.inicioValidez)
      updateData.inicioValidez = new Date(dto.inicioValidez);
    if (dto.finValidez) updateData.finValidez = new Date(dto.finValidez);

    return this.prisma.promocion.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.promocion.delete({
      where: { id },
    });
  }

  async validarPromocion(codigo: string, montoCompra?: number) {
    const promocion = await this.prisma.promocion.findUnique({
      where: { codigo },
    });

    if (!promocion) {
      throw new NotFoundException('Código de promoción no válido');
    }

    if (!promocion.activo) {
      throw new BadRequestException('Esta promoción no está activa');
    }

    const ahora = new Date();
    if (ahora < promocion.inicioValidez) {
      throw new BadRequestException('Esta promoción aún no es válida');
    }

    if (ahora > promocion.finValidez) {
      throw new BadRequestException('Esta promoción ha expirado');
    }

    if (promocion.usoMaximo && promocion.usoActual >= promocion.usoMaximo) {
      throw new BadRequestException(
        'Esta promoción ha alcanzado su límite de uso',
      );
    }

    if (
      promocion.montoMinimo &&
      montoCompra &&
      Number(promocion.montoMinimo) > montoCompra
    ) {
      throw new BadRequestException(
        `Monto mínimo de compra: S/${Number(promocion.montoMinimo)}`,
      );
    }

    return promocion;
  }

  async incrementarUso(codigo: string) {
    return this.prisma.promocion.update({
      where: { codigo },
      data: {
        usoActual: {
          increment: 1,
        },
      },
    });
  }

  async calcularDescuento(codigo: string, subtotal: number) {
    const promocion = await this.validarPromocion(codigo, subtotal);

    let descuento = 0;

    switch (promocion.tipo) {
      case 'PORCENTAJE':
        descuento = (subtotal * Number(promocion.valor)) / 100;
        break;
      case 'MONTO_FIJO':
        descuento = Number(promocion.valor);
        break;
      case 'ENVIO_GRATIS':
        descuento = 0;
        break;
      case 'PRODUCTO_GRATIS':
        descuento = 0;
        break;
    }

    if (descuento > subtotal) {
      descuento = subtotal;
    }

    return {
      promocion,
      descuento,
    };
  }
}
