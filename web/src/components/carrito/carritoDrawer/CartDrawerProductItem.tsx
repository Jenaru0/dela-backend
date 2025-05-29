"use client";
import React from "react";
import { Trash, Plus, Minus } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import type { CartItem } from "@/context/CarContext";

interface Props {
  prod: CartItem;
  increaseQty: (id: string) => void;
  decreaseQty: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
}

const CartDrawerProductItem: React.FC<Props> = ({
  prod,
  increaseQty,
  decreaseQty,
  setQty,
  removeFromCart,
}) => (
  <div className="flex items-center rounded-2xl border border-[#F6E9C2]/80 bg-white shadow-lg shadow-[#cc9f5326] p-3 sm:p-4 gap-3">
    <Image
      src={prod.image}
      alt={prod.name}
      width={56}   // 14 * 4 = 56px
      height={56}
      className="w-14 h-14 object-contain rounded-xl border border-[#f7ecd8] bg-[#FFF9EC] shadow-inner"
      loading="lazy"
    />
    <div className="flex-1 min-w-0">
      <div className="font-bold text-sm sm:text-base text-[#3A3A3A] truncate">
        {prod.name}
      </div>
      <div className="flex items-center gap-1 mt-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => decreaseQty(prod.id)}
          className="text-[#CC9F53]"
        >
          <Minus className="w-4 h-4" />
        </Button>
        <input
          type="number"
          min={1}
          value={prod.quantity}
          onChange={e => setQty(prod.id, Number(e.target.value))}
          className="w-10 text-center font-semibold border rounded bg-[#FFFCE8] border-[#ECD8AB] focus:outline-[#CC9F53] text-[#222]"
          style={{ MozAppearance: "textfield" }}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => increaseQty(prod.id)}
          className="text-[#CC9F53]"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
    <div className="font-extrabold text-[#B88D42] text-xs sm:text-base min-w-[65px] text-right">
      S/ {(prod.price * prod.quantity).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
    </div>
    <Button variant="ghost" size="icon" onClick={() => removeFromCart(prod.id)}>
      <Trash className="w-4 h-4 text-red-500" />
    </Button>
  </div>
);

export default CartDrawerProductItem;
