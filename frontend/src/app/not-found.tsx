import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container">
      <h1>Sayfa bulunamadı</h1>
      <p><Link href="/">Ana sayfaya dön</Link></p>
    </main>
  );
}
