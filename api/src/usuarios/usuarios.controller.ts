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
  ForbiddenException,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';
import { JwtAutenticacionGuard } from '../autenticacion/guards/jwt-autenticacion.guard';
import { PeticionAutenticada } from '../autenticacion/interfaces/peticion.interface';
import type { Usuario } from '@prisma/client';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  // Creación de usuario (solo admin puede crear usuarios de cualquier tipo)
  @Post()
  @UseGuards(JwtAutenticacionGuard)
  async create(
    @Body() createUsuarioDto: CreateUsuarioDto,
    @Request() req: PeticionAutenticada,
  ) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo administradores pueden crear usuarios.',
      );
    }
    const usuario = await this.usuariosService.create(createUsuarioDto);
    return {
      mensaje: 'Usuario creado exitosamente por admin.',
      data: usuario,
    };
  }
  @Get()
  @UseGuards(JwtAutenticacionGuard)
  async findAll(
    @Request() req: PeticionAutenticada,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    // Solo admin puede listar todos
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo administradores pueden listar todos los usuarios.',
      );
    }

    // Usar paginación igual que productos
    const result = await this.usuariosService.findAllWithPagination(
      page,
      limit,
      { search },
    );

    return {
      mensaje: 'Lista de usuarios obtenida correctamente.',
      data: result.data,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    };
  }

  @Get('me')
  @UseGuards(JwtAutenticacionGuard)
  async getProfile(@Request() req: PeticionAutenticada) {
    const usuario = await this.usuariosService.findOne(Number(req.user.id));
    return {
      mensaje: 'Perfil obtenido correctamente.',
      data: usuario,
    };
  }

  @Patch('me')
  @UseGuards(JwtAutenticacionGuard)
  async updateProfile(
    @Body() dto: ActualizarPerfilDto,
    @Request() req: PeticionAutenticada,
  ) {
    const usuario = await this.usuariosService.actualizarPerfil(
      Number(req.user.id),
      dto,
    );
    return {
      mensaje: 'Perfil actualizado correctamente.',
      data: usuario,
    };
  }

  @Patch('me/desactivar')
  @UseGuards(JwtAutenticacionGuard)
  async deactivateOwnAccount(@Request() req: PeticionAutenticada) {
    const userId = req.user.id;
    if (!userId) {
      throw new ForbiddenException('Usuario no válido.');
    }

    const usuario = await this.usuariosService.deactivateOwnAccount(userId);
    return {
      mensaje: 'Cuenta desactivada correctamente.',
      data: usuario,
    };
  }

  @Get(':id')
  @UseGuards(JwtAutenticacionGuard)
  async findOne(@Param('id') id: string, @Request() req: PeticionAutenticada) {
    let usuario: Usuario | null;

    if (req.user.tipoUsuario === 'ADMIN') {
      // Admin puede ver cualquier usuario (activo o inactivo)
      usuario = await this.usuariosService.findOneForAdmin(+id);
    } else {
      // Usuario normal solo puede ver usuarios activos
      usuario = await this.usuariosService.findOne(+id);
      // Solo el propio usuario puede ver su perfil
      if (req.user.id !== usuario?.id) {
        throw new ForbiddenException(
          'No tienes permisos para ver este usuario.',
        );
      }
    }

    return {
      mensaje: 'Usuario obtenido correctamente.',
      data: usuario,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAutenticacionGuard)
  async update(
    @Param('id') id: string,
    @Body() updateUsuarioDto: UpdateUsuarioDto,
    @Request() req: PeticionAutenticada,
  ) {
    let usuario: Usuario;

    if (req.user.tipoUsuario === 'ADMIN') {
      // Admin puede actualizar cualquier usuario
      usuario = await this.usuariosService.updateForAdmin(
        +id,
        updateUsuarioDto,
      );
    } else {
      // Usuario normal solo puede editarse a sí mismo
      if (req.user.id !== +id) {
        throw new ForbiddenException(
          'No tienes permisos para editar este usuario.',
        );
      }
      usuario = await this.usuariosService.update(+id, updateUsuarioDto);
    }

    return {
      mensaje: 'Usuario actualizado correctamente.',
      data: usuario,
    };
  }

  @Patch(':id/activar')
  @UseGuards(JwtAutenticacionGuard)
  async activateUser(
    @Param('id') id: string,
    @Request() req: PeticionAutenticada,
  ) {
    // Solo admin puede activar usuarios
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo administradores pueden activar usuarios.',
      );
    }

    const usuario: Usuario = await this.usuariosService.activateUser(+id);
    return {
      mensaje: 'Usuario activado correctamente.',
      data: usuario,
    };
  }

  @Patch(':id/desactivar')
  @UseGuards(JwtAutenticacionGuard)
  async deactivateUser(
    @Param('id') id: string,
    @Request() req: PeticionAutenticada,
  ) {
    // Solo admin puede desactivar usuarios
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo administradores pueden desactivar usuarios.',
      );
    }

    const usuario = await this.usuariosService.deactivateUser(+id);
    return {
      mensaje: 'Usuario desactivado correctamente.',
      data: usuario,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAutenticacionGuard)
  async remove(@Param('id') id: string, @Request() req: PeticionAutenticada) {
    // Solo admin o el propio usuario puede eliminar
    if (req.user.tipoUsuario !== 'ADMIN' && req.user.id !== +id) {
      throw new ForbiddenException(
        'No tienes permisos para eliminar este usuario.',
      );
    }
    await this.usuariosService.remove(+id);
    return {
      mensaje: 'Usuario desactivado correctamente.',
    };
  }
}
