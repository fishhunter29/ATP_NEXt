/* WhatsApp: one number for the whole site, and the link that opens a chat with the message already written. */
import { COMPANY } from './company';

export const WA_DIGITS = COMPANY.whatsapp.replace(/\D/g, '');

/** A chat with Andaman Travel Planner, with `text` typed in and ready to send. */
export const waLink = (text: string) => `https://wa.me/${WA_DIGITS}?text=${encodeURIComponent(text)}`;

/** The message: a greeting, what it is about, any details, and the address of the page it came from. */
export function waText(about: string, lines: (string | false | null | undefined)[] = [], url = '') {
  return [`Hi Andaman Travel Planner, ${about}`, ...lines.filter(Boolean), url].filter(Boolean).join('\n');
}
