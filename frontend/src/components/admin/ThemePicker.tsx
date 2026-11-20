"use client";

import type { PostTheme } from "@/lib/types";

const FONTS: { value: NonNullable<PostTheme["font"]>; label: string; sample: string; family: string }[] = [
  { value: "serif", label: "Kitap gibi", sample: "Aa", family: "Georgia, serif" },
  { value: "sans", label: "Modern", sample: "Aa", family: "var(--font-geist-sans), sans-serif" },
];

const WIDTHS: { value: NonNullable<PostTheme["width"]>; label: string; bar: number }[] = [
  { value: "narrow", label: "Dar", bar: 40 },
  { value: "normal", label: "Normal", bar: 62 },
  { value: "wide", label: "Geniş", bar: 86 },
];

const COLORS = ["#b4441c", "#1d4f91", "#2f7d4f", "#7a3fa0", "#b7791f", "#1d1b19"];

/** Yazı tasarımını açılır menüler yerine görsel kartlarla seçtirir. */
export function ThemePicker({ theme, onChange }: { theme: PostTheme; onChange: (t: PostTheme) => void }) {
  const font = theme.font ?? "serif";
  const width = theme.width ?? "normal";
  return (
    <div className="stack">
      <div>
        <div className="field-label">Yazı karakteri</div>
        <div className="choice-row">
          {FONTS.map((f) => (
            <button type="button" key={f.value} className={`choice ${font === f.value ? "on" : ""}`} aria-pressed={font === f.value} onClick={() => onChange({ ...theme, font: f.value })}>
              <span className="choice-sample" style={{ fontFamily: f.family }}>{f.sample}</span>
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="field-label">Sayfa genişliği <span className="muted">(gazete düzeni için “Geniş” ideal)</span></div>
        <div className="choice-row">
          {WIDTHS.map((w) => (
            <button type="button" key={w.value} className={`choice ${width === w.value ? "on" : ""}`} aria-pressed={width === w.value} onClick={() => onChange({ ...theme, width: w.value })}>
              <span className="choice-page"><span style={{ width: `${w.bar}%` }} /></span>
              {w.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="field-label">Vurgu rengi <span className="muted">(bağlantılar ve alıntı çizgisi)</span></div>
        <div className="swatches">
          {COLORS.map((c) => (
            <button type="button" key={c} className={`swatch ${(theme.accent ?? COLORS[0]) === c ? "on" : ""}`} style={{ background: c }} aria-label={`Renk ${c}`} aria-pressed={(theme.accent ?? COLORS[0]) === c} onClick={() => onChange({ ...theme, accent: c === COLORS[0] ? undefined : c })} />
          ))}
          <label className="swatch custom" title="Başka bir renk seç">
            <input type="color" value={theme.accent ?? COLORS[0]} onChange={(e) => onChange({ ...theme, accent: e.target.value })} aria-label="Özel renk seç" />＋
          </label>
        </div>
      </div>
    </div>
  );
}
