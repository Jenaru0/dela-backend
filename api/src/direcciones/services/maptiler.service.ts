import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MapTilerFeature {
  id: string;
  type: 'Feature';
  text: string;
  place_name: string;
  place_type: string[];
  relevance: number;
  center: [number, number]; // [longitude, latitude]
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  properties: {
    ref?: string;
    country_code?: string;
    kind?:
      | 'road'
      | 'road_relation'
      | 'admin_area'
      | 'place'
      | 'street'
      | 'virtual_street';
    categories?: string[];
    'osm:tags'?: Record<string, any>;
    'osm:place_type'?: string;
  };
  context?: Array<{
    id: string;
    text: string;
    short_code?: string;
    wikidata?: string;
    ref?: string;
    country_code?: string;
    kind?: string;
    categories?: string[];
    'osm:tags'?: Record<string, any>;
    'osm:place_type'?: string;
  }>;
  bbox?: [number, number, number, number]; // [west, south, east, north]
  address?: string;
}

export interface MapTilerGeocodingResponse {
  type: 'FeatureCollection';
  features: MapTilerFeature[];
  query: string[];
  attribution: string;
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
        types: 'address,locality,municipality,region', // Tipos más específicos para direcciones
        autocomplete: 'true', // Habilitar autocompletado
        fuzzyMatch: 'true', // Búsqueda aproximada
      });

      const response = await fetch(`${url}?${params}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `MapTiler API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = (await response.json()) as MapTilerGeocodingResponse;

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
        types: 'address,locality,municipality', // Tipos específicos para reverse geocoding
      });

      const response = await fetch(`${url}?${params}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `MapTiler API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = (await response.json()) as MapTilerReverseGeocodingResponse;

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

    // Procesar contexto según la jerarquía de MapTiler
    contexto.forEach((item) => {
      const itemId = item.id.toLowerCase();

      // Identificar el tipo de elemento geográfico por su ID
      if (itemId.includes('postal_code') || itemId.includes('postcode')) {
        codigoPostal = item.text;
      }
      // País (country)
      else if (itemId.includes('country')) {
        // Ya sabemos que es Perú por el filtro
      }
      // Región/Departamento (region level)
      else if (itemId.includes('region') || itemId.includes('subregion')) {
        departamento = item.text;
      }
      // Provincia/County
      else if (itemId.includes('county') || itemId.includes('municipality')) {
        if (itemId.includes('joint_municipality')) {
          // Nivel provincial mayor
          provincia = provincia || item.text;
        } else if (itemId.includes('municipality')) {
          // Puede ser distrito o provincia, depende del contexto
          if (!distrito) distrito = item.text;
          if (!provincia) provincia = item.text;
        }
      }
      // Localidad/Distrito
      else if (
        itemId.includes('locality') ||
        itemId.includes('neighbourhood') ||
        itemId.includes('municipal_district')
      ) {
        distrito = distrito || item.text;
      }
      // Lugar específico
      else if (itemId.includes('place')) {
        distrito = distrito || item.text;
      }
    });

    // Si no hay información de contexto, usar place_name y place_type
    if ((!departamento || !provincia || !distrito) && feature.place_type) {
      const placeTypes = feature.place_type;

      // Si es una localidad/municipio, usarlo como distrito
      if (
        placeTypes.includes('locality') ||
        placeTypes.includes('municipality')
      ) {
        distrito =
          distrito ||
          feature.text ||
          this.extraerPrimerElemento(feature.place_name);
      }

      // Si es una región, usarla como departamento
      if (placeTypes.includes('region') || placeTypes.includes('subregion')) {
        departamento = departamento || feature.text;
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

      this.logger.debug(
        `Procesando partes de dirección: ${JSON.stringify(partes)}`
      );

      // Jerarquía esperada para Perú: [Dirección específica, Distrito, Provincia, Departamento]
      if (partes.length >= 3) {
        const len = partes.length;
        departamento = departamento || partes[len - 1];
        provincia = provincia || partes[len - 2];
        distrito = distrito || partes[len - 3];
      } else if (partes.length === 2) {
        departamento = departamento || partes[1] || 'Lima';
        distrito = distrito || partes[0];
        provincia = provincia || distrito;
      } else if (partes.length === 1) {
        distrito = distrito || partes[0];
        departamento = departamento || 'Lima';
        provincia = provincia || distrito;
      }
    }

    // Extraer código postal del place_name si no se encontró
    if (!codigoPostal) {
      codigoPostal = this.extraerCodigoPostal(feature.place_name) || '';
    }

    // Aplicar fallbacks y limpieza
    const finalDepartamento = this.limpiarTexto(departamento) || 'Lima';
    const finalProvincia =
      this.limpiarTexto(provincia) ||
      (finalDepartamento === 'Lima' ? 'Lima' : finalDepartamento);
    const finalDistrito = this.limpiarTexto(distrito) || finalProvincia;

    // Generar código postal si no se encontró
    if (!codigoPostal && finalDistrito) {
      codigoPostal = this.generarCodigoPostalPorDistrito(finalDistrito);
    }

    const resultado = {
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

    this.logger.debug(
      `Resultado final procesado:`,
      JSON.stringify(resultado, null, 2)
    );

    return resultado;
  }

  /**
   * Extraer el primer elemento útil de una cadena separada por comas
   */
  private extraerPrimerElemento(texto: string): string {
    return texto.split(',')[0]?.trim() || '';
  }

  /**
   * Limpiar texto eliminando caracteres especiales y normalizando
   */
  private limpiarTexto(texto: string): string {
    if (!texto) return '';

    return texto
      .trim()
      .replace(/^\d+\s+/, '') // Remover números al inicio
      .replace(/\s+/g, ' ') // Normalizar espacios
      .trim();
  }

  /**
   * Extraer código postal de un texto usando patrones mejorados
   */
  private extraerCodigoPostal(texto: string): string {
    const patterns = [
      /\b(\d{5})\b/g, // 5 dígitos exactos
      /Lima\s+(\d{5})/gi, // "Lima 15036"
      /,\s*(\d{5})\s*[,\s]/g, // ", 15036, " o ", 15036 "
      /PE[\s-]?(\d{5})/gi, // "PE 15036" o "PE-15036"
      /(\d{5})\s+(?:Lima|Perú)/gi, // "15036 Lima"
    ];

    this.logger.debug(`Buscando código postal en: "${texto}"`);

    for (const pattern of patterns) {
      pattern.lastIndex = 0; // Reset regex state
      const match = pattern.exec(texto);
      if (match && match[1] && match[1].length === 5) {
        this.logger.debug(
          `Código postal encontrado: ${match[1]} con patrón: ${pattern}`
        );
        return match[1];
      }
    }

    return '';
  }

  /**
   * Generar código postal aproximado basado en distrito conocido
   */
  private generarCodigoPostalPorDistrito(distrito: string): string {
    const codigosPostalesLima: Record<string, string> = {
      // Lima Metropolitana
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

      // Departamento de Ica
      Ica: '11001',
      'Provincia de Ica': '11001',
      Chincha: '11701',
      'Chincha Alta': '11701',
      Pisco: '11601',
      Nazca: '11401',
      Palpa: '11501',

      // Otras provincias comunes
      Callao: '07001',
      Ventanilla: '07056',
      'La Punta': '07036',
    };

    // Buscar coincidencia exacta o parcial
    let codigoPostal = codigosPostalesLima[distrito];

    if (!codigoPostal) {
      // Buscar coincidencia parcial (case insensitive)
      const distritoLower = distrito.toLowerCase();
      for (const [key, value] of Object.entries(codigosPostalesLima)) {
        if (
          key.toLowerCase().includes(distritoLower) ||
          distritoLower.includes(key.toLowerCase())
        ) {
          codigoPostal = value;
          break;
        }
      }
    }

    return codigoPostal || '';
  }

  /**
   * Buscar direcciones con mejores filtros y validación
   */
  async buscarDireccionesConFiltros(
    query: string,
    opciones?: {
      limite?: number;
      proximidad?: [number, number]; // [longitude, latitude]
      boundingBox?: [number, number, number, number]; // [west, south, east, north]
      soloUrbanAreas?: boolean;
    }
  ): Promise<DireccionValidada[]> {
    if (!this.apiKey) {
      throw new Error('MapTiler API key not configured');
    }

    const {
      limite = 5,
      proximidad,
      boundingBox,
      soloUrbanAreas = false,
    } = opciones || {};

    try {
      const url = `${this.baseUrl}/geocoding/${encodeURIComponent(query)}.json`;
      const params = new URLSearchParams({
        key: this.apiKey,
        country: 'pe',
        limit: limite.toString(),
        language: 'es',
        types: soloUrbanAreas
          ? 'locality,municipality,neighbourhood'
          : 'address,locality,municipality,region',
        autocomplete: 'true',
        fuzzyMatch: 'true',
      });

      // Agregar proximidad si se proporciona
      if (proximidad) {
        params.append('proximity', `${proximidad[0]},${proximidad[1]}`);
      }

      // Agregar bounding box si se proporciona
      if (boundingBox) {
        params.append('bbox', boundingBox.join(','));
      }

      const response = await fetch(`${url}?${params}`);

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `MapTiler API error: ${response.status} - ${errorText}`
        );
        throw new Error(
          `Error en búsqueda: ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as MapTilerGeocodingResponse;

      return data.features
        .map((feature) => this.procesarFeatureMapTiler(feature))
        .filter((direccion) => this.validarDireccionPeru(direccion));
    } catch (error: unknown) {
      this.logger.error('Error en búsqueda de direcciones con filtros:', error);
      throw error;
    }
  }

  /**
   * Validar que una dirección es válida para Perú
   */
  private validarDireccionPeru(direccion: DireccionValidada): boolean {
    // Verificar coordenadas dentro de Perú
    const { latitud, longitud } = direccion;
    const estaEnPeru =
      latitud >= -18.35 &&
      latitud <= -0.04 &&
      longitud >= -81.33 &&
      longitud <= -68.65;

    if (!estaEnPeru) {
      this.logger.debug(
        `Dirección fuera de Perú: ${direccion.direccionCompleta}`
      );
      return false;
    }

    // Verificar que tenga información mínima
    if (!direccion.departamento || !direccion.distrito) {
      this.logger.debug(
        `Dirección con datos incompletos: ${direccion.direccionCompleta}`
      );
      return false;
    }

    return true;
  }

  /**
   * Obtener sugerencias de autocompletado optimizadas
   */
  async obtenerSugerencias(
    query: string,
    limite: number = 5
  ): Promise<DireccionValidada[]> {
    if (query.length < 3) {
      return []; // No buscar con queries muy cortos
    }

    return this.buscarDireccionesConFiltros(query, {
      limite,
      soloUrbanAreas: query.length < 10, // Para queries cortos, solo áreas urbanas
    });
  }

  /**
   * Verificar disponibilidad del servicio MapTiler
   */
  async verificarDisponibilidad(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      // Hacer una consulta simple para verificar conectividad
      const url = `${this.baseUrl}/geocoding/Lima.json`;
      const params = new URLSearchParams({
        key: this.apiKey,
        limit: '1',
      });

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        // Nota: fetch no tiene timeout nativo, se podría implementar con AbortController
      });

      return response.ok;
    } catch (error) {
      this.logger.warn('MapTiler service not available:', error);
      return false;
    }
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
