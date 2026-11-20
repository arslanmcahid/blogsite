// Sunucu tarafı (SSR) Django API adresi. Docker içinde "http://backend:8000" olur.
export const API_URL = process.env.API_URL ?? "http://localhost:8000";

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`API hatası ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}
