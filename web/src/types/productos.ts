// Types for products catalog
import { Product } from '@/lib/products';

export interface FilterState {
  search: string;
  category: string;
  priceMin: string;
  priceMax: string;
  destacado: boolean;
  disponible: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface Categoria {
  id: string;
  nombre: string;
}

export interface OpcionOrdenamiento {
  value: string;
  label: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ProductsResponse {
  data: Product[];
  meta: PaginationMeta;
}


export type ViewMode = 'grid' | 'list';

export interface CartProduct extends Product {
  quantity: number;
}