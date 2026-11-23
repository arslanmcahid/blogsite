"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** Menüde "Yönetim" bağlantısı: yalnızca yönetici giriş yapmışsa görünür, ziyaretçiler görmez. */
export function AdminLink() {
  const [isStaff, setIsStaff] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me/", { credentials: "same-origin" })
      .then((r) => !cancelled && setIsStaff(r.ok))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return isStaff ? (
    <Link href="/admin" className="admin-link">
      Yönetim
    </Link>
  ) : null;
}
