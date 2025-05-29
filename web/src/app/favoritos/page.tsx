'use client';
import { useFavorites } from '@/context/FavoritoContext';
import Layout from '@/components/layout/Layout';
import ProductCard from '@/components/common/ProductCard';

export default function FavoritosPage() {
  const { favorites } = useFavorites();

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-[#CC9F53] mb-6">Tus Favoritos</h1>
        {favorites.length === 0 ? (
          <p className="text-gray-600">No tienes productos favoritos aún.</p>
        ) : (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            {favorites.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
