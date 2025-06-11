import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Inicializando base de datos...');

  // Limpiar la base de datos
  console.log('🧹 Limpiando datos existentes...');
  await prisma.comentarioReclamo.deleteMany();
  await prisma.reclamo.deleteMany();
  await prisma.pago.deleteMany();
  await prisma.detallePedido.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.carritoItem.deleteMany();
  await prisma.carrito.deleteMany();
  await prisma.favorito.deleteMany();
  await prisma.resena.deleteMany();
  await prisma.imagenProducto.deleteMany();
  await prisma.producto.deleteMany();
  await prisma.categoriaProducto.deleteMany();
  await prisma.direccionCliente.deleteMany();
  await prisma.newsletter.deleteMany();
  await prisma.promocion.deleteMany();
  await prisma.recuperacionContrasena.deleteMany();
  await prisma.autenticacionUsuario.deleteMany();
  await prisma.usuario.deleteMany();
  // Crear categorías DELA
  console.log('📦 Creando categorías DELA...');
  const categorias = await Promise.all([
    prisma.categoriaProducto.create({
      data: {
        nombre: 'Leche DELA',
        descripcion: 'Leche fresca y natural de la mejor calidad',
        slug: 'leche-dela',
        imagenUrl: '/images/categories/leche-dela.jpg',
        activo: true,
      },
    }),
    prisma.categoriaProducto.create({
      data: {
        nombre: 'Yogurt DELA',
        descripcion: 'Yogurt artesanal con frutas naturales',
        slug: 'yogurt-dela',
        imagenUrl: '/images/categories/yogurt-dela.jpg',
        activo: true,
      },
    }),
    prisma.categoriaProducto.create({
      data: {
        nombre: 'Quesos DELA',
        descripcion: 'Quesos frescos y maduros, 100% leche de vaca',
        slug: 'quesos-dela',
        imagenUrl: '/images/categories/quesos-dela.jpg',
        activo: true,
      },
    }),
    prisma.categoriaProducto.create({
      data: {
        nombre: 'Helados DELA',
        descripcion: 'Helados artesanales de sabores únicos',
        slug: 'helados-dela',
        imagenUrl: '/images/categories/helados-dela.jpg',
        activo: true,
      },
    }),
  ]);

  // Crear productos para cada categoría DELA
  console.log('🥛 Creando productos DELA...');
  const productos: any[] = [];

  // Productos Leche DELA
  const productosLeche = await Promise.all([
    prisma.producto.create({
      data: {
        nombre: 'Leche Chocolatada DELA',
        sku: 'LEC-001',
        slug: 'leche-chocolatada-dela',
        descripcion: 'La leche chocolatada tiene varias vitaminas, siendo la principal fuente en la alimentación humana, como la B2 o la B12, aportando un solo vaso de leche más de un tercio de la cantidad diaria que necesitamos. Unas están unidas a la grasa; son la A, la D y la E.',
        descripcionCorta: 'Leche chocolatada 1L',
        precioUnitario: 6.50,
        stock: 80,
        unidadMedida: 'litro',
        peso: 1.0,
        destacado: true,
        categoriaId: categorias[0].id,
        infoNutricional: {
          calorias: 90,
          proteinas: 3.2,
          grasas: 3.5,
          carbohidratos: 12.0,
          fibra: 0.5,
        },
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Leche DELA',
        sku: 'LEC-002',
        slug: 'leche-dela',
        descripcion: 'La leche tiene varias vitaminas. De algunas, la leche es la principal fuente en la alimentación humana, como la B2 o la B12, aportando un solo vaso de leche más de un tercio de la cantidad diaria que necesitamos. Unas están unidas a la grasa; son la A, la D y la E.',
        descripcionCorta: 'Leche entera 1L',
        precioUnitario: 5.50,
        stock: 100,
        unidadMedida: 'litro',
        peso: 1.0,
        destacado: false,
        categoriaId: categorias[0].id,
        infoNutricional: {
          calorias: 60,
          proteinas: 3.2,
          grasas: 3.2,
          carbohidratos: 4.8,
          fibra: 0,
        },
      },
    }),
  ]);

  // Productos Yogurt DELA
  const productosYogurt = await Promise.all([
    prisma.producto.create({
      data: {
        nombre: 'Yogurt Frutado de Fresa DELA',
        sku: 'YOG-001',
        slug: 'yogurt-frutado-fresa-dela',
        descripcion: 'Es una buena fuente de vitamina D, potasio y vitamina B12. Además, los probióticos del yogurt, mejoran la digestión. Y mientras los nutrientes del yogurt son buenos para todos, su mezcla de carbohidratos y proteínas lo hace ideal para corredores.',
        descripcionCorta: 'Yogurt fresa 1L',
        precioUnitario: 10.00,
        stock: 60,
        unidadMedida: 'litro',
        peso: 1.0,
        destacado: true,
        categoriaId: categorias[1].id,
        infoNutricional: {
          calorias: 80,
          proteinas: 3.5,
          grasas: 2.0,
          carbohidratos: 12.0,
          fibra: 0.5,
        },
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Yogurt Frutado de Pitahaya DELA',
        sku: 'YOG-002',
        slug: 'yogurt-frutado-pitahaya-dela',
        descripcion: 'Es una buena fuente de vitamina D, potasio y vitamina B12. Además, los probióticos del yogurt, mejoran la digestión. Y mientras los nutrientes del yogurt son buenos para todos, su mezcla de carbohidratos y proteínas lo hace ideal para corredores.',
        descripcionCorta: 'Yogurt pitahaya 1L',
        precioUnitario: 10.50,
        stock: 50,
        unidadMedida: 'litro',
        peso: 1.0,
        destacado: false,
        categoriaId: categorias[1].id,
        infoNutricional: {
          calorias: 85,
          proteinas: 3.5,
          grasas: 2.0,
          carbohidratos: 13.0,
          fibra: 0.6,
        },
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Yogurt Frutado de Aguaymanto DELA',
        sku: 'YOG-003',
        slug: 'yogurt-frutado-aguaymanto-dela',
        descripcion: 'Es una buena fuente de vitamina D, potasio y vitamina B12. Además, los probióticos del yogurt, mejoran la digestión. Y mientras los nutrientes del yogurt son buenos para todos, su mezcla de carbohidratos y proteínas lo hace ideal para corredores.',
        descripcionCorta: 'Yogurt aguaymanto 1L',
        precioUnitario: 10.90,
        stock: 40,
        unidadMedida: 'litro',
        peso: 1.0,
        destacado: false,
        categoriaId: categorias[1].id,
        infoNutricional: {
          calorias: 88,
          proteinas: 3.6,
          grasas: 2.1,
          carbohidratos: 13.5,
          fibra: 0.7,
        },
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Yogurt Frutado de Arándanos DELA',
        sku: 'YOG-004',
        slug: 'yogurt-frutado-arandanos-dela',
        descripcion: 'Es una buena fuente de vitamina D, potasio y vitamina B12. Además, los probióticos del yogurt, mejoran la digestión. Y mientras los nutrientes del yogurt son buenos para todos, su mezcla de carbohidratos y proteínas lo hace ideal para corredores.',
        descripcionCorta: 'Yogurt arándanos 1L',
        precioUnitario: 10.50,
        stock: 50,
        unidadMedida: 'litro',
        peso: 1.0,
        destacado: false,
        categoriaId: categorias[1].id,
        infoNutricional: {
          calorias: 85,
          proteinas: 3.5,
          grasas: 2.0,
          carbohidratos: 13.0,
          fibra: 0.6,
        },
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Yogurt Frutado de Durazno DELA',
        sku: 'YOG-005',
        slug: 'yogurt-frutado-durazno-dela',
        descripcion: 'Es una buena fuente de vitamina D, potasio y vitamina B12. Además, los probióticos del yogurt, mejoran la digestión. Y mientras los nutrientes del yogurt son buenos para todos, su mezcla de carbohidratos y proteínas lo hace ideal para corredores.',
        descripcionCorta: 'Yogurt durazno 1L',
        precioUnitario: 9.90,
        stock: 45,
        unidadMedida: 'litro',
        peso: 1.0,
        destacado: false,
        categoriaId: categorias[1].id,
        infoNutricional: {
          calorias: 82,
          proteinas: 3.4,
          grasas: 2.0,
          carbohidratos: 12.5,
          fibra: 0.5,
        },
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Yogurt Natural de Vainilla DELA',
        sku: 'YOG-006',
        slug: 'yogurt-natural-vainilla-dela',
        descripcion: 'Es una buena fuente de vitamina D, potasio y vitamina B12. Además, los probióticos del yogurt, mejoran la digestión. Y mientras los nutrientes del yogurt son buenos para todos, su mezcla de carbohidratos y proteínas lo hace ideal para corredores.',
        descripcionCorta: 'Yogurt vainilla 1L',
        precioUnitario: 9.80,
        stock: 55,
        unidadMedida: 'litro',
        peso: 1.0,
        destacado: false,
        categoriaId: categorias[1].id,
        infoNutricional: {
          calorias: 78,
          proteinas: 3.3,
          grasas: 2.0,
          carbohidratos: 11.5,
          fibra: 0.4,
        },
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Yogurt Frutado de Guanábana DELA',
        sku: 'YOG-007',
        slug: 'yogurt-frutado-guanabana-dela',
        descripcion: 'Es una buena fuente de vitamina D, potasio y vitamina B12. Además, los probióticos del yogurt, mejoran la digestión. Y mientras los nutrientes del yogurt son buenos para todos, su mezcla de carbohidratos y proteínas lo hace ideal para corredores.',
        descripcionCorta: 'Yogurt guanabana 1L',
        precioUnitario: 10.80,
        stock: 38,
        unidadMedida: 'litro',
        peso: 1.0,
        destacado: false,
        categoriaId: categorias[1].id,
        infoNutricional: {
          calorias: 87,
          proteinas: 3.4,
          grasas: 2.1,
          carbohidratos: 13.2,
          fibra: 0.6,
        },
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Yogurt Natural de Lúcuma DELA',
        sku: 'YOG-008',
        slug: 'yogurt-natural-lucuma-dela',
        descripcion: 'Es una buena fuente de vitamina D, potasio y vitamina B12. Además, los probióticos del yogurt, mejoran la digestión. Y mientras los nutrientes del yogurt son buenos para todos, su mezcla de carbohidratos y proteínas lo hace ideal para corredores.',
        descripcionCorta: 'Yogurt lúcuma 1L',
        precioUnitario: 10.20,
        stock: 42,
        unidadMedida: 'litro',
        peso: 1.0,
        destacado: false,
        categoriaId: categorias[1].id,
        infoNutricional: {
          calorias: 84,
          proteinas: 3.3,
          grasas: 2.0,
          carbohidratos: 12.8,
          fibra: 0.5,
        },
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Yogurt Frutado de Piña DELA',
        sku: 'YOG-009',
        slug: 'yogurt-frutado-pina-dela',
        descripcion: 'Es una buena fuente de vitamina D, potasio y vitamina B12. Además, los probióticos del yogurt, mejoran la digestión. Y mientras los nutrientes del yogurt son buenos para todos, su mezcla de carbohidratos y proteínas lo hace ideal para corredores.',
        descripcionCorta: 'Yogurt piña 1L',
        precioUnitario: 9.70,
        stock: 48,
        unidadMedida: 'litro',
        peso: 1.0,
        destacado: false,
        categoriaId: categorias[1].id,
        infoNutricional: {
          calorias: 80,
          proteinas: 3.2,
          grasas: 2.0,
          carbohidratos: 12.2,
          fibra: 0.5,
        },
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Yogurt Natural DELA',
        sku: 'YOG-010',
        slug: 'yogurt-natural-dela',
        descripcion: 'Es una buena fuente de vitamina D, potasio y vitamina B12. Además, los probióticos del yogurt, mejoran la digestión. Y mientras los nutrientes del yogurt son buenos para todos, su mezcla de carbohidratos y proteínas lo hace ideal para corredores.',
        descripcionCorta: 'Yogurt natural 1L',
        precioUnitario: 8.90,
        stock: 60,
        unidadMedida: 'litro',
        peso: 1.0,
        destacado: true,
        categoriaId: categorias[1].id,
        infoNutricional: {
          calorias: 75,
          proteinas: 3.2,
          grasas: 2.0,
          carbohidratos: 10.0,
          fibra: 0.3,
        },
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Yogurt Natural Sin Azúcar DELA',
        sku: 'YOG-011',
        slug: 'yogurt-natural-sin-azucar-dela',
        descripcion: 'Es una buena fuente de vitamina D, potasio y vitamina B12. Además, los probióticos del yogurt, mejoran la digestión. Y mientras los nutrientes del yogurt son buenos para todos, su mezcla de carbohidratos y proteínas lo hace ideal para corredores.',
        descripcionCorta: 'Yogurt natural sin azúcar 1L',
        precioUnitario: 8.90,
        stock: 60,
        unidadMedida: 'litro',
        peso: 1.0,
        destacado: false,
        categoriaId: categorias[1].id,
        infoNutricional: {
          calorias: 70,
          proteinas: 3.2,
          grasas: 2.0,
          carbohidratos: 8.0,
          fibra: 0.3,
        },
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Yogurt Frutado de Maracumango DELA',
        sku: 'YOG-012',
        slug: 'yogurt-frutado-maracumango-dela',
        descripcion: 'Es una buena fuente de vitamina D, potasio y vitamina B12. Además, los probióticos del yogurt, mejoran la digestión. Y mientras los nutrientes del yogurt son buenos para todos, su mezcla de carbohidratos y proteínas lo hace ideal para corredores.',
        descripcionCorta: 'Yogurt maracumango 1L',
        precioUnitario: 10.20,
        stock: 40,
        unidadMedida: 'litro',
        peso: 1.0,
        destacado: false,
        categoriaId: categorias[1].id,
        infoNutricional: {
          calorias: 85,
          proteinas: 3.3,
          grasas: 2.0,
          carbohidratos: 12.5,
          fibra: 0.5,
        },
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Yogurt Frutado Endulzado con Stevia',
        sku: 'YOG-013',
        slug: 'yogurt-frutado-stevia-dela',
        descripcion: 'Es una buena fuente de vitamina D, potasio y vitamina B12. Además, los probióticos del yogurt, mejoran la digestión. Y mientras los nutrientes del yogurt son buenos para todos, su mezcla de carbohidratos y proteínas lo hace ideal para corredores.',
        descripcionCorta: 'Yogurt stevia 1L',
        precioUnitario: 9.80,
        stock: 35,
        unidadMedida: 'litro',
        peso: 1.0,
        destacado: false,
        categoriaId: categorias[1].id,
        infoNutricional: {
          calorias: 75,
          proteinas: 3.2,
          grasas: 2.0,
          carbohidratos: 9.0,
          fibra: 0.4,
        },
      },
    }),
    // Yogures griegos DELA
    prisma.producto.create({
      data: {
        nombre: 'Yogurt Griego con jalea de Arándanos',
        sku: 'YOGGR-014',
        slug: 'yogurt-griego-jalea-arandanos-dela',
        descripcion: 'El yogur griego de Arándanos DELA es un alimento altamente palatable, de textura cremosa y muy agradable al paladar. Recomendamos emplear siempre en platos dulces y salados, debido a su sabor neutro.',
        descripcionCorta: 'Yogurt griego 500g',
        precioUnitario: 9.80,
        stock: 35,
        unidadMedida: 'gramos',
        peso: 0.5,
        destacado: false,
        categoriaId: categorias[1].id,
        infoNutricional: {
          calorias: 75,
          proteinas: 3.2,
          grasas: 2.0,
          carbohidratos: 9.0,
          fibra: 0.4,
        },
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Yogurt Griego con jalea de Fresa',
        sku: 'YOGGR-015',
        slug: 'yogurt-griego-jalea-fresa-dela',
        descripcion: 'El yogur griego de Fresa DELA es un alimento altamente palatable, de textura cremosa y muy agradable al paladar. Recomendamos emplear siempre en platos dulces y salados, debido a su sabor neutro.',
        descripcionCorta: 'Yogurt griego 500g',
        precioUnitario: 9.80,
        stock: 35,
        unidadMedida: 'gramos',
        peso: 0.5,
        destacado: false,
        categoriaId: categorias[1].id,
        infoNutricional: {
          calorias: 75,
          proteinas: 3.2,
          grasas: 2.0,
          carbohidratos: 9.0,
          fibra: 0.4,
        },
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Yogurt Griego con jalea de Maracuyá',
        sku: 'YOGGR-016',
        slug: 'yogurt-griego-jalea-maracuya-dela',
        descripcion: 'El yogur griego de Maracuyá DELA es un alimento altamente palatable, de textura cremosa y muy agradable al paladar. Recomendamos emplear siempre en platos dulces y salados, debido a su sabor neutro.',
        descripcionCorta: 'Yogurt griego 500g',
        precioUnitario: 9.80,
        stock: 35,
        unidadMedida: 'gramos',
        peso: 0.5,
        destacado: false,
        categoriaId: categorias[1].id,
        infoNutricional: {
          calorias: 75,
          proteinas: 3.2,
          grasas: 2.0,
          carbohidratos: 9.0,
          fibra: 0.4,
        },
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Yogurt Griego con Granola',
        sku: 'YOGGR-017',
        slug: 'yogurt-griego-granola-dela',
        descripcion: 'El yogur griego con Granola DELA es un alimento altamente palatable, de textura cremosa y muy agradable al paladar. Recomendamos emplear siempre en platos dulces y salados, debido a su sabor neutro.',
        descripcionCorta: 'Yogurt griego 500g',
        precioUnitario: 9.80,
        stock: 35,
        unidadMedida: 'gramos',
        peso: 0.5,
        destacado: false,
        categoriaId: categorias[1].id,
        infoNutricional: {
          calorias: 75,
          proteinas: 3.2,
          grasas: 2.0,
          carbohidratos: 9.0,
          fibra: 0.4,
        },
      },
    }),
  ]);

  // Productos Quesos DELA
  const productosQuesos = await Promise.all([
    prisma.producto.create({
      data: {
        nombre: 'Queso Fresco DELA',
        sku: 'QUE-003',
        slug: 'queso-fresco-dela',
        descripcion: 'El Queso Fresco DELA un alimento rico en vitaminas A y D, ambas vitaminas ayudan al cuerpo a absorber el calcio y a mantener los huesos y los dientes sanos. El queso DELA también es rico en vitaminas del grupo B, entre las que destaca la vitamina B12, la B9, la B1 o la B2.',
        descripcionCorta: 'Queso fresco DELA 500g',
        precioUnitario: 18.90,
        stock: 35,
        unidadMedida: 'pieza',
        peso: 0.5,
        destacado: false,
        categoriaId: categorias[2].id,
        infoNutricional: {
          calorias: 90,
          proteinas: 6.0,
          grasas: 7.0,
          carbohidratos: 1.0,
          fibra: 0,
        },
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Queso Paria DELA',
        sku: 'QUE-004',
        slug: 'queso-paria-dela',
        descripcion: 'El Queso DELA contiene todo tipo de vitaminas y minerales que necesitamos en nuestra dieta diaria y que son indispensables para su salud. Además, el queso, es un gran recurso para consumir la dosis de calcio que tanto necesita nuestro organismo.',
        descripcionCorta: 'Queso paria DELA 500g',
        precioUnitario: 20.90,
        stock: 30,
        unidadMedida: 'pieza',
        peso: 0.5,
        destacado: false,
        categoriaId: categorias[2].id,
        infoNutricional: {
          calorias: 95,
          proteinas: 6.5,
          grasas: 7.5,
          carbohidratos: 1.2,
          fibra: 0,
        },
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Queso Mozzarella DELA',
        sku: 'QUE-005',
        slug: 'queso-mozzarella-dela',
        descripcion: 'El Queso Mozzarella DELA contiene todo tipo de vitaminas y minerales que necesitamos en nuestra dieta diaria y que son indispensables para su salud. Además, el queso, es un gran recurso para consumir la dosis de calcio que tanto necesita nuestro organismo.',
        descripcionCorta: 'Queso mozzarella DELA 500g',
        precioUnitario: 23.90,
        stock: 25,
        unidadMedida: 'pieza',
        peso: 0.5,
        destacado: false,
        categoriaId: categorias[2].id,
        infoNutricional: {
          calorias: 100,
          proteinas: 7.0,
          grasas: 8.0,
          carbohidratos: 1.0,
          fibra: 0,
        },
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Queso EDAM DELA',
        sku: 'QUE-006',
        slug: 'queso-edam-dela',
        descripcion: 'El Queso EDAM DELA contiene todo tipo de vitaminas y minerales que necesitamos en nuestra dieta diaria y que son indispensables para su salud. Además, el queso, es un gran recurso para consumir la dosis de calcio que tanto necesita nuestro organismo.',
        descripcionCorta: 'Queso EDAM DELA 500g',
        precioUnitario: 25.90,
        stock: 20,
        unidadMedida: 'pieza',
        peso: 0.5,
        destacado: false,
        categoriaId: categorias[2].id,
        infoNutricional: {
          calorias: 110,
          proteinas: 7.5,
          grasas: 9.0,
          carbohidratos: 1.0,
          fibra: 0,
        },
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Queso Parmesano DELA',
        sku: 'QUE-007',
        slug: 'queso-parmesano-dela',
        descripcion: 'El Queso Parmesano DELA contiene todo tipo de vitaminas y minerales que necesitamos en nuestra dieta diaria y que son indispensables para su salud. Además, el queso, es un gran recurso para consumir la dosis de calcio que tanto necesita nuestro organismo.',
        descripcionCorta: 'Queso parmesano DELA 250g',
        precioUnitario: 19.90,
        stock: 18,
        unidadMedida: 'pieza',
        peso: 0.25,
        destacado: false,
        categoriaId: categorias[2].id,
        infoNutricional: {
          calorias: 120,
          proteinas: 8.0,
          grasas: 9.5,
          carbohidratos: 1.0,
          fibra: 0,
        },
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Queso Paria Joque DELA',
        sku: 'QUE-008',
        slug: 'queso-paria-joque-dela',
        descripcion: 'El Queso Paria Joque DELA contiene todo tipo de vitaminas y minerales que necesitamos en nuestra dieta diaria y que son indispensables para su salud. Además, el queso, es un gran recurso para consumir la dosis de calcio que tanto necesita nuestro organismo.',
        descripcionCorta: 'Queso paria joque DELA 500g',
        precioUnitario: 21.90,
        stock: 15,
        unidadMedida: 'pieza',
        peso: 0.5,
        destacado: false,
        categoriaId: categorias[2].id,
        infoNutricional: {
          calorias: 98,
          proteinas: 6.8,
          grasas: 7.8,
          carbohidratos: 1.1,
          fibra: 0,
        },
      },
    }),
  ]);

  // Productos Helados DELA
  const productosHelados = await Promise.all([
    prisma.producto.create({
      data: {
        nombre: 'Helado de Fresa DELA',
        sku: 'HEL-001',
        slug: 'helado-fresa-dela',
        descripcion: 'El Helado de Fresa DELA contiene las vitaminas E, D, C, B y A. También contiene la vitamina K, para la coagulación de la sangre.',
        descripcionCorta: 'Helado fresa 500ml',
        precioUnitario: 14.90,
        stock: 25,
        unidadMedida: 'envase',
        peso: 0.5,
        destacado: true,
        categoriaId: categorias[3].id,
        infoNutricional: {
          calorias: 160,
          proteinas: 2.5,
          grasas: 7.0,
          carbohidratos: 22.0,
          fibra: 0.5,
        },
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Helado de Arándano DELA',
        sku: 'HEL-002',
        slug: 'helado-arandano-dela',
        descripcion: 'El helado de arándanos DELA es uno de los helados más ricos que puedes probar. Los arándanos son una de las frutas con un sabor único e irresistible.',
        descripcionCorta: 'Helado arándano 500ml',
        precioUnitario: 15.90,
        stock: 20,
        unidadMedida: 'envase',
        peso: 0.5,
        destacado: false,
        categoriaId: categorias[3].id,
        infoNutricional: {
          calorias: 165,
          proteinas: 2.6,
          grasas: 7.2,
          carbohidratos: 23.0,
          fibra: 0.6,
        },
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Helado de Maracuyá DELA',
        sku: 'HEL-003',
        slug: 'helado-maracuya-dela',
        descripcion: 'El helado de maracuyá DELA tiene propiedades que ayudan al tránsito intestinal, y posee muchas vitaminas para los seres humanos.',
        descripcionCorta: 'Helado maracuyá 500ml',
        precioUnitario: 15.90,
        stock: 20,
        unidadMedida: 'envase',
        peso: 0.5,
        destacado: false,
        categoriaId: categorias[3].id,
        infoNutricional: {
          calorias: 170,
          proteinas: 2.7,
          grasas: 7.3,
          carbohidratos: 24.0,
          fibra: 0.7,
        },
      },
    }),
  ]);

  productos.push(...productosLeche, ...productosYogurt);
  productos.push(...productosQuesos, ...productosHelados);

  // Crear imágenes para productos
  console.log('🖼️ Creando imágenes de productos...');
  const imagenesData: any[] = [];
  productos.forEach((producto, index) => {
    imagenesData.push(
      {
        productoId: producto.id,
        url: `/images/products/${producto.slug}-1.jpg`,
        altText: `${producto.nombre} - Imagen principal`,
        principal: true,
        orden: 1,
      },
      {
        productoId: producto.id,
        url: `/images/products/${producto.slug}-2.jpg`,
        altText: `${producto.nombre} - Imagen secundaria`,
        principal: false,
        orden: 2,
      }
    );
  });

  await prisma.imagenProducto.createMany({
    data: imagenesData,
  });

  // Crear usuarios
  console.log('👥 Creando usuarios...');
  const hashedPassword = await hash('123456', 10);
  
  const usuarios = await Promise.all([
    // Usuario admin
    prisma.usuario.create({
      data: {
        nombres: 'Administrador',
        apellidos: 'Sistema',
        email: 'admin@dela.com',
        celular: '+51987654321',
        tipoUsuario: 'ADMIN',
        auth: {
          create: {
            contrasena: hashedPassword,
          },
        },
      },
    }),
    // Usuarios clientes nuevos
    prisma.usuario.create({
      data: {
        nombres: 'Lucía Fernanda',
        apellidos: 'Salazar Paredes',
        email: 'lucia.salazar@email.com',
        celular: '+51911112222',
        tipoUsuario: 'CLIENTE',
        auth: {
          create: {
            contrasena: hashedPassword,
          },
        },
      },
    }),
    prisma.usuario.create({
      data: {
        nombres: 'Jorge Esteban',
        apellidos: 'Mendoza Ruiz',
        email: 'jorge.mendoza@email.com',
        celular: '+51922223333',
        tipoUsuario: 'CLIENTE',
        auth: {
          create: {
            contrasena: hashedPassword,
          },
        },
      },
    }),
    prisma.usuario.create({
      data: {
        nombres: 'Valeria Sofía',
        apellidos: 'Cáceres Torres',
        email: 'valeria.caceres@email.com',
        celular: '+51933334444',
        tipoUsuario: 'CLIENTE',
        auth: {
          create: {
            contrasena: hashedPassword,
          },
        },
      },
    }),
    prisma.usuario.create({
      data: {
        nombres: 'Martín Alejandro',
        apellidos: 'Vargas León',
        email: 'martin.vargas@email.com',
        celular: '+51944445555',
        tipoUsuario: 'CLIENTE',
        auth: {
          create: {
            contrasena: hashedPassword,
          },
        },
      },
    }),
  ]);

  // Crear direcciones para clientes
  console.log('📍 Creando direcciones...');
  const direcciones: any[] = [];
  for (let i = 1; i < usuarios.length; i++) {
    const usuario = usuarios[i];
    const direccionesUsuario = await Promise.all([
      prisma.direccionCliente.create({
        data: {
          usuarioId: usuario.id,
          alias: 'Casa',
          direccion: `Av. Principal ${100 + i * 50}`,
          distrito: 'San Isidro',
          provincia: 'Lima',
          codigoPostal: '15036',
          referencia: 'Frente al parque',
          predeterminada: true,
        },
      }),
      prisma.direccionCliente.create({
        data: {
          usuarioId: usuario.id,
          alias: 'Trabajo',
          direccion: `Jr. Comercio ${200 + i * 30}`,
          distrito: 'Miraflores',
          provincia: 'Lima',
          codigoPostal: '15074',
          referencia: 'Edificio corporativo',
          predeterminada: false,
        },
      }),
    ]);
    direcciones.push(...direccionesUsuario);
  }

  // Crear carritos para usuarios clientes
  console.log('🛒 Creando carritos...');
  const carritos: any[] = [];
  for (let i = 1; i < usuarios.length; i++) {
    const carrito = await prisma.carrito.create({
      data: {
        usuarioId: usuarios[i].id,
      },
    });
    carritos.push(carrito);
  }

  // Agregar items a algunos carritos
  console.log('🛍️ Agregando items a carritos...');
  if (carritos.length > 0) {
    await prisma.carritoItem.createMany({
      data: [
        {
          carritoId: carritos[0].id,
          productoId: productos[0].id,
          cantidad: 2,
        },
        {
          carritoId: carritos[0].id,
          productoId: productos[3].id,
          cantidad: 1,
        },
        {
          carritoId: carritos[1].id,
          productoId: productos[1].id,
          cantidad: 1,
        },
        {
          carritoId: carritos[1].id,
          productoId: productos[5].id,
          cantidad: 3,
        },
      ],
    });
  }

  // Crear favoritos
  console.log('❤️ Creando favoritos...');
  await prisma.favorito.createMany({
    data: [
      {
        usuarioId: usuarios[1].id,
        productoId: productos[0].id,
      },
      {
        usuarioId: usuarios[1].id,
        productoId: productos[4].id,
      },
      {
        usuarioId: usuarios[2].id,
        productoId: productos[1].id,
      },
      {
        usuarioId: usuarios[2].id,
        productoId: productos[6].id,
      },
      {
        usuarioId: usuarios[3].id,
        productoId: productos[2].id,
      },
    ],
  });

  // Crear promociones
  console.log('🎯 Creando promociones...');
  const promociones = await Promise.all([
    prisma.promocion.create({
      data: {
        codigo: 'BIENVENIDO10',
        nombre: 'Descuento de Bienvenida',
        descripcion: '10% de descuento en tu primera compra',
        tipo: 'PORCENTAJE',
        valor: 10.00,
        montoMinimo: 50.00,
        inicioValidez: new Date('2024-01-01'),
        finValidez: new Date('2024-12-31'),
        usoMaximo: 1000,
        usoActual: 45,
        activo: true,
      },
    }),
    prisma.promocion.create({
      data: {
        codigo: 'ENVIOGRATIS',
        nombre: 'Envío Gratis',
        descripcion: 'Envío gratis en compras mayores a S/100',
        tipo: 'ENVIO_GRATIS',
        valor: 0.00,
        montoMinimo: 100.00,
        inicioValidez: new Date('2024-01-01'),
        finValidez: new Date('2024-12-31'),
        usoMaximo: null,
        usoActual: 123,
        activo: true,
      },
    }),
    prisma.promocion.create({
      data: {
        codigo: 'DESCUENTO20',
        nombre: 'Descuento 20 Soles',
        descripcion: 'S/20 de descuento en compras mayores a S/150',
        tipo: 'MONTO_FIJO',
        valor: 20.00,
        montoMinimo: 150.00,
        inicioValidez: new Date('2024-06-01'),
        finValidez: new Date('2024-06-30'),
        usoMaximo: 500,
        usoActual: 78,
        activo: true,
      },
    }),
  ]);

  // Crear pedidos
  console.log('📦 Creando pedidos...');
  const pedidos: any[] = [];
  for (let i = 1; i < Math.min(usuarios.length, 4); i++) {
    const usuario = usuarios[i];
    const direccionUsuario = direcciones.find(d => d.usuarioId === usuario.id && d.predeterminada);
    
    if (direccionUsuario) {
      const pedido = await prisma.pedido.create({
        data: {
          numero: `PED-2024-${String(i).padStart(6, '0')}`,
          usuarioId: usuario.id,
          direccionId: direccionUsuario.id,
          subtotal: 85.40,
          impuestos: 15.37,
          envioMonto: 10.00,
          descuentoMonto: 8.54,
          total: 102.23,
          promocionCodigo: i === 1 ? 'BIENVENIDO10' : null,
          estado: i === 1 ? 'ENTREGADO' : i === 2 ? 'ENVIADO' : 'CONFIRMADO',
          metodoPago: i % 2 === 0 ? 'TARJETA_CREDITO' : 'YAPE',
          metodoEnvio: 'DELIVERY',
          fechaPedido: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)),
          fechaEntrega: i === 1 ? new Date(Date.now() - ((i-1) * 24 * 60 * 60 * 1000)) : null,
          notasCliente: i === 2 ? 'Entregar en portería' : null,
        },
      });
      pedidos.push(pedido);
    }
  }

  // Crear detalles de pedidos
  console.log('📋 Creando detalles de pedidos...');
  for (let i = 0; i < pedidos.length; i++) {
    const pedido = pedidos[i];
    await prisma.detallePedido.createMany({
      data: [
        {
          pedidoId: pedido.id,
          productoId: productos[i * 2].id,
          cantidad: 2,
          precioUnitario: productos[i * 2].precioUnitario,
          subtotal: productos[i * 2].precioUnitario.mul(2),
        },
        {
          pedidoId: pedido.id,
          productoId: productos[i * 2 + 1].id,
          cantidad: 1,
          precioUnitario: productos[i * 2 + 1].precioUnitario,
          subtotal: productos[i * 2 + 1].precioUnitario,
        },
      ],
    });
  }

  // Crear pagos
  console.log('💳 Creando pagos...');
  for (const pedido of pedidos) {
    await prisma.pago.create({
      data: {
        pedidoId: pedido.id,
        metodoPago: pedido.metodoPago,
        monto: pedido.total,
        estado: pedido.estado === 'ENTREGADO' ? 'COMPLETADO' : pedido.estado === 'CANCELADO' ? 'FALLIDO' : 'PROCESANDO',
        referencia: `PAY-${pedido.numero}-${Date.now()}`,
        fechaPago: pedido.estado === 'ENTREGADO' ? pedido.fechaPedido : null,
      },
    });
  }

  // Crear reseñas
  console.log('⭐ Creando reseñas...');
  await prisma.resena.createMany({
    data: [
      {
        usuarioId: usuarios[1].id,
        productoId: productos[0].id,
        calificacion: 5,
        comentario: 'Excelente calidad de carne, muy tierna y sabrosa. Totalmente recomendado.',
        estado: 'APROBADO',
      },
      {
        usuarioId: usuarios[2].id,
        productoId: productos[1].id,
        calificacion: 4,
        comentario: 'Buen pollo, fresco y de buen tamaño. Perfecto para la familia.',
        estado: 'APROBADO',
      },
      {
        usuarioId: usuarios[3].id,
        productoId: productos[3].id,
        calificacion: 5,
        comentario: 'La leche está muy fresca y tiene buen sabor. Llegó en perfectas condiciones.',
        estado: 'APROBADO',
      },
      {
        usuarioId: usuarios[1].id,
        productoId: productos[4].id,
        calificacion: 4,
        comentario: 'Queso muy rico, de textura suave y sabor auténtico.',
        estado: 'PENDIENTE',
      },
    ],
  });

  // Crear reclamos
  console.log('📢 Creando reclamos...');
  const reclamos = await Promise.all([
    prisma.reclamo.create({
      data: {
        usuarioId: usuarios[2].id,
        pedidoId: pedidos[1]?.id,
        asunto: 'Demora en la entrega',
        descripcion: 'Mi pedido tenía fecha de entrega para ayer pero aún no llega. ¿Podrían verificar el estado?',
        estado: 'EN_PROCESO',
        tipoReclamo: 'DEMORA_ENTREGA',
        prioridad: 'MEDIA',
      },
    }),
    prisma.reclamo.create({
      data: {
        usuarioId: usuarios[3].id,
        asunto: 'Consulta sobre productos orgánicos',
        descripcion: '¿Tienen productos orgánicos certificados? Me interesa conocer más sobre su origen.',
        estado: 'ABIERTO',
        tipoReclamo: 'OTRO',
        prioridad: 'BAJA',
      },
    }),
  ]);

  // Crear comentarios de reclamos
  console.log('💬 Creando comentarios de reclamos...');
  if (reclamos.length > 0) {
    await prisma.comentarioReclamo.createMany({
      data: [
        {
          reclamoId: reclamos[0].id,
          comentario: 'Hemos verificado su pedido y está en camino. Debería llegar hoy en la tarde.',
          usuarioId: usuarios[0].id, // Admin
          esInterno: false,
        },
        {
          reclamoId: reclamos[0].id,
          comentario: 'Muchas gracias por la respuesta. Estaré atento a la entrega.',
          usuarioId: usuarios[2].id,
          esInterno: false,
        },
        {
          reclamoId: reclamos[1].id,
          comentario: 'Contactar con el proveedor para verificar certificaciones orgánicas.',
          usuarioId: usuarios[0].id, // Admin
          esInterno: true,
        },
      ],
    });
  }

  // Crear suscriptores del newsletter
  console.log('📧 Creando suscriptores del newsletter...');
  await prisma.newsletter.createMany({
    data: [
      { email: 'newsletter1@email.com' },
      { email: 'newsletter2@email.com' },
      { email: 'newsletter3@email.com' },
      { email: 'cliente.activo@email.com' },
    ],
  });

  console.log('✅ Base de datos poblada correctamente!');
  console.log('📊 Resumen de datos creados:');
  console.log(`   👥 Usuarios: ${usuarios.length}`);
  console.log(`   📦 Categorías: ${categorias.length}`);
  console.log(`   🛍️ Productos: ${productos.length}`);
  console.log(`   🖼️ Imágenes: ${imagenesData.length}`);
  console.log(`   📍 Direcciones: ${direcciones.length}`);
  console.log(`   🛒 Carritos: ${carritos.length}`);
  console.log(`   🎯 Promociones: ${promociones.length}`);
  console.log(`   📦 Pedidos: ${pedidos.length}`);
  console.log(`   📢 Reclamos: ${reclamos.length}`);
  console.log('');
  console.log('🔐 Credenciales de prueba:');
  console.log('   Admin: admin@dela.com / 123456');
  console.log('   Cliente: lucia.salazar@email.com / 123456');
  console.log('   Cliente: jorge.mendoza@email.com / 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
