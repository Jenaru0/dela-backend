import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MapTilerService } from '../services/maptiler.service';
import { JwtAutenticacionGuard } from '../../autenticacion/guards/jwt-autenticacion.guard';

@Controller('geocoding')
@UseGuards(JwtAutenticacionGuard)
export class GeocodingController {
  constructor(private readonly mapTilerService: MapTilerService) {}

  /**
   * Buscar direcciones con autocompletado
   * GET /geocoding/search?q=Av Javier Prado&limit=5
   */
  @Get('search')
  async buscarDirecciones(
    @Query('q') query: string,
    @Query('limit') limit?: string
  ) {
    if (!query || query.trim().length < 3) {
      return {
        mensaje: 'La búsqueda debe tener al menos 3 caracteres',
        data: [],
      };
    }

    try {
      const limite = limit ? parseInt(limit, 10) : 5;
      const resultados = await this.mapTilerService.buscarDirecciones(
        query.trim(),
        limite
      );

      return {
        mensaje: 'Búsqueda realizada correctamente',
        data: resultados,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      return {
        mensaje: 'Error al buscar direcciones',
        data: [],
        error: errorMessage,
      };
    }
  }

  /**
   * Validar una dirección específica
   * GET /geocoding/validate?address=Av Javier Prado 123, San Isidro, Lima
   */
  @Get('validate')
  async validarDireccion(@Query('address') direccion: string) {
    if (!direccion || direccion.trim().length < 5) {
      return {
        mensaje: 'La dirección debe tener al menos 5 caracteres',
        data: null,
        esValida: false,
      };
    }

    try {
      const resultado = await this.mapTilerService.validarDireccion(
        direccion.trim()
      );

      return {
        mensaje: resultado
          ? 'Dirección validada correctamente'
          : 'No se pudo validar la dirección',
        data: resultado,
        esValida: resultado?.esValida || false,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      return {
        mensaje: 'Error al validar dirección',
        data: null,
        esValida: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Geocodificación inversa - obtener dirección desde coordenadas
   * GET /geocoding/reverse?lat=-12.0463731&lng=-77.0427934
   */
  @Get('reverse')
  async geocodificacionInversa(
    @Query('lat') latitud: string,
    @Query('lng') longitud: string
  ) {
    if (!latitud || !longitud) {
      return {
        mensaje: 'Se requieren las coordenadas latitud y longitud',
        data: null,
      };
    }

    try {
      const lat = parseFloat(latitud);
      const lng = parseFloat(longitud);

      if (isNaN(lat) || isNaN(lng)) {
        return {
          mensaje: 'Las coordenadas deben ser números válidos',
          data: null,
        };
      }

      const resultado =
        await this.mapTilerService.obtenerDireccionDesdeCoordenadas(lat, lng);

      return {
        mensaje: resultado
          ? 'Dirección obtenida correctamente'
          : 'No se encontró dirección para estas coordenadas',
        data: resultado,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      return {
        mensaje: 'Error en geocodificación inversa',
        data: null,
        error: errorMessage,
      };
    }
  }

  /**
   * Verificar cobertura en una ubicación
   * GET /geocoding/coverage?lat=-12.0463731&lng=-77.0427934
   */
  @Get('coverage')
  verificarCobertura(
    @Query('lat') latitud: string,
    @Query('lng') longitud: string
  ) {
    if (!latitud || !longitud) {
      return {
        mensaje: 'Se requieren las coordenadas latitud y longitud',
        tieneCobertura: false,
      };
    }

    try {
      const lat = parseFloat(latitud);
      const lng = parseFloat(longitud);

      if (isNaN(lat) || isNaN(lng)) {
        return {
          mensaje: 'Las coordenadas deben ser números válidos',
          tieneCobertura: false,
        };
      }

      const tieneCobertura = this.mapTilerService.estaEnZonaCobertura(lat, lng);

      return {
        mensaje: tieneCobertura
          ? 'Ubicación con cobertura de delivery'
          : 'Ubicación fuera del área de cobertura',
        tieneCobertura,
        coordenadas: { latitud: lat, longitud: lng },
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      return {
        mensaje: 'Error al verificar cobertura',
        tieneCobertura: false,
        error: errorMessage,
      };
    }
  }
}
