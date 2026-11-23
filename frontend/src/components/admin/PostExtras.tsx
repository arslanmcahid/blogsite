"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { adminFetch, errorMessage } from "@/lib/admin-api";
import type { Category, InfoRow, PostSummary, Source, Tag } from "@/lib/types";
import { useToast } from "./Toast";

/** Kategori seçimi (listeden ya da yeni oluşturarak). */
export function CategoryCard({
  categories,
  value,
  onChange,
  onCreated,
}: {
  categories: Category[];
  value: number | null;
  onChange: (id: number | null) => void;
  onCreated: (c: Category) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    const n = name.trim();
    if (!n || busy) return;
    const existing = categories.find(
      (c) => c.name.toLowerCase() === n.toLowerCase(),
    );
    if (existing) {
      onChange(existing.id);
      setName("");
      return;
    }
    setBusy(true);
    try {
      const c = await adminFetch<Category>("/api/categories/", {
        method: "POST",
        json: { name: n },
      });
      onCreated(c);
      onChange(c.id);
      setName("");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card stack">
      <h2>Kategori</h2>
      <select
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value ? Number(e.target.value) : null)
        }
        aria-label="Kategori"
      >
        <option value="">Kategorisiz</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <div className="inline-add">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Yeni kategori adı"
          maxLength={80}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), create())}
        />
        <button
          type="button"
          className="btn"
          onClick={create}
          disabled={busy || !name.trim()}
        >
          <Plus size={14} aria-hidden /> Ekle
        </button>
      </div>
    </div>
  );
}

