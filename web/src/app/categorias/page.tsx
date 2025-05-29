'use client';

import React from 'react';
import Layout from '@/components/layout/Layout';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

const CATEGORIES = [
  {
    name: 'Leche DELA',
    image: '/images/category-fallback.png',
    desc: 'Leche fresca, pasteurizada y llena de nutrientes. Directo de vacas criadas en libertad.',
    link: '/categorias/leche',
  },
  {
    name: 'Yogurt DELA',
    image: '/images/categorias/yogurt.jpg',
    desc: 'Yogurt artesanal, natural y cremoso. Perfecto para tus desayunos y snacks.',
    link: '/categorias/yogurt',
  },
  {
    name: 'Quesos DELA',
    image: '/images/categorias/quesos.jpg',
    desc: 'Quesos frescos y madurados con recetas tradicionales y el sabor auténtico DELA.',
    link: '/categorias/quesos',
  },
  {
    name: 'Helados DELA',
    image: '/images/categorias/helados.jpg',
    desc: 'Helados cremosos, elaborados artesanalmente con ingredientes naturales.',
    link: '/categorias/helados',
  },
];

// Sellos de confianza
const SEALS = [
  { icon: '🥛', text: 'Leche fresca' },
  { icon: '🌱', text: '100% Natural' },
  { icon: '🏅', text: 'Premio Nacional' },
  { icon: '🔒', text: 'Garantía de calidad' },
];

// Testimonios
const TESTIMONIALS = [
  {
    name: 'María R.',
    text: '“La leche DELA es la mejor que he probado, perfecta para mi familia.”',
  },
  {
    name: 'José L.',
    text: '“Los quesos artesanales tienen un sabor único, se nota el trabajo y la tradición.”',
  },
];

export default function CategoriasPage() {
  return (
    <Layout>
      <section className="max-w-7xl mx-auto py-10 px-4">
        {/* Intro */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#CC9F53] mb-3">
            Categorías DELA
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Descubre la calidad y frescura de nuestros productos artesanales agrupados en categorías. Encuentra el producto ideal y vive la experiencia DELA.
          </p>
        </div>
        
        {/* Tarjetas de Categoría */}
        <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 mb-12">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.name}
              className="bg-white shadow-xl border border-[#ECD8AB]/50 rounded-2xl overflow-hidden flex flex-col group transition-transform hover:scale-105"
            >
              <div className="relative h-48 w-full">
                <Image
                  src={cat.image}
                  alt={cat.name}
                  fill
                  className="object-cover transition-all duration-300 group-hover:brightness-110"
                  sizes="(max-width: 768px) 100vw, 320px"
                />
                <Badge className="absolute top-3 left-3 bg-[#CC9F53] text-white font-bold shadow-md">
                  {cat.name}
                </Badge>
              </div>
              <div className="flex-1 flex flex-col p-5">
                <p className="text-gray-700 mb-4">{cat.desc}</p>
                <Link
                  href={cat.link}
                  className="mt-auto"
                >
                  <button className="w-full bg-gradient-to-r from-[#C59D5F] to-[#FFD795] text-white font-bold py-2 px-4 rounded-lg shadow hover:from-[#b88a3a] hover:to-[#C59D5F] transition-colors">
                    Ver productos
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Sellos de confianza */}
        <div className="flex flex-wrap justify-center gap-5 mb-14">
          {SEALS.map((seal) => (
            <div
              key={seal.text}
              className="flex items-center gap-2 bg-[#FFFBE8] border border-[#ECD8AB]/70 px-5 py-2 rounded-full text-[#CC9F53] font-semibold shadow-sm"
            >
              <span className="text-xl">{seal.icon}</span>
              <span>{seal.text}</span>
            </div>
          ))}
        </div>

        {/* Historia breve */}
        <div className="bg-[#FFF9EC] border-l-4 border-[#CC9F53] p-6 rounded-xl shadow mb-14 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-[#CC9F53] mb-2">Nuestra Historia</h2>
          <p className="text-gray-700">
            Desde el año 2000, en DELA Corp SAC nos dedicamos a ofrecer productos lácteos frescos y artesanales, comprometidos con la sostenibilidad y el bienestar animal. Cada categoría representa años de tradición, innovación y pasión por la calidad.
          </p>
        </div>

        {/* Testimonios */}
        <div className="mb-10">
          <h3 className="text-xl font-bold text-[#CC9F53] mb-4 text-center">Lo que dicen nuestros clientes</h3>
          <div className="flex flex-col sm:flex-row gap-8 justify-center">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white border border-[#ECD8AB]/40 rounded-xl shadow p-5 max-w-sm mx-auto">
                <p className="italic text-gray-800 mb-2">“{t.text}”</p>
                <div className="text-sm text-gray-500 font-semibold text-right">- {t.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA final */}
        <div className="text-center mt-14">
          <Link href="/productos">
            <button className="bg-[#CC9F53] hover:bg-[#b48a3a] text-white font-bold text-lg py-3 px-8 rounded-xl shadow-lg transition-all">
              Explora todo nuestro catálogo
            </button>
          </Link>
        </div>
      </section>
    </Layout>
  );
}
