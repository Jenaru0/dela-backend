"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";
import { Product } from "@/lib/products";

export interface CartItem extends Product {
  quantity: number;
}

interface CartContextProps {
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  increaseQty: (productId: string) => void;
  decreaseQty: (productId: string) => void;
  setQty: (productId: string, qty: number) => void; // <-- AQUI
  clearCart: () => void;
}

const CartContext = createContext<CartContextProps | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);

  function addToCart(product: Product) {
    setCart((prev) => {
      const item = prev.find((p) => p.id === product.id);
      if (item) {
        return prev.map((p) =>
          p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((p) => p.id !== productId));
  }

  function increaseQty(productId: string) {
    setCart((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, quantity: p.quantity + 1 } : p
      )
    );
  }

  function decreaseQty(productId: string) {
    setCart((prev) =>
      prev
        .map((p) =>
          p.id === productId
            ? { ...p, quantity: p.quantity > 1 ? p.quantity - 1 : 1 }
            : p
        )
        .filter((p) => p.quantity > 0)
    );
  }

  function setQty(productId: string, qty: number) {
    setCart((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, quantity: qty < 1 ? 1 : qty } : p
      )
    );
  }

  function clearCart() {
    setCart([]);
  }

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, increaseQty, decreaseQty, setQty, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}
