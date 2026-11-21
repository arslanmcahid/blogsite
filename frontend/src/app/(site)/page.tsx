import { Suspense } from "react";
import { HomeSections } from "@/components/HomeSections";
import { SideRails } from "@/components/SideRails";

export default function Home() {
  return (
    <main id="main" className="container">
      <Suspense fallback={null}><SideRails kind="home" /></Suspense>
      <Suspense fallback={<p className="muted">Yükleniyor…</p>}>
        <HomeSections />
      </Suspense>
    </main>
  );
}
