import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export const CartEmpty: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-32">
    <Image
      src="https://cdn-icons-png.flaticon.com/512/17568/17568902.png"
      alt="Carrito vacío"
      width={144}
      height={144}
      className="w-36 mb-6"
    />
    <div className="text-lg text-gray-500 mb-2">¡Tu carrito está vacío!</div>
    <Link
      href="/productos"
      className="text-[#CC9F53] font-semibold hover:underline"
    >
      Explora productos
    </Link>
  </div>
);
