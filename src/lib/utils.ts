import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// shadcn's `cn`: clsx joins conditional classes, tailwind-merge lets a later class win a conflict.
// tailwind-merge stays on 2.6.0 because 3.x targets Tailwind v4.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
