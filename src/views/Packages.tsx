'use client';
/* The live part of a ready-made trip's page, and the "Plan my trip for me" builder. The list of trips is the browse screen. */
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { commit, dispatch, useEngine } from '@/engine/client';
import { Ic, Loading } from '@/components/ui';

/** The live part of a planned trip's page: today's price for your dates and travellers, and the button that loads it.
    The day-by-day itinerary above it is rendered on the server (src/app/trips/[id]/page.tsx). */
export function PlannedTripBuy({ id }: { id: string }) {
  const E = useEngine(); const router = useRouter();
  if (!E) return <div className="atp-buy" style={{ minHeight: 132 }} aria-busy="true" />;
  const p = E.PKGS.find((x: any) => x.id.toLowerCase() === id.toLowerCase());
  if (!p) return null;
  const pr = E.pkgPreview(p);
  // same as v1: with plans already in the trip, ask before replacing them (the pkgload sheet); otherwise load and open the trip
  const use = () => dispatch('usepkg', { id: p.id });
  return (
    <div className="atp-buy">
      <span className="atp-total"><b>{E.inr(pr.pp)}</b><small>a person · {E.inr(pr.total)} for {E.paxLabel(p)} · incl. GST · from {E.fD(pr.start)}</small></span>
      <button className="atp-btn is-action" onClick={use}>Use this trip</button>
      <p className="atp-fine">You can change dates, hotels and every plan after loading it.</p>
    </div>
  );
}
