import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CarritoService {
  constructor(private prisma: PrismaService) {}

  async getCarrito(usuarioId: number) {
    // First, ensure the user has a cart
    await this.ensureCartExists(usuarioId);

    const carrito = await this.prisma.carrito.findUnique({
      where: { usuarioId },
      include: {
        items: {
          include: {
            producto: {
              include: {
                imagenes: true,
                categoria: true,
              },
            },
          },
        },
      },
    });

    return carrito;
  }

  async addItemToCart(usuarioId: number, dto: AddCartItemDto) {
    // Verify product exists
    const producto = await this.prisma.producto.findUnique({
      where: { id: dto.productoId },
    });
    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }

    // Check stock
    if (producto.stock < dto.cantidad) {
      throw new BadRequestException('Stock insuficiente');
    }

    // Ensure cart exists
    const carrito = await this.ensureCartExists(usuarioId);

    // Check if item already exists in cart
    const existingItem = await this.prisma.carritoItem.findUnique({
      where: {
        carritoId_productoId: {
          carritoId: carrito.id,
          productoId: dto.productoId,
        },
      },
    });

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.cantidad + dto.cantidad;

      if (producto.stock < newQuantity) {
        throw new BadRequestException('Stock insuficiente');
      }

      return await this.prisma.carritoItem.update({
        where: {
          carritoId_productoId: {
            carritoId: carrito.id,
            productoId: dto.productoId,
          },
        },
        data: { cantidad: newQuantity },
        include: {
          producto: {
            include: {
              imagenes: true,
              categoria: true,
            },
          },
        },
      });
    } else {
      // Create new item
      return await this.prisma.carritoItem.create({
        data: {
          carritoId: carrito.id,
          productoId: dto.productoId,
          cantidad: dto.cantidad,
        },
        include: {
          producto: {
            include: {
              imagenes: true,
              categoria: true,
            },
          },
        },
      });
    }
  }

  async updateCartItem(
    usuarioId: number,
    productoId: number,
    dto: UpdateCartItemDto
  ) {
    const carrito = await this.ensureCartExists(usuarioId);

    // Verify product exists
    const producto = await this.prisma.producto.findUnique({
      where: { id: productoId },
    });
    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }

    // Check stock
    if (producto.stock < dto.cantidad) {
      throw new BadRequestException('Stock insuficiente');
    }

    // Check if item exists in cart
    const existingItem = await this.prisma.carritoItem.findUnique({
      where: {
        carritoId_productoId: {
          carritoId: carrito.id,
          productoId: productoId,
        },
      },
    });

    if (!existingItem) {
      throw new NotFoundException('Producto no encontrado en el carrito');
    }

    return await this.prisma.carritoItem.update({
      where: {
        carritoId_productoId: {
          carritoId: carrito.id,
          productoId: productoId,
        },
      },
      data: { cantidad: dto.cantidad },
      include: {
        producto: {
          include: {
            imagenes: true,
            categoria: true,
          },
        },
      },
    });
  }

  async removeItemFromCart(usuarioId: number, productoId: number) {
    const carrito = await this.ensureCartExists(usuarioId);

    const existingItem = await this.prisma.carritoItem.findUnique({
      where: {
        carritoId_productoId: {
          carritoId: carrito.id,
          productoId: productoId,
        },
      },
    });

    if (!existingItem) {
      throw new NotFoundException('Producto no encontrado en el carrito');
    }

    return await this.prisma.carritoItem.delete({
      where: {
        carritoId_productoId: {
          carritoId: carrito.id,
          productoId: productoId,
        },
      },
    });
  }

  async clearCart(usuarioId: number) {
    const carrito = await this.ensureCartExists(usuarioId);

    await this.prisma.carritoItem.deleteMany({
      where: { carritoId: carrito.id },
    });

    return { message: 'Carrito vaciado exitosamente' };
  }

  private async ensureCartExists(usuarioId: number) {
    let carrito = await this.prisma.carrito.findUnique({
      where: { usuarioId },
    });

    if (!carrito) {
      carrito = await this.prisma.carrito.create({
        data: { usuarioId },
      });
    }

    return carrito;
  }
}
