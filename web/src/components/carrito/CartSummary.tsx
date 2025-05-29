import React from "react";
import { Button } from "@/components/ui/Button";
import { ShoppingBag } from "lucide-react";

interface CartSummaryProps {
  subtotal: number;
  envio: number;
}

export const CartSummary: React.FC<CartSummaryProps> = ({ subtotal, envio }) => (
  <div className="bg-white bg-opacity-95 border border-[#ecd8ab] rounded-2xl p-7 shadow-2xl h-fit sticky top-24 flex flex-col gap-3">
    <h2 className="text-2xl font-extrabold mb-2 text-[#B88D42]">Resumen</h2>
    <div className="flex justify-between text-base text-[#8F734A] mb-2">
      <span>Subtotal</span>
      <span>S/ {subtotal.toFixed(2)}</span>
    </div>
    <div className="flex justify-between text-base text-[#8F734A] mb-2">
      <span>Envío</span>
      <span>S/ {envio.toFixed(2)}</span>
    </div>
    <div className="flex justify-between font-bold border-t border-[#ecd8ab] pt-2 mt-2 text-lg text-[#C59D5F]">
      <span>Total</span>
      <span>S/ {(subtotal + envio).toFixed(2)}</span>
    </div>
    <Button className="w-full mt-5 bg-gradient-to-r from-[#C59D5F] via-[#CC9F53] to-[#FFD795] hover:from-[#B88D42] hover:to-[#C59D5F] text-white font-extrabold py-3 rounded-xl text-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95">
      <ShoppingBag className="w-5 h-5" />
      Ir a pagar
    </Button>
  </div>
);
