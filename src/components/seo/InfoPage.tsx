/* A plain company page (contact, partners, careers, media): a title, a short lead, sections, and the ways to reach us.
   Server-rendered; the content is passed in by each page so it is easy to edit. */
import { COMPANY, DPIIT_LINE } from '@/lib/company';
import { waLink } from '@/lib/whatsapp';
import JsonLd from '@/components/seo/JsonLd';
import { abs, crumbs } from '@/lib/seo';
import { WaIcon, TideIcon } from '@/components/Brand';

export type InfoSection = { h: string; t: string; items?: [string, string][]; link?: [string, string] };

export default function InfoPage({ path, eyebrow, title, lead, sections, wa, mailSubject, schemaType = 'WebPage' }: {
  path: string; eyebrow: string; title: string; lead: string; sections: InfoSection[]; wa: string; mailSubject?: string; schemaType?: string;
}) {
  const mail = `mailto:${COMPANY.email}${mailSubject ? `?subject=${encodeURIComponent(mailSubject)}` : ''}`;
  return (
    <div className="atp-info">
      <header className="atp-info-h"><span className="atp-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{lead}</p></header>
      {sections.map((s) => (
        <section key={s.h} className="atp-info-s">
          <h2>{s.h}</h2>
          {s.t && <p>{s.t}</p>}
          {s.link && <p><a className="atp-info-a" href={s.link[0]}>{s.link[1]}</a></p>}
          {s.items && <ul>{s.items.map(([b, t]) => <li key={b}><b>{b}</b><span>{t}</span></li>)}</ul>}
        </section>
      ))}
      <section className="atp-info-s atp-info-reach" aria-label="Reach us">
        <a className="af-btn is-wa atp-info-wa" href={waLink(wa)} target="_blank" rel="noopener noreferrer"><WaIcon s={22} /><span><b>WhatsApp {COMPANY.whatsapp}</b><small>Every day, 8 am to 9 pm</small></span></a>
        <a className="atp-info-mail" href={mail}><TideIcon n="mail" s={18} />{COMPANY.email}</a>
      </section>
      <address className="atp-info-co"><b>{COMPANY.name}</b><span>{DPIIT_LINE}</span><span>Registered office: {COMPANY.address}</span></address>
      <JsonLd data={[{ '@context': 'https://schema.org', '@type': schemaType, name: title, url: abs(path), about: { '@id': abs('/#org') } }, crumbs([['Home', '/'], [eyebrow, path]])]} />
    </div>
  );
}