/** Etiketler: çip olarak gösterilir, yazıp Enter ile eklenir; bilinmeyen etiket otomatik oluşturulur. */
export function TagsCard({
  tags,
  value,
  onChange,
  onCreated,
}: {
  tags: Tag[];
  value: number[];
  onChange: (ids: number[]) => void;
  onCreated: (t: Tag) => void;
}) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const chosen = value.flatMap((id) => tags.filter((t) => t.id === id));
  const suggestions = tags.filter((t) => !value.includes(t.id)).slice(0, 12);

  async function add() {
    const names = [
      ...new Set(
        text
          .split(",")
          .map((s) => s.trim().replace(/^#/, ""))
          .filter(Boolean),
      ),
    ];
    if (names.length === 0 || busy) return;
    setBusy(true);
    const ids = [...value];
    try {
      for (const n of names) {
        const existing = tags.find(
          (t) => t.name.toLowerCase() === n.toLowerCase(),
        );
        if (existing) {
          if (!ids.includes(existing.id)) ids.push(existing.id);
          continue;
        }
        const t = await adminFetch<Tag>("/api/tags/", {
          method: "POST",
          json: { name: n },
        });
        onCreated(t);
        ids.push(t.id);
      }
      setText("");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      onChange(ids);
      setBusy(false);
    }
  }

  return (
    <div className="card stack">
      <h2>Etiketler</h2>
      {chosen.length > 0 && (
        <div className="tagbox">
          {chosen.map((t) => (
            <span key={t.id} className="tagpill">
              #{t.name}
              <button
                type="button"
                aria-label={`${t.name} etiketini kaldır`}
                onClick={() => onChange(value.filter((x) => x !== t.id))}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="inline-add">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Etiket yaz; virgülle ayır ya da Enter’a bas"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button
          type="button"
          className="btn"
          onClick={add}
          disabled={busy || !text.trim()}
        >
          <Plus size={14} aria-hidden /> Ekle
        </button>
      </div>
      {suggestions.length > 0 && (
        <div>
          <p className="muted small" style={{ margin: "0 0 6px" }}>
            Önceden kullandıkların:
          </p>
          <div className="chips">
            {suggestions.map((t) => (
              <button
                key={t.id}
                type="button"
                className="chip"
                onClick={() => onChange([...value, t.id])}
              >
                #{t.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Kaynakça: metin + isteğe bağlı bağlantı satırları. */
export function SourcesCard({
  value,
  onChange,
}: {
  value: Source[];
  onChange: (v: Source[]) => void;
}) {
  const set = (i: number, p: Partial<Source>) =>
    onChange(value.map((s, j) => (j === i ? { ...s, ...p } : s)));
  return (
    <div className="card stack">
      <div className="row">
        <div>
          <h2>Kaynakça</h2>
          <p className="muted small" style={{ margin: 0 }}>
            Yazıda yararlandığın kitap, makale ya da sayfalar. Yazının sonunda
            listelenir.
          </p>
        </div>
        <span className="spacer" />
        <button
          type="button"
          className="btn small"
          onClick={() => onChange([...value, { text: "", url: "" }])}
        >
          <Plus size={14} aria-hidden /> Yeni kaynak
        </button>
      </div>
      {value.length > 0 && (
        <div className="list-edit">
          {value.map((s, i) => (
            <div key={i} className="list-row">
              <div className="fields">
                <input
                  value={s.text}
                  onChange={(e) => set(i, { text: e.target.value })}
                  placeholder="Örn. Yazar (2026). Kitap adı."
                  maxLength={500}
                  aria-label={`Kaynak ${i + 1} metni`}
                />
                <input
                  value={s.url ?? ""}
                  onChange={(e) => set(i, { url: e.target.value })}
                  placeholder="Bağlantı (isteğe bağlı) https://…"
                  inputMode="url"
                  aria-label={`Kaynak ${i + 1} bağlantısı`}
                />
              </div>
              <button
                type="button"
                className="icon danger"
                aria-label={`Kaynak ${i + 1}’i sil`}
                onClick={() => onChange(value.filter((_, j) => j !== i))}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Bilgi kartı: "Süre: 3 gün" gibi etiket-değer satırları. */
export function InfoCard({
  value,
  onChange,
}: {
  value: InfoRow[];
  onChange: (v: InfoRow[]) => void;
}) {
  const set = (i: number, p: Partial<InfoRow>) =>
    onChange(value.map((r, j) => (j === i ? { ...r, ...p } : r)));
  return (
    <div className="card stack">
      <div className="row">
        <div>
          <h2>Bilgi kartı</h2>
          <p className="muted small" style={{ margin: 0 }}>
            Yazının başında küçük bir künye olarak görünür. Örn. Süre: 3 gün,
            Bütçe: 5.000 ₺.
          </p>
        </div>
        <span className="spacer" />
        <button
          type="button"
          className="btn small"
          onClick={() => onChange([...value, { label: "", value: "" }])}
        >
          <Plus size={14} aria-hidden /> Satır ekle
        </button>
      </div>
      {value.length > 0 && (
        <div className="list-edit">
          {value.map((r, i) => (
            <div key={i} className="list-row">
              <div className="fields">
                <input
                  value={r.label}
                  onChange={(e) => set(i, { label: e.target.value })}
                  placeholder="Başlık (Süre)"
                  maxLength={80}
                  aria-label={`Satır ${i + 1} başlığı`}
                />
                <input
                  value={r.value}
                  onChange={(e) => set(i, { value: e.target.value })}
                  placeholder="Değer (3 gün)"
                  maxLength={300}
                  aria-label={`Satır ${i + 1} değeri`}
                />
              </div>
              <button
                type="button"
                className="icon danger"
                aria-label={`Satır ${i + 1}’i sil`}
                onClick={() => onChange(value.filter((_, j) => j !== i))}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** "Bunları da oku": ilgili yazıları elle seç. */
export function RelatedCard({
  posts,
  currentId,
  value,
  onChange,
}: {
  posts: PostSummary[];
  currentId: number | null;
  value: number[];
  onChange: (ids: number[]) => void;
}) {
  const [pick, setPick] = useState("");
  const chosen = value.flatMap((id) => posts.filter((p) => p.id === id));
  const options = posts.filter(
    (p) => p.id !== currentId && !value.includes(p.id),
  );
  return (
    <div className="card stack">
      <div>
        <h2>İlgili yazılar</h2>
        <p className="muted small" style={{ margin: 0 }}>
          Okuyucuya “Bunları da oku” diye önereceğin yazılar. Yazının sonunda
          görünür.
        </p>
      </div>
      {chosen.length > 0 && (
        <ul className="rel-list">
          {chosen.map((p) => (
            <li key={p.id}>
              {p.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.cover_url} alt="" />
              ) : (
                <span className="rel-ph" />
              )}
              <strong>{p.title}</strong>
              <button
                type="button"
                className="icon danger"
                aria-label={`${p.title} yazısını çıkar`}
                onClick={() => onChange(value.filter((x) => x !== p.id))}
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {options.length > 0 ? (
        <select
          value={pick}
          aria-label="İlgili yazı ekle"
          onChange={(e) => {
            if (e.target.value) onChange([...value, Number(e.target.value)]);
            setPick("");
          }}
        >
          <option value="">+ Bir yazı ekle…</option>
          {options.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      ) : (
        chosen.length === 0 && (
          <p className="muted small" style={{ margin: 0 }}>
            Önerilebilecek başka yazı yok.
          </p>
        )
      )}
    </div>
  );
}
