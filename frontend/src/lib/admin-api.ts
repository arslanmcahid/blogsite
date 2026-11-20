"use client";

import { useCallback, useEffect, useState } from "react";

export class ApiError extends Error {
  constructor(public status: number, message: string, public data?: unknown) {
    super(message);
  }
}

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

/** DRF hata gövdesini ({alan: ["mesaj"]} veya {detail}) okunur bir metne çevirir. */
function describeError(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const parts = Object.entries(data as Record<string, unknown>).map(([k, v]) => {
      const msg = Array.isArray(v) ? v.map(String).join(" ") : typeof v === "object" ? JSON.stringify(v) : String(v);
      return k === "detail" || k === "non_field_errors" ? msg : `${k}: ${msg}`;
    });
    if (parts.length) return parts.join(" · ");
  }
  return `İstek başarısız (${status})`;
}

type Options = { method?: string; json?: unknown; form?: FormData };

/**
 * Django'ya (aynı origin üzerinden /api) oturum cookie'siyle istek atar.
 * Yazma isteklerinde CSRF token'ı cookie'den okuyup X-CSRFToken başlığına koyar.
 */
export async function adminFetch<T = unknown>(path: string, { method = "GET", json, form }: Options = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (method !== "GET") {
    let token = readCookie("csrftoken");
    if (!token) {
      await fetch("/api/auth/csrf/"); // CSRF cookie'sini Django'dan al
      token = readCookie("csrftoken");
    }
    if (token) headers["X-CSRFToken"] = token;
  }
  let body: BodyInit | undefined;
  if (form) body = form; // multipart: Content-Type'ı tarayıcı sınır (boundary) ile kendisi koyar
  else if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  }
  const res = await fetch(path, { method, headers, body, credentials: "same-origin" });
  if (res.status === 204) return null as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, describeError(data, res.status), data);
  return data as T;
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Bilinmeyen hata";
}

/** GET isteği yapıp {data, error, loading} döndüren basit kanca. */
export function useApi<T>(path: string | null) {
  const [state, setState] = useState<{ data?: T; error?: ApiError | Error; loading: boolean }>({ loading: true });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    adminFetch<T>(path)
      .then((data) => !cancelled && setState({ data, loading: false }))
      .catch((error) => !cancelled && setState({ error, loading: false }));
    return () => {
      cancelled = true;
    };
  }, [path, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
