import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import Shell from '@/components/Shell';
import JsonLd from '@/components/seo/JsonLd';
import SiteFooter from '@/components/seo/SiteFooter';
import ProductTour from '@/components/ProductTour';
import EnquiryLog from '@/components/EnquiryLog';
import { SITE, SITE_NAME, abs } from '@/lib/seo';
import { COMPANY } from '@/lib/company';
import '@/styles/app.css';
import '@/styles/tide.css';
import '@/styles/tide-pages.css';
import '@/styles/tide-trip.css';
import '@/styles/tide-flow.css';

const DESC = 'Plan and book an Andaman trip as one itinerary. Ferries, hotels, cabs and things to do on Havelock, Neil, Port Blair and beyond, with every connection checked before you pay.';
/* Search Console / Bing Webmaster ownership checks and Google Analytics: set these in Vercel when you have them. */
const GSC = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
const BING = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION;
const GA4 = process.env.NEXT_PUBLIC_GA4_ID;

const THEME_BOOT = `try{var t=JSON.parse(localStorage.getItem('atp_v6')||'{}').theme;if(t==='dark'||(t==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.dataset.theme='dark'}catch(e){}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: 'Andaman Travel Planner: Ferries, Hotels, Cabs & Tours', template: '%s · Andaman Travel Planner' },
  description: DESC,
  applicationName: SITE_NAME,
  manifest: '/manifest.webmanifest',
  icons: { icon: [{ url: '/icons/favicon-48.png', sizes: '48x48', type: 'image/png' }, { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }], apple: '/icons/icon-180.png' },
  openGraph: { type: 'website', siteName: SITE_NAME, locale: 'en_IN', images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'Andaman Travel Planner' }] },
  twitter: { card: 'summary_large_image', images: ['/og.jpg'] },
  formatDetection: { telephone: false },
  verification: { ...(GSC ? { google: GSC } : {}), ...(BING ? { other: { 'msvalidate.01': BING } } : {}) },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#FCF9F2' };

const ORG = [
  { '@context': 'https://schema.org', '@type': 'TravelAgency', '@id': abs('/#org'), name: SITE_NAME, url: SITE, logo: abs('/icons/icon-512.png'), description: DESC,
    legalName: COMPANY.name, email: COMPANY.email, taxID: COMPANY.gstin, telephone: COMPANY.whatsapp.replace(/\s/g, ''), image: abs('/og.jpg'),
    contactPoint: { '@type': 'ContactPoint', contactType: 'customer service', telephone: COMPANY.whatsapp.replace(/\s/g, ''), email: COMPANY.email, areaServed: 'IN', url: `https://wa.me/${COMPANY.whatsapp.replace(/\D/g, '')}` },
    identifier: [{ '@type': 'PropertyValue', propertyID: 'DPIIT', value: COMPANY.dpiit }, { '@type': 'PropertyValue', propertyID: 'CIN', value: COMPANY.cin }],
    knowsAbout: ['Andaman and Nicobar Islands', 'Havelock Island (Swaraj Dweep)', 'Neil Island (Shaheed Dweep)', 'Port Blair (Sri Vijaya Puram)', 'Andaman ferry tickets', 'Scuba diving in the Andamans'],
    address: { '@type': 'PostalAddress', streetAddress: COMPANY.street, addressLocality: COMPANY.locality, addressRegion: 'Andaman and Nicobar Islands', postalCode: COMPANY.postalCode, addressCountry: 'IN' }, areaServed: { '@type': 'Place', name: 'Andaman and Nicobar Islands' } },
  { '@context': 'https://schema.org', '@type': 'WebSite', '@id': abs('/#site'), name: SITE_NAME, url: SITE, inLanguage: 'en-IN', publisher: { '@id': abs('/#org') } },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" data-theme="light" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap" />
        {/* night theme, if chosen, before the first paint */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <JsonLd data={ORG} />
      </head>
      <body>
        <Shell footer={<SiteFooter />}>{children}</Shell>
        <ProductTour />
        <EnquiryLog />
        {GA4 && <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA4}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA4}');`}</Script>
        </>}
      </body>
    </html>
  );
}
