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
  async findAll(@Request() req: PeticionAutenticada) {
    // Solo admin puede listar todos
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo administradores pueden listar todos los usuarios.',
      );
    }
    // Admin puede ver todos los usuarios (incluyendo inactivos)
    const usuarios = await this.usuariosService.findAll(true);
    return {
      mensaje: 'Lista de usuarios obtenida correctamente.',
      data: usuarios,
    };
  }

  @Get('me')
  @UseGuards(JwtAutenticacionGuard)
  async getProfile(@Request() req: PeticionAutenticada) {
    const usuario = await this.usuariosService.findOne(Number(req.user.sub));
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
      Number(req.user.sub),
      dto,
    );
    return {
      mensaje: 'Perfil actualizado correctamente.',
      data: usuario,
    };
  }

  @Patch('me/desactivar')
  @UseGuards(JwtAutenticacionGuard)
  async deactivateAccount(@Request() req: PeticionAutenticada) {
    await this.usuariosService.deactivateAccount(Number(req.user.sub));
    return {
      mensaje: 'Cuenta desactivada correctamente.',
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
      if (req.user.sub !== usuario?.id) {
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
      if (req.user.sub !== +id) {
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
    if (req.user.tipoUsuario !== 'ADMIN' && req.user.sub !== +id) {
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
