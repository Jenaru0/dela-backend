import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { CarritoService } from './carrito.service';
import { JwtAutenticacionGuard } from '../autenticacion/guards/jwt-autenticacion.guard';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { PeticionAutenticada } from '../autenticacion/interfaces/peticion.interface';

@Controller('carrito')
@UseGuards(JwtAutenticacionGuard)
export class CarritoController {
  constructor(private readonly carritoService: CarritoService) {}

  @Get()
  async getCarrito(@Request() req: PeticionAutenticada) {
    return this.carritoService.getCarrito(req.user.id);
  }

  @Post('items')
  async addItemToCart(
    @Body() dto: AddCartItemDto,
    @Request() req: PeticionAutenticada
  ) {
    return this.carritoService.addItemToCart(req.user.id, dto);
  }

  @Put('items/:productoId')
  async updateCartItem(
    @Param('productoId', ParseIntPipe) productoId: number,
    @Body() dto: UpdateCartItemDto,
    @Request() req: PeticionAutenticada
  ) {
    return this.carritoService.updateCartItem(req.user.id, productoId, dto);
  }

  @Delete('items/:productoId')
  async removeItemFromCart(
    @Param('productoId', ParseIntPipe) productoId: number,
    @Request() req: PeticionAutenticada
  ) {
    return this.carritoService.removeItemFromCart(req.user.id, productoId);
  }

  @Delete()
  async clearCart(@Request() req: PeticionAutenticada) {
    return this.carritoService.clearCart(req.user.id);
  }
}
