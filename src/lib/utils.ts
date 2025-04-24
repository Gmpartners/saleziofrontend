import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
/**
 * Função utilitária para concatenar nomes de classes condicionalmente
 * Similar à biblioteca clsx/classnames
 */
