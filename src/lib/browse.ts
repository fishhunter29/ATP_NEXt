/* The catalogue, shaped for browsing: small records for cards and lists, the categories people pick from,
   and the island lines. Runs on the server; pages hand the result to the browse components. */
import { ACTS, HOTELS, ZN, ZONES, actPhoto, hotelFrom, zonePhoto, type Act } from '@/lib/catalogue';
import { hotelPhotoCount } from '@/components/HotelPhoto';
import PKGS from '@/data/packages.json';

export type Cat = { k: string; n: string; icon: string };
/** One thing in a browse list: a thing to do, a stay or a ready-made trip. */
export type Item = {
  id: string; href: string; n: string; z: string; cs: string[];
  ph: string; th: string; sample?: boolean; tag?: string;
  l1: string; l2?: string; l3?: string;
  rt: number | null; rv: number | null;
  p: number | null; unit: string; from: boolean;
  d: number; s: number; q: string;
};
export type Isle = { id: string; n: string; line: string };

/* Islands in the order people ask for them. */
const ORDER = ['HAV', 'PBL', 'NEI', 'BAR', 'WAN', 'LON', 'RAN', 'MAY', 'DIG', 'LIT'];
const LINE: Record<string, string> = {
  HAV: 'Beaches and diving', PBL: 'History and the jail', NEI: 'Slow, quiet, rock pools', BAR: 'Mangroves and caves', WAN: 'Marine park, day trips',
  LON: 'Remote beaches', RAN: 'Mangrove walks', MAY: 'Turtle beaches', DIG: 'The far north', LIT: 'Waterfalls and surf',
};
export const BEST_FOR: Record<string, string> = {
  HAV: 'Beaches, diving, couples, families', PBL: 'History, museums, first and last night', NEI: 'Slow days, cycling, families', BAR: 'A day trip from Port Blair',
  WAN: 'Snorkelling day trips', LON: 'Quiet, walkers, no cars', RAN: 'A stop on the road north', MAY: 'Turtle nesting, quiet coast', DIG: 'Trekking and the twin islands', LIT: 'Surf, waterfalls, long beaches',
};
export const ISLES: Isle[] = ORDER.filter((z) => ZN[z]).map((z) => ({ id: z, n: ZN[z].name, line: LINE[z] || '' }));
export const isleName = (z: string) => ZN[z]?.name || z;

const score = (rt?: number | null, n?: number | null) => (rt || 0) * Math.log10((n || 1) + 1);

/* ---------- things to do ---------- */
const ACT_CATS: (Cat & { fams: string[] })[] = [
  { k: 'sights', n: 'Sights and beaches', icon: 'sunset', fams: ['Places to visit'] },
  { k: 'boats', n: 'Boat trips', icon: 'boat', fams: ['Boat trips', 'Cruises & charters'] },
  { k: 'snorkel', n: 'Snorkel and sea walk', icon: 'eye', fams: ['Snorkelling', 'Sea walk', 'Glass bottom & semi-sub'] },
  { k: 'scuba', n: 'Scuba diving', icon: 'mask', fams: ['Scuba - Try dive', 'Scuba - Certified dives', 'Scuba - Courses'] },
  { k: 'water', n: 'Water sports', icon: 'jet', fams: ['Motor water sports'] },
  { k: 'kayak', n: 'Kayaking', icon: 'wave', fams: ['Kayaking'] },
  { k: 'nature', n: 'Nature and walks', icon: 'leaf', fams: ['Walks & nature'] },
  { k: 'tours', n: 'Tours and shows', icon: 'compass', fams: ['Sightseeing tours'] },
  { k: 'fishing', n: 'Fishing', icon: 'fish', fams: ['Fishing'] },
];
export const actCats: Cat[] = ACT_CATS.map(({ k, n, icon }) => ({ k, n, icon }));
const HIDDEN = /^ACV-(FISH-PERMIT|EQUIP|NITROX|ADDON|SCOOTY|CYCLE|HELI|TOUR-DIGLIPUR|MEAL|SHOP)/;
export const actCat = (a: Act) => (HIDDEN.test(a.id) ? undefined : ACT_CATS.find((c) => c.fams.includes(a.fam)));
export const PER: Record<string, string> = { per_pax: 'a person', per_boat: 'a boat', per_vehicle: 'a vehicle', per_group: 'a group' };

const dur = (m: number) => (!m ? '' : m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);
const rvOf = (a: Act) => a.g?.rv ?? a.g?.n ?? null;
const text = (...x: (string | undefined | null)[]) => x.filter(Boolean).join(' ').toLowerCase();

export function actItems(): Item[] {
  return spread(ACTS.flatMap((a) => {
    const c = actCat(a); if (!c) return [];
    const ph = `/img/t/${actPhoto(a.id)}.webp`;
    return [{ id: a.id, href: `/things-to-do/${a.id.toLowerCase()}`, n: a.n, z: a.z, cs: [c.k], ph, th: ph, l1: a.v, l2: [c.n, dur(a.d || 0)].filter(Boolean).join(' · '),
      rt: a.g?.rt ?? null, rv: rvOf(a), p: a.p ?? null, unit: PER[a.b] || '', from: true, d: a.d || 0, s: score(a.g?.rt, rvOf(a)), q: text(a.n, a.v, a.fam, a.site, isleName(a.z)), gk: a.g?.k }];
  }).sort((x, y) => y.s - x.s));
}
/* Several things to do share one place's Google rating (everything at Radhanagar, say). Only the first keeps its
   full weight, so "Most loved" is a list of different places. */
function spread(list: (Item & { gk?: string })[]): Item[] {
  const seen = new Set<string>();
  return list.map(({ gk, ...x }) => { if (!gk) return x; if (seen.has(gk)) return { ...x, s: x.s * 0.55 }; seen.add(gk); return x; }).sort((x, y) => y.s - x.s);
}

