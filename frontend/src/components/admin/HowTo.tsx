"use client";

import { ChevronLeft, ChevronRight, FileText, Images, LayoutTemplate, MapPin, Rocket, X, type LucideIcon } from "lucide-react";
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";

const KEY = "blog-admin-howto-hidden";

function isHidden(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
function setHidden(hide: boolean) {
  try {
    if (hide) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    /* tarayıcı depolamaya izin vermiyorsa her girişte gösterilir */
  }
}

const STEPS: { icon: LucideIcon; title: string; lines: string[] }[] = [
  {
    icon: Rocket,
    title: "Hoş geldin!",
    lines: [
      "Bu panelden sitenin her şeyini yönetirsin: yazılar, fotoğraf sergileri, konumlar ve ana sayfanın düzeni.",
      "Kod ya da teknik bilgi gerekmez. Birkaç dakikalık bu tur, ihtiyacın olan her şeyi anlatıyor.",
      "Sol menüden istediğin bölüme geçebilirsin. Bu turu sol alttaki “Nasıl kullanılır?” düğmesinden istediğin zaman yeniden açabilirsin.",
    ],
  },
  {
    icon: FileText,
    title: "1. Yazı yazmak",
    lines: [
      "Yazılar → Yeni yazı. Başlığı yaz, altındaki kutuya Word gibi yazmaya başla: kalın, italik, başlık, liste, bağlantı hepsi üstteki düğmelerde.",
      "İşin bitince Kaydet’e bas. Yazı, Durum “Taslak” iken sadece sen görürsün. Herkese açmak için Durum’u “Yayında” yapıp Kaydet’e bas.",
      "Hiç başlamak istemezsen “Şablonla başla” düğmeleri hazır düzenler sunar (gezi yazısı, fotoğraf gezisi, gazete…).",
    ],
  },
  {
    icon: LayoutTemplate,
    title: "2. Resim, alıntı ve gazete düzeni",
    lines: [
      "Yazının içine metnin yanında resim, alıntı, fotoğraf sergisi, harita ve gazete gibi 2-4 sütunlu bölümler ekleyebilirsin. Üstteki “Ekle” düğmelerinden seç.",
      "Resmi sürükleyip bırakabilir ya da bilgisayarından seçebilirsin. Bölümleri tutacağından (⠿) sürükleyerek ya da ↑ ↓ düğmeleriyle sıralarsın.",
      "“Önizleme” sekmesi, yazının sitede nasıl görüneceğini kaydetmeden gösterir. Sağdaki “Görünüm” kartı yazı tipini ve genişliğini değiştirir.",
    ],
  },
  {
    icon: Images,
    title: "3. Fotoğraf sergileri ve konumlar",
    lines: [
      "Fotoğraf sergileri → Yeni sergi: fotoğrafları kutuya sürükle, sırala, istersen her birine alt yazı ekle. Yayında olan sergiler sitede “Sergiler” sayfasında görünür.",
      "Konumlar: haritaya tıklayarak bir yer ekle. Sonra yazılara “Konumlar” kartından etiketle. Etiketli yerler sitedeki haritada belirir.",
    ],
  },
  {
    icon: MapPin,
    title: "4. Ana sayfayı düzenlemek",
    lines: [
      "Ana sayfa düzeni: ziyaretçilerin göreceği sayfayı burada olduğu gibi görürsün. Üstteki düğmelerle yeni bölüm ekle.",
      "Her bölümün sağ üstünden taşıyabilir, düzenleyebilir ya da kaldırabilirsin. Kartların da kendi düğmeleri var: sürükle, başka bir yazıyla değiştir ya da çıkar.",
      "Değişiklikler Kaydet’e basana kadar sitede görünmez. Yanlışlıkla sildiysen çıkan “Geri al” düğmesini kullan.",
    ],
  },
];

/**
 * Nasıl kullanılır turu. İlk girişte kendiliğinden açılır; “Bir daha gösterme”
 * işaretlenirse bu tarayıcıda bir daha açılmaz. `handle.open()` ile elle yeniden açılır.
 */
export type HowToHandle = { open: () => void };

export function HowTo({ handle }: { handle: Ref<HowToHandle> }) {
  const [hide, setHide] = useState(() => isHidden());
  const [step, setStep] = useState(0);
  const ref = useRef<HTMLDialogElement>(null);

  // Açık/kapalı durumunu <dialog>'un kendisi tutar; böylece elle yeniden açma her zaman çalışır.
  function show() {
    setStep(0);
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }
  useImperativeHandle(handle, () => ({ open: show }));
  useEffect(() => {
    if (!isHidden()) ref.current?.showModal();
  }, []);

  function close() {
    setHidden(hide);
    setStep(0);
    if (ref.current?.open) ref.current.close();
  }

  const s = STEPS[step];
  const last = step === STEPS.length - 1;
  return (
    <dialog ref={ref} className="hp-dialog howto" aria-labelledby="howto-title" onClose={close} onClick={(e) => e.target === ref.current && close()}>
      <div className="stack">
        <div className="hp-dialog-head">
          <s.icon size={20} aria-hidden />
          <h2 id="howto-title">{s.title}</h2>
          <button type="button" className="icon" aria-label="Kapat" onClick={close}><X size={16} /></button>
        </div>
        <div className="howto-body">
          {s.lines.map((l) => <p key={l}>{l}</p>)}
        </div>
        <div className="howto-dots" aria-hidden>
          {STEPS.map((_, i) => <span key={i} className={i === step ? "on" : ""} />)}
        </div>
        <div className="howto-foot">
          <label className="howto-check">
            <input type="checkbox" checked={hide} onChange={(e) => setHide(e.target.checked)} /> Bir daha gösterme
          </label>
          <span className="spacer" />
          {step > 0 && <button type="button" className="btn" onClick={() => setStep(step - 1)}><ChevronLeft size={15} aria-hidden /> Geri</button>}
          {last ? (
            <button type="button" className="btn primary" onClick={close}>Başlayalım</button>
          ) : (
            <button type="button" className="btn primary" onClick={() => setStep(step + 1)}>İleri <ChevronRight size={15} aria-hidden /></button>
          )}
        </div>
      </div>
    </dialog>
  );
}
