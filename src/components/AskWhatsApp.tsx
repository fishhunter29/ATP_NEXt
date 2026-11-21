'use client';
/* "Ask on WhatsApp": opens a chat with us, the question already written for the thing on screen.
   The server writes the basic message; on the phone it adds the traveller's dates and group when a trip exists,
   so nobody has to type what the site already knows. */
import { useEffect, useState } from 'react';
import { loadEngine } from '@/engine/client';
import { TideIcon, WaIcon } from '@/components/Brand';
import { waLink, waText } from '@/lib/whatsapp';

export function tripLines(E: any): string[] {
  try {
    const S = E.S; if (!S.trip && S.cart.length) E.syncTrip();
    const t = S.trip || S.win; const out: string[] = [];
    if (t && t.start) out.push(`Dates: ${E.fD(t.start)} – ${E.fD(t.end)}`);
    out.push(`Travellers: ${E.paxTxt()}`);
    return out;
  } catch { return []; }
}

export default function AskWhatsApp({ about, lines = [], path = '', label = 'Ask on WhatsApp', hint = 'We reply with times, prices and what suits your group.', variant = 'row', withTrip = true }: {
  about: string; lines?: (string | false | null | undefined)[]; path?: string; label?: string; hint?: string; variant?: 'row' | 'btn' | 'text'; withTrip?: boolean;
}) {
  const [extra, setExtra] = useState<string[]>([]);
  /* the page's own address, so the link in the message opens the site the traveller is on */
  const [origin, setOrigin] = useState('');
  useEffect(() => { setOrigin(window.location.origin); }, []);
  useEffect(() => { if (!withTrip) return; let on = true; loadEngine().then((E: any) => { if (on && E) setExtra(tripLines(E)); }).catch(() => {}); return () => { on = false; }; }, [withTrip]);
  const href = waLink(waText(about, [...lines, ...extra], path && origin ? origin + path : ''));
  if (variant === 'btn') return <a className="atp-btn is-outline atp-wa-btn" href={href} target="_blank" rel="noopener noreferrer"><WaIcon s={20} />{label}</a>;
  if (variant === 'text') return <a className="atp-link atp-wa-text" href={href} target="_blank" rel="noopener noreferrer">{label}</a>;
  return (
    <a className="atp-wa" href={href} target="_blank" rel="noopener noreferrer">
      <span className="atp-wa-i"><WaIcon s={40} /></span>
      <span><b>{label}</b><small>{hint}</small></span>
      <TideIcon n="chev" s={18} />
    </a>
  );
}