/* ---------- stays ---------- */
export const stayCats: Cat[] = [
  { k: 'Luxury', n: 'Luxury', icon: 'crown' }, { k: 'Premium', n: 'Premium', icon: 'star' }, { k: 'Deluxe', n: 'Deluxe', icon: 'bed' },
  { k: 'Standard', n: 'Standard', icon: 'bed' }, { k: 'Budget', n: 'Budget', icon: 'wallet' },
];
export function stayItems(): Item[] {
  return HOTELS.map((h) => {
    const own = hotelPhotoCount(h.id) > 0; const key = own ? h.id.toLowerCase() : 'sample';
    return { id: h.id, href: `/stays/${h.id.toLowerCase()}`, n: h.n, z: h.z, cs: [h.t], ph: `/img/h/${key}-0.webp`, th: `/img/h/${key}-t.webp`, sample: !own, tag: h.t,
      l1: h.a || isleName(h.z), l2: `${h.rooms.length} room type${h.rooms.length > 1 ? 's' : ''}`, rt: h.rt, rv: h.rv, p: hotelFrom(h), unit: 'a night', from: true, d: 0,
      /* hotels that have sent their own photos come first, then by rating */
      s: score(h.rt, h.rv) + (own ? 100 : 0), q: text(h.n, h.a, h.t, isleName(h.z)) };
  }).sort((x, y) => y.s - x.s);
}

/* ---------- ready-made trips ---------- */
type Pkg = { id: string; n: string; tag: string; nights: number; tier: string; pax: number[]; hl: string[]; route: [string, number][]; total: number; days: { kind: string; ref: string; zone: string }[][] };
const TRIP_CATS: (Cat & { tags?: string[]; under?: number; picks?: boolean })[] = [
  { k: 'picks', n: 'Our picks', icon: 'star', picks: true },
  { k: 'couples', n: 'Honeymoon and couples', icon: 'heart', tags: ['Honeymoon', 'Couples'] },
  { k: 'families', n: 'Families and easy pace', icon: 'kid', tags: ['Family', 'Families', 'Seniors', 'Slow travel'] },
  { k: 'groups', n: 'Friends and groups', icon: 'users', tags: ['Group', 'Groups'] },
  { k: 'adventure', n: 'Adventure and diving', icon: 'mask', tags: ['Adventure', 'Certified divers', 'Offbeat'] },
  { k: 'signature', n: 'Signature stays', icon: 'crown', tags: ['Signature', 'Luxury'] },
  { k: 'budget', n: 'Easy on the budget', icon: 'wallet', under: 16000 },
  { k: 'ltc', n: 'LTC-friendly', icon: 'brief', tags: ['LTC'] },
  { k: 'classic', n: 'Classic first trips', icon: 'map', tags: ['Classic', 'First-timers', 'Essential', 'The full picture'] },
];
export const tripCats: Cat[] = TRIP_CATS.map(({ k, n, icon }) => ({ k, n, icon }));

/* A trip's photo: the best-loved thing it does on the island where it spends the most nights outside Port Blair. */
function tripPhoto(p: Pkg, used: Map<string, number>) {
  const nights: Record<string, number> = {}; p.route.forEach(([z, n]) => { nights[z] = (nights[z] || 0) + n; });
  const main = Object.keys(nights).filter((z) => z !== 'PBL').sort((a, b) => nights[b] - nights[a])[0] || 'PBL';
  const byId = new Map(ACTS.map((a) => [a.id, a]));
  const acts = p.days.flat().filter((x) => x.kind === 'act' && byId.has(x.ref)).map((x) => byId.get(x.ref)!);
  const ranked = acts.map((a) => ({ ph: actPhoto(a.id), s: score(a.g?.rt, (a.g as any)?.rv ?? a.g?.n) + (a.z === main ? 4 : 0) })).sort((a, b) => b.s - a.s);
  /* spread the photos: prefer one that fewer trips already use */
  const pick = ranked.slice(0, 6).sort((a, b) => (used.get(a.ph) || 0) - (used.get(b.ph) || 0) || b.s - a.s)[0];
  const ph = pick ? pick.ph : zonePhoto(main); used.set(ph, (used.get(ph) || 0) + 1); return ph;
}
export function tripItems(): Item[] {
  const used = new Map<string, number>();
  return (PKGS as unknown as Pkg[]).map((p, i) => {
    const pe = (p.pax[0] || 2) + (p.pax[1] || 0); const pp = Math.round(p.total / pe);
    const cs = TRIP_CATS.filter((c) => (c.picks && /^P\d/.test(p.id)) || (c.tags && c.tags.includes(p.tag)) || (c.under && pp < c.under)).map((c) => c.k);
    const names = p.route.map(([z]) => isleName(z)); const ph = `/img/t/${tripPhoto(p, used)}.webp`;
    return { id: p.id, href: `/trips/${p.id.toLowerCase()}`, n: p.n, z: '', cs, ph, th: ph, tag: TRIP_CATS.find((c) => c.tags?.includes(p.tag))?.n || p.tag,
      l1: `${p.nights} nights · ${[...new Set(names)].join(', ')}`, l2: `${p.nights + 1} days · for ${pe} · ${p.tier} stays`, l3: p.hl.slice(0, 3).join(' · '),
      rt: null, rv: null, p: pp, unit: 'a person', from: false, d: p.nights, s: 1000 - i, q: text(p.n, names.join(' '), p.hl.join(' '), p.tag) };
  });
}

export const COUNTS = {
  acts: ACTS.filter((a) => actCat(a)).length, stays: HOTELS.length, trips: (PKGS as unknown[]).length, zones: ZONES.length,
};
