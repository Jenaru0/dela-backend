import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFavoritoDto } from './dto/create-favorito.ts';

@Injectable()
export class FavoritosService {
  constructor(private prisma: PrismaService) {}

  async addFavorito(usuarioId: number, dto: CreateFavoritoDto) {
    const producto = await this.prisma.producto.findUnique({
      where: { id: dto.productoId },
    });
    if (!producto) throw new NotFoundException('Producto no encontrado');

    try {
      return await this.prisma.favorito.create({
        data: {
          usuarioId: usuarioId,
          productoId: dto.productoId,
        },
        include: { producto: true },
      });
    } catch (err) {
      if (err.code === 'P2002') {
        throw new ConflictException('Este producto ya está en favoritos');
      }
      throw err;
    }
  }

  async removeFavorito(usuarioId: number, productoId: number) {
    const favorito = await this.prisma.favorito.findUnique({
      where: { usuarioId_productoId: { usuarioId, productoId } },
    });
    if (!favorito)
      throw new NotFoundException('Este producto no está en favoritos');
    return this.prisma.favorito.delete({
      where: { usuarioId_productoId: { usuarioId, productoId } },
    });
  }

  async getFavoritos(usuarioId: number) {
    return this.prisma.favorito.findMany({
      where: { usuarioId },
      include: {
        producto: {
          include: {
            imagenes: true, // <-- AGREGADO AQUÍ
            categoria: true, // <-- AGREGADO AQUÍ
          },
        },
      },
      orderBy: { creadoEn: 'desc' },
    });
  }
}
