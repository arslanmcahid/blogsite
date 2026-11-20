import { Suspense } from "react";
import { apiGet } from "@/lib/api";

async function BackendStatus() {
  let status: string | null = null;
  try {
    status = (await apiGet<{ status: string }>("/api/health/")).status;
  } catch {
    status = null;
  }
  return <p>{status ? `Backend durumu: ${status}` : "Backend’e ulaşılamıyor."}</p>;
}

export default function Home() {
  return (
    <main style={{ padding: "2rem" }}>
      <h1>Blog</h1>
      <Suspense fallback={<p>Backend kontrol ediliyor…</p>}>
        <BackendStatus />
      </Suspense>
    </main>
  );
}
