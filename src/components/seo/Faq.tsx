/* Questions and answers on a page, in the HTML for Google and readers alike, with the matching FAQPage data.
   Every answer is worked out from the catalogue (timetables, fares, island notes), never written by hand,
   so it cannot drift from what the page itself shows. */
import JsonLd from './JsonLd';

export default function Faq({ items, title = 'Questions people ask' }: { items: [string, string][]; title?: string }) {
  const list = items.filter(([q, a]) => q && a);
  if (!list.length) return null;
  return (
    <section className="atp-cs">
      <h2>{title}</h2>
      <div className="atp-faq">{list.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: list.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }} />
    </section>
  );
}
