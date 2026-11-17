/* schema.org data for Google, rendered on the server. "<" is escaped so text can never close the script tag. */
export default function JsonLd({ data }: { data: unknown }) {
  const list = (Array.isArray(data) ? data : [data]).filter(Boolean);
  return <>{list.map((d, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(d).replace(/</g, '\\u003c') }} />)}</>;
}
