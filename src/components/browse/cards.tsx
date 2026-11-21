/* Cards and rows for browse lists. Plain markup, no hooks: used by server pages and by the browse screen alike. */
import Link from 'next/link';
import type { Item } from '@/lib/browse';
import { TideIcon } from '@/components/Brand';

export const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

export function Price({ it }: { it: Item }) {
  if (it.p == null) return <span className="atp-bc-p"><b>On request</b></span>;
  if (it.p === 0) return <span className="atp-bc-p"><b>Free</b></span>;
  return <span className="atp-bc-p">{it.from && <small>from</small>}<b>{inr(it.p)}</b>{it.unit && <small>{it.unit}</small>}</span>;
}

export function Rate({ rt, rv }: { rt: number | null; rv: number | null }) {
  if (!rt) return null;
  return <span className="atp-rate" title="Google rating"><TideIcon n="starf" s={12} />{rt.toFixed(1)}{rv ? <small>({rv.toLocaleString('en-IN')})</small> : null}</span>;
}

function Zone({ z, name }: { z: string; name?: string }) {
  return name ? <span className="atp-zone"><i style={{ background: `var(--z-${z})` }} />{name}</span> : null;
}

/** A photo card for a rail or a grid. `isle` adds the island's name (used when all islands are shown together). */
export function Card({ it, isle, wide, q, eager, notag }: { it: Item; isle?: string; wide?: boolean; q?: string; eager?: boolean; notag?: boolean }) {
  return (
    <Link className={`atp-bc${wide ? ' is-wide' : ''}`} href={it.href + (q || '')} prefetch={false}>
      <span className="atp-bc-ph">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={it.ph} alt="" width={464} height={309} loading={eager ? 'eager' : 'lazy'} decoding="async" />
        {it.tag && !notag && <span className="atp-pk-tag">{it.tag}</span>}
        {it.smp && <span className="atp-smp">{it.smp}</span>}
      </span>
      <span className="atp-bc-b">
        <b>{it.n}</b>
        <small className="atp-bc-m"><Rate rt={it.rt} rv={it.rv} />{isle ? <Zone z={it.z} name={isle} /> : <span>{it.l1}</span>}</small>
        <Price it={it} />
      </span>
    </Link>
  );
}

/** A list row: small photo, name, two or three lines, price. */
export function Row({ it, isle, q }: { it: Item; isle?: string; q?: string }) {
  return (
    <Link className="atp-lrow" href={it.href + (q || '')} prefetch={false}>
      <span className="atp-lrow-ph">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={it.th} alt="" width={224} height={168} loading="lazy" decoding="async" />
        {it.smp && <span className="atp-smp">{it.smp}</span>}
      </span>
      <span className="atp-lrow-b">
        <b>{it.n}</b>
        {(it.rt || isle) && <small className="atp-bc-m"><Rate rt={it.rt} rv={it.rv} /><Zone z={it.z} name={isle} /></small>}
        <small>{it.l1}</small>
        {it.l2 && <small>{it.l2}</small>}
        {it.l3 && <small className="atp-clamp1">{it.l3}</small>}
        <Price it={it} />
      </span>
    </Link>
  );
}
