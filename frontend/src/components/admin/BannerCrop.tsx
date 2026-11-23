"use client";

import { Wand2 } from "lucide-react";
import { useState } from "react";
import { cropBox, isSide, resolveFormat } from "@/lib/ads";
import {
  AD_FORMATS,
  AD_PLACEMENTS,
  type AdFormat,
  type AdPlacement,
} from "@/lib/types";

const COLORS = ["#e8743b", "#2f7dd1", "#2f9e6b", "#a259d9"];

type Image = {
  url: string;
  w: number | null;
  h: number | null;
  autoX: number;
  autoY: number;
};

/**
 * Afişin kırpılması otomatik yapılır: her yer için görselin oranına en yakın uygun biçim seçilir
 * ve konu (otomatik bulunan odak) ortada kalır. Burada kırpılan alanlar gösterilir; istenirse elle düzeltilir.
 */

export function BannerCrop({
  image,
  placements,
  format,
  focus,
  onChange,
}: {
  image: Image;
  placements: AdPlacement[];
  format: AdFormat;
  focus: { x: number; y: number } | null;
  onChange: (p: {
    format?: AdFormat;
    focus?: { x: number; y: number } | null;
  }) => void;
}) {
  const [manual, setManual] = useState(format !== "auto" || focus !== null);
  const fx = focus?.x ?? image.autoX;
  const fy = focus?.y ?? image.autoY;
  const w = image.w,
    h = image.h;

  // Her yer için çözülen biçim (yeri aynı biçimi kullananlar tek çerçevede toplanır)
  const items = placements.map((p) => ({
    p,
    f: resolveFormat(format, p, w, h),
  }));
  const frames = [...new Map(items.map((i) => [i.f, i])).values()];

  return (
    <div className="card stack">
      <div className="row">
        <div>
          <h2>
            Afiş kırpması{" "}
            <span
              className={`badge ${manual ? "ad-paused" : "ad-running"}`}
              style={{ marginLeft: 6 }}
            >
              {manual ? "Elle" : "Otomatik"}
            </span>
          </h2>
          <p className="muted small" style={{ margin: 0 }}>
            Görsel, gösterileceği yere göre sistem tarafından kırpılır ve konu
            ortada kalır. Aşağıda kırpılan alanları görebilirsin; hiçbir şey
            yapman gerekmez.
          </p>
        </div>
      </div>

      {!w || !h ? (
        <p className="muted small">
          Görselin boyutu okunamadı, bu yüzden kırpma yapılmaz.
        </p>
      ) : placements.length === 0 ? (
        <p className="muted small">
          Önce sağdan reklamın nerede görüneceğini seç; kırpma buna göre
          hesaplanır.
        </p>
      ) : (
        <>
          <div
            className={`crop-figure ${manual ? "manual" : ""}`}
            aria-label="Görsel ve kırpılan alanlar"
            onClick={(e) => {
              if (!manual) return;
              const r = e.currentTarget.getBoundingClientRect();
              onChange({
                focus: {
                  x: Math.round(((e.clientX - r.left) / r.width) * 100),
                  y: Math.round(((e.clientY - r.top) / r.height) * 100),
                },
              });
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt="" draggable={false} />
            {frames.map((fr, i) => {
              const b = cropBox(fr.f, w, h, fx, fy);
              const label = AD_FORMATS.find((x) => x.id === fr.f)?.label ?? "";
              return (
                <span
                  key={fr.f}
                  className="crop-box"
                  style={{
                    left: `${b.left}%`,
                    top: `${b.top}%`,
                    width: `${b.width}%`,
                    height: `${b.height}%`,
                    borderColor: COLORS[i % COLORS.length],
                  }}
                >
                  <em style={{ background: COLORS[i % COLORS.length] }}>
                    {label}
                  </em>
                </span>
              );
            })}
            {manual && (
              <span
                className="focus-dot"
                style={{ left: `${fx}%`, top: `${fy}%` }}
              />
            )}
          </div>
          <ul className="crop-legend">
            {items.map(({ p, f }) => {
              const fi = frames.findIndex((x) => x.f === f);
              const label = AD_FORMATS.find((x) => x.id === f);
              return (
                <li key={p}>
                  <i style={{ background: COLORS[fi % COLORS.length] }} />
                  <strong>
                    {AD_PLACEMENTS.find((x) => x.id === p)?.label}
                  </strong>
                  <span className="muted">
                    {" "}
                    → {label && label.w ? label.label : "kırpılmadan"}
                    {isSide(p) ? " (dar alan)" : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {w &&
        h &&
        (manual ? (
          <div className="stack" style={{ gap: 10 }}>
            <label>
              Biçim
              <select
                value={format}
                onChange={(e) =>
                  onChange({ format: e.target.value as AdFormat })
                }
              >
                {AD_FORMATS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label} — {f.hint}
                  </option>
                ))}
              </select>
            </label>
            <p className="muted small" style={{ margin: 0 }}>
              Kalmasını istediğin noktayı işaretlemek için yukarıdaki görsele
              tıkla.
            </p>
            <div className="row">
              <button
                type="button"
                className="btn small"
                onClick={() => {
                  setManual(false);
                  onChange({ format: "auto", focus: null });
                }}
              >
                <Wand2 size={14} aria-hidden /> Otomatiğe dön
              </button>
            </div>
          </div>
        ) : (
          <div className="row">
            <span className="muted small">
              Konu noktası otomatik bulundu (%{image.autoX}, %{image.autoY}).
            </span>
            <span className="spacer" />
            <button
              type="button"
              className="btn small"
              onClick={() => {
                setManual(true);
                onChange({ focus: { x: image.autoX, y: image.autoY } });
              }}
            >
              Elle ayarla
            </button>
          </div>
        ))}
    </div>
  );
}
