'use client';
/* A map on the page. It stays a quiet tile until asked for, so pages load fast and nothing is sent to Google
   unless the traveller wants the map. "Open in Google Maps" always works, with or without the map on the page. */
import { useState } from 'react';
import { TideIcon } from '@/components/Brand';

export default function MapFrame({ embed, href, title, cta = 'Show the map', stops, open = 'Open in Google Maps' }: { embed: string; href: string; title: string; cta?: string; stops?: string[]; open?: string }) {
  const [on, setOn] = useState(false);
  return (
    <div className={`atp-map${on ? ' is-on' : ''}`}>
      {on
        ? <iframe src={embed} title={title} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
        : (
          <button type="button" className="atp-map-show" onClick={() => setOn(true)} aria-label={`${cta}: ${title}`}>
            <span className="atp-map-i"><TideIcon n="map" /></span>
            <span><b>{cta}</b>{stops && stops.length > 1 ? <small className="atp-map-stops">{stops.join(' → ')}</small> : <small>{title}</small>}</span>
          </button>
        )}
      <a className="atp-map-open" href={href} target="_blank" rel="noopener noreferrer"><TideIcon n="pin" s={16} />{open}<TideIcon n="arrow" s={14} /></a>
    </div>
  );
}
