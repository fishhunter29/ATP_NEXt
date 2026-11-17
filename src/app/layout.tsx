import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import Shell from '@/components/Shell';
import JsonLd from '@/components/seo/JsonLd';
import SiteFooter from '@/components/seo/SiteFooter';
import { SITE, SITE_NAME, abs } from '@/lib/seo';
import '@/styles/app.css';

const DESC = 'Plan and book an Andaman trip as one itinerary. Ferries, hotels, cabs and things to do on Havelock, Neil, Port Blair and beyond, with every connection checked before you pay.';
/* Search Console / Bing Webmaster ownership checks and Google Analytics: set these in Vercel when you have them. */
const GSC = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
const BING = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION;
const GA4 = process.env.NEXT_PUBLIC_GA4_ID;

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: 'Andaman Travel Planner: ferries, stays, cabs and things to do in one plan', template: '%s · Andaman Travel Planner' },
  description: DESC,
  applicationName: SITE_NAME,
  manifest: '/manifest.webmanifest',
  icons: { icon: [{ url: '/icons/icon.svg', type: 'image/svg+xml' }, { url: '/icons/icon-192.png', sizes: '192x192' }], apple: '/icons/icon-180.png' },
  openGraph: { type: 'website', siteName: SITE_NAME, locale: 'en_IN', images: ['/img/f/i179.webp'] },
  twitter: { card: 'summary_large_image', images: ['/img/f/i179.webp'] },
  formatDetection: { telephone: false },
  verification: { ...(GSC ? { google: GSC } : {}), ...(BING ? { other: { 'msvalidate.01': BING } } : {}) },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#071A22' };

const ORG = [
  { '@context': 'https://schema.org', '@type': 'TravelAgency', '@id': abs('/#org'), name: SITE_NAME, url: SITE, logo: abs('/icons/icon-512.png'), description: DESC,
    address: { '@type': 'PostalAddress', addressLocality: 'Sri Vijaya Puram (Port Blair)', addressRegion: 'Andaman and Nicobar Islands', addressCountry: 'IN' }, areaServed: { '@type': 'Place', name: 'Andaman and Nicobar Islands' } },
  { '@context': 'https://schema.org', '@type': 'WebSite', '@id': abs('/#site'), name: SITE_NAME, url: SITE, inLanguage: ['en-IN', 'hi-IN'], publisher: { '@id': abs('/#org') } },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anek+Devanagari:wght@400;600;700&family=Inter+Tight:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" />
        <JsonLd data={ORG} />
      </head>
      <body>
        <Shell footer={<SiteFooter />}>{children}</Shell>
        {GA4 && <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA4}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA4}');`}</Script>
        </>}
      </body>
    </html>
  );
}
