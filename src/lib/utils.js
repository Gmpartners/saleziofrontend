import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina várias classes CSS, incluindo condicionais, e resolve conflitos com o tailwind-merge
 * @param {...string} inputs - Classes CSS que serão combinadas
 * @returns {string} - String com as classes combinadas e conflitos resolvidos
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
