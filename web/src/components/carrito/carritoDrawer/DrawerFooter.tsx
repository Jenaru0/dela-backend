import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface Props {
  subtotal: number;
  clearCart: () => void;
  handleClose: () => void;
}

const DrawerFooter: React.FC<Props> = ({ subtotal, clearCart, handleClose }) => (
  <div className="px-4 py-4 sm:px-7 sm:py-5 border-t border-[#ECD8AB] bg-white/90 rounded-b-none sm:rounded-bl-[2rem] flex flex-col gap-3">
    <div className="flex justify-between items-center text-[#3A3A3A] font-medium text-base sm:text-lg">
      <span>Subtotal</span>
      <span className="font-extrabold text-[#C59D5F] text-lg sm:text-2xl">
        S/ {subtotal.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
      </span>
    </div>
    <Link href="/carrito" className="w-full">
      <Button
        className="w-full mt-2 bg-gradient-to-r from-[#C59D5F] via-[#CC9F53] to-[#FFD795] text-white font-extrabold py-3 rounded-xl text-lg shadow-lg hover:brightness-110 flex items-center justify-center gap-2 transition-all active:scale-95"
      >
        Ir al carrito
      </Button>
    </Link>
    <Button
      variant="outline"
      className="w-full text-red-600 border-red-300 hover:bg-red-100 font-semibold mt-2"
      onClick={clearCart}
    >
      Vaciar carrito
    </Button>
    {/* Seguir comprando */}
    <Link href="/productos" className="w-full">
      <Button
        variant="ghost"
        className="w-full text-[#C59D5F] mt-1 hover:bg-[#FFFCE8] font-medium text-base"
        onClick={handleClose}
      >
        Seguir comprando
      </Button>
    </Link>
  </div>
);

export default DrawerFooter;
