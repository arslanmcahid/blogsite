import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { HOME_TITLE, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { TitleMarquee } from "@/components/TitleMarquee";
import "./globals.css";

// Türkçe karakterler (ş, ğ, ı…) için latin-ext alt kümesi gerekli.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  // Göreli URL'leri (kapak görseli, canonical) mutlak adrese çevirir.
  metadataBase: new URL(SITE_URL),
  title: { default: HOME_TITLE, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  openGraph: { siteName: SITE_NAME, locale: "tr_TR", type: "website" },
  alternates: { types: { "application/rss+xml": "/feed.xml" } },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={geistSans.variable} suppressHydrationWarning>
      <head>
        {/* Kayıtlı tema seçimini sayfa çizilmeden önce uygular (açılışta beyaz/koyu yanıp sönmeyi önler). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body>
        <TitleMarquee />
        {children}
      </body>
    </html>
  );
}
