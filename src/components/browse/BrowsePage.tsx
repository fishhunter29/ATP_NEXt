/* A browse page: heading, then the browse screen. The server sends the first view complete (Google reads it);
   the phone takes over with whatever the address asks for. */
import { Suspense, type ReactNode } from 'react';
import Browse, { BrowseStatic, type BrowseProps } from './Browse';

export default function BrowsePage({ eyebrow, title, lead, children, ...props }: BrowseProps & { eyebrow: string; title: string; lead: string; children?: ReactNode }) {
  return (
    <div className="atp-pg">
      <header className="atp-ph"><span className="atp-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{lead}</p></header>
      <Suspense fallback={<BrowseStatic {...props} />}><Browse {...props} /></Suspense>
      {children}
    </div>
  );
}
