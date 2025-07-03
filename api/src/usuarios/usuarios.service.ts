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
import * as bcrypt from 'bcrypt';

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

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(dto.contrasena, 10);

    // Separar la contraseña del resto de datos
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { contrasena: _, ...userData } = dto;

    // Crear usuario con autenticación
    return this.prisma.usuario.create({
      data: {
        ...userData,
        auth: {
          create: {
            contrasena: hashedPassword,
          },
        },
      },
      select: {
        id: true,
        email: true,
        nombres: true,
        apellidos: true,
        celular: true,
        tipoUsuario: true,
        activo: true,
        creadoEn: true,
        actualizadoEn: true,
      },
    });
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

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    return this.prisma.usuario.update({
      where: { id },
      data: { activo: true },
    });
  }

  // Nuevo método: desactivar usuario
  async deactivateUser(id: number): Promise<Usuario> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    return this.prisma.usuario.update({
      where: { id },
      data: { activo: false },
    });
  }

  // Método para que un usuario desactive su propia cuenta
  async deactivateOwnAccount(id: number): Promise<Usuario> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    if (!usuario.activo) {
      throw new ConflictException('La cuenta ya está desactivada.');
    }

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
          'El correo ya está registrado por otro usuario.'
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
  // Método de paginación para admin (igual que productos)
  async findAllWithPagination(
    page: number = 1,
    limit: number = 10,
    filters: { search?: string } = {}
  ) {
    const skip = (page - 1) * limit;

    // Construir condiciones de búsqueda
    const where: { OR?: any[] } = {};

    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { nombres: { contains: filters.search, mode: 'insensitive' } },
        { apellidos: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [usuarios, total] = await Promise.all([
      this.prisma.usuario.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'asc' }, // Orden ascendente por ID igual que productos
      }),
      this.prisma.usuario.count({ where }),
    ]);

    return {
      data: usuarios,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Método para obtener el perfil actualizado del usuario autenticado
  async obtenerPerfilActualizado(usuarioId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        email: true,
        nombres: true,
        apellidos: true,
        celular: true,
        tipoUsuario: true,
        activo: true,
        suscrito_newsletter: true,
        creadoEn: true,
        actualizadoEn: true,
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (!usuario.activo) {
      throw new NotFoundException('Usuario inactivo');
    }

    return usuario;
  }
}
