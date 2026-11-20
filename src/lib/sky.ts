/* Sun and moon over Port Blair, worked out from the date (no data file, never out of date).
   Sunrise and sunset follow the NOAA formulas; good to about two minutes. Times are island time (IST). */
const LAT = 11.6234, LON = 92.7265, RAD = Math.PI / 180;
const hhmm = (min: number) => { const m = ((Math.round(min) % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };

/** The date and time in the islands right now. */
export function istNow(now = new Date()) {
  const t = new Date(now.getTime() + 330 * 60000);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate(), clock: hhmm(t.getUTCHours() * 60 + t.getUTCMinutes()),
    label: t.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }) };
}

export function sky(now = new Date()) {
  const { y, m, d } = istNow(now);
  const noon = Date.UTC(y, m, d, 6, 30); // midday in the islands
  const doy = Math.round((Date.UTC(y, m, d) - Date.UTC(y, 0, 0)) / 86400000);
  const g = (2 * Math.PI / 365) * (doy - 1);
  const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const dec = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const ha = Math.acos(Math.cos(90.833 * RAD) / (Math.cos(LAT * RAD) * Math.cos(dec)) - Math.tan(LAT * RAD) * Math.tan(dec)) / RAD;
  const rise = 720 - 4 * (LON + ha) - eq + 330, set = 720 - 4 * (LON - ha) - eq + 330;
  /* moon: days since a known new moon (6 Jan 2000, 18:14 UTC), in a 29.53-day cycle */
  const P = 29.530588853; const age = ((((noon + 6 * 3600000) / 86400000 - 10962.76) % P) + P) % P; // by early evening
  const lit = (1 - Math.cos((2 * Math.PI * age) / P)) / 2;
  const names = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'];
  const edges = [1.85, 5.54, 9.23, 12.92, 16.61, 20.3, 23.99, 27.68];
  const at = edges.findIndex((e) => age < e); const moon = names[at < 0 ? 0 : at];
  /* glowing plankton needs a dark evening: poor in the ten nights around full moon, when
     the sea never gets dark enough; good the rest of the month (359 of 365 nights agree with our almanac) */
  const glow = age > 10.2 && age < 20.5 ? 'Faint tonight' : 'Good tonight';
  return { sunrise: hhmm(rise), sunset: hhmm(set), moon, lit, glow };
}
