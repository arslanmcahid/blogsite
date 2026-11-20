"use client";

// Beklenmeyen bir hata olursa (örn. backend'e ulaşılamıyor) kullanıcıya gösterilir.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="container">
      <h1>Bir şeyler ters gitti</h1>
      <p className="muted">Sayfa şu an yüklenemedi. Biraz sonra tekrar dene.</p>
      <button className="btn" onClick={reset}>Tekrar dene</button>
    </main>
  );
}
