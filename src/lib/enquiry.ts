/* Browser side of the enquiry log: tell the server what is being sent to us on WhatsApp. It never blocks or delays
   opening the chat, and a failure is ignored (the WhatsApp message itself is what matters to the traveller). */
export type Enquiry = { message: string; kind?: 'trip' | 'item' | 'general'; ref?: string; name?: string; phone?: string; email?: string; start?: string; end?: string; travellers?: number; total?: number; items?: number; plan?: string };

let last = ''; let lastAt = 0;
export function logEnquiry(e: Enquiry) {
  try {
    if (!e.message) return;
    /* the same message twice in a few seconds (a double tap, or the link and its handler) is logged once */
    const now = Date.now(); if (e.message === last && now - lastAt < 8000) return; last = e.message; lastAt = now;
    const body = JSON.stringify({ ...e, page: location.pathname + location.search });
    if (navigator.sendBeacon && navigator.sendBeacon('/api/enquiries', new Blob([body], { type: 'application/json' }))) return;
    fetch('/api/enquiries', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {});
  } catch {}
}
