/* WhatsApp: one number for the whole site, and the link that opens a chat with the message already written. */
import { COMPANY } from './company';

export const WA_DIGITS = COMPANY.whatsapp.replace(/\D/g, '');

/** A chat with Andaman Travel Planner, with `text` typed in and ready to send. */
export const waLink = (text: string) => `https://wa.me/${WA_DIGITS}?text=${encodeURIComponent(text)}`;

/** The message: a greeting, what it is about, any details, and the address of the page it came from. */
export function waText(about: string, lines: (string | false | null | undefined)[] = [], url = '') {
  return [`Hi Andaman Travel Planner, ${about}`, ...lines.filter(Boolean), url].filter(Boolean).join('\n');
}

/* ---------- Ready messages: "please confirm this" for one thing, written from what is chosen on screen ----------
   Each kind has its own wording, so the message reads like the traveller wrote it and we can confirm it without
   asking again: what it is, the day and time, the room or class, who is travelling, the price they saw. */
const OPEN = 'please confirm this for me.';
export function itemQuery(E: any, c: any, url = ''): string {
  let I: any = {}; try { I = E.info(c) || {}; } catch {}
  const day = c.date ? E.fD(c.date) : ''; const lines: string[] = [];
  if (c.kind === 'stay') { const h = E.HOT[c.ref] || {}; const z = E.ZN[h.z] ? E.ZN[h.z].name : '';
    lines.push(`Stay: ${I.title || h.n}${z ? `, ${z}` : ''}`, `Check-in ${day} · ${c.nights || 1} night${(c.nights || 1) > 1 ? 's' : ''}${c.room ? ` · ${c.room}` : ''}${(c.qty || 1) > 1 ? ` · ${c.qty} rooms` : ''}`); }
  else if (c.kind === 'ferry') { const s = E.SAIL[c.ref] || {};
    lines.push(`Ferry: ${I.title}`, `${s.gov ? 'Government ship' : String(s.op || '').replace(/ \d$/, '')} · leaves ${s.dep} · ${day}${c.cls ? ` · ${c.cls} class` : ''}`, 'Please tell me which seats are free.'); }
  else if (c.kind === 'cab') lines.push(`Cab: ${I.title}`, `${day}${c.t ? ` at ${c.t}` : ''}${c.vc ? ` · ${c.vc}` : ''}`);
  else if (c.kind === 'rent') lines.push(`Rental: ${I.title}`, `From ${day}${c.days ? ` · ${c.days} day${c.days > 1 ? 's' : ''}` : ''}`);
  else { const a = E.ACT[c.ref] || {}; const z = E.ZN[a.z] ? E.ZN[a.z].name : '';
    lines.push(`Activity: ${I.title || a.n}${z ? `, ${z}` : ''}`, `${day}${c.t ? ` at ${c.t}` : ''}`); }
  lines.push(`Travellers: ${E.paxTxt()}`);
  if (I.price != null) lines.push(`Price I saw: ${E.inr(I.price)}${I.perTxt ? ` (${I.perTxt})` : ''}, before GST and fee`);
  return waText(OPEN, lines, url);
}
/** A ready-made trip, for the dates and group shown on its page. */
export function tripQuery(E: any, p: any, pr: any, url = ''): string {
  const route = (E.route ? E.route(p) : []).map(([z, n]: [string, number]) => `${E.ZN[z].name} ${n}N`).join(' → ');
  return waText('please confirm this trip for me.', [`Trip: ${p.n} · ${p.nights} nights`, route, `From ${E.fD(pr.start)} · for ${E.paxLabel(p)}`, `Price I saw: ${E.inr(pr.total)} including GST and fee`, 'I may want a few changes; please tell me what is possible.'], url);
}
