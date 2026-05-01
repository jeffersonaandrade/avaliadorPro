import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Compõe classes Tailwind com resolução de conflitos (tailwind-merge). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
