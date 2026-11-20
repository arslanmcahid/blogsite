import type { Metadata } from "next";
import "./admin.css";

// Yönetim paneli arama motorlarında görünmesin.
export const metadata: Metadata = { title: "Yönetim", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
