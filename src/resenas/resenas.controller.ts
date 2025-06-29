import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ResenasService } from './resenas.service';
import { CreateResenaDto, UpdateResenaDto } from './dto';
import { JwtAutenticacionGuard } from '../autenticacion/guards/jwt-autenticacion.guard';
import { EstadoResena } from '@prisma/client';
import { PeticionAutenticada } from '../autenticacion/interfaces/peticion.interface';

@Controller('resenas')
export class ResenasController {
  constructor(private readonly resenasService: ResenasService) {}

  @Post()
  @UseGuards(JwtAutenticacionGuard)
  create(
    @Request() req: PeticionAutenticada,
    @Body() createResenaDto: CreateResenaDto
  ) {
    return this.resenasService.create(req.user.id, createResenaDto);
  }

  @Get('mis-resenas')
  @UseGuards(JwtAutenticacionGuard)
  findMyResenas(
    @Request() req: PeticionAutenticada,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number
  ) {
    return this.resenasService.findByUser(req.user.id, page, limit);
  }

  @Get('producto/:productoId')
  findByProduct(
    @Param('productoId', ParseIntPipe) productoId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('estado') estado?: EstadoResena
  ) {
    return this.resenasService.findByProduct(productoId, page, limit, estado);
  }

  @Get('producto/:productoId/estadisticas')
  getProductRatingStats(@Param('productoId', ParseIntPipe) productoId: number) {
    return this.resenasService.getProductRatingStats(productoId);
  }
  @Get('admin')
  @UseGuards(JwtAutenticacionGuard)
  findAllAdmin(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('estado') estado?: EstadoResena
  ) {
    return this.resenasService.findAll(page, limit, estado);
  }

  @Get('admin/estadisticas')
  @UseGuards(JwtAutenticacionGuard)
  getStatistics() {
    return this.resenasService.getStatistics();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.resenasService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAutenticacionGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateResenaDto: UpdateResenaDto,
    @Request() req: PeticionAutenticada
  ) {
    return this.resenasService.update(
      id,
      updateResenaDto,
      req.user.id,
      req.user.tipoUsuario
    );
  }

  @Delete(':id')
  @UseGuards(JwtAutenticacionGuard)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: PeticionAutenticada
  ) {
    return this.resenasService.remove(id, req.user.id, req.user.tipoUsuario);
  }
}
