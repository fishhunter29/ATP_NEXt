/* One terms-and-policies page (booking terms, refunds, privacy), rendered on the server from src/data/legal.json. */
import LEGAL from '@/data/legal.json';
import { COMPANY, DPIIT_LINE } from '@/lib/company';
import JsonLd from '@/components/seo/JsonLd';
import { crumbs } from '@/lib/seo';

export type LegalKey = 'terms' | 'refunds' | 'privacy';
type Doc = { title: string; sections: [string, string][] };
const DOCS = LEGAL as unknown as Record<LegalKey, Doc>;
const TABS: [LegalKey, string][] = [['terms', 'Booking terms'], ['refunds', 'Refunds and cancellation'], ['privacy', 'Privacy']];

export const legalTitle = (k: LegalKey) => DOCS[k].title;

export default function Legal({ k }: { k: LegalKey }) {
  const d = DOCS[k];
  return (
    <>
      <div className="wrap pg-plain"><span className="eyebrow">Terms and policies</span><h1>{d.title}</h1></div>
      <div className="wrap lgl">
        <nav className="lgl-tabs" aria-label="Terms and policies">
          {TABS.map(([key, label]) => <a key={key} href={`/${key}`} aria-current={key === k ? 'page' : undefined}>{label}</a>)}
        </nav>
        {d.sections.map(([h, t]) => <section key={h}><h2>{h}</h2><p>{t}</p></section>)}
        <address className="sf-co">
          <b>{COMPANY.name}</b>
          <span>CIN {COMPANY.cin}</span>
          <span>GSTIN {COMPANY.gstin}</span>
          <span>{DPIIT_LINE}</span>
          <span>Registered office: {COMPANY.address}</span>
          <span>Email <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></span>
        </address>
      </div>
      <JsonLd data={crumbs([['Home', '/'], [d.title, `/${k}`]])} />
    </>
  );
}
