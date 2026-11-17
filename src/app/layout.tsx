import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import Shell from '@/components/Shell';
import '@/styles/app.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://andamantravelplanner.com'),
  title: { default: 'Andaman Travel Planner: ferries, stays, cabs and things to do in one plan', template: '%s · Andaman Travel Planner' },
  description: 'Plan and book an Andaman trip as one itinerary. Ferries, hotels, cabs and things to do on Havelock, Neil, Port Blair and beyond, with every connection checked before you pay.',
  applicationName: 'Andaman Travel Planner',
  manifest: '/manifest.webmanifest',
  openGraph: { type: 'website', siteName: 'Andaman Travel Planner', images: ['/img/f/i179.webp'] },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#071A22' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anek+Devanagari:wght@400;600;700&family=Inter+Tight:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" />
      </head>
      <body>
        <Suspense><Shell>{children}</Shell></Suspense>
      </body>
    </html>
  );
}
