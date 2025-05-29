"use client";
import React, { useRef } from "react";
import { useCart } from "@/context/CarContext";
import { useCartDrawer } from "@/context/CartDrawerContext";
import DrawerFooter from "./DrawerFooter";
import DrawerHeader from "./DrawerHeader";
import CartDrawerProductItem from "./CartDrawerProductItem";
import DrawerEmpty from "./DrawerEmpty";
import DrawerAnimationStyle from "./DrawerAnimationStyle";

export const MiniCartDrawer: React.FC = () => {
  const { cart, increaseQty, decreaseQty, removeFromCart, setQty, clearCart } = useCart();
  const { open, closeDrawer } = useCartDrawer();
  const asideRef = useRef<HTMLDivElement>(null);

  if (!open) return null;
  const subtotal = cart.reduce((acc, prod) => acc + prod.price * prod.quantity, 0);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closeDrawer();
  };
  const handleClose = () => {
    if (asideRef.current) {
      asideRef.current.classList.remove("animate-slide-in-right");
      asideRef.current.classList.add("animate-slide-out-right");
      setTimeout(closeDrawer, 140);
    } else {
      closeDrawer();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-[2.5px] flex justify-end"
      onClick={handleOverlayClick}
      aria-modal="true"
      role="dialog"
    >
      <aside
        ref={asideRef}
        className="relative h-full w-full max-w-full flex flex-col bg-gradient-to-br from-[#fffce8fa] via-[#fff] to-[#fffbec] shadow-[0_12px_36px_0_rgba(204,159,83,0.19),0_2px_8px_0_rgba(190,170,110,0.10)] transition-all animate-slide-in-right border-0 sm:border-l-[7px] sm:border-[#CC9F53] rounded-none sm:rounded-l-[2rem] sm:w-[410px] sm:max-w-[95vw] sm:mt-2 sm:mb-2 overscroll-contain"
      >
        <DrawerHeader handleClose={handleClose} />
        <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-6 sm:py-5 flex flex-col gap-4">
          {cart.length === 0 ? (
            <DrawerEmpty />
          ) : (
            cart.map((prod) => (
              <CartDrawerProductItem
                key={prod.id}
                prod={prod}
                increaseQty={increaseQty}
                decreaseQty={decreaseQty}
                setQty={setQty}
                removeFromCart={removeFromCart}
              />
            ))
          )}
        </div>
        <DrawerFooter
          subtotal={subtotal}
          clearCart={clearCart}
          handleClose={handleClose}
        />
        <DrawerAnimationStyle />
      </aside>
    </div>
  );
};
