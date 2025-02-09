import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function convertToAscii(input: string) {
  // Remove all non-ascii characters
  return input.replace(/[^\x00-\x7F]/g, "")}
