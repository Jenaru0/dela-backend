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
import { ReclamosService } from './reclamos.service';
import {
  CreateReclamoDto,
  UpdateReclamoDto,
  CreateComentarioReclamoDto,
} from './dto';
import { JwtAutenticacionGuard } from '../autenticacion/guards/jwt-autenticacion.guard';
import { AdminGuard } from '../autenticacion/guards/admin.guard';
import { EstadoReclamo } from '@prisma/client';
import { PeticionAutenticada } from '../autenticacion/interfaces/peticion.interface';

@Controller('reclamos')
@UseGuards(JwtAutenticacionGuard)
export class ReclamosController {
  constructor(private readonly reclamosService: ReclamosService) {}

  @Post()
  create(
    @Request() req: PeticionAutenticada,
    @Body() createReclamoDto: CreateReclamoDto,
  ) {
    return this.reclamosService.create(req.user.id, createReclamoDto);
  }

  @Get('mis-reclamos')
  findMyReclamos(
    @Request() req: PeticionAutenticada,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.reclamosService.findByUser(req.user.id, page, limit);
  }

  @Get('admin')
  @UseGuards(AdminGuard)
  findAllAdmin(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('estado') estado?: EstadoReclamo,
    @Query('prioridad') prioridad?: string,
    @Query('tipoReclamo') tipoReclamo?: string,
    @Query('search') search?: string,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ) {
    return this.reclamosService.findAll(
      page,
      limit,
      estado,
      prioridad,
      tipoReclamo,
      search,
      fechaInicio,
      fechaFin,
    );
  }

  @Get('admin/estadisticas')
  @UseGuards(AdminGuard)
  getStatistics() {
    return this.reclamosService.getStatistics();
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: PeticionAutenticada,
  ) {
    return this.reclamosService.findOne(id, req.user.id, req.user.tipoUsuario);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateReclamoDto: UpdateReclamoDto,
    @Request() req: PeticionAutenticada,
  ) {
    return this.reclamosService.update(
      id,
      updateReclamoDto,
      req.user.id,
      req.user.tipoUsuario,
    );
  }

  @Post(':id/comentarios')
  addComment(
    @Param('id', ParseIntPipe) id: number,
    @Body() createComentarioDto: CreateComentarioReclamoDto,
    @Request() req: PeticionAutenticada,
  ) {
    return this.reclamosService.addComment(
      id,
      req.user.id,
      createComentarioDto,
      req.user.tipoUsuario,
    );
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: PeticionAutenticada,
  ) {
    return this.reclamosService.remove(id, req.user.id, req.user.tipoUsuario);
  }
}
