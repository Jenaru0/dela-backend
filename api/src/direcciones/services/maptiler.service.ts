import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MapTilerFeature {
  id: string;
  type: string;
  place_name: string;
  relevance: number;
  center: [number, number]; // [longitude, latitude]
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  properties: {
    category?: string;
    maki?: string;
    short_code?: string;
  };
  context: Array<{
    id: string;
    short_code?: string;
    wikidata?: string;
    text: string;
  }>;
}

export interface MapTilerGeocodingResponse {
  features: MapTilerFeature[];
  attribution: string;
  query: string[];
}

export interface MapTilerReverseGeocodingResponse {
  features: MapTilerFeature[];
}

export interface DireccionValidada {
  direccionCompleta: string;
  departamento: string;
  provincia: string;
  distrito: string;
  codigoPostal?: string; // Agregamos código postal opcional
  latitud: number;
  longitud: number;
  esValida: boolean;
  mapTilerPlaceId: string;
  confianza: number; // 0-1
}

@Injectable()
export class MapTilerService {
  private readonly logger = new Logger(MapTilerService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.maptiler.com';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('MAPTILER_API_KEY') ?? '';
    if (!this.apiKey) {
      this.logger.warn(
        'MapTiler API key not found. Geocoding features will be disabled.'
      );
    }
  }

