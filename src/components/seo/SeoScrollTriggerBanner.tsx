"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function SeoScrollTriggerBanner() {
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (total <= 0) return;
      const progresso = window.scrollY / total;
      setMostrar(progresso >= 0.5);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!mostrar) return null;

  return (
    <div className="sticky top-3 z-30 rounded-xl border border-amber-300 bg-amber-50 p-3 shadow-sm">
      <p className="text-sm font-bold text-amber-950">
        Você compraria esse carro no escuro?
      </p>
      <Link
        href="/painel"
        className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-amber-600 px-4 text-sm font-bold text-white"
      >
        Analisar veículo agora
      </Link>
    </div>
  );
}

