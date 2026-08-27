import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind class names with proper conflict resolution.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
