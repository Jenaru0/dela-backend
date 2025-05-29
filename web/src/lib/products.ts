  export interface Product {
    id: string;
    name: string;
    price: number;
    oldPrice?: number;
    image: string;
    category: string;
    discount?: number;
    // Propiedades adicionales para el catálogo completo
    description?: string;
    rating?: number;
    reviews?: number;
    isNew?: boolean;
    isFeatured?: boolean;
    stock?: number;
  }

  export const products: Product[] = [
    {
      id: '1',
      name: 'Leche DELA Premium',
      price: 8.5,
      image: '/images/products/product-1.svg',
      category: 'Leche',
    },
    {
      id: '2',
      name: 'Yogurt Natural DELA',
      price: 12.0,
      image: '/images/products/product-2.svg',
      category: 'Yogurt',
    },
    {
      id: '3',
      name: 'Yogurt Griego DELA',
      price: 15.5,
      oldPrice: 18.0,
      image: '/images/products/product-3.svg',
      category: 'Yogurt',
    },
    {
      id: '4',
      name: 'Queso Fresco DELA',
      price: 25.0,
      image: '/images/products/product-4.svg',
      category: 'Quesos',
    },
    {
      id: '5',
      name: 'Helado DELA Vainilla',
      price: 18.9,
      oldPrice: 22.0,
      image: '/images/products/product-5.svg',
      category: 'Helados',
    },
    {
      id: '6',
      name: 'Queso Madurado DELA',
      price: 32.5,
      image: '/images/products/product-6.svg',
      category: 'Quesos',
    },
  ];
