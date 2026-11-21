/* The first-visit tour: the words, and what each step points at.
   Edit the titles and bodies freely; nothing else reads them. Keep titles to four words and bodies to one sentence.

   target: the data-tour="…" value of the thing to highlight on Home. Leave it out for a centred card.
           When the target is not on the screen (hidden at this width, or not rendered), the step is skipped.

   TOUR_VERSION: bump it after a big redesign and everyone sees the tour once more. */

export const TOUR_VERSION = 1;
export const TOUR_KEY = `atp_tour_v${TOUR_VERSION}`;

export type TourStep = { id: string; target?: string; title: string; body: string };

export const TOUR_STEPS: TourStep[] = [
  { id: 'welcome', title: 'Welcome to the Andamans', body: 'Plan your whole trip in minutes, with ferries, stays and cabs checked against each other.' },
  { id: 'plan', target: 'plan', title: 'Plan in three taps', body: 'Pick your dates, who’s coming and your pace, and we build the whole trip.' },
  { id: 'trips', target: 'trips', title: 'Or pick a ready-made trip', body: 'Start from one of 96 checked trips and change anything you like.' },
  { id: 'ferries', target: 'ferries', title: 'Ferries as boarding passes', body: 'Nautika, Makruzz and the government ships, booked by our team and shown as boarding passes.' },
  { id: 'cabs', target: 'cabs', title: 'One cab, many stops', body: 'One cab takes you round the nearby sights and back to your hotel, at one price.' },
  { id: 'trip', target: 'trip-tab', title: 'Your day-by-day plan', body: 'Every day of your trip lives here, with photos of each place and optional meals out.' },
  { id: 'done', title: 'You’re all set', body: 'Send your trip on WhatsApp and we confirm it within 30 minutes. Happy islands!' },
];

/* Button words */
export const TOUR_LABELS = { next: 'Next', back: 'Back', skip: 'Skip tour', done: 'Start planning', close: 'Close the tour' };
