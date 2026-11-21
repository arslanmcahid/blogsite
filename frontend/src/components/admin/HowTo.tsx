"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";

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

type Step = {
  /** Bu adımın gösterileceği sayfa (farklıysa tur oraya geçer). */
  route?: string;
  /** Vurgulanacak öğe: sayfada data-tour="…" ile işaretli. Yoksa ekran ortasında gösterilir. */
  target?: string;
  title: string;
  text: string;
};

const STEPS: Step[] = [
  {
    route: "/admin",
    title: "Hoş geldin!",
    text: "Bu kısa turda panelin nerelerinden ne yaptığını ekranda göstereceğim. Kod bilmen gerekmez. İstediğin an “Kapat”la çıkabilir, sol alttaki “Nasıl kullanılır?” düğmesiyle yeniden başlatabilirsin.",
  },
  {
    route: "/admin",
    target: "nav-posts",
    title: "Yazılar burada",
    text: "Sol menüden bölümler arasında geçersin. Yazdığın bütün yazılar “Yazılar”da listelenir.",
  },
  {
    route: "/admin/posts",
    target: "new-post",
    title: "Yeni yazı başlat",
    text: "Yeni bir yazı yazmak için bu düğmeye basarsın. Listede her yazının yanında Düzenle, Yayınla / Taslağa al ve Sil düğmeleri de var.",
  },
  {
    route: "/admin/posts/new",
    target: "post-title",
    title: "Başlık ve özet",
    text: "Yazının başlığını ve kısa özetini buraya yazarsın. Özet, yazı listelerinde ve paylaşımlarda görünür.",
  },
  {
    route: "/admin/posts/new",
    target: "post-content",
    title: "İçeriği bölümlerle kur",
    text: "Yazını bölümlerden oluşturursun: metin, fotoğraf, alıntı, YouTube videosu, gazete sütunları, sergi ve harita. Metin bölümü Word gibi çalışır. Boş bir yazıda hazır şablonlar da var. Bölümleri sürükleyerek sıralarsın.",
  },
  {
    route: "/admin/posts/new",
    target: "post-status",
    title: "Taslak mı, yayında mı?",
    text: "“Taslak” yazıyı sadece sen görürsün. Herkese açmak için Durum’u “Yayında” yapıp Kaydet’e basarsın. İstersen yayın tarihini de burada ayarlarsın. Ctrl/Cmd+S de kaydeder.",
  },
  {
    route: "/admin/posts/new",
    target: "post-taxonomy",
    title: "Kategori ve etiketler",
    text: "Yazına bir kategori ve istediğin kadar etiket ver. Ziyaretçiler bunlara tıklayıp aynı konudaki yazıları görür. Kapak fotoğrafı, konumlar ve yazı görünümü de bu sağ sütunda.",
  },
  {
    route: "/admin/galleries",
    target: "new-gallery",
    title: "Fotoğraf sergisi",
    text: "Fotoğraflarını bir sergide toplayabilirsin: yeni sergi oluştur, fotoğrafları sürükleyip bırak, sırala. Hazır sergiyi yazıların içine de ekleyebilirsin.",
  },
  {
    route: "/admin/locations",
    target: "loc-add",
    title: "Konum ekleme",
    text: "Haritaya tıklayarak ya da adres arayarak bir yer ekle, ona bir ad ver. Sonra yazı düzenlerken “Konumlar” kartından o yeri yazına etiketlersin. Etiketli yerler sitedeki haritada görünür.",
  },
  {
    route: "/admin/home",
    target: "home-add",
    title: "Ana sayfayı kur",
    text: "Buradaki düğmelerle ana sayfana yeni bölümler eklersin: öne çıkan yazı, son yazılar, sergiler, harita ya da kendi yazdığın bir mesaj.",
  },
  {
    route: "/admin/home",
    target: "home-frame",
    title: "Bölümleri yönet",
    text: "Her bölümün sağ üstündeki düğmelerle düzenler, yukarı-aşağı taşır ya da kaldırırsın. Kartların da kendi düğmeleri var. Bitince Kaydet’e bas. Yanlışlıkla sildiysen “Geri al” çıkar.",
  },
  {
    route: "/admin/ads",
    target: "new-ad",
    title: "Reklam ekleme",
    text: "Elden aldığın bir reklamı buradan eklersin: görselli afiş ya da metinli kart. Bağlantısını, başlangıç-bitiş tarihini ve nerede görüneceğini (ana sayfanın ve yazıların sol/sağ yanı, yazı sonu, ekranın altında sabit şerit) seçersin. Süresi dolunca kendiliğinden kalkar. Reklamın sayfasında günlük, haftalık ve aylık gösterim/tıklama raporu ve Excel indirme var.",
  },
  {
    route: "/admin",
    title: "Hepsi bu kadar!",
    text: "Artık hazırsın. Takıldığın bir yerde sol alttaki “Nasıl kullanılır?” düğmesiyle bu turu istediğin zaman yeniden izleyebilirsin.",
  },
];

type Box = { top: number; left: number; width: number; height: number };
const PAD = 8;
const POP_W = 340;

