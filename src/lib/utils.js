import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...args) {
  return args
    .flat()
    .filter(Boolean)
    .join(" ")
    .trim();
}