import type { Metadata, Viewport } from "next";
import { LocaleProvider } from "@/lib/i18n/locale-provider";
import { ToastProvider } from "@/components/ui/toast";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import "./globals.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://mutabasir.ae";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Mutabasir — The Director’s Lens · مُتَبَصِّر",
    template: "%s · Mutabasir",
  },
  description:
    "From paperwork to board insight in 90 seconds. Mutabasir turns contracts, tenders, O&M reports and construction files into bilingual executive dashboards, powered by an on-device AI engine that keeps every document on your machine.",
  applicationName: "Mutabasir",
  generator: "Mutabasir · Next.js",
  keywords: [
    "Mutabasir",
    "مُتَبَصِّر",
    "Basira",
    "executive dashboard",
    "bilingual dashboard",
    "Arabic executive dashboard",
    "PMO software",
    "contract management",
    "tender evaluation",
    "operations and maintenance reporting",
    "construction reporting",
    "on-device AI",
    "board reporting UAE",
    "government executive reporting",
    "لوحة تنفيذية",
    "تقارير مجلس الإدارة",
    "إدارة العقود",
    "تقييم العطاءات",
  ],
  authors: [{ name: "Eng. Ahmed Zaian" }],
  creator: "Beyond Connect General Trading L.L.C",
  publisher: "Beyond Connect General Trading L.L.C",
  category: "business",
  openGraph: {
    type: "website",
    url: APP_URL,
    title: "Mutabasir — The Director’s Lens",
    description:
      "From paperwork to board insight in 90 seconds. Bilingual executive dashboards, cited to source.",
    siteName: "Mutabasir",
    locale: "en_AE",
    alternateLocale: ["ar_AE"],
    images: [
      { url: "/opengraph-image", width: 1200, height: 630, alt: "Mutabasir" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mutabasir — The Director’s Lens",
    description: "From paperwork to board insight in 90 seconds.",
    images: ["/opengraph-image"],
  },
  alternates: {
    canonical: APP_URL,
    languages: {
      "en-AE": APP_URL,
      "ar-AE": APP_URL,
      "x-default": APP_URL,
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.svg", sizes: "any" },
    ],
    apple: [
      { url: "/apple-touch-icon.svg", sizes: "180x180", type: "image/svg+xml" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mutabasir",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#171C8F" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1350" },
  ],
  colorScheme: "light",
};

const JSON_LD_ORGANIZATION = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Mutabasir",
  alternateName: "مُتَبَصِّر",
  url: APP_URL,
  logo: `${APP_URL}/logo.svg`,
  description:
    "Bilingual executive intelligence platform for PMOs, contracting authorities and consultancies.",
  parentOrganization: {
    "@type": "Organization",
    name: "Beyond Connect General Trading L.L.C",
    address: {
      "@type": "PostalAddress",
      addressCountry: "AE",
      addressRegion: "United Arab Emirates",
    },
  },
};

const JSON_LD_SOFTWARE = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Mutabasir",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, Android, iOS",
  offers: [
    { "@type": "Offer", price: "0", priceCurrency: "AED", name: "Starter" },
    { "@type": "Offer", price: "1499", priceCurrency: "AED", name: "Pro" },
  ],
  featureList:
    "Bilingual AR+EN dashboards, on-device AI extraction, cited-to-source facts, WhatsApp summaries, formal Arabic letters, PDF export, 11-point quality gate, RLS-secured storage.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <link rel="mask-icon" href="/favicon.svg" color="#171C8F" />
        <meta name="apple-mobile-web-app-title" content="Mutabasir" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Mutabasir" />
        <meta name="msapplication-TileColor" content="#171C8F" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(JSON_LD_ORGANIZATION),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(JSON_LD_SOFTWARE),
          }}
        />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <LocaleProvider>
          <OfflineBanner />
          <ToastProvider>{children}</ToastProvider>
          <InstallPrompt />
        </LocaleProvider>
      </body>
    </html>
  );
}
