import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="container">
        <h1>Sayfa bulunamadı</h1>
        <p><Link href="/">Ana sayfaya dön</Link></p>
      </main>
    </>
  );
}
