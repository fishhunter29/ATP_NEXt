/* Hotel photos. /public/img/h holds the photos partner hotels have sent us: <id>-t.webp is the list thumbnail,
   <id>-0.webp … the gallery. src/data/hotelphotos.json says how many each hotel has. Every hotel we list has its own
   photos; the only stays without them are the island placeholders ("hotel confirmed by us", catalogue flag tbc), which
   show a photo of the island, labelled, never a photo passed off as the hotel. */
import PHOTOS from '@/data/hotelphotos.json';

const N = PHOTOS as Record<string, number>;
export const hotelPhotoCount = (id: string) => N[id] || 0;
export const hotelCover = (id: string) => (N[id] ? `/img/h/${id.toLowerCase()}-0.webp` : null);

/** Swipeable gallery for the stay page: plain images in a scroll-snap strip, no script needed.
    `island` is the island photo shown for a stay that has no photos of its own (the placeholders). */
export function HotelGallery({ id, name, island }: { id: string; name: string; island?: string }) {
  const n = N[id] || 0;
  if (!n) return (
    <div className="hgal-w">
      <div className="hgal" role="group" aria-label={name}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={island || '/img/f/i179.webp'} alt="" width={720} height={480} decoding="async" />
      </div>
      <p className="note">A photo of the island. We confirm the hotel with you on WhatsApp before anything is booked.</p>
    </div>
  );
  return (
    <div className="hgal-w">
      <div className="hgal" role="group" aria-label={`Photos of ${name}`} tabIndex={0}>
        {Array.from({ length: n }, (_, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={`/img/h/${id.toLowerCase()}-${i}.webp`} alt={`${name}, photo ${i + 1} of ${n}`} width={720} height={480} loading={i ? 'lazy' : 'eager'} decoding="async" />
        ))}
      </div>
      {n > 1 && <span className="hgal-n">{n} photos · swipe</span>}
    </div>
  );
}
