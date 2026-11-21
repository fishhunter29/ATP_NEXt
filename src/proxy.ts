/* Addresses are lowercase. /Stays or /Ferries/PBL-HAV (typed by hand, or from an old link) go to the lowercase page
   instead of "not found". Files, the API and Next's own paths are left alone. */
import { NextResponse, type NextRequest } from 'next/server';

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === pathname.toLowerCase()) return NextResponse.next();
  const url = req.nextUrl.clone(); url.pathname = pathname.toLowerCase();
  return NextResponse.redirect(url, 308);
}

export const config = { matcher: ['/((?!api/|_next/|img/|brand/|icons/|.*\\..*).*)'] };
