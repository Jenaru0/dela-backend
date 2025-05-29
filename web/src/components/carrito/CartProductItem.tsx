import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Trash, Plus, Minus } from 'lucide-react';
import type { CartProduct } from '@/types/productos';

interface CartProductItemProps {
  prod: CartProduct;
  increaseQty: (id: string) => void;
  decreaseQty: (id: string) => void;
  removeFromCart: (id: string) => void;
}

export const CartProductItem: React.FC<CartProductItemProps> = ({
  prod,
  increaseQty,
  decreaseQty,
  removeFromCart,
}) => (
  <div
    className="flex items-center bg-white bg-opacity-90 rounded-2xl shadow-xl border border-[#ecd8ab] p-4 transition-all duration-200 group hover:shadow-2xl hover:border-[#CC9F53]"
    style={{ backdropFilter: 'blur(4px)' }}
  >
    <div className="w-20 h-20 rounded-4xl bg-[#F5E6C6] flex items-center justify-center mr-4 border-2 border-[#CC9F53] overflow-hidden">
      <Image
        src={prod.image}
        alt={prod.name}
        width={64}
        height={64}
        className="w-16 h-16 object-contain"
      />
    </div>

    <div className="flex-1">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <div className="font-bold text-lg text-[#3A3A3A]">{prod.name}</div>
          <div className="text-xs inline-block font-semibold bg-[#FAF3E7] text-[#C59D5F] px-3 py-1 rounded mt-1">
            {prod.category}
          </div>
        </div>
        <div className="flex md:justify-end items-center gap-2 mt-2 md:mt-0">
          <div className="text-[#C59D5F] font-extrabold text-lg">
            S/ {(prod.price * prod.quantity).toFixed(2)}
          </div>
        </div>
      </div>
      <div className="flex items-center mt-3 gap-4">
        {/* Contador mejorado */}
        <div className="flex items-center bg-white rounded-full shadow-inner border border-[#ecd8ab]">
          <Button
            variant="ghost"
            size="icon"
            className="px-2 text-[#B88D42] hover:bg-[#FFF8E1] rounded-full"
            title="Restar"
            onClick={() => decreaseQty(prod.id)}
          >
            <Minus className="w-4 h-4" />
          </Button>
          <span className="px-4 font-semibold text-lg text-[#3A3A3A] min-w-[28px] text-center select-none">
            {prod.quantity}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="px-2 text-[#B88D42] hover:bg-[#FFF8E1] rounded-full"
            title="Sumar"
            onClick={() => increaseQty(prod.id)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {/* Botón eliminar */}
        <Button
          variant="ghost"
          size="icon"
          className="ml-2 hover:bg-red-100 transition"
          title="Eliminar"
          onClick={() => removeFromCart(prod.id)}
        >
          <Trash className="h-5 w-5 text-red-400 group-hover:text-red-600 transition-all" />
        </Button>
      </div>
    </div>
  </div>
);
