'use client';
/* Every WhatsApp link on the site (wa.me/…?text=…) is logged when it is tapped: the message that was written for
   the visitor goes to /api/enquiries, then WhatsApp opens as usual. Mounted once in the root layout. */
import { useEffect } from 'react';
import { logEnquiry } from '@/lib/enquiry';

export default function EnquiryLog() {
  useEffect(() => {
    const h = (ev: MouseEvent) => {
      const a = (ev.target as Element | null)?.closest?.('a[href^="https://wa.me/"]') as HTMLAnchorElement | null; if (!a) return;
      let message = ''; try { message = new URL(a.href).searchParams.get('text') || ''; } catch {}
      if (!message) return;
      logEnquiry({ message, kind: /\bRef: ATP-|confirm this trip/.test(message) ? 'trip' : /please confirm this for me/.test(message) ? 'item' : 'general' });
    };
    document.addEventListener('click', h, true); document.addEventListener('auxclick', h, true);
    return () => { document.removeEventListener('click', h, true); document.removeEventListener('auxclick', h, true); };
  }, []);
  return null;
}
