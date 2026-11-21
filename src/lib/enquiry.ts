/* Browser side of the enquiry log: tell the server what is being sent to us on WhatsApp. It never blocks or delays
   opening the chat, and a failure is ignored (the WhatsApp message itself is what matters to the traveller). */
export type Enquiry = { message: string; kind?: 'trip' | 'item' | 'general'; ref?: string; name?: string; phone?: string; email?: string; start?: string; end?: string; travellers?: number; total?: number; items?: number; plan?: string };

const QUEUE = 'atp_enq_q';
function queue(body: string) { try { const q: string[] = JSON.parse(localStorage.getItem(QUEUE) || '[]'); q.push(body); localStorage.setItem(QUEUE, JSON.stringify(q.slice(-10))); } catch {} }
function post(body: string) { return fetch('/api/enquiries', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).then((r) => { if (r.status >= 500) throw new Error('server'); }); }

/** Queries that could not be logged (the phone was offline) are sent on the next page load. */
export function flushEnquiries() {
  try {
    const q: string[] = JSON.parse(localStorage.getItem(QUEUE) || '[]'); if (!q.length || navigator.onLine === false) return;
    localStorage.removeItem(QUEUE);
    q.forEach((body) => post(body).catch(() => queue(body)));
  } catch {}
}

let last = ''; let lastAt = 0;
export function logEnquiry(e: Enquiry) {
  try {
    if (!e.message) return;
    /* the same message twice in a few seconds (a double tap, or the link and its handler) is logged once */
    const now = Date.now(); if (e.message === last && now - lastAt < 8000) return; last = e.message; lastAt = now;
    const body = JSON.stringify({ ...e, page: location.pathname + location.search });
    /* counted in Google Analytics as a lead, once the GA4 id is set (NEXT_PUBLIC_GA4_ID) */
    try { (window as any).gtag?.('event', 'generate_lead', { method: 'whatsapp', lead_type: e.kind || 'general', value: e.total, currency: e.total != null ? 'INR' : undefined }); } catch {}
    if (navigator.onLine === false) { queue(body); return; }
    post(body).catch(() => queue(body));
  } catch {}
}
