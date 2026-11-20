/* Hotel photos. /public/img/h holds the photos partner hotels have sent us: <id>-t.webp is the list thumbnail,
   <id>-0.webp … the gallery. src/data/hotelphotos.json says how many each hotel has. A hotel that has not sent
   photos yet shows one labelled sample photo, so nobody takes it for the hotel itself. */
import PHOTOS from '@/data/hotelphotos.json';

const N = PHOTOS as Record<string, number>;
export const hotelPhotoCount = (id: string) => N[id] || 0;
export const hotelCover = (id: string) => (N[id] ? `/img/h/${id.toLowerCase()}-0.webp` : null);

/** Small photo for a list row. */
export function HotelThumb({ id }: { id: string }) {
  const has = !!N[id];
  return (
    <span className="lph">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/img/h/${has ? id.toLowerCase() : 'sample'}-t.webp`} alt="" width={112} height={84} loading="lazy" decoding="async" />
      {!has && <i>Sample</i>}
    </span>
  );
}

/** Swipeable gallery for the stay page: plain images in a scroll-snap strip, no script needed. */
export function HotelGallery({ id, name }: { id: string; name: string }) {
  const n = N[id] || 0; const key = n ? id.toLowerCase() : 'sample';
  return (
    <div className="hgal-w">
      <div className="hgal" role="group" aria-label={`Photos of ${name}`} tabIndex={0}>
        {Array.from({ length: n || 1 }, (_, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={`/img/h/${key}-${i}.webp`} alt={n ? `${name}, photo ${i + 1} of ${n}` : ''} width={720} height={480} loading={i ? 'lazy' : 'eager'} decoding="async" />
        ))}
      </div>
      {n > 1 && <span className="hgal-n">{n} photos · swipe</span>}
      {!n && <p className="note">Sample photo. The hotel’s own photos are coming.</p>}
    </div>
  );
}
