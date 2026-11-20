import Link from "next/link";

// (site) grubunun içinden notFound() çağrılınca gösterilir; başlık grubun layout'undan gelir.
export default function SiteNotFound() {
  return (
    <main className="container">
      <h1>Sayfa bulunamadı</h1>
      <p><Link href="/">Ana sayfaya dön</Link></p>
    </main>
  );
}
