/* Maps. Places are named the way Google Maps knows them (and by Google place id where the catalogue has one),
   so the map and the directions are Google's own, never our drawing of them.
   `href` uses the documented Maps URLs and opens the Maps app on a phone; `embed` is the map shown on the page,
   loaded only when the traveller asks for it. */
export type Stop = { q: string; pid?: string; label?: string };
const enc = encodeURIComponent;
export const inIsles = (name: string, isle: string) => `${name}, ${isle}, Andaman and Nicobar Islands`;

export function mapPlace(s: Stop, zoom = 14) {
  return { embed: `https://www.google.com/maps?output=embed&z=${zoom}&q=${enc(s.q)}`, href: `https://www.google.com/maps/search/?api=1&query=${enc(s.q)}${s.pid ? `&query_place_id=${enc(s.pid)}` : ''}` };
}

/** Driving directions through the stops in order. Maps takes at most nine stops between the two ends. */
export function mapRoute(stops: Stop[]) {
  const a = stops[0], b = stops[stops.length - 1], mid = stops.slice(1, -1).slice(0, 9);
  const ids = mid.every((m) => m.pid) && mid.length ? `&waypoint_place_ids=${mid.map((m) => enc(m.pid!)).join('%7C')}` : '';
  const href = `https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=${enc(a.q)}${a.pid ? `&origin_place_id=${enc(a.pid)}` : ''}&destination=${enc(b.q)}${b.pid ? `&destination_place_id=${enc(b.pid)}` : ''}${mid.length ? `&waypoints=${mid.map((m) => enc(m.q)).join('%7C')}` : ''}${ids}`;
  const embed = `https://www.google.com/maps?output=embed&saddr=${enc(a.q)}&daddr=${[...mid, b].map((m) => enc(m.q)).join('+to:')}`;
  return { embed, href };
}
