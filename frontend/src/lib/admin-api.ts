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

const FIELD_NAMES: Record<string, string> = {
  title: "Başlık",
  excerpt: "Özet",
  blocks: "İçerik",
  theme: "Görünüm",
  cover: "Kapak görseli",
  locations: "Konumlar",
  published_at: "Yayın tarihi",
  name: "Ad",
  latitude: "Enlem",
  longitude: "Boylam",
  file: "Dosya",
  items: "Fotoğraflar",
  sections: "Bölümler",
};

const KNOWN_MESSAGES: [RegExp, string][] = [
  [/this field may not be blank|bu alan boş bırakılamaz/i, "boş bırakılamaz"],
  [/this field is required|bu alan zorunlu/i, "zorunludur"],
  [/ensure this field has no more than (\d+)/i, "çok uzun (en fazla $1 karakter)"],
  [/upload a valid image/i, "geçerli bir resim değil"],
];

function softenMessage(msg: string): string {
  for (const [re, replacement] of KNOWN_MESSAGES) if (re.test(msg)) return msg.replace(re, replacement);
  return msg;
}

/** DRF hata gövdesini ({alan: ["mesaj"]} veya {detail}) sade bir Türkçe cümleye çevirir. */
function describeError(data: unknown, status: number): string {
  if (status === 403) return "Bu işlem için yetkin yok ya da oturumun süresi dolmuş. Sayfayı yenileyip tekrar giriş yap.";
  if (status === 401) return "Oturumun sona ermiş. Lütfen yeniden giriş yap.";
  if (status === 413) return "Dosya çok büyük. Daha küçük bir dosya dene.";
  if (status >= 500) return "Sunucuda bir sorun oluştu. Biraz sonra tekrar dene.";
  if (data && typeof data === "object") {
    const parts = Object.entries(data as Record<string, unknown>).map(([k, v]) => {
      const msg = Array.isArray(v) ? v.map((x) => softenMessage(String(x))).join(" ") : typeof v === "object" ? "eksik ya da hatalı bilgi var" : softenMessage(String(v));
      if (k === "detail" || k === "non_field_errors") return msg;
      return `${FIELD_NAMES[k] ?? k}: ${msg}`;
    });
    if (parts.length) return parts.join(" · ");
  }
  return `İşlem tamamlanamadı (hata ${status}).`;
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
  let res: Response;
  try {
    res = await fetch(path, { method, headers, body, credentials: "same-origin" });
  } catch {
    throw new ApiError(0, "Sunucuya ulaşılamadı. İnternet bağlantını ve arka plan sunucusunun (Django) çalıştığını kontrol et.");
  }
  if (res.status === 204) return null as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, describeError(data, res.status), data);
  return data as T;
}

const MAX_IMAGE_MB = 15;

/** Tek bir resmi yükler; tür ve boyutu önceden kontrol ederek anlaşılır hata verir. */
export async function uploadImage(file: File): Promise<import("./types").AdminImage> {
  if (!file.type.startsWith("image/")) throw new ApiError(0, `"${file.name}" bir resim dosyası değil.`);
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) throw new ApiError(0, `"${file.name}" çok büyük (en fazla ${MAX_IMAGE_MB} MB).`);
  const form = new FormData();
  form.append("file", file);
  return adminFetch("/api/images/", { method: "POST", form });
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
