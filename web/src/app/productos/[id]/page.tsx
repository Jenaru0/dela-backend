'use client';
import { useParams, useRouter } from 'next/navigation';
import { products } from '@/lib/products';
import { useCart } from '@/context/CarContext';
import { useCartDrawer } from '@/context/CartDrawerContext';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import Layout from '@/components/layout/Layout';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { useState } from 'react';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const { openDrawer } = useCartDrawer();
  const [added, setAdded] = useState(false);

  // Busca producto
  const id = typeof params.id === 'string' ? params.id : params.id?.[0];
  const product = products.find((p) => p.id === id);

  // Si no existe el producto
  if (!product)
    return (
      <Layout>
        <section className="flex items-center justify-center min-h-[70vh]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[#CC9F53] mb-3">
              Producto no encontrado
            </h2>
            <Button
              onClick={() => router.push('/productos')}
              className="bg-[#CC9F53] text-white"
            >
              <ArrowLeft className="inline w-5 h-5 mr-1" /> Volver a productos
            </Button>
          </div>
        </section>
      </Layout>
    );

  const hasDiscount =
    product.oldPrice !== undefined && product.oldPrice > product.price;
  const discount = hasDiscount
    ? Math.round(
        ((product.oldPrice! - product.price) / product.oldPrice!) * 100
      )
    : 0;

  // Añadir al carrito + abrir drawer y feedback
  const handleAddToCart = () => {
    addToCart(product);
    openDrawer();
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <Layout>
      <section className="max-w-4xl mx-auto px-4 sm:px-8 py-10">
        <div className="bg-white rounded-3xl shadow-2xl border border-[#ECD8AB]/30 p-6 md:p-10 flex flex-col md:flex-row gap-8 md:gap-14 items-center md:items-start">
          {/* Imagen */}
          <div className="w-full max-w-xs flex flex-col gap-3">
            <div className="relative w-full aspect-square bg-gradient-to-br from-[#FFF9EC] via-white to-[#FFF9EC]/80 rounded-2xl border border-[#ECD8AB]/60 shadow-inner overflow-hidden flex items-center justify-center">
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-contain p-8 transition-transform duration-300 hover:scale-105"
                sizes="(max-width: 768px) 80vw, 320px"
                priority
              />
              {hasDiscount && (
                <Badge className="absolute left-3 top-3 bg-gradient-to-r from-red-500 to-red-700 text-white font-bold shadow-md">
                  -{discount}% OFF
                </Badge>
              )}
              {product.isNew && (
                <Badge className="absolute right-3 top-3 bg-green-100 text-green-700 font-semibold">
                  Nuevo
                </Badge>
              )}
            </div>
          </div>
          {/* Info producto */}
          <div className="flex-1 flex flex-col gap-2 md:gap-5">
            <Badge className="bg-[#CC9F53]/20 text-[#CC9F53] w-max mb-2">
              {product.category}
            </Badge>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#232323] mb-1">
              {product.name}
            </h1>
            <div className="flex items-center gap-5">
              <span className="text-2xl md:text-3xl font-bold text-[#CC9F53]">
                S/ {product.price.toFixed(2)}
              </span>
              {hasDiscount && (
                <span className="line-through text-lg text-gray-400 font-medium">
                  S/ {product.oldPrice!.toFixed(2)}
                </span>
              )}
              {hasDiscount && (
                <span className="text-green-600 font-bold text-base ml-2">
                  -{discount}%
                </span>
              )}
            </div>
            {/* Descripción */}
            <p className="text-gray-600 text-base mb-3">
              {product.description ||
                'Delicioso producto artesanal, hecho con calidad DELA.'}
            </p>
            {/* Stock */}
            {product.stock !== undefined && (
              <div className="text-sm text-[#A09574]">
                <b>Stock:</b> {product.stock}
              </div>
            )}

            {/* Acciones */}
            <div className="mt-4 flex flex-col gap-3 max-w-xs">
              <Button
                onClick={handleAddToCart}
                className="w-full bg-gradient-to-r from-[#C59D5F] via-[#CC9F53] to-[#FFD795] hover:from-[#B88D42] hover:to-[#C59D5F] text-white font-extrabold py-3 rounded-xl text-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                Añadir al carrito
                {added && (
                  <CheckCircle className="ml-2 w-5 h-5 text-white animate-bounce" />
                )}
              </Button>
              <Button
                variant="outline"
                className="w-full text-[#C59D5F] border-[#CC9F53] hover:bg-[#FFFBE8] font-semibold"
                onClick={() => router.push('/productos')}
              >
                Seguir comprando
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
