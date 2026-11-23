"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

/** Geçerli tema: ziyaretçi seçtiyse o, seçmediyse cihazın ayarı. */
function current(): Theme {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === "light" || chosen === "dark") return chosen;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function subscribe(onChange: () => void) {
  // data-theme değişince (düğme ya da başka sekme) ve cihaz ayarı değişince yeniden oku.
  const obs = new MutationObserver(onChange);
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", onChange);
  return () => {
    obs.disconnect();
    mq.removeEventListener("change", onChange);
  };
}

/** Üst menüdeki aydınlık/karanlık mod düğmesi. Seçim bu tarayıcıda hatırlanır. */
export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribe,
    current,
    () => "light" as Theme,
  );

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* depolama kapalıysa bu oturum boyunca geçerli olur */
    }
  }

  const toDark = theme === "light";
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={toDark ? "Karanlık moda geç" : "Aydınlık moda geç"}
      title={toDark ? "Karanlık mod" : "Aydınlık mod"}
    >
      {toDark ? <Moon size={16} aria-hidden /> : <Sun size={16} aria-hidden />}
    </button>
  );
}
