import { Suspense } from "react";
import { HomeSections } from "@/components/HomeSections";

export default function Home() {
  return (
    <main className="container">
      <Suspense fallback={<p className="muted">Yükleniyor…</p>}>
        <HomeSections />
      </Suspense>
    </main>
  );
}
