import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { PromocionesService } from './promociones.service';
import { CreatePromocionDto } from './dto/crear-promocion.dto';
import { UpdatePromocionDto } from './dto/update-promocion.dto';
import { FiltrosPromocionesDto } from './dto/filtros-promociones.dto';
import { JwtAutenticacionGuard } from '../autenticacion/guards/jwt-autenticacion.guard';

@Controller('promociones')
@UseGuards(JwtAutenticacionGuard)
export class PromocionesController {
  constructor(private readonly promocionesService: PromocionesService) {}

  @Post()
  async create(@Body() dto: CreatePromocionDto, @Request() req) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden crear promociones',
      );
    }

    return this.promocionesService.create(dto);
  }

  @Get()
  async findAll(@Query() filtros: FiltrosPromocionesDto, @Request() req) {
    // Los clientes solo pueden ver promociones activas y vigentes
    if (req.user.tipoUsuario !== 'ADMIN') {
      filtros.activo = true;
      filtros.vigente = true;
    }

    return this.promocionesService.findAll(filtros);
  }

  @Get('validar/:codigo')
  async validarPromocion(
    @Param('codigo') codigo: string,
    @Query('monto') monto?: string,
  ) {
    const montoCompra = monto ? parseFloat(monto) : undefined;
    return this.promocionesService.validarPromocion(codigo, montoCompra);
  }

  @Post('calcular-descuento')
  async calcularDescuento(
    @Body('codigo') codigo: string,
    @Body('subtotal') subtotal: number,
  ) {
    return this.promocionesService.calcularDescuento(codigo, subtotal);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden ver detalles de promociones',
      );
    }

    return this.promocionesService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePromocionDto,
    @Request() req,
  ) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden actualizar promociones',
      );
    }

    return this.promocionesService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden eliminar promociones',
      );
    }

    return this.promocionesService.remove(id);
  }
}
