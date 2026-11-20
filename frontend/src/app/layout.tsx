import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

// Türkçe karakterler (ş, ğ, ı…) için latin-ext alt kümesi gerekli.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: { default: "Blog", template: "%s · Blog" },
  description: "Kişisel blog",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={geistSans.variable}>
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
