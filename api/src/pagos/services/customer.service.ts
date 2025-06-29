import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MercadoPagoConfig, Customer, CardToken } from 'mercadopago';
import {
  getMercadoPagoConfig,
  createMercadoPagoConfig,
} from '../mercadopago.config';

/**
 * Servicio dedicado a Customer y CardToken APIs de MercadoPago
 * Maneja: crear clientes, obtener clientes, buscar clientes, crear tokens de tarjeta
 */
@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);
  private mercadopago: MercadoPagoConfig;

  constructor(private readonly prisma: PrismaService) {
    const config = getMercadoPagoConfig();
    this.mercadopago = createMercadoPagoConfig(config);
  }

  /**
   * Crear cliente en MercadoPago
   */
  async crearCliente(datos: {
    email: string;
    first_name?: string;
    last_name?: string;
    phone?: {
      area_code?: string;
      number?: string;
    };
    identification?: {
      type?: string;
      number?: string;
    };
    description?: string;
  }) {
    try {
      this.logger.log(`Creando cliente con email: ${datos.email}`);

      const customer = new Customer(this.mercadopago);

      // Preparar datos sin address para evitar errores de tipo
      const clienteData = {
        email: datos.email,
        first_name: datos.first_name,
        last_name: datos.last_name,
        phone: datos.phone,
        identification: datos.identification,
        description: datos.description,
      };

      const nuevoCliente = await customer.create({
        body: clienteData,
      });

      this.logger.log(`Cliente creado: ${nuevoCliente.id}`);

      return {
        id: nuevoCliente.id,
        email: nuevoCliente.email,
        first_name: nuevoCliente.first_name,
        last_name: nuevoCliente.last_name,
        phone: nuevoCliente.phone,
        identification: nuevoCliente.identification,
        address: nuevoCliente.address,
        description: nuevoCliente.description,
        date_created: nuevoCliente.date_created,
        date_last_updated: nuevoCliente.date_last_updated,
      };
    } catch (error) {
      this.logger.error(`Error al crear cliente: ${error.message}`);

      if (error.message?.includes('already_exists')) {
        throw new BadRequestException(
          'Ya existe un cliente con este email en MercadoPago'
        );
      }

      throw new BadRequestException(`Error al crear cliente: ${error.message}`);
    }
  }

  /**
   * Obtener cliente por ID
   */
  async obtenerCliente(clienteId: string) {
    try {
      this.logger.log(`Obteniendo cliente: ${clienteId}`);

      const customer = new Customer(this.mercadopago);
      const cliente = await customer.get({ customerId: clienteId });

      return {
        id: cliente.id,
        email: cliente.email,
        first_name: cliente.first_name,
        last_name: cliente.last_name,
        phone: cliente.phone,
        identification: cliente.identification,
        address: cliente.address,
        description: cliente.description,
        date_created: cliente.date_created,
        date_last_updated: cliente.date_last_updated,
        cards: cliente.cards,
      };
    } catch (error) {
      this.logger.error(`Error al obtener cliente: ${error.message}`);

      if (error.message?.includes('not found')) {
        throw new NotFoundException('Cliente no encontrado en MercadoPago');
      }

      throw new BadRequestException(
        `Error al obtener cliente: ${error.message}`
      );
    }
  }

  /**
   * Buscar clientes
   */
  async buscarClientes(filtros: {
    email?: string;
    limit?: number;
    offset?: number;
  }) {
    try {
      this.logger.log('Buscando clientes en MercadoPago');

      const customer = new Customer(this.mercadopago);

      const options: Record<string, string | number> = {
        limit: filtros.limit || 50,
        offset: filtros.offset || 0,
      };

      // Solo agregar email si está definido
      if (filtros.email && filtros.email.trim() !== '') {
        options.email = filtros.email;
      }

      const resultados = await customer.search({
        options,
      });

      return resultados;
    } catch (error) {
      this.logger.error(`Error al buscar clientes: ${error.message}`);
      throw new BadRequestException(
        `Error al buscar clientes: ${error.message}`
      );
    }
  }

  /**
   * Actualizar cliente
   */
  async actualizarCliente(
    clienteId: string,
    datos: {
      email?: string;
      first_name?: string;
      last_name?: string;
      phone?: {
        area_code?: string;
        number?: string;
      };
      identification?: {
        type?: string;
        number?: string;
      };
      description?: string;
    }
  ) {
    try {
      this.logger.log(`Actualizando cliente: ${clienteId}`);

      const customer = new Customer(this.mercadopago);
      const clienteActualizado = await customer.update({
        customerId: clienteId,
        body: datos,
      });

      this.logger.log(`Cliente actualizado: ${clienteId}`);

      return {
        id: clienteActualizado.id,
        email: clienteActualizado.email,
        first_name: clienteActualizado.first_name,
        last_name: clienteActualizado.last_name,
        phone: clienteActualizado.phone,
        identification: clienteActualizado.identification,
        address: clienteActualizado.address,
        description: clienteActualizado.description,
        date_last_updated: clienteActualizado.date_last_updated,
      };
    } catch (error) {
      this.logger.error(`Error al actualizar cliente: ${error.message}`);

      if (error.message?.includes('not found')) {
        throw new NotFoundException('Cliente no encontrado en MercadoPago');
      }

      throw new BadRequestException(
        `Error al actualizar cliente: ${error.message}`
      );
    }
  }

  /**
   * Crear token de tarjeta
   */
  async crearTokenTarjeta(datosTarjeta: {
    card_number: string;
    security_code: string;
    expiration_month: string;
    expiration_year: string;
    cardholder: {
      name: string;
      identification?: {
        type: string;
        number: string;
      };
    };
  }) {
    try {
      this.logger.log('Creando token de tarjeta');

      const cardToken = new CardToken(this.mercadopago);
      const token = await cardToken.create({
        body: datosTarjeta,
      });

      this.logger.log(`Token de tarjeta creado: ${token.id}`);

      return {
        id: token.id,
        status: token.status,
        date_created: token.date_created,
        date_last_updated: token.date_last_updated,
        date_due: token.date_due,
        luhn_validation: token.luhn_validation,
        live_mode: token.live_mode,
        card_number_length: token.card_number_length,
        cardholder: token.cardholder,
        first_six_digits: token.first_six_digits,
        last_four_digits: token.last_four_digits,
      };
    } catch (error) {
      this.logger.error(`Error al crear token de tarjeta: ${error.message}`);

      if (error.message?.includes('invalid_card_number')) {
        throw new BadRequestException('Número de tarjeta inválido');
      }

      if (error.message?.includes('invalid_security_code')) {
        throw new BadRequestException('Código de seguridad inválido');
      }

      if (error.message?.includes('invalid_expiration_date')) {
        throw new BadRequestException('Fecha de vencimiento inválida');
      }

      throw new BadRequestException(
        `Error al crear token de tarjeta: ${error.message}`
      );
    }
  }
}
