// src/catalogo/catalogo.controller.ts
import { Controller, Get, Query, Param } from '@nestjs/common';
import { CatalogoService } from './catalogo.service';
import { FiltrosCatalogoDto } from './dto/FiltrosCatalogoDto';

@Controller('catalogo')
export class CatalogoController {
  constructor(private readonly catalogoService: CatalogoService) {}

  @Get('productos')
  obtenerProductos(@Query() filtros: FiltrosCatalogoDto) {
    return this.catalogoService.obtenerProductos(filtros);
  }

  @Get('productos/:id')
  async obtenerProductoPorId(@Param('id') id: string) {
    return this.catalogoService.obtenerProductoPorId(Number(id));
  }
}