  /**
   * Buscar direcciones con autocompletado
   */
  async buscarDirecciones(
    query: string,
    limite: number = 5
  ): Promise<DireccionValidada[]> {
    if (!this.apiKey) {
      throw new Error('MapTiler API key not configured');
    }

    try {
      // Filtrar solo resultados de Perú
      const url = `${this.baseUrl}/geocoding/${encodeURIComponent(query)}.json`;
      const params = new URLSearchParams({
        key: this.apiKey,
        country: 'pe', // Solo Perú
        limit: limite.toString(),
        language: 'es', // Español
        types: 'address,poi,place', // Direcciones, puntos de interés, lugares
      });

      const response = await fetch(`${url}?${params}`);

      if (!response.ok) {
        throw new Error(
          `MapTiler API error: ${response.status} ${response.statusText}`
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const data: MapTilerGeocodingResponse = await response.json();

      return data.features.map((feature) =>
        this.procesarFeatureMapTiler(feature)
      );
    } catch (error: unknown) {
      this.logger.error('Error en búsqueda de direcciones:', error);
      throw error;
    }
  }

  /**
   * Validar una dirección específica
   */
  async validarDireccion(direccion: string): Promise<DireccionValidada | null> {
    const resultados = await this.buscarDirecciones(direccion, 1);
    return resultados.length > 0 ? resultados[0] : null;
  }

  /**
   * Geocodificación inversa - obtener dirección desde coordenadas
   */
  async obtenerDireccionDesdeCoordenadas(
    latitud: number,
    longitud: number
  ): Promise<DireccionValidada | null> {
    if (!this.apiKey) {
      throw new Error('MapTiler API key not configured');
    }

    try {
      const url = `${this.baseUrl}/geocoding/${longitud},${latitud}.json`;
      const params = new URLSearchParams({
        key: this.apiKey,
        language: 'es',
      });

      const response = await fetch(`${url}?${params}`);

      if (!response.ok) {
        throw new Error(
          `MapTiler API error: ${response.status} ${response.statusText}`
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const data: MapTilerReverseGeocodingResponse = await response.json();

      if (data.features.length > 0) {
        return this.procesarFeatureMapTiler(data.features[0]);
      }

      return null;
    } catch (error: unknown) {
      this.logger.error('Error en geocodificación inversa:', error);
      throw error;
    }
  }

  /**
   * Calcular distancia entre dos puntos (en kilómetros)
   */
  calcularDistancia(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(valor: number): number {
    return valor * (Math.PI / 180);
  }

  /**
   * Procesar feature de MapTiler a nuestro formato
   */
  private procesarFeatureMapTiler(feature: MapTilerFeature): DireccionValidada {
    const [longitud, latitud] = feature.center;

    // Extraer información geográfica del contexto
    const contexto = feature.context || [];
    let departamento = '';
    let provincia = '';
    let distrito = '';
    let codigoPostal = '';

    // Debug: Log para ver la estructura de datos
    this.logger.debug('MapTiler feature:', JSON.stringify(feature, null, 2));

    // MapTiler maneja la jerarquía administrativa diferente para cada país
    // Para Perú, necesitamos mapear correctamente los niveles administrativos
    contexto.forEach((item) => {
      const itemId = item.id.toLowerCase();
      const shortCode = item.short_code?.toLowerCase();

      // Código postal - buscar en diferentes campos
      if (itemId.includes('postcode') || itemId.includes('postal')) {
        codigoPostal = item.text;
      }
      // Departamento/Región (nivel 1) - PE-LIM, PE-CUS, etc.
      else if (shortCode?.startsWith('pe-') && shortCode.length === 6) {
        departamento = item.text;
      }
      // Región/Estado
      else if (
        itemId.includes('region') ||
        itemId.includes('state') ||
        itemId.includes('administrative_area_level_1')
      ) {
        departamento = departamento || item.text;
      }
      // Provincia (nivel 2)
      else if (
        itemId.includes('administrative_area_level_2') ||
        itemId.includes('county')
      ) {
        provincia = item.text;
      }
      // Distrito (nivel 3)
      else if (
        itemId.includes('locality') ||
        itemId.includes('administrative_area_level_3') ||
        itemId.includes('sublocality')
      ) {
        distrito = item.text;
      }
    });

    // Extraer código postal del place_name si no se encontró en contexto
    if (!codigoPostal) {
      // Buscar patrones de código postal peruano (5 dígitos)
      const patterns = [
        /\b(\d{5})\b/, // 5 dígitos exactos
        /Lima\s+(\d{5})/i, // "Lima 15036"
        /,\s*(\d{5})\s*,/, // ", 15036, "
        /PE\s+(\d{5})/i, // "PE 15036"
      ];

      for (const pattern of patterns) {
        const match = feature.place_name.match(pattern);
        if (match && match[1]) {
          codigoPostal = match[1];
          break;
        }
      }
    }

    // Parsing inteligente del place_name para campos faltantes
    if (!departamento || !provincia || !distrito) {
      const partes = feature.place_name
        .split(',')
        .map((p) => p.trim())
        .filter((p) => {
          const lower = p.toLowerCase();
          return lower !== 'peru' && lower !== 'perú' && !/^\d{5}$/.test(p);
        });

      // MapTiler suele usar formato: "Dirección específica, Distrito, Provincia, Departamento"
      if (partes.length >= 3) {
        const len = partes.length;
        departamento = departamento || partes[len - 1];
        provincia = provincia || partes[len - 2];
        distrito = distrito || partes[len - 3];
      } else if (partes.length === 2) {
        departamento = departamento || partes[1] || 'Lima';
        distrito = distrito || partes[0];
        provincia = provincia || distrito; // En algunos casos distrito = provincia
      } else if (partes.length === 1) {
        distrito = distrito || partes[0];
      }
    }

    // Fallbacks para datos de Lima
    const finalDepartamento = departamento || 'Lima';
    const finalProvincia =
      provincia || (finalDepartamento === 'Lima' ? 'Lima' : finalDepartamento);
    const finalDistrito = distrito || finalProvincia;

    // Generar código postal basado en distrito si no se encontró
    if (!codigoPostal && finalDistrito) {
      codigoPostal = this.generarCodigoPostalPorDistrito(finalDistrito);
    }

    return {
      direccionCompleta: feature.place_name,
      departamento: finalDepartamento,
      provincia: finalProvincia,
      distrito: finalDistrito,
      codigoPostal: codigoPostal || '',
      latitud,
      longitud,
      esValida: feature.relevance > 0.7,
      mapTilerPlaceId: feature.id,
      confianza: feature.relevance,
    };
  }

  /**
   * Generar código postal aproximado basado en distrito conocido
   */
  private generarCodigoPostalPorDistrito(distrito: string): string {
    const codigosPostalesLima: Record<string, string> = {
      Miraflores: '15074',
      'San Isidro': '15036',
      Surco: '15023',
      'Santiago de Surco': '15023',
      'La Molina': '15024',
      'San Borja': '15037',
      Barranco: '15063',
      Chorrillos: '15067',
      Surquillo: '15038',
      'Magdalena del Mar': '15076',
      'Pueblo Libre': '15084',
      'Jesús María': '15072',
      Lince: '15073',
      Breña: '15082',
      Lima: '15001',
      'Cercado de Lima': '15001',
      'San Vicente de Cañete': '15701',
      Cañete: '15701',
    };

    return codigosPostalesLima[distrito] || '';
  }

  /**
   * Verificar si una coordenada está en zona de cobertura
   * (puedes personalizar esto según tus zonas de delivery)
   */
  estaEnZonaCobertura(latitud: number, longitud: number): boolean {
    // Por ahora, verificamos que esté en Perú (aproximadamente)
    // Perú está entre -18.35° y -0.04° latitud, -81.33° y -68.65° longitud
    const estaEnPeru =
      latitud >= -18.35 &&
      latitud <= -0.04 &&
      longitud >= -81.33 &&
      longitud <= -68.65;

    if (!estaEnPeru) return false;

    // Aquí puedes agregar lógica más específica:
    // - Verificar contra una lista de distritos con cobertura
    // - Calcular distancia desde tu centro de distribución
    // - Consultar base de datos de zonas de cobertura

    return true;
  }
}
