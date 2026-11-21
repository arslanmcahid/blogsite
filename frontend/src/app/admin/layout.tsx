import type { Metadata } from "next";
import { Instrument_Serif } from "next/font/google";
import "./admin.css";

const serif = Instrument_Serif({ variable: "--font-serif", weight: "400", subsets: ["latin", "latin-ext"] });

// Yönetim paneli arama motorlarında görünmesin.
export const metadata: Metadata = { title: "Yönetim", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className={`admin-root ${serif.variable}`}>{children}</div>;
}
