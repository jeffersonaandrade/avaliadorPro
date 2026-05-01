/**
 * Design System — tokens Tailwind (strings).
 * Preferir `DS.*` + `cn()` em componentes; evitar duplicar utilitários soltos.
 */
export const DS = {
  spacing: {
    xs: "p-2",
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
    /** Padding padrão de cards (mobile-first). */
    card: "p-4 md:p-6",
  },
  radius: {
    sm: "rounded-lg",
    md: "rounded-xl",
    lg: "rounded-2xl",
  },
  typography: {
    title: "font-bold tracking-tight",
    subtitle: "text-sm text-muted-foreground",
    value: "font-bold tabular-nums tracking-tight",
    /** Valores monetários em destaque — sempre `clamp` (mobile-first). */
    heroPrice:
      "font-bold tabular-nums tracking-tight text-[clamp(1.5rem,6vw,3rem)]",
  },
  colors: {
    primary: "bg-slate-900 text-white",
    warning: "bg-yellow-500 text-black",
    danger: "bg-red-600 text-white",
  },
} as const;
