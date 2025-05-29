import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/context/CarContext';
import { CartDrawerProvider } from '@/context/CartDrawerContext';
import { MiniCartDrawer } from '@/components/carrito/carritoDrawer/MiniCartDrawer';
import { FavoritesProvider } from '@/context/FavoritoContext';

export const metadata: Metadata = {
  title: 'DELA - Deleites del Valle | Lácteos Artesanales desde 2000',
  description:
    'Productos lácteos artesanales de la más alta calidad desde Cerro Azul, Cañete. Leche fresca, yogures, quesos y helados elaborados con tradición familiar peruana.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="font-sans antialiased">
        <CartProvider>
          <CartDrawerProvider>
            <FavoritesProvider>
              <MiniCartDrawer />
              <main id="main-content">{children}</main>
            </FavoritesProvider>
          </CartDrawerProvider>
        </CartProvider>
      </body>
    </html>
  );
}
