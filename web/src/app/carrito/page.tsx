'use client';

import React from 'react';
import Layout from '@/components/layout/Layout';
import { Lock, ShoppingBag } from 'lucide-react';
import { useCart } from '@/context/CarContext';
import { CartProductItem } from '@/components/carrito/CartProductItem';
import { CartSummary } from '@/components/carrito/CartSummary';
import { CartEmpty } from '@/components/carrito/CartEmpty';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
export default function CarritoPage() {
  const {
    cart,
    increaseQty,
    decreaseQty,
    removeFromCart,
    clearCart,
  } = useCart();

  const subtotal = cart.reduce(
    (acc, prod) => acc + prod.price * prod.quantity,
    0
  );
  const envio = 10;

  return (
    <Layout>
      <div className="min-h-screen py-10 bg-gradient-to-br from-[#fffbe6] via-[#fffaf1] to-[#fff]">
        <div className="container mx-auto px-2 max-w-5xl">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-6 text-[#C59D5F] tracking-tight flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-[#CC9F53]" /> Carrito de compras
          </h1>

          {/* CTA para seguir comprando */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2 mt-3 text-[#9A8C61] bg-[#F7ECD8] px-4 py-3 rounded-xl text-sm shadow">
              <Lock className="w-4 h-4" />
              Compra protegida y datos seguros con DELA
            </div>
            <Link
              href="/productos"
              className="text-[#B88D42] font-semibold hover:underline transition"
            >
              + Seguir comprando
            </Link>
          </div>

          {cart.length === 0 ? (
            <CartEmpty />
          ) : (
            <div className="grid md:grid-cols-3 gap-8">
              {/* Product list */}
              <div className="md:col-span-2 flex flex-col gap-6">
                {cart.map((prod) => (
                  <CartProductItem
                    key={prod.id}
                    prod={prod}
                    increaseQty={increaseQty}
                    decreaseQty={decreaseQty}
                    removeFromCart={removeFromCart}
                  />
                ))}
                <div className="flex justify-end mt-2">
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-100"
                    onClick={clearCart}
                  >
                    Vaciar carrito
                  </Button>
                </div>
              </div>
              <CartSummary subtotal={subtotal} envio={envio} />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