/** Sayfadaki görünür (boyutu olan) ilk eşleşmeyi bulur; masaüstü ve mobil menüde aynı anahtar olabilir. */
function findTarget(key: string): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(`[data-tour="${key}"]`);
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

export type HowToHandle = { open: () => void };

/**
 * Ekran üzerinde gösteren tur: her adımda ilgili sayfaya geçer, anlatılan öğeyi vurgular.
 * İlk girişte kendiliğinden açılır; “Bir daha gösterme” işaretlenirse bu tarayıcıda açılmaz.
 * `handle.open()` ile elle yeniden başlatılır.
 */
export function HowTo({ handle }: { handle: Ref<HowToHandle> }) {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [hide, setHide] = useState(() => isHidden());
  const [box, setBox] = useState<Box | null>(null);
  const [popH, setPopH] = useState(200);
  const [vp, setVp] = useState({ w: 1024, h: 768 });
  const popRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const resumePath = useRef("/admin");

  useImperativeHandle(handle, () => ({
    open: () => {
      resumePath.current = pathname;
      setStep(0);
      setActive(true);
    },
  }));

  useEffect(() => {
    // İlk giriş: kayıt yoksa turu başlat (zamanlayıcı içinde, sayfa yerleşsin diye).
    if (isHidden()) return;
    const t = setTimeout(() => setActive(true), 400);
    return () => clearTimeout(t);
  }, []);

  const s = STEPS[step];

  // Hedefi bul, ekrana getir, ölç. Sayfa yeni açıldıysa öğe gelene kadar kısa süre bekler.
  const locate = useCallback(() => {
    setVp({ w: window.innerWidth, h: window.innerHeight });
    if (!s.target) return setBox(null);
    const el = findTarget(s.target);
    if (!el) return setBox(null);
    const r = el.getBoundingClientRect();
    setBox({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [s.target]);

  useEffect(() => {
    if (!active) return;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (s.route && pathname !== s.route) return; // sayfa değişimini bekle
      if (s.target) {
        const el = findTarget(s.target);
        if (!el && tries++ < 40) {
          timer = setTimeout(tick, 100);
          return;
        }
        el?.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
      }
      locate();
      nextRef.current?.focus({ preventScroll: true });
    };
    timer = setTimeout(tick, 60);
    const onMove = () => locate();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [active, step, pathname, s.route, s.target, locate]);

  // Açılır pencerenin yüksekliğini ölç (konumlandırma için).
  useEffect(() => {
    if (!active || !popRef.current) return;
    const ro = new ResizeObserver(() => setPopH(popRef.current?.offsetHeight ?? 200));
    ro.observe(popRef.current);
    return () => ro.disconnect();
  }, [active]);

  const close = useCallback(() => {
    setHidden(hide);
    setActive(false);
    setBox(null);
    if (pathname !== resumePath.current) router.push(resumePath.current);
  }, [hide, pathname, router]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, close]);

  function go(i: number) {
    const next = STEPS[i];
    setStep(i);
    setBox(null);
    if (next.route && next.route !== pathname) router.push(next.route);
  }

  if (!active) return null;

  const last = step === STEPS.length - 1;
  const w = Math.min(POP_W, vp.w - 24);
  let top: number;
  let left: number;
  if (box) {
    left = Math.min(Math.max(12, box.left + box.width / 2 - w / 2), vp.w - w - 12);
    const below = box.top + box.height + PAD + 12;
    const above = box.top - PAD - 12 - popH;
    top = below + popH <= vp.h - 12 ? below : above >= 12 ? above : Math.max(12, vp.h - popH - 12);
  } else {
    left = (vp.w - w) / 2;
    top = Math.max(12, (vp.h - popH) / 2);
  }

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div className="tour-block" />
      {box ? (
        <div className="tour-spot" style={{ top: box.top - PAD, left: box.left - PAD, width: box.width + PAD * 2, height: box.height + PAD * 2 }} />
      ) : (
        <div className="tour-dim" />
      )}
      <div ref={popRef} className="tour-pop" style={{ top, left, width: w }}>
        <div className="tour-head">
          <span className="tour-count">{step + 1} / {STEPS.length}</span>
          <button type="button" className="icon" aria-label="Turu kapat" onClick={close}><X size={16} /></button>
        </div>
        <h2 id="tour-title">{s.title}</h2>
        <p>{s.text}</p>
        <label className="howto-check">
          <input type="checkbox" checked={hide} onChange={(e) => setHide(e.target.checked)} /> Bir daha gösterme
        </label>
        <div className="tour-foot">
          <button type="button" className="btn small" onClick={close}>Kapat</button>
          <span className="spacer" />
          {step > 0 && <button type="button" className="btn small" onClick={() => go(step - 1)}><ChevronLeft size={14} aria-hidden /> Geri</button>}
          {last ? (
            <button ref={nextRef} type="button" className="btn small primary" onClick={close}>Başlayalım</button>
          ) : (
            <button ref={nextRef} type="button" className="btn small primary" onClick={() => go(step + 1)}>İleri <ChevronRight size={14} aria-hidden /></button>
          )}
        </div>
      </div>
    </div>
  );
}
