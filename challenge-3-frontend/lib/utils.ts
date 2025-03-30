import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateHash(
  hash: string,
  startLength: number = 6,
  endLength: number = 4
) {
  return `${hash.slice(0, startLength)}...${hash.slice(-endLength)}`;
}

export function formatDate(timestamp: number | bigint): string {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
}
