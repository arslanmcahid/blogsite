import { Suspense } from "react";
import { AdminGate } from "@/components/admin/AdminGate";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  // AdminGate usePathname kullanır; çalışma zamanı verisi olduğu için Suspense içinde olmalı.
  return (
    <Suspense fallback={<p className="muted admin-pad">Yükleniyor…</p>}>
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}
