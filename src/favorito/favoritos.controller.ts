import {
  Controller,
  Post,
  Delete,
  Param,
  ParseIntPipe,
  Body,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FavoritosService } from './favoritos.service';
import { JwtAutenticacionGuard } from '../autenticacion/guards/jwt-autenticacion.guard';
import { CreateFavoritoDto } from './dto/create-favorito.ts';
import { PeticionAutenticada } from '../autenticacion/interfaces/peticion.interface';

@Controller('favoritos')
@UseGuards(JwtAutenticacionGuard)
export class FavoritosController {
  constructor(private readonly favoritosService: FavoritosService) {}

  @Get()
  async getFavoritos(@Request() req: PeticionAutenticada) {
    // req.user.id debe venir del guard de autenticación
    return this.favoritosService.getFavoritos(req.user.id);
  }

  @Post()
  async addFavorito(
    @Body() dto: CreateFavoritoDto,
    @Request() req: PeticionAutenticada
  ) {
    // req.user.id debe existir (tu guard de JWT debe ponerlo)
    return this.favoritosService.addFavorito(req.user.id, dto);
  }
  @Delete(':productoId')
  async removeFavorito(
    @Param('productoId', ParseIntPipe) productoId: number,
    @Request() req: PeticionAutenticada
  ) {
    return this.favoritosService.removeFavorito(req.user.id, productoId);
  }
}
