import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';
import type { Usuario } from '@prisma/client';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUsuarioDto) {
    // Solo verifica por email, ya que findUnique solo acepta campos únicos
    const existe: any = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });
    // Si existe y está activo, lanza error
    if (existe && existe.activo === true)
      throw new ConflictException('El correo ya está registrado.');
    return this.prisma.usuario.create({ data: dto });
  }

  findAll(includeInactive = false) {
    if (includeInactive) {
      // Para admin: mostrar todos los usuarios (activos e inactivos)
      return this.prisma.usuario.findMany({
        orderBy: { creadoEn: 'desc' },
      });
    }
    // Para usuarios normales: solo usuarios activos
    return this.prisma.usuario.findMany({
      where: { activo: true },
      orderBy: { creadoEn: 'desc' },
    });
  }

  findOne(id: number) {
    // Solo si está activo
    return this.prisma.usuario.findFirst({
      where: { AND: [{ id }, { activo: true }] },
    });
  }

  // Nuevo método para admin: obtener usuario por ID (activo o inactivo)
  findOneForAdmin(id: number) {
    return this.prisma.usuario.findUnique({
      where: { id },
    });
  }

  async update(id: number, dto: UpdateUsuarioDto): Promise<Usuario> {
    const usuario = await this.prisma.usuario.findFirst({
      where: { AND: [{ id }, { activo: true }] },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return this.prisma.usuario.update({ where: { id }, data: dto });
  }

  // Nuevo método para admin: actualizar cualquier usuario
  async updateForAdmin(id: number, dto: UpdateUsuarioDto): Promise<Usuario> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return this.prisma.usuario.update({ where: { id }, data: dto });
  }

  // Nuevo método: activar usuario
  async activateUser(id: number): Promise<Usuario> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    return this.prisma.usuario.update({
      where: { id },
      data: { activo: true },
    });
  }

  // Nuevo método: desactivar usuario
  async deactivateUser(id: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    return this.prisma.usuario.update({
      where: { id },
      data: { activo: false },
    });
  }

  async remove(id: number) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { AND: [{ id }, { activo: true }] },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    // Soft delete: actualiza el campo activo a false
    return this.prisma.usuario.update({
      where: { id },
      data: { activo: false },
    });
  }

  async actualizarPerfil(id: number, dto: ActualizarPerfilDto) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { AND: [{ id }, { activo: true }] },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    // Si se está actualizando el email, verificar que no exista
    if (dto.email && dto.email !== usuario.email) {
      const emailExiste = await this.prisma.usuario.findUnique({
        where: { email: dto.email },
      });
      if (emailExiste && emailExiste.id !== id) {
        throw new ConflictException(
          'El correo ya está registrado por otro usuario.',
        );
      }
    }

    return this.prisma.usuario.update({
      where: { id },
      data: dto,
    });
  }

  async deactivateAccount(id: number) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { AND: [{ id }, { activo: true }] },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    // Desactivar la cuenta
    return this.prisma.usuario.update({
      where: { id },
      data: { activo: false },
    });
  }
}
