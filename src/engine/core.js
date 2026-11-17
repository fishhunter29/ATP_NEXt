/* Andaman Travel Planner — trip engine (moved unchanged from the v1 app).
   Pricing, ferry timing, conflict checks, auto-planning, suggestions, bookings state.
   Loaded only in the browser; React reads S and calls these functions. */
/* eslint-disable */
/* ============ DATA & HELPERS ============ */
const D = globalThis.__ATP_DATA__;
const ZN = {}; D.zones.forEach(z => ZN[z.id] = z);
const ZC = id => `var(--z-${id})`;
const ZHEX = {PBL:'#2E4A9E',WAN:'#0A6F9C',HAV:'#00767F',LON:'#0B735C',RAN:'#4E7020',BAR:'#6E4A3A',NEI:'#A3365C',MAY:'#5A49C2',DIG:'#8C2F8E',LIT:'#4D5F69'};
const HOT = {}; D.hotels.forEach(h => { HOT[h.id] = h; });
const ACT = {}; D.acts.forEach(a => ACT[a.id] = a);
const SAIL = {}; D.sails.forEach(s => SAIL[s.id] = s);
const NAT = {}; D.nat.forEach(n => NAT[n.d] = n);
const MARKUP = {stay:.075, ferry:.046, act:.075, cab:.075, rent:.075};

const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0); };
const inr = n => n == null ? '' : '₹' + Math.round(n).toLocaleString('en-IN');
const tm = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const hm = m => { m = ((m % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const iso = dt => dt.toISOString().slice(0, 10);
const addD = (s, n) => { const d = pDate(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOW_HI = ['रवि','सोम','मंगल','बुध','गुरु','शुक्र','शनि'];
const fD = s => { const d = pDate(s); return `${DOW[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`; };
const dowOf = s => pDate(s).getUTCDay();
const durTxt = m => { if (!m) return ''; if (m >= 1440 && m % 1440 === 0) return `${m / 1440} day${m > 1440 ? 's' : ''}`; const h = Math.floor(m / 60), r = m % 60; return h ? `${h} hr${h > 1 ? 's' : ''}${r ? ' ' + r + ' min' : ''}` : `${r} min`; };


/* ============ I18N ============ */
const T = {
  en: {home:'Home',trip:'My trip',passes:'Passes',account:'Account',ferry:'Ferry',stays:'Stays',todo:'Things to do',cabs:'Cabs & scooters',search:'Search a beach, island, hotel or activity',addToTrip:'Add to trip',update:'Save changes',remove:'Remove',checkout:'Continue to pay',pay:'Pay',fits:'Fits your trip',from:'From',to:'To',date:'Date',travellers:'Travellers',adults:'Adults',kids:'Children',infants:'Infants',islands:'Pick an island',perNight:'/ night',perPerson:'/ person',total:'Total',taxes:'Taxes included',offline:'Works offline',yourTrip:'My trip',emptyTrip:'Your trip is empty',sample:'Try a sample trip',night:'Night at',noStay:'No stay booked for this night',change:'Change',done:'Done',when:'When',time:'Time',morning:'Morning',afternoon:'Afternoon',evening:'Evening',seatsLeft:'seats left',full:'Full',searchFerries:'Search ferries',viewTrip:'View trip',addReturn:'Add return ferry',keep:'Keep browsing',selectClass:'Choose a class',all:'All',hello:'Your Andaman trip, one piece at a time.',helloSub:'Ferries, stays, cabs and activities. We check that the timings work together.'},
  hi: {home:'होम',trip:'मेरी यात्रा',passes:'पास',account:'खाता',ferry:'फ़ेरी',stays:'होटल',todo:'घूमना-फिरना',cabs:'कैब और स्कूटर',search:'बीच, द्वीप, होटल या एक्टिविटी खोजें',addToTrip:'यात्रा में जोड़ें',update:'बदलाव सेव करें',remove:'हटाएँ',checkout:'भुगतान पर जाएँ',pay:'भुगतान करें',fits:'आपकी यात्रा में फिट',from:'कहाँ से',to:'कहाँ तक',date:'तारीख',travellers:'यात्री',adults:'वयस्क',kids:'बच्चे',infants:'शिशु',islands:'द्वीप चुनें',perNight:'/ रात',perPerson:'/ व्यक्ति',total:'कुल',taxes:'टैक्स शामिल',offline:'ऑफ़लाइन चलता है',yourTrip:'मेरी यात्रा',emptyTrip:'आपकी यात्रा खाली है',sample:'नमूना यात्रा देखें',night:'रात यहाँ',noStay:'इस रात के लिए होटल नहीं',change:'बदलें',done:'हो गया',when:'कब',time:'समय',morning:'सुबह',afternoon:'दोपहर',evening:'शाम',seatsLeft:'सीटें बचीं',full:'भरा हुआ',searchFerries:'फ़ेरी खोजें',viewTrip:'यात्रा देखें',addReturn:'वापसी फ़ेरी जोड़ें',keep:'और देखें',selectClass:'क्लास चुनें',all:'सभी',hello:'अपनी अंडमान यात्रा, एक-एक करके बुक करें।',helloSub:'फ़ेरी, होटल, कैब और एक्टिविटी। हम समय की जाँच करते हैं।'}
};
const t = k => (T[S.lang] && T[S.lang][k]) || T.en[k] || k;

/* ============ STATE ============ */
const TODAY = (() => { const d = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10); return d < '2026-10-25' ? '2026-10-25' : d > '2027-08-31' ? '2027-08-31' : d; })();
const SAMPLE0 = (() => { let d = '2026-12-07'; while (d < addD(TODAY, 10)) d = addD(d, 7); return d; })();
const S = {lang:'en', cart:[], pax:{adults:2, kids:0, infants:0}, fin:null, fout:null, dismissed:{}, stack:[{v:'home'}], booked:[], scans:{}, vendorStatus:{}, offline:false, pay:'upi', lead:{name:'', phone:'', email:''}, seq:1, priceOverride:{}, trip:null, sheet:null, planDate:null, win:null, po:{}, poUndo:null, ownSails:[], theme:'system', homeZone:null, datesAssumed:false, datesSkipped:false};
const SAVE_KEYS = ['lang','cart','pax','fin','fout','dismissed','booked','scans','vendorStatus','lead','seq','priceOverride','planDate','win','po','ownSails','theme','homeZone','datesAssumed','datesSkipped'];
function save() { try { const o = {}; SAVE_KEYS.forEach(k => o[k] = S[k]); localStorage.setItem('atp_v6', JSON.stringify(o)); } catch (e) {} }
function regOwn(o) { if (!SAIL[o.id]) { SAIL[o.id] = o; D.sails.push(o); } }
function load() { try { const o = JSON.parse(localStorage.getItem('atp_v6') || 'null'); if (o) SAVE_KEYS.forEach(k => { if (o[k] !== undefined) S[k] = o[k]; }); } catch (e) {}
  (S.ownSails || []).forEach(regOwn);
  S.cart = (S.cart || []).filter(it => (it.kind === 'stay' && HOT[it.ref]) || (it.kind === 'ferry' && SAIL[it.ref]) || (it.kind === 'act' && ACT[it.ref]) || (it.kind === 'cab' && ROUTE[it.ref]) || (it.kind === 'rent' && RENT[it.ref])); }

/* ============ PRODUCT MODEL ============ */
function vendorFor(a) {
  const pick = (cat, z) => { const c = D.vend.filter(v => v.c === cat && (!z || v.z === z)); return c.length ? c[hash(a.id) % c.length].n : null; };
  if (/Scuba/.test(a.fam)) return pick('Dive centre', a.z) || pick('Dive centre', 'HAV');
  if (a.fam === 'Kayaking') return pick('Kayaking', a.z) || pick('Kayaking');
  if (a.fam === 'Fishing') return pick('Game fishing', a.z) || pick('Game fishing');
  if (a.fam === 'Rentals' && /Scooter/.test(a.n)) return pick('Two-wheeler rental', 'HAV');
  if (/Sea walk|Motor water|Glass/.test(a.fam)) return pick('Water sports / boats', a.z) || pick('Water sports / boats');
  return 'Local partner';
}
const FAMICON = {'Scuba - Try dive':'mask','Scuba - Certified dives':'mask','Scuba - Courses':'mask','Snorkelling':'mask','Sea walk':'mask','Glass bottom & semi-sub':'boat','Boat trips':'boat','Cruises & charters':'boat','Fishing':'fish','Kayaking':'kayak','Motor water sports':'wave','Walks & nature':'leaf','Sightseeing tours':'camera','Rentals':'scooter','Add-ons':'camera'};
const actPrice = a => S.priceOverride[a.id] ?? a.p;
const hotelPrice = h => S.priceOverride[h.id] ?? h.p;
function slotsFor(a) {
  if (a.slots && a.slots.length) return a.slots;   // published show and boat times
  if (a.entry) { const o = a.open ? tm(a.open) : 420, c = a.close ? tm(a.close) : 1080; const out = []; const b0 = a.brk ? tm(a.brk[0]) : 9e9, b1 = a.brk ? tm(a.brk[1]) : 0; for (let m = Math.ceil(o / 60) * 60; m + (a.d || 60) <= c; m += 60) { if (m < b1 && m + (a.d || 60) > b0) continue; out.push(hm(m)); } return out.length ? out.slice(0, 14) : [hm(o)]; }
  if (a.fixed) return [a.t];
  const m = {'AM':['08:00','09:00','10:00','11:00'],'PM':['13:00','14:00','15:00','16:00'],'AM/PM':['09:00','11:00','14:00','15:00'],'Any':['08:00','10:00','12:00','14:00','16:00'],'Dawn':['05:30'],'Night':['19:00','20:00'],'Full-day':['08:00'],'Multi-day':['07:00']};
  return m[a.slot] || [a.t];
}
const pax = () => S.pax.adults + S.pax.kids;
const kidAges = () => { const a = (S.pax.ages || []).slice(0, S.pax.kids); while (a.length < S.pax.kids) a.push(8); return a; };
const kidsOk = a => a && a.age ? kidAges().filter(x => x >= a.age).length : S.pax.kids;
function partyOf(it) { const a = ACT[it.ref]; const pa = it.pa != null ? Math.min(it.pa, S.pax.adults) : S.pax.adults; const pk = it.pk != null ? Math.min(it.pk, S.pax.kids) : kidsOk(a); return {pa, pk}; }
const ROUTE = {}; D.routes.forEach(r => { ROUTE[r.id] = r; });
const RENT = {}; D.rentals.forEach(r => { RENT[r.id] = r; });
const VCLS = ['Auto', 'Sedan', 'Standard SUV', 'Premium SUV', 'Tempo Traveller 12', 'Tempo Traveller 17', 'Mini coach 26', 'Boat up to 8', 'Boat up to 20'];
const VSUB = {'Auto':'3 seats', 'Sedan':'4 seats · Dzire, Etios', 'Standard SUV':'6 seats · Ertiga, Xylo', 'Premium SUV':'6 seats · Innova Crysta', 'Tempo Traveller 12':'12–13 seats', 'Tempo Traveller 17':'17 seats', 'Mini coach 26':'26 seats · groups'};
const season = d => { const m = +d.slice(5, 7), dd = +d.slice(8, 10); if ((m === 12 && dd >= 15) || (m === 1 && dd <= 15)) return 'pk'; if ((m === 5 && dd >= 16) || (m >= 6 && m <= 9)) return 'ln'; return 'hi'; };
const SEASON_NAME = {pk:'Peak season', hi:'High season', ln:'Lean season'};
const peakUp = (ops, date) => date && season(date) === 'pk' && ops && ops.peak ? 1 + ops.peak / 100 : 1;
function vehFor(r, cls) { // default: smallest car that seats everyone (no auto unless chosen)
  const ps = r.prices.filter(p => p.ow || p.ret).sort((a, b) => VCLS.indexOf(a.c) - VCLS.indexOf(b.c));
  if (cls) { const p = ps.find(x => x.c === cls); if (p) return p; }
  return ps.find(p => p.seats >= pax() && p.c !== 'Auto') || ps.find(p => p.seats >= pax()) || ps[ps.length - 1];
}
const HUB = {PBL:'ABERDEEN', HAV:'B3', NEI:'NKENDRA', DIG:'DIGBAZ', RAN:'RBAZ', MAY:'MAYABAZ', LIT:'HUTBAY', WAN:'ABERDEEN', BAR:'BARJ', LON:'LONJ'};
const rkey = id => id.replace(/^RT-/, '');
function rkeys(r) { const s = rkey(r.id); if (!s.includes('-') && s.startsWith('PHOENI')) return ['PHOENIX', s.slice(6)]; return s.split('-'); }
function findRoute(fromKey, toKey) { // routes are stored one way; either direction is bookable
  if (!fromKey || !toKey || fromKey === toKey) return null;
  for (const r of D.routes) { const k = rkeys(r); if (k.length !== 2) continue;
    if (k[0] === fromKey && k[1] === toKey) return {r, rev:false};
    if (k[0] === toKey && k[1] === fromKey) return {r, rev:true}; }
  return null;
}
/* where a hotel is, as a cab-route place key */
function hotelKey(h) { const s = (h.a || '') + ' ' + h.n;
  if (h.z === 'PBL') return /Marine Hill/i.test(s) ? 'MARINE' : /Corbyn/i.test(s) ? 'CORBHOT' : 'ABERDEEN';
  if (h.z === 'HAV') return /Radha ?nagar|Beach N[o0]\.? ?7|Radhanagar|Taj Exotica|Barefoot/i.test(s) ? 'RADHOT' : /Vijay|Beach No\.? ?5|\b5\b/i.test(s) ? 'VIJAY' : 'B3';
  return HUB[h.z]; }
const JKEY = s => s.fromPt === 'Phoenix Bay' ? 'PHOENIX' : ({PBL:'HADDO', HAV:'HAVJ', NEI:'NEIJ', DIG:'AERIAL', RAN:'YERRATA'})[s.f];
const JKEY_TO = s => s.toPt === 'Phoenix Bay' ? 'PHOENIX' : ({PBL:'HADDO', HAV:'HAVJ', NEI:'NEIJ', DIG:'AERIAL', RAN:'YERRATA'})[s.to];
/* the stay you sleep at on a date's night (or checked out of that morning) on an island */
function stayOn(cart, zone, date, morning) {
  const sts = cart.filter(i => i.kind === 'stay' && HOT[i.ref] && HOT[i.ref].z === zone);
  return sts.find(i => i.date <= date && addD(i.date, i.nights) > date && !(morning && i.date === date)) || (morning ? sts.find(i => addD(i.date, i.nights) === date) : null) || null;
}
/* the stay you are in on an island at a given minute of a date: before ~10:00 the one you check out of, after that the one you check into */
function stayAt(cart, zone, date, min) { const sts = cart.filter(i => i.kind === 'stay' && HOT[i.ref] && HOT[i.ref].z === zone);
  const cont = sts.find(i => i.date < date && addD(i.date, i.nights) > date); if (cont) return cont;
  const ending = sts.find(i => addD(i.date, i.nights) === date), starting = sts.find(i => i.date === date);
  return (min < CHECKOUT + GRACE && ending) ? ending : (starting || ending || null); }
function baseKey(cart, zone, date, morning) { const st = stayOn(cart, zone, date, morning); return st ? hotelKey(HOT[st.ref]) : HUB[zone]; }
function placeRoute(fromKey, toKey, zone) { return findRoute(fromKey, toKey) || (fromKey !== HUB[zone] ? findRoute(HUB[zone], toKey) : null); }
const JETTY_RT = {PBL:'RT-HADDO-ABERDEEN', PHX:'RT-PHOENIABERDEEN', HAV:'RT-HAVJ-B3', NEI:'RT-NEIJ-NKENDRA', DIG:'RT-AERIAL-DIGBAZ'};
function cabMeta(it) {
  const r = ROUTE[it.ref]; const rev = !!it.rev; const from = rev ? r.b : r.a, to = rev ? r.a : r.b; const ret = !!it.ret;
  let vk = 'Sightseeing';
  if (r.kind === 'airport' && /hotels|Wharf|Jetty/.test(r.b)) vk = rev ? 'Airport drop' : 'Airport pickup';
  else if (r.kind === 'jetty') vk = 'Jetty transfer';
  else if (r.kind === 'road' || r.kind === 'daytrip') vk = 'Road trip';
  const dur = r.mins + (ret ? r.mins + Math.round((r.wait || 0) * 60) : 0);
  return {r, rev, from, to, ret, vk, dur, move:(r.kind === 'road' && !ret) ? (rev ? r.z : r.move) : null};
}
/* Ferry classes with fares, from the operator's published "from" fare and range */
const BOOKABLE = D.sails.filter(s => s.fare && !/not named/i.test(s.op));
function classFares(s) {
  if (s._cf) return s._cf;
  if (s.fares && s.fares.length) { s._cf = s.fares.map((x, i) => ({name:x.n, fare:(i === 0 && S.priceOverride[s.id] != null) ? S.priceOverride[s.id] : x.f, cost:x.c, approx:false})); return s._cf; }
  const ft = s.ft || ''; const nums = [...ft.matchAll(/(\d{1,2},\d{3}|\d{3,})/g)].map(m => +m[1].replace(/,/g, ''));
  let names = (s.cls || 'Standard').split(/,|\//).map(x => x.replace(/\(.*$/, '').replace(/classes?/i, '').trim()).filter(Boolean);
  if (!names.length) names = ['Standard'];
  const named = {}; for (const m of ft.matchAll(/₹\s?([\d,]+)(?:\s?–\s?[\d,]+)?\s+([A-Z][a-z]+)/g)) named[m[2]] = +m[1].replace(/,/g, '');
  const lo = Math.min(...nums), hi = Math.max(...nums); const n = names.length; const tilde = /~/.test(ft);
  const listed = new RegExp('\\(' + names.join('/') + '\\)').test(ft); // e.g. "₹950–1,750 (Luxury/Royal)"
  const anchor = names.map(nm => named[nm] != null ? named[nm] : null);
  if (anchor[0] == null) anchor[0] = lo;
  if (n > 1 && anchor[n - 1] == null && hi > Math.max(...anchor.filter(x => x != null))) anchor[n - 1] = hi;
  const f = anchor.slice();
  for (let i = 1; i < n; i++) if (f[i] == null) { let j = i; while (j < n && anchor[j] == null) j++; f[i] = j < n ? f[i - 1] + (anchor[j] - f[i - 1]) / (j - i + 1) : f[i - 1] * 1.3; }
  for (let i = 1; i < n; i++) f[i] = Math.max(f[i], f[i - 1] + 100);
  s._cf = names.map((nm, i) => ({name:nm, fare:(i === 0 && S.priceOverride[s.id] != null) ? S.priceOverride[s.id] : (anchor[i] != null && anchor[i] === f[i] ? f[i] : Math.round(f[i] / 50) * 50), approx:tilde || (named[nm] == null && !(listed && (i === 0 || i === n - 1)) && !(i === 0 && anchor[0] === lo && nums.length === 1 && false))}));
  return s._cf;
}
const fareOf = (s, cls) => { const c = classFares(s); return (c.find(x => x.name === cls) || c[0]).fare; };
const minFare = s => Math.min(...classFares(s).map(c => c.fare));

function roomOf(h, name) { return h.rooms.find(r => r.n === name) || h.rooms[0]; }
function stayPrice(h, it) {
  const r = roomOf(h, it.room); const rooms = it.qty || 1; let tot = 0; const per = {};
  for (let n = 0; n < it.nights; n++) { const d = addD(it.date, n); const sz = season(d); const night = r['s_' + sz] || r.s_hi; per[sz] = night; tot += night * rooms;
    const extraAd = Math.max(0, S.pax.adults - rooms * (r.ma || 2)); tot += extraAd * (r['s_eb'] || 0) + S.pax.kids * (r['s_cwb'] || 0); }
  return {tot, per, r};
}
function actUnit(a, date) { const p = actPrice(a); return p == null ? null : Math.round(p * peakUp(a.ops, date) / 10) * 10; }
function info(it) {
  const k = it.kind;
  if (k === 'stay') { const h = HOT[it.ref]; const sp = stayPrice(h, it); const rooms = it.qty || 1; const sz = season(it.date);
    return {kind:k, title:h.n, sub:`${it.room || sp.r.n} · ${it.nights} night${it.nights > 1 ? 's' : ''} · ${rooms} room${rooms > 1 ? 's' : ''}`, zone:h.z, unit:sp.r['s_' + sz] || sp.r.s_hi, unitLabel:'/ night, ' + SEASON_NAME[sz].toLowerCase(), per:1, price:sp.tot, vendor:h.n, icon:'bed', rep:0, pol:'POL-MOD', wx:'WX-STAY', gst:h.ops ? h.ops.gst : 12}; }
  if (k === 'ferry' && it.own) { const s = SAIL[it.ref]; return {kind:k, own:true, title:`${ZN[s.f].name} → ${ZN[s.to].name}`, sub:`${s.op.replace(/ \d$/, '')} · booked elsewhere`, zone:s.f, to:s.to, unit:0, per:1, price:0, vendor:'Booked elsewhere', icon:'ferry', rep:s.rep || 45, dur:(tm(s.arr) - tm(s.dep) + 1440) % 1440, pol:'POL-OPERATOR', wx:'WX-FERRY', site:s.fromPt, gst:0}; }
  if (k === 'ferry') { const s = SAIL[it.ref]; const n = pax(); const fare = fareOf(s, it.cls);
    return {kind:k, title:`${ZN[s.f].name} → ${ZN[s.to].name}`, sub:`${s.op.replace(/ \d$/, '')} · ${it.cls || classFares(s)[0].name} · ${n} seat${n > 1 ? 's' : ''}${S.pax.infants ? ` + ${S.pax.infants} infant${S.pax.infants > 1 ? 's' : ''} free` : ''}`, zone:s.f, to:s.to, unit:fare, per:n, price:fare * n, vendor:s.gov ? 'Directorate of Shipping Services' : s.op.replace(/ \d$/, '').replace(' Lite', ''), icon:'ferry', rep:s.rep || 45, dur:(tm(s.arr) - tm(s.dep) + 1440) % 1440, pol:s.gov ? 'POL-GOVT' : 'POL-OPERATOR', wx:'WX-FERRY', site:s.fromPt, gst:5}; }
  if (k === 'act') { const a = ACT[it.ref]; const u = actUnit(a, it.date); const childPct = a.ops && a.ops.child != null ? a.ops.child / 100 : 1;
    let per = 1, price = null, perTxt = null;
    if (a.b === 'per_pax') { const {pa, pk} = partyOf(it); per = pa + pk; price = u != null ? Math.round(u * pa + u * childPct * pk) : null;
      perTxt = u == null ? null : pk && childPct !== 1 ? `${pa} adult${pa !== 1 ? 's' : ''} × ${inr(u)} + ${pk} child${pk > 1 ? 'ren' : ''} × ${inr(Math.round(u * childPct))}` : `${per} × ${inr(u)}`; }
    else if (a.b === 'per_unit') { per = it.qty || 1; price = u != null ? u * per : null; }
    else price = u;
    return {kind:k, title:a.n, sub:a.v, zone:a.z, unit:u, per, perTxt, price, vendor:a.entry ? 'Government / site office' : vendorFor(a), icon:a.entry ? 'camera' : (FAMICON[a.fam] || 'wave'), rep:/Scuba/.test(a.fam) ? 30 : a.entry ? 0 : 15, dur:a.d || 60, pol:a.entry ? 'POL-GOVT' : /Courses|charter|Fishing/i.test(a.fam + a.n) ? 'POL-STRICT' : 'POL-FLEX', wx:'WX-ACT', site:a.site, gst:a.ops ? a.ops.gst : 18, peak:peakUp(a.ops, it.date) > 1}; }
  if (k === 'cab') { const m = cabMeta(it); const v = vehFor(m.r, it.vc); const base = m.ret ? (v.ret || v.ow * 2) : (v.ow || Math.round(v.ret / 2)); const up = peakUp(m.r.ops, it.date); const price = Math.round(base * up / 10) * 10;
    const t0 = tm(it.t || '09:00'); const nm = (x, at) => { if (!/hotels|market|Bazaar/i.test(x) || m.r.kind === 'road') return x; const st = stayAt(S.cart, m.r.z, it.date, at); return st ? HOT[st.ref].n : x; };
    return {kind:k, title:`${nm(m.from, t0)} → ${nm(m.to, t0 + m.dur)}`, sub:`${v.c} · ${m.ret ? 'return' + (m.r.wait ? `, ${m.r.wait} h wait` : '') : 'one way'}${up > 1 ? ' · peak' : ''}`, zone:m.r.z, unit:price, per:1, price, vendor:'Local taxi partner', icon:'car', rep:0, dur:m.dur, pol:'POL-FLEX', wx:'WX-ACT', gst:5, site:m.to}; }
  if (k === 'rent') { const r = RENT[it.ref]; const q = it.qty || 1; const up = peakUp(r.ops, it.date); const unit = Math.round(r.p * up / 10) * 10;
    return {kind:k, title:r.n, sub:`${q} × per day · deposit ${inr(r.dep * q)} at pickup`, zone:r.z, unit, per:q, price:unit * q * (it.days || 1), vendor:'Rental partner', icon:'scooter', rep:0, dur:0, pol:'POL-FLEX', wx:'WX-ACT', gst:18}; }
}

/* ============ AVAILABILITY ============ */
function seasonOk(sea, date) {
  if (!sea || /All year/i.test(sea)) return true;
  const mm = sea.match(/^(\w{3})-(\w{3})$/); if (!mm) return true;
  const a = MON.indexOf(mm[1]), b = MON.indexOf(mm[2]), m = pDate(date).getUTCMonth();
  if (a < 0 || b < 0) return true;
  return a <= b ? (m >= a && m <= b) : (m >= a || m <= b);
}
function availability(it) {
  const date = it.date;
  if (date < TODAY) return {why:'That date has passed'};
  const dw = dowOf(date); const DAYN = ['Sundays','Mondays','Tuesdays','Wednesdays','Thursdays','Fridays','Saturdays'];
  if (it.kind === 'act') { const a = ACT[it.ref];
    if (!seasonOk(a.sea, date)) return {why:`Runs ${a.sea.replace('-', ' to ')} only`};
    if (a.dates && !a.dates.includes(date)) { const nx = a.dates.find(x => x >= date); return {why:`Sails on set dates only${nx ? `; the next one is ${fD(nx)}` : ''}`}; }
    if (a.closed && a.closed.includes(dw)) return {why:`Closed on ${DAYN[dw]}`};
    const dc = closedRule(a.id, dw); if (dc && dc.sev === 'HARD') return {why:dc.msg.replace(/\.$/, '')};
    if (a.entry) return null;
    if (seatsAct(a.id, date, it.t) === 0) return {why:'Sold out for this time', sold:true};
  }
  if (it.kind === 'ferry' && !it.own) { const s = SAIL[it.ref];
    if (s && !sailsOn(s, date)) { const nx = nextSailDate(s, date); return {why:`This ship sails ${dayList(s.days)} only, not on ${DAYN[dw]}${nx !== date ? `; the next one is ${fD(nx)}` : ''}`}; }
    if (seats(it.ref, it.cls || classFares(s)[0].name, date) < pax()) return {why:'Not enough seats left', sold:true}; }
  return null;
}
// simulated inventory: stable per sailing, class and date
function seats(id, cls, date) { const s = SAIL[id]; if (s && s.gov) return 40;   // government seats are bought and confirmed by our Port Blair desk, not held online
  const h = hash(id + cls + date + 'v2') % 100; return h < 6 ? 0 : h < 16 ? (h % 6) + 1 : 40; }
function seatsAct(id, date, time) { const h = hash(id + date + time + 'a2') % 100; return h < 4 ? 0 : h < 12 ? (h % 5) + 1 : 20; }

/* ============ ENGINE: the 6 rules ============ */
function itemEnd(it) { return it.kind === 'stay' ? addD(it.date, it.nights) : it.date; }
function deriveTrip(cart) {
  const ds = cart.map(i => i.date).concat(cart.map(itemEnd));
  if (S.fin) ds.push(S.fin.date); if (S.fout) ds.push(S.fout.date);
  if (S.win) { ds.push(S.win.start); ds.push(S.win.end); }
  if (!ds.length) return null;
  ds.sort(); return {start:ds[0], end:ds[ds.length - 1]};
}
function syncTrip() { S.cart = linkCart(S.cart, true); S.trip = deriveTrip(S.cart); }
function cabTimeFor(act, cab) { const r = ROUTE[cab.ref]; const I = info(act); return hm(Math.max(300, Math.floor((tm(act.t || ACT[act.ref].t || '09:00') - r.mins - 15 - Math.max(I.rep || 0, 15)) / 5) * 5)); }
function linkCart(cart, inPlace) { // a cab booked for an activity keeps its day and pickup time in step with it
  if (!cart.some(i => i.for)) return cart;
  return cart.map(c => { if (c.kind !== 'cab' || !c.for) return c; const a = cart.find(x => x.uid === c.for); if (!a) return c;
    let t0; if (a.kind === 'ferry') { const s = SAIL[a.ref]; if (!s) return c; t0 = c.leg === 'post' ? s.arr : hm(Math.floor((tm(s.dep) - (s.rep || 45) - ROUTE[c.ref].mins - 10) / 5) * 5); }
    else if (a.kind === 'act') t0 = c.back ? hm(tm(a.t || '09:00') + (ACT[a.ref].d || 60)) : cabTimeFor(a, c); else return c;
    const dd = a.kind === 'ferry' && c.leg === 'post' && SAIL[a.ref] && SAIL[a.ref].nxt ? addD(a.date, 1) : a.date;
    if (c.date === dd && c.t === t0) return c;
    if (inPlace) { c.date = dd; c.t = t0; return c; } return Object.assign({}, c, {date:dd, t:t0}); });
}
function dayIdx(date) { return S.trip ? Math.round((pDate(date) - pDate(S.trip.start)) / 864e5) : 0; }
function nDays() { return S.trip ? dayIdx(S.trip.end) + 1 : 0; }
function flightIn() { if (!S.fin) return null; const f = D.flights.find(x => x.no === S.fin.no); return f ? Object.assign({}, f, {date:S.fin.date}) : null; }
function flightOut() { if (!S.fout) return null; const f = D.flights.find(x => x.no === S.fout.no); return f ? Object.assign({}, f, {date:S.fout.date}) : null; }

function expand(cart) {
  const evs = [];
  cart.forEach(it => {
    const I = info(it); const d0 = dayIdx(it.date) * 1440;
    if (it.kind === 'stay') { evs.push({it, I, kind:'stay', s:d0 + CHECKIN, e:d0 + it.nights * 1440 + CHECKOUT, zone:I.zone}); return; }
    if (it.kind === 'ferry') { const s = SAIL[it.ref]; const st = d0 + tm(s.dep); evs.push({it, I, kind:'ferry', s:st, e:st + I.dur, zone:s.f, to:s.to, rep:I.rep, move:s.to}); return; }
    const st = d0 + tm(it.t || '09:00');
    if (it.kind === 'act') { const a = ACT[it.ref];
      if (a.sched && a.sched.length) { const n = a.sched.length; a.sched.forEach((p, k) => { const s0 = d0 + k * 1440 + tm(p.t); evs.push({it, I, kind:'act', s:s0, e:s0 + p.d, zone:a.z, rep:k ? 0 : I.rep, ...(n > 1 ? {part:k + 1, parts:n} : {}), lbl:p.l, fb:a.fb}); }); return; }
      if (a.b !== 'per_unit' && (a.d >= 1440 || (a.d >= 600 && /Courses/.test(a.fam)))) { const days = Math.max(1, Math.ceil(a.d / 480)); for (let k = 0; k < days; k++) evs.push({it, I, kind:'act', s:d0 + k * 1440 + 480, e:d0 + k * 1440 + 960, zone:a.z, rep:I.rep, part:k + 1, parts:days, fb:a.fb}); return; }
      if ((a.b === 'per_unit' && a.d >= 1440) || !a.d) { evs.push({it, I, kind:'rental', s:st, e:st, zone:a.z, rep:0}); return; }
      evs.push({it, I, kind:'act', s:st, e:st + (a.d || 60), zone:a.z, rep:I.rep, fb:a.fb}); return; }
    if (it.kind === 'rent') { evs.push({it, I, kind:'rental', s:st, e:st, zone:RENT[it.ref].z, rep:0}); return; }
    if (it.kind === 'cab') { const m = cabMeta(it); evs.push({it, I, kind:'veh', vk:m.vk, s:st, e:st + m.dur, zone:m.r.z, rep:0, move:m.move}); }
  });
  return evs.sort((a, b) => a.s - b.s || (a.kind === 'stay') - (b.kind === 'stay'));
}
// Where the traveller is at minute T. Starts at Port Blair if a landing flight is set,
// otherwise on the island of their first booked item (they may already be in the islands).
function startZone(evs) { if (S.fin) return 'PBL'; const f = evs[0]; if (!f) return 'PBL'; return f.kind === 'ferry' ? f.zone : (f.zone === 'WAN' || f.zone === 'BAR' ? 'PBL' : f.zone); }
function makePos(evs) {
  const movers = evs.filter(e => e.move).sort((a, b) => a.s - b.s); const z0 = startZone(evs);
  return T0 => { let z = z0; for (const m of movers) { if (T0 >= m.e) z = m.move; else if (T0 > m.s) return 'transit'; else break; } return z; };
}
const reach = (z, pos) => z === pos || (pos === 'PBL' && (z === 'WAN' || z === 'BAR'));
const SITEMIN = [[/Mount Harriet|Madhuban/i, 75], [/Chidiya|Munda/i, 60], [/Baludera/i, 45], [/Sippighat/i, 25], [/Wandoor|Jolly|Red Skin/i, 60], [/Radhanagar|Beach 7/i, 35], [/Kalapathar/i, 25], [/Elephant/i, 25], [/Vijaynagar|Beach 5|Beach No\. 5/i, 20], [/Govind|Beach 2|Beach 3/i, 10], [/Laxmanpur/i, 10], [/Bharatpur/i, 5], [/Sitapur/i, 20], [/Natural Bridge/i, 15], [/Corbyn/i, 15], [/Chatham/i, 10]];
function siteMin(e) { if (e.kind === 'ferry') return 0; const s = (e.I.site || '') + ' ' + (e.I.title || '') + ' ' + (e.I.sub || ''); for (const [re, m] of SITEMIN) if (re.test(s)) return m; return 10; }
function cabServes(v, b) { if (b.kind !== 'act') return false; if (v.it.for === b.it.uid) return true; const k = siteKey(ACT[b.it.ref]); return !!k && rkeys(ROUTE[v.it.ref]).includes(k); }
function tau(a, b) {
  if (a.kind === 'veh' && (b.kind === 'veh' || b.kind === 'ferry')) return 0;
  if (a.kind === 'veh' && a.vk !== 'Road trip') return cabServes(a, b) ? 5 : Math.max(15, siteMin(b));
  if (a.kind === 'veh' && (a.vk === 'Jetty transfer' || a.vk === 'Airport pickup')) return 0;
  if (b.kind === 'veh') return 0;
  if (a.kind === 'ferry' && b.kind === 'ferry') return 90;
  const zb = b.zone, za = a.kind === 'ferry' ? a.to : a.zone;
  if ((za === 'PBL' && zb === 'WAN') || (za === 'WAN' && zb === 'PBL')) return 60;
  if (za !== zb) return 30;
  if (a.I.site && a.I.site === b.I.site) return 10;
  return Math.max(15, siteMin(a) + siteMin(b));
}
const abs = (d, m) => d * 1440 + m;
const CHECKIN = 720, CHECKOUT = 600, GRACE = 120; // check-in 12:00, check-out 10:00; up to 2 hrs later is usually fine
const dayOf = m => Math.floor(m / 1440);
const clock = m => hm(m % 1440);
let _lite = false, _nofix = false;

function run(cart) {
  cart = linkCart(cart); const saved = S.trip; S.trip = deriveTrip(cart);
  try { return run0(cart); } finally { S.trip = saved; }
}
function run0(cart) {
  const out = {by:{}, day:{}, anchors:{in:[], out:[]}, hard:0, soft:0};
  if (!S.trip) return out;
  const add = (uid, a) => { (out.by[uid] = out.by[uid] || []).push(a); a.sev === 'hard' ? out.hard++ : out.soft++; };
  const addDay = (d, a) => { (out.day[d] = out.day[d] || []).push(a); if (a.sev === 'hard') out.hard++; else if (a.sev === 'soft') out.soft++; };
  const evs = expand(cart); const pos = makePos(evs);
  const N = nDays(); const fi = flightIn(), fo = flightOut();
  const dIn = fi ? dayIdx(fi.date) : null, dOut = fo ? dayIdx(fo.date) : null;
  const Tin = fi ? abs(dIn, tm(fi.arr)) : null, Tout = fo ? abs(dOut, tm(fo.dep)) : null;
  const timed = evs.filter(e => e.kind !== 'stay' && e.kind !== 'rental');
  const seen = new Set();
  const fx = it => { if (it.kind === 'cab' && it.for) { const a = cart.find(x => x.uid === it.for); if (a) return fixesFor(a, cart).map(f => f.act === 'edit' ? Object.assign({}, f, {label:`Change ${info(a).title}`}) : f); } return fixesFor(it, cart); };

  // R6 availability
  cart.forEach(it => { const av = availability(it); if (av) add(it.uid, {rule:6, sev:'hard', title:av.sold ? 'Sold out' : 'Not available', msg:`${av.why}.`, fix:fx(it)}); });
  // items that ride on another (snorkel on the Elephant Beach boat) may overlap it
  const carrier = carrierPairs(cart);
  // R1 clash
  for (let i = 0; i < timed.length; i++) for (let j = i + 1; j < timed.length; j++) {
    const a = timed[i], b = timed[j]; if (a.it.uid === b.it.uid) continue;
    if (b.s - (b.rep || 0) < a.e && a.s - (a.rep || 0) < b.e) {
      if (carrier.has(a.it.uid + '|' + b.it.uid) || carrier.has(b.it.uid + '|' + a.it.uid)) continue;
      if (a.kind === 'veh' || b.kind === 'veh') { const v = a.kind === 'veh' ? a : b, o = a.kind === 'veh' ? b : a; if (o.kind === 'ferry' && Math.abs(v.s - o.e) <= 30) continue; if (v.vk === 'Sightseeing' || v.vk === 'Road trip') continue; }
      const key = [a.it.uid, b.it.uid].sort().join('|'); if (seen.has(key)) continue; seen.add(key);
      add(b.it.uid, {rule:1, sev:'hard', title:'Time clash', msg:`Overlaps with ${a.I.title} (${clock(a.s)}–${clock(a.e)})${b.rep ? `. You need to report ${b.rep} min early` : ''}.`, fix:fx(b.it)});
    }
  }
  // R2 wrong island
  timed.forEach(e => {
    const p = pos(e.s - (e.kind === 'act' ? (e.rep || 0) : 0) - 1); if (e.kind === 'veh' && e.vk === 'Road trip') return;
    if (p === 'transit') { if (e.kind === 'act') { const mv = evs.find(m => m.move && m.s < e.s && m.e >= e.s - (e.rep || 0)); if (mv) add(e.it.uid, {rule:2, sev:'hard', title:"You'll still be travelling", msg:`${mv.I.title} runs ${clock(mv.s)}–${clock(mv.e)}, so you won't be there at ${clock(e.s)}.`, fix:fx(e.it)}); } return; }
    if (e.kind === 'ferry' ? p !== e.zone : !reach(e.zone, p)) {
      add(e.it.uid, {rule:2, sev:'hard', title:'Wrong island', msg:`On ${fD(e.it.date)} at ${clock(e.s)} you'll be on ${ZN[p].name}, but this ${e.kind === 'ferry' ? 'ferry leaves from' : 'is on'} ${ZN[e.zone].name}.`, fix:[{label:`Find a ferry to ${ZN[e.zone].name}`, act:'ferry', from:p, to:e.zone, date:e.it.date}, {label:'I booked it elsewhere', act:'ferry', from:p, to:e.zone, date:e.it.date, own:1}, ...fx(e.it).filter(f => f.act === 'patch')]});
    }
  });
  // R3 buffers
  const byS = timed.slice().sort((a, b) => a.s - b.s);
  for (let i = 1; i < byS.length; i++) {
    const b = byS[i]; let a = null;
    for (let j = i - 1; j >= 0; j--) if (byS[j].e <= b.s - (b.rep || 0) && byS[j].it.uid !== b.it.uid && !carrier.has(byS[j].it.uid + '|' + b.it.uid) && !carrier.has(b.it.uid + '|' + byS[j].it.uid)) { a = byS[j]; break; }
    if (!a || dayOf(a.e) !== dayOf(b.s)) continue;
    const need = tau(a, b); const gap = b.s - (b.rep || 0) - a.e;
    if (gap < need) add(b.it.uid, {rule:3, sev:'hard', title:'Not enough time', msg:a.kind === 'ferry' && b.kind === 'ferry' ? `Keep at least 90 min between landing and your next ferry. Sea delays are common.` : `${a.I.title} ends at ${clock(a.e)}. Getting to ${b.I.site || ZN[b.zone].name} takes about ${need} min${b.rep ? `, and you report ${b.rep} min early` : ''}.`, fix:fx(b.it)});
  }
  if (fi) byS.forEach(e => {
    const need = e.kind === 'veh' ? Tin : e.kind === 'ferry' ? Tin + 95 : Tin + 60 + (e.rep || 0);
    if (e.s >= need) return;
    const nxt = e.kind === 'ferry' && (() => { const s0 = SAIL[e.it.ref]; const d1 = addD(e.it.date, 1); const s = BOOKABLE.filter(x => x.f === s0.f && x.to === s0.to && tm(x.dep) >= 420 && sailsOn(x, d1)).sort((a, b) => tm(a.dep) - tm(b.dep)).find(x => classFares(x).some(c => seats(x.id, c.name, d1) >= pax())); return s && {label:`Take the ${s.dep} ${s.op.replace(/ \d$/, '')} next morning`, act:'patch', uid:e.it.uid, patch:{ref:s.id, date:d1, cls:classFares(s).find(c => seats(s.id, c.name, d1) >= pax()).name}}; })();
    add(e.it.uid, {rule:3, sev:'hard', title:'Before you land', msg:`Your flight ${fi.no} lands at ${fi.arr} on ${fD(fi.date)}.${e.kind === 'ferry' ? ` The earliest ferry you can make that day is around ${hm(tm(fi.arr) + 95)}.${nxt ? ' Spend the first night in Port Blair and sail next morning.' : ''}` : ' Leave about an hour after landing.'}`, fix:(nxt ? [nxt] : []).concat(fx(e.it))}); });
  if (fo) byS.forEach(e => {
    if (e.fb && e.e + e.fb * 60 > Tout && e.s < Tout) add(e.it.uid, {rule:3, sev:'hard', title:'Too close to your flight', msg:`Diving needs ${e.fb} hours before flying. Your flight leaves ${fD(fo.date)} at ${fo.dep}.`, fix:fx(e.it)});
    else if (e.kind === 'ferry' && e.to === 'PBL' && e.e <= Tout && e.e + 240 > Tout) add(e.it.uid, {rule:3, sev:'hard', title:'Too close to your flight', msg:`This ferry lands at ${clock(e.e)}. Keep 4 hours before your ${fo.dep} flight in case the sea delays it.`, fix:fx(e.it)});
    else if (e.kind !== 'veh' && e.e > Tout - 120 && e.s < Tout + 1440 && dayOf(e.s) >= dOut) add(e.it.uid, {rule:3, sev:'hard', title:'After your flight', msg:`Your flight ${fo.no} leaves at ${fo.dep} on ${fD(fo.date)}.`, fix:fx(e.it)});
  });
  dataRules(cart, evs, pos, add, fo, Tout);
  // R4 missing links
  evs.filter(e => e.kind === 'stay').forEach(e => {
    const d = dayIdx(e.it.date); const p = pos(abs(d, 1380));
    if (p !== e.zone) { const from = p === 'transit' ? 'PBL' : p;
      const nextIn = e.it.nights > 1 && evs.some(x => x.move === e.zone && dayIdx(x.it.date) === d + 1);
      if (nextIn) { add(e.it.uid, {rule:4, sev:'hard', title:`You reach ${ZN[e.zone].name} a day later`, msg:`Your ${evs.find(x => x.move === e.zone && dayIdx(x.it.date) === d + 1).I.title} trip is on ${fD(addD(e.it.date, 1))}, so check in that day.`, fix:[{label:`Check in ${fD(addD(e.it.date, 1))} (${e.it.nights - 1} night${e.it.nights > 2 ? 's' : ''})`, act:'patch', uid:e.it.uid, patch:{date:addD(e.it.date, 1), nights:e.it.nights - 1}}]}); return; }
      const road = ['RAN', 'MAY', 'DIG', 'BAR'].includes(e.zone) || ['RAN', 'MAY', 'DIG'].includes(from);
      const rr = road && D.routes.find(r => r.kind === 'road' && ((r.z === from && r.move === e.zone) || (r.z === e.zone && r.move === from)));
      add(e.it.uid, {rule:4, sev:'hard', title:`How will you reach ${ZN[e.zone].name}?`, msg:`You check in on ${fD(e.it.date)}, but your trip has no ${road ? 'road trip or ferry' : 'ferry'} from ${ZN[from].name} to ${ZN[e.zone].name} that day.`, fix:rr ? [{label:`Add the drive · ${inr(vehFor(rr).ow)}`, act:'quickadd', kind:'cab', ref:rr.id, rev:rr.z === from ? '' : 1, date:e.it.date, t:'06:00'}] : [{label:`Find a ferry`, act:'ferry', from, to:e.zone, date:e.it.date}, {label:'I booked it elsewhere', act:'ferry', from, to:e.zone, date:e.it.date, own:1}]}); }
  });
  if (!fi) { const first = evs.find(e => e.kind === 'stay' && dayIdx(e.it.date) === 0); const z0 = startZone(evs);
    if (first && z0 === first.zone && z0 !== 'PBL' && !S.dismissed['reach' + first.it.uid]) {
      const rr = D.routes.find(r => r.kind === 'road' && r.z === 'PBL' && r.move === first.zone); const via = D.zm.find(r => r.f === 'PBL' && r.t === first.zone);
      const fix = rr ? [{label:`Add the drive from Port Blair · ${inr(vehFor(rr).ow)}`, act:'quickadd', kind:'cab', ref:rr.id, date:first.it.date, t:'05:00'}] : [{label:`Find a ferry from Port Blair`, act:'ferry', from:'PBL', to:first.zone, date:first.it.date}];
      fix.push({label:"I'm already there", act:'dismiss', key:'reach' + first.it.uid});
      add(first.it.uid, {rule:4, sev:'soft', title:`How will you get to ${ZN[first.zone].name}?`, msg:`All flights land in Port Blair. ${ZN[first.zone].name} is ${rr ? `about ${durTxt(rr.mins)} by road from there${['DIG', 'MAY', 'RAN'].includes(first.zone) ? ' (or an overnight government ship)' : ''}` : `${via && via.h ? `about ${via.h} hrs ` : ''}by ferry from there`}.`, fix}); } }
  evs.filter(e => e.kind === 'stay').forEach(e => {
    const dOutDay = dayIdx(e.it.date) + e.it.nights; if (S.dismissed['late' + e.it.uid] || e.it.late) return;
    const leave = evs.filter(x => dayOf(x.s) === dOutDay && x.zone === e.zone && (x.kind === 'ferry' || (x.kind === 'veh' && (/Airport|Jetty|Wharf|Phoenix/.test(x.I.title.split(' → ')[1] || '') || x.vk === 'Road trip')))).sort((a, b) => a.s - b.s)[0];
    const t0 = leave ? leave.s % 1440 : null;
    if (t0 != null && t0 > CHECKOUT + GRACE) add(e.it.uid, {rule:4, sev:'soft', title:'Late check-out needed', msg:`Check-out is ${hm(CHECKOUT)} (up to ${hm(CHECKOUT + GRACE)} is usually fine). You leave at ${hm(t0)}, so a later check-out depends on room availability.`, fix:[{label:'Request late check-out', act:'patch', uid:e.it.uid, patch:{late:1}}, {label:"I'll leave bags at the hotel", act:'dismiss', key:'late' + e.it.uid}]});
  });
  evs.filter(e => e.kind === 'stay' && !e.it.early && !e.it.own && !S.dismissed['early' + e.it.uid]).forEach(st => { const n0 = dayIdx(st.it.date);
    const arr = [fi && dayIdx(fi.date) === n0 && st.zone === 'PBL' ? Tin + 45 : null].concat(evs.filter(x => dayOf(x.e) === n0 && ((x.kind === 'ferry' && x.to === st.zone) || (x.kind === 'veh' && x.move === st.zone))).map(x => x.e + 20)).filter(x => x != null).sort((a, b) => a - b)[0];
    if (arr == null || arr >= abs(n0, CHECKIN) - 30) return; const how = fi && dayIdx(fi.date) === n0 && st.zone === 'PBL' && arr === Tin + 45 ? `You land at ${fi.arr}` : `You reach ${ZN[st.zone].name} around ${hm(arr % 1440)}`;
    add(st.it.uid, {rule:4, sev:'soft', title:'Arriving before check-in', msg:`${how}; standard check-in is ${hm(CHECKIN)}. We ask the hotel to have your room ready early: free when a room is free, otherwise you can leave your bags and freshen up.`, fix:[{label:'Request early check-in', act:'patch', uid:st.it.uid, patch:{early:1}}, {label:'Not needed', act:'dismiss', key:'early' + st.it.uid}]}); });
  // every night of a stay must be on that island, and end by the flight home
  evs.filter(e => e.kind === 'stay').forEach(e => {
    const d0 = dayIdx(e.it.date); const h = HOT[e.it.ref];
    for (let k = 1; k < e.it.nights; k++) { const p = pos(abs(d0 + k, 1380)); if (p === 'transit' || p === e.zone) continue;
      add(e.it.uid, {rule:4, sev:'hard', title:`You won't be on ${ZN[e.zone].name} on night ${k + 1}`, msg:`On ${fD(addD(e.it.date, k))} you'll be on ${ZN[p].name}, but this stay runs ${e.it.nights} nights.`, fix:[{label:`Make it ${k} night${k > 1 ? 's' : ''}`, act:'patch', uid:e.it.uid, patch:{nights:k}}, {label:t('change'), act:'edit', uid:e.it.uid}]}); break; }
    if (fo && d0 + e.it.nights > dOut) { const k = Math.max(1, dOut - d0); add(e.it.uid, {rule:3, sev:'hard', title:'Runs past your flight home', msg:`Your flight leaves ${fD(fo.date)}, but this stay checks out ${fD(addD(e.it.date, e.it.nights))}.`, fix:[{label:`Make it ${k} night${k > 1 ? 's' : ''}`, act:'patch', uid:e.it.uid, patch:{nights:k}}]}); }
    const r = roomOf(h, e.it.room); const cap = (r.ma || 2) + 1; const rooms = e.it.qty || 1;
    if (S.pax.adults > rooms * cap) { const need = Math.ceil(S.pax.adults / cap); add(e.it.uid, {rule:4, sev:'hard', title:'Not enough rooms', msg:`${S.pax.adults} adults need ${need} rooms here (up to ${cap} adults a room, with an extra bed).`, fix:[{label:`Book ${need} rooms`, act:'patch', uid:e.it.uid, patch:{qty:need}}]}); }
    const other = evs.find(o => o !== e && o.kind === 'stay' && cart.indexOf(o.it) < cart.indexOf(e.it) && dayIdx(o.it.date) < d0 + e.it.nights && dayIdx(o.it.date) + o.it.nights > d0);
    if (other) add(e.it.uid, {rule:1, sev:'hard', title:'Two stays on the same night', msg:`${other.I.title} already covers ${fD(S.trip ? addD(S.trip.start, Math.max(d0, dayIdx(other.it.date))) : e.it.date)}.`, fix:[{label:t('change'), act:'edit', uid:e.it.uid}, {label:t('remove'), act:'del', uid:e.it.uid}]});
  });
  cart.filter(it => it.kind === 'ferry' && !it.own && it.seats && it.seats.length && it.seats.length < pax()).forEach(it => {
    add(it.uid, {rule:6, sev:'hard', title:`Seats for ${it.seats.length} of ${pax()} travellers`, msg:`You added travellers after picking seats.`, fix:[{label:'Pick seats for everyone', act:'patch', uid:it.uid, patch:{reseat:1}}, {label:t('change'), act:'edit', uid:it.uid}]}); });
  cart.filter(it => it.kind === 'act' && ACT[it.ref].b === 'per_pax').forEach(it => { const a = ACT[it.ref]; const {pa, pk} = partyOf(it);
    if (a.age && pk > kidsOk(a)) add(it.uid, {rule:6, sev:'hard', title:'Too young for this', msg:`Minimum age is ${a.age}. ${pk - kidsOk(a)} of your children ${pk - kidsOk(a) > 1 ? 'are' : 'is'} younger.`, fix:[{label:`Book for those ${a.age}+ only`, act:'patch', uid:it.uid, patch:{pk:kidsOk(a)}}]});
    if (pa + pk === 0) add(it.uid, {rule:6, sev:'hard', title:'Nobody is going', msg:'Choose who is going, or remove it.', fix:[{label:t('change'), act:'edit', uid:it.uid}, {label:t('remove'), act:'del', uid:it.uid}]}); });
  // cabs to and from each jetty
  evs.filter(e => e.kind === 'ferry').forEach(e => {
    if (S.dismissed['pk' + e.it.uid] || e.it.own) return;
    const day = dayOf(e.s); const s = SAIL[e.it.ref];
    const hasPost = evs.some(x => x.kind === 'veh' && (x.vk === 'Jetty transfer' || x.vk === 'Sightseeing') && x.zone === e.to && x.s >= e.e - 30 && x.s <= e.e + 120);
    const hasPre = evs.some(x => x.kind === 'veh' && x.zone === e.zone && x.e <= e.s && x.s >= e.s - e.rep - 240 && dayOf(x.s) === day);
    const date = addD(S.trip.start, day);
    const preF = placeRoute(baseKey(cart, e.zone, date, true), JKEY(s), e.zone), postF = placeRoute(JKEY_TO(s), baseKey(cart, e.to, addD(S.trip.start, dayOf(e.e)), false), e.to);
    const trIn = evs.some(o => o !== e && o.kind === 'ferry' && o.to === e.zone && JKEY_TO(SAIL[o.it.ref]) === JKEY(s) && o.e <= e.s && e.s - o.e <= 240), trOut = evs.some(o => o !== e && o.kind === 'ferry' && o.zone === e.to && JKEY(SAIL[o.it.ref]) === JKEY_TO(s) && o.s >= e.e && o.s - e.e <= 240);
    const pre = !hasPre && !trIn && preF && preF.r, post = !hasPost && !trOut && postF && postF.r;
    if (!pre && !post) return;
    const preRev = preF && preF.rev ? 1 : '', postRev = postF && postF.rev ? 1 : '';
    const preFrom = pre && (preF.rev ? pre.b : pre.a), postTo = post && (postF.rev ? post.a : post.b);
    const preT = hm(Math.floor((e.s % 1440 - e.rep - (pre ? pre.mins + 10 : 20)) / 5) * 5);
    const pv = pre && vehFor(pre), qv = post && vehFor(post);
    const fixes = [];
    if (pre && post) fixes.push({label:`Add both · ${inr(pv.ow + qv.ow)}`, act:'quickadd', kind:'cab', ref:pre.id, rev:preRev, date, t:preT, for:e.it.uid, leg:'pre', ref2:post.id, rev2:postRev, t2:clock(e.e), leg2:'post'});
    if (pre) fixes.push({label:`${post ? 'Only to' : 'Cab to'} ${s.fromPt} · ${inr(pv.ow)}`, act:'quickadd', kind:'cab', ref:pre.id, rev:preRev, date, t:preT, for:e.it.uid, leg:'pre'});
    if (post) fixes.push({label:`${pre ? 'Only from' : 'Cab from'} ${s.toPt} · ${inr(qv.ow)}`, act:'quickadd', kind:'cab', ref:post.id, rev:postRev, date, t:clock(e.e), for:e.it.uid, leg:'post'});
    fixes.push({label:'No thanks', act:'dismiss', key:'pk' + e.it.uid});
    const parts = [pre && `pickup at ${preT} from ${stayOn(cart, e.zone, date, true) ? 'your hotel' : preFrom} to reach ${s.fromPt} (report by ${hm(e.s % 1440 - e.rep)})`, post && `a cab waiting at ${s.toPt} when you land at ${clock(e.e)}, to ${stayOn(cart, e.to, date, false) ? 'your hotel' : postTo}`].filter(Boolean);
    add(e.it.uid, {rule:4, sev:'soft', title:pre && post ? 'Cabs to and from the jetty?' : pre ? 'How will you reach the jetty?' : 'Need a cab from the jetty?', msg:`${(pv || qv).c} for ${pax()}: ${parts.join(', and ')}.`, fix:fixes});
  });
  const airSite = siteCabs(cart, evs, add); out._airSite = airSite;
  evs.filter(e => e.kind === 'ferry' && !e.it.own).forEach(e => { const start = e.s % 1440 - e.rep - 40; if (start >= 330 || S.dismissed['early' + e.it.uid]) return;
    const s0 = SAIL[e.it.ref]; const later = BOOKABLE.filter(s => s.f === s0.f && s.to === s0.to && tm(s.dep) >= tm(s0.dep) + 60 && tm(s.dep) <= 720).sort((a, b) => tm(a.dep) - tm(b.dep))
      .find(s => { const c = classFares(s).find(x => seats(s.id, x.name, e.it.date) >= pax()); if (!c) return false; return runLite(cart.map(x => x.uid === e.it.uid ? Object.assign({}, x, {ref:s.id, cls:c.name}) : x), e.it.uid).item === 0; });
    add(e.it.uid, {rule:3, sev:'soft', title:'Very early start', msg:`You'd leave around ${hm(start)} to report ${e.rep} min before this ${s0.dep} sailing${S.pax.kids ? ' — hard with children' : ''}.`, fix:(later ? [{label:`Take the ${later.dep} ${later.op.replace(/ \d$/, '')} instead`, act:'patch', uid:e.it.uid, patch:{ref:later.id, cls:classFares(later).find(x => seats(later.id, x.name, e.it.date) >= pax()).name}}] : []).concat([{label:'Keep it', act:'dismiss', key:'early' + e.it.uid}])}); });
  if (fi) { const air = evs.filter(e => e.kind === 'veh' && dayOf(e.s) === dIn && /Airport/.test(e.I.title.split(' → ')[0]));
    if (air.length > 1 && !S.dismissed.air2) { const toHotel = air.find(e => !e.it.for) || air[air.length - 1]; add(toHotel.it.uid, {rule:4, sev:'soft', title:'Two cabs from the airport', msg:`You're going straight from the airport to ${air.find(e => e !== toHotel).I.title.split(' → ')[1]}, so this one may not be needed.`, fix:[{label:t('remove'), act:'del', uid:toHotel.it.uid}, {label:'Keep both', act:'dismiss', key:'air2'}]}); } }
  const lastNight = (fo ? dOut : N - 1);
  for (let n = 0; n < lastNight; n++) {
    const date = addD(S.trip.start, n); if (S.dismissed['n' + date]) continue;
    const covered = evs.some(e => e.kind === 'stay' && dayIdx(e.it.date) <= n && dayIdx(e.it.date) + e.it.nights > n);
    if (!covered) { const p = pos(abs(n, 1380)); const z = p === 'transit' ? 'PBL' : p; addDay(n, {rule:4, sev:'soft', kind:'night', title:t('noStay'), zone:z, fix:[{label:`Find a stay on ${ZN[z].name}`, act:'list', cat:'stay', zone:z, date}, {label:'I have a place', act:'dismiss', key:'n' + date}]}); }
  }
  if (fi && !S.dismissed.airIn && !airSite && !evs.some(e => e.kind === 'veh' && /Airport pickup|Sightseeing/.test(e.vk) && /Airport/.test(e.I.title.split(' → ')[0]) && dayOf(e.s) === dIn)) { const f = placeRoute('IXZ', baseKey(cart, 'PBL', fi.date, false), 'PBL') || {r:ROUTE['RT-IXZ-ABERDEEN'], rev:false}; const r = f.r; const v = vehFor(r); const st = stayOn(cart, 'PBL', fi.date, false); out.anchors.in.push({rule:4, sev:'soft', title:'Cab from the airport?', msg:`${v.c} to ${st ? HOT[st.ref].n : r.b}, ${inr(v.ow)}.`, fix:[{label:`Add cab · ${inr(v.ow)}`, act:'quickadd', kind:'cab', ref:r.id, rev:f.rev ? 1 : '', date:fi.date, t:hm(tm(fi.arr) + 20)}, {label:'No thanks', act:'dismiss', key:'airIn'}]}); out.soft++; }
  if (fo) { const p = pos(Tout - 180);
    if (p !== 'PBL') { out.anchors.out.push({rule:4, sev:'hard', title:`You'll still be on ${p === 'transit' ? 'a ferry' : ZN[p].name}`, msg:`Your flight leaves Port Blair at ${fo.dep}. Book a ferry back the day before.`, fix:[{label:'Find a ferry to Port Blair', act:'ferry', from:p === 'transit' ? 'HAV' : p, to:'PBL', date:addD(fo.date, -1)}]}); out.hard++; }
    else if (!S.dismissed.airOut && !evs.some(e => e.kind === 'veh' && /Airport/.test(e.I.title.split(' → ')[1] || '') && dayOf(e.s) === dOut)) { const f = placeRoute('IXZ', baseKey(cart, 'PBL', fo.date, true), 'PBL') || {r:ROUTE['RT-IXZ-ABERDEEN'], rev:false}; const r = f.r; const v = vehFor(r); const st = stayOn(cart, 'PBL', fo.date, true); out.anchors.out.push({rule:4, sev:'soft', title:'Cab to the airport?', msg:`${v.c} from ${st ? HOT[st.ref].n : r.b}, ${inr(v.ow)}. Pickup ${hm(tm(fo.dep) - 150)}.`, fix:[{label:`Add cab · ${inr(v.ow)}`, act:'quickadd', kind:'cab', ref:r.id, rev:f.rev ? '' : 1, date:fo.date, t:hm(tm(fo.dep) - 150)}, {label:'No thanks', act:'dismiss', key:'airOut'}]}); out.soft++; }
  }
  // R5 free time (daylight, 2+ hours, on an island)
  for (let n = 0; n < N && !_lite && !_nofix; n++) {
    const date = addD(S.trip.start, n); const nat = NAT[date];
    let ws = abs(n, Math.max(420, nat ? tm(nat.sr) + 90 : 420)), we = abs(n, nat ? tm(nat.ss) : 1050);
    if (fi && n === dIn) ws = Math.max(ws, Tin + 60); if (fi && n < dIn) continue;
    if (!fo && n === N - 1 && n > 0 && evs.some(e => e.kind === 'stay' && dayIdx(e.it.date) + e.it.nights === n) && !evs.some(e => e.kind === 'stay' && dayIdx(e.it.date) === n)) continue;   // the day you go home: we don't know your flight, so we don't fill it
    if (!fi && n === 0) { const ci = evs.find(e => e.kind === 'stay' && dayIdx(e.it.date) === 0); ws = Math.max(ws, abs(0, ci ? CHECKIN + 60 : 540)); }
    if (fo && n === dOut) { we = Math.min(we, Tout - 180); if (we - ws < 180) continue; } if (fo && n > dOut) continue; // flying-home morning: only a real half-day counts
    const busy = timed.filter(e => e.e > ws && e.s < we).map(e => [e.s - (e.rep || 0) - 20, e.e + 20]).sort((a, b) => a[0] - b[0]);
    const skipped = !!S.dismissed['gapday' + date];
    let c = ws; const gaps = [];
    busy.forEach(([s, e]) => { if (s - c >= 90) gaps.push([c, s]); c = Math.max(c, e); });
    if (we - c >= 90) gaps.push([c, we]);
    else if (!(fo && n >= dOut - 0 && n === dOut)) { const ee = abs(n, 1320), es = Math.max(c, we); if (ee - es >= 90 && es <= abs(n, 1140) && !timed.some(e => e.e > es && e.s < ee) && !evs.some(e => e.kind === 'ferry' && e.s < ee && e.e > es)) gaps.push([es, ee, 1]); }
    gaps.forEach(([gs, ge, night]) => { const p = pos(gs + 1); if (p === 'transit') return;
      addDay(n, {rule:5, sev:'tip', kind:'gap', at:gs, end:ge, zone:p, date, skipped, night:!!night, evening:!!night || (ge === we && !(fo && n === dOut))}); });
  }
  return out;
}
/* how a sensible traveller ranks sailings that all fit: no pre-dawn starts; heading out, an earlier boat gives more of the day on the new island;
   heading back to Port Blair, an afternoon boat keeps a last morning on the island */
function ferryPref(s) { const d = tm(s.dep); let sc = 0;
  if (d < 420) sc -= 30;
  if (s.to === 'PBL') sc += d >= 780 && d <= 960 ? 24 : d >= 600 ? 14 : 4;
  else sc += d <= 600 ? 22 - Math.max(0, d - 450) / 15 : d <= 840 ? 6 : 0;
  if (s.gov) sc -= 15; if (/Conflict|Estimate/.test(s.conf || '')) sc -= 4; return sc; }
function prefWhy(s) { const d = tm(s.dep); return s.to === 'PBL' ? (d >= 780 ? 'Keeps your last morning on the island' : 'Lands early in Port Blair') : d <= 600 ? 'Gets you there with most of the day ahead' : 'Leaves at a relaxed hour'; }
function fixesFor(it, cart) {
  if (_lite || _nofix) return [{label:t('change'), act:'edit', uid:it.uid}];
  const res = []; const base = runLite(cart, it.uid).total;
  const test = patch => { const c = cart.map(x => x.uid === it.uid ? Object.assign({}, x, patch) : x); const r = runLite(c, it.uid); return r.item === 0 && r.total < base; };
  if (it.kind === 'act') { for (const s of slotsFor(ACT[it.ref])) { if (s !== it.t && test({t:s})) { res.push({label:`Move to ${s}`, act:'patch', uid:it.uid, patch:{t:s}}); break; } } }
  if (it.kind === 'act' && !res.length && S.trip) { const N = Math.round((pDate(S.trip.end) - pDate(S.trip.start)) / 864e5) + 1; const d0 = Math.round((pDate(it.date) - pDate(S.trip.start)) / 864e5);
    const order = []; for (let k = 1; k < N; k++) { if (d0 - k >= 0) order.push(d0 - k); if (d0 + k < N) order.push(d0 + k); }
    let hit = false; for (const k of order) { const nd = addD(S.trip.start, k); for (const s of [it.t].concat(slotsFor(ACT[it.ref]).filter(x => x !== it.t))) { if (test({date:nd, t:s})) { res.push({label:`Move to ${fD(nd)}${s !== it.t ? ' at ' + s : ''}`, act:'patch', uid:it.uid, patch:{date:nd, t:s}}); hit = true; break; } } if (hit) break; } }
  if (it.kind === 'ferry') { const s0 = SAIL[it.ref]; const alts = BOOKABLE.filter(s => s.f === s0.f && s.to === s0.to && s.id !== s0.id).sort((a, b) => ferryPref(b) - ferryPref(a) || tm(a.dep) - tm(b.dep)); let n = 0;
    for (const s of alts) { const cls = (classFares(s).find(c => seats(s.id, c.name, it.date) >= pax()) || classFares(s)[0]).name; if (test({ref:s.id, cls})) { res.push({label:`Take the ${s.dep} ${s.op.replace(/ \d$/, '')} instead`, act:'patch', uid:it.uid, patch:{ref:s.id, cls}}); if (++n === 2) break; } } }
  res.push({label:it.kind === 'ferry' ? 'See all ferries' : t('change'), act:'edit', uid:it.uid});
  return res;
}
function runLite(cart, uid) { _lite = true; try { const r = run(cart); return {item:(r.by[uid] || []).filter(a => a.sev === 'hard').length, total:r.hard}; } finally { _lite = false; } }
function fitOf(cand) {
  if (!S.cart.filter(x => x.uid !== cand.uid && x.for !== cand.uid).length) return {state:'alone', hard:[], soft:[]};
  const c = Object.assign({}, cand, {uid:cand.uid || '__c'});
  const cart = S.cart.filter(x => x.uid !== c.uid).concat([c]);
  _nofix = true; let r; try { r = run(cart); } finally { _nofix = false; }
  const al = r.by[c.uid] || []; const hard = al.filter(a => a.sev === 'hard');
  return {state:hard.length ? 'bad' : 'ok', hard, soft:al.filter(a => a.sev === 'soft')};
}

/* ============ DATA RULES (from the Constraints sheet) ============ */
const RULES = D.rules || [];
const ZID = {}; D.zones.forEach(z => ZID[z.name] = z.id);
const mt = (p, id) => p.endsWith('*') ? id.startsWith(p.slice(0, -1)) : p === id;
const inList = (list, id) => list.some(p => mt(p, id));
const DAYN = {Sunday:0, Monday:1, Tuesday:2, Wednesday:3, Thursday:4, Friday:5, Saturday:6, Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6};
function closedRule(id, dw) { return RULES.find(r => r.t === 'DAY_CLOSED' && inList(r.a, id) && r.b.join(',').split(/[,\s]+/).some(x => DAYN[x] === dw)); }
const isCarrierRule = r => (r.t === 'REQUIRES_ONE_OF' || r.t === 'REQUIRES') && r.b.some(x => /^(ACV|VEH)-/.test(x)) && r.a.some(x => /^ACV-/.test(x));
// a booked cab to Wandoor counts as the Wandoor transfer the marine-park rules ask for
function refsOf(it) { if (it.kind !== 'cab') return [it.ref]; const m = cabMeta(it); return /Wandoor/.test(m.to + m.from) ? [it.ref, 'VEH-PB-WANDOOR-SUV', 'VEH-PB-WANDOOR-TT12'] : [it.ref]; }
const inRefs = (list, it) => refsOf(it).some(id => inList(list, id));
/* the same rules, said simply */
const PLAIN = {
  'R-112':['Add the boat to Jolly Buoy', 'To snorkel at Jolly Buoy, you also need the boat that takes you there.'],
  'R-113':['Add the boat to Red Skin', 'To snorkel at Red Skin, you also need the boat that takes you there.'],
  'R-132':['Add a cab to Wandoor', 'Boats to Jolly Buoy and Red Skin leave from Wandoor jetty, about an hour from Port Blair. You need a cab there and back.'],
  'R-133':['Add a way to reach Elephant Beach', 'To do this, you first need to get to Elephant Beach. Most people take the boat. You can also walk there through the forest (about 2 hours).'],
  'R-134':['Add the boat to North Bay', 'To do this, you first need to get to North Bay. Take the North Bay boat, or the Ross + North Bay trip.'],
  'R-135':['Choose your boat to Ross & Smith', 'To snorkel here, you need a boat to Ross & Smith. Pick one that fits your group.'],
  'R-136':['Add the boat to Merk Bay', 'To snorkel at Merk Bay, you need a boat. Take the Merk Bay boat or the 3-beach trip.'],
  'R-137':['Add a fishing permit', 'Everyone who fishes needs a permit. Pick Indian or foreign national.']
};
function carrierPairs(cart) {
  const set = new Set();
  RULES.filter(isCarrierRule).forEach(r => cart.forEach(a => { if (!inList(r.a, a.ref)) return; cart.forEach(b => { if (b.uid !== a.uid && b.date === a.date && inRefs(r.b, b)) set.add(a.uid + '|' + b.uid); }); }));
  return set;
}
function quickFix(id, it) {
  if (ACT[id]) { const a = ACT[id]; const p = actPrice(a); const per = a.b === 'per_pax' ? pax() : 1; const slots = slotsFor(a); const tt = a.fixed ? a.t : (slots.find(x => tm(x) <= tm(it.t || '09:00')) || slots[0]);
    return {label:`Add ${a.n}${a.v && a.v.length < 26 ? ' · ' + a.v : ''}${p != null ? ' · ' + inr(p * per) : ''}`, act:'quickadd', kind:'act', ref:id, date:it.date, t:tt}; }
  if (/^VEH-PB-WANDOOR/.test(id)) { const f = placeRoute(baseKey(S.cart, 'PBL', it.date, true), 'WAND', 'PBL') || {r:ROUTE['RT-ABERDEEN-WAND'], rev:false}; const r = f.r; const v = vehFor(r); return {label:`Add return cab to Wandoor · ${inr(v.ret)}`, act:'quickadd', kind:'cab', ref:r.id, rev:f.rev ? 1 : '', ret:1, date:it.date, t:hm(Math.max(360, tm(it.t || '09:00') - r.mins - 15)), for:it.uid}; }
  return null;
}
const EXCURSION = /Mount Harriet|Madhuban|Chidiya|Munda|Wandoor|Jolly|Red Skin|Baratang|Barren|Cinque/i;
function dataRules(cart, evs, pos, add, fo, Tout) {
  const byDate = d => cart.filter(x => x.date === d);
  const actEvs = evs.filter(e => e.kind === 'act');
  RULES.forEach(r => {
    if (isCarrierRule(r)) {
      const opts = r.b.filter(x => /^(ACV|VEH)-/.test(x) && (ACT[x] || /^VEH-PB-WANDOOR-SUV/.test(x)));
      cart.filter(it => inList(r.a, it.ref)).forEach(it => {
        if (byDate(it.date).some(o => o.uid !== it.uid && inRefs(r.b, o))) return;
        { const pt = PLAIN[r.id] || ['You need one more booking for this', r.msg]; add(it.uid, {rule:4, sev:'hard', title:pt[0], msg:pt[1], fix:opts.slice(0, 3).map(id => quickFix(id, it)).filter(Boolean)}); }
      });
    }
    if (r.t === 'MUTEX_SAME_TRIP') {
      const A = cart.filter(x => inList(r.a, x.ref)), B = cart.filter(x => inList(r.b, x.ref));
      if (A.length && B.length) B.forEach(b => add(b.uid, {rule:1, sev:'hard', title:'Can’t book both', msg:r.msg, fix:[{label:t('remove'), act:'del', uid:b.uid}]}));
    }
    if (r.t === 'MUTEX_SAME_DAY') cart.filter(x => inList(r.a, x.ref)).forEach(a => {
      const others = byDate(a.date).filter(o => o.uid !== a.uid && (/Any other/i.test(r.b[0]) ? o.kind === 'act' && !ACT[o.ref].entry : inList(r.b, o.ref)));
      others.forEach(o => add(o.uid, {rule:1, sev:'hard', title:'Same-day conflict', msg:r.msg, fix:fixesFor(o, cart)}));
    });
    if (r.t === 'ZONE_NIGHT_REQUIRED') { const z = ZID[r.b[0]]; if (!z) return;
      cart.filter(x => inList(r.a, x.ref)).forEach(it => {
        const n = dayIdx(it.date); const need = Math.max(1, +r.p1 || 1);
        const nights = evs.filter(e => e.kind === 'stay' && e.zone === z).reduce((s, e) => s + e.it.nights, 0);
        const tonight = evs.some(e => e.kind === 'stay' && e.zone === z && dayIdx(e.it.date) <= n && dayIdx(e.it.date) + e.it.nights > n);
        if (!tonight || nights < need) add(it.uid, {rule:4, sev:'hard', title:`Needs ${need > 1 ? need + ' nights' : 'a night'} on ${ZN[z].name}`, msg:r.msg, fix:[{label:`Find a stay on ${ZN[z].name}`, act:'list', cat:'stay', zone:z, date:it.date}]});
      }); }
    if (r.t === 'MOON_DEPENDENT') cart.filter(x => inList(r.a, x.ref)).forEach(it => {
      const n = NAT[it.date]; if (!n || !/^Poor/i.test(n.bio || '')) return;
      add(it.uid, {rule:6, sev:r.sev === 'HARD' ? 'hard' : 'soft', title:'Bright moon that night', msg:r.msg, fix:fixesFor(it, cart)});
    });
    if (r.t === 'DAY_CLOSED' && r.sev === 'WARN') cart.filter(x => inList(r.a, x.ref)).forEach(it => { if (closedRule(it.ref, dowOf(it.date)) === r) add(it.uid, {rule:6, sev:'soft', title:'Partly closed that day', msg:r.msg, fix:fixesFor(it, cart)}); });
    if (r.t === 'SAME_DAY_IMPOSSIBLE') { const za = ZID[r.a[0]], zb = ZID[r.b[0]]; if (!za || !zb) return;
      const days = [...new Set(cart.map(x => x.date))];
      days.forEach(d => { const es = evs.filter(e => e.it.date === d && e.kind !== 'stay' && !(e.kind === 'veh' && (e.vk === 'Jetty transfer' || /Airport/.test(e.vk) || (e.it.for && (cart.find(x => x.uid === e.it.for) || {}).kind === 'ferry')))); if ((za === 'BAR' || zb === 'BAR') && es.some(e => e.kind === 'ferry' && (e.zone === 'BAR' || e.to === 'BAR'))) return; /* by sea (Makruzz Baratang route) Baratang and Havelock fit in one day */
        const zonesOf = e => e.kind === 'ferry' ? [e.zone, e.to] : [e.zone];
        const hit = z => es.find(e => zonesOf(e).includes(z) && !(e.kind === 'ferry' && z === 'PBL'));
        const ea = hit(za), eb = hit(zb);
        if (ea && eb && ea !== eb) { const tgt = eb.kind === 'ferry' ? ea : eb; add(tgt.it.uid, {rule:1, sev:'hard', title:'Not possible on the same day', msg:r.msg, fix:fixesFor(tgt.it, cart)}); }
      }); }
  });
  // Full-day blocks use the whole day (R-061)
  actEvs.filter(e => ACT[e.it.ref].d >= 420 && !e.parts).forEach(f => {
    evs.filter(e => e.it.date === f.it.date && e.it.uid !== f.it.uid && (e.kind === 'act' || e.kind === 'ferry') && (e.s % 1440) < 1020 && !(ACT[e.it.ref] && ACT[e.it.ref].entry) && !carrierPairs(cart).has(e.it.uid + '|' + f.it.uid)).forEach(o => add(o.it.uid, {rule:1, sev:'hard', title:'That day is full', msg:`${f.I.title} takes the whole day, so nothing else fits on ${fD(f.it.date)}.`, fix:fixesFor(o.it, cart)}));
  });
  // Trips out of town don't fit before a ferry on the same day
  evs.filter(e => e.kind === 'ferry').forEach(fe => {
    actEvs.filter(a => a.it.date === fe.it.date && a.s < fe.s && a.zone === fe.zone && !ACT[a.it.ref].seaRoute && EXCURSION.test((a.I.site || '') + ' ' + a.I.title + ' ' + a.I.sub) && ACT[a.it.ref].d >= 120).forEach(a =>
      add(a.it.uid, {rule:3, sev:'hard', title:'Too much for a ferry day', msg:`${a.I.title} is a trip out of town. On the day you take the ${SAIL[fe.it.ref].dep} ferry there isn't enough time to get back, collect bags and report at the jetty. Do it on another day.`, fix:fixesFor(a.it, cart)}));
  });
  // Last night in Port Blair when flying out (R-049, advice)
  if (fo) { const last = dayIdx(fo.date) - 1; const st = evs.find(e => e.kind === 'stay' && dayIdx(e.it.date) <= last && dayIdx(e.it.date) + e.it.nights > last);
    if (st && st.zone !== 'PBL' && !S.dismissed.lastnight) add(st.it.uid, {rule:4, sev:'soft', title:'Last night away from Port Blair', msg:(RULES.find(r => r.t === 'LAST_NIGHT_ZONE') || {}).msg || 'Spending your last night in Port Blair protects your flight if the sea is rough.', fix:[{label:'OK, keep it', act:'dismiss', key:'lastnight'}]}); }
}
function productNotes(id) { return RULES.filter(r => (r.t === 'REQUIRES' && r.b.some(x => /^(PER|GDE)-/.test(x)) || r.t === 'TIDE_DEPENDENT' || r.t === 'MOON_DEPENDENT' || r.t === 'ZONE_NIGHT_REQUIRED') && inList(r.a, id)).map(r => r.msg); }

/* ============ CAB TO THE SITE (point to point) ============ */
const SITECAB = [
  [/Ross|North Bay|Rajiv Gandhi|harbour|Coral Safari|Semi-submarine|Jet ski|Banana|Sofa|Speed boat ride|Parasail|Sea karting|Snuba|Sunset cruise|Dinner cruise|Glass bottom boat — North Bay/i, 'PBL', 'RGWSC'],
  [/Cellular Jail|Light (&|and) Sound Show — (Hindi|English)|Light & Sound Show$/i, 'PBL', 'CELL'], [/Corbyn/i, 'PBL', 'CORB'], [/Chidiya/i, 'PBL', 'CHID'], [/Munda/i, 'PBL', 'MUNDA'],
  [/Mount Harriet|Madhuban/i, 'PBL', 'MTH'], [/Anthropolog/i, 'PBL', 'ANTHRO'], [/Samudrika/i, 'PBL', 'SAMUD'], [/Fisheries/i, 'PBL', 'FISH'], [/Science Centre/i, 'PBL', 'SCI'],
  [/Chatham/i, 'PBL', 'CHAT'], [/Gandhi Park/i, 'PBL', 'GANDHI'], [/Marina Park/i, 'PBL', 'MARINA'], [/Sippighat/i, 'PBL', 'SIPPI'], [/Baludera/i, 'PBL', 'BALU'],
  [/Jolly Buoy|Red Skin|Wandoor|Marine National Park/i, 'WAN', 'WAND'],
  [/Radhanagar/i, 'HAV', 'RADH'], [/Kalapathar/i, 'HAV', 'KALA'], [/Elephant Beach trek/i, 'HAV', 'ELTREK'], [/Elephant Beach|Game fishing|Barren|Dolphin|charter|Fishing with local/i, 'HAV', 'HAVJ'],
  [/Vijaynagar|Beach 5/i, 'HAV', 'VIJAY'], [/Scuba|Fun dive|Night dive|PADI|Specialty|Refresher|freediv|Snorkelling — Guided/i, 'HAV', 'B2'],
  [/Laxmanpur/i, 'NEI', 'LAXM'], [/Natural Bridge/i, 'NEI', 'NATB'], [/Bharatpur|Glass bottom boat — Neil/i, 'NEI', 'BHAR'], [/Sitapur/i, 'NEI', 'SITA'], [/Ramnagar/i, 'NEI', 'RAMNAGAR'],
  [/Dhani Nallah/i, 'RAN', 'DHANI'], [/Cuthbert/i, 'RAN', 'CUTHBERT'], [/Amkunj/i, 'RAN', 'AMKUNJ'], [/Morrice/i, 'RAN', 'MORRICE'], [/Panchavati/i, 'RAN', 'PANCH'],
  [/Karmatang/i, 'MAY', 'KARMA'], [/Avis|Interview/i, 'MAY', 'MAYAJ'],
  [/Kalipur/i, 'DIG', 'KALIPUR'], [/Saddle Peak|Lamiya/i, 'DIG', 'LAMIYA'], [/Alfred|Ramnagar/i, 'DIG', 'RAMDIG'], [/Shyamnagar|mud volcano/i, 'DIG', 'SHYAM'], [/Ross & Smith|Craggy/i, 'DIG', 'AERIAL'],
  [/Butler/i, 'LIT', 'BUTLER'], [/White Surf/i, 'LIT', 'WSURF'], [/Whisper/i, 'LIT', 'WWAVE'], [/Netaji/i, 'LIT', 'NETAJI'], [/Lighthouse/i, 'LIT', 'LIGHT']
];
const NO_CAB = /^ACV-(FISH-PERMIT|MEAL-|SHOP-|TOUR-|BOAT-BAR-CAVE|BOAT-PARROT|MANGROVE-BOAT-BAR|SPEED-)/;
function siteKey(a) {
  if (NO_CAB.test(a.id)) return null;
  const txt = `${a.n} — ${a.v} ${a.site || ''}`;
  for (const [re, z, key] of SITECAB) { if (z !== a.z) continue; if (re.test(txt)) return key; }
  return null;
}
function siteRoute(a, fromKey) { const key = siteKey(a); if (!key) return null; const z = a.z === 'WAN' ? 'PBL' : a.z;
  const from = fromKey || HUB[z]; if (from === key) return null; const f = placeRoute(from, key, z); return f ? Object.assign({key, from}, f) : null; }
function siteCabs(cart, evs, add) {
  const carrier = carrierPairs(cart); const done = new Set(); const fi = flightIn(); let airSite = false;
  // own wheels that day on that island: no cab suggestions
  const wheels = (z, d) => cart.some(r => r.kind === 'rent' && RENT[r.ref] && RENT[r.ref].z === z && r.date <= d && addD(r.date, r.days || 1) > d);
  evs.filter(e => e.kind === 'act' && !e.parts).forEach(e => {
    const a = ACT[e.it.ref]; if (S.dismissed['cab' + e.it.uid]) return;
    if (cart.some(o => o.for === e.it.uid)) return;                                  // already has its cab
    if (cart.some(o => carrier.has(e.it.uid + '|' + o.uid))) return;                 // rides on another booking (e.g. snorkel on the boat)
    if (RULES.some(r => isCarrierRule(r) && inList(r.a, a.id) && r.b.some(x => /^VEH/.test(x)))) return;   // the marine-park rule asks for this cab already
    const z = a.z === 'WAN' ? 'PBL' : a.z; const key = siteKey(a); if (!key) return; if (wheels(z, e.it.date)) return;
    // where are you coming from: the airport on landing morning, the jetty right after a ferry, else your hotel
    const dayEvs = evs.filter(x => x.it.date === e.it.date && x.kind !== 'stay' && x.e <= e.s && x !== e);
    const prev = dayEvs[dayEvs.length - 1]; const st0 = stayOn(cart, z, e.it.date, e.s % 1440 < 720) || stayOn(cart, z, e.it.date, false) || stayOn(cart, z, e.it.date, true); let fromKey = st0 ? hotelKey(HOT[st0.ref]) : HUB[z], fromTxt = st0 ? 'your hotel' : null;
    if (fi && fi.date === e.it.date && z === 'PBL' && e.s < dayIdx(fi.date) * 1440 + 720 && !cart.some(o => o.kind === 'cab' && !o.for && o.date === e.it.date && /^RT-IXZ-/.test(o.ref)) && (!prev || (prev.kind === 'veh' && /Airport/.test(prev.I.title.split(' → ')[0])))) { fromKey = 'IXZ'; fromTxt = 'the airport, with your bags'; airSite = true; }
    else if (prev && prev.kind === 'ferry' && prev.to === z && e.s - prev.e < 120) { fromKey = JKEY_TO(SAIL[prev.it.ref]); fromTxt = SAIL[prev.it.ref].toPt; }
    const sr = siteRoute(a, fromKey); if (!sr) return;
    const dk = e.it.date + sr.key + '@' + Math.floor(e.s / 120); if (done.has(dk)) return;
    const covered = evs.some(x => x.kind === 'veh' && x.it.date === e.it.date && rkeys(ROUTE[x.it.ref]).includes(sr.key) && x.e <= e.s + 30 && e.s - x.e <= 90);
    done.add(dk); if (covered) return;
    const r = sr.r, v = vehFor(r); const dest = sr.rev ? r.a : r.b, origin = fromTxt || (sr.rev ? r.b : r.a);
    const t0 = hm(Math.max(300, Math.floor((tm(e.it.t || a.t) - r.mins - 10 - (e.rep || 0)) / 5) * 5)); const tEnd = clock(e.e);
    const fix = []; const rev = sr.rev ? 1 : '';
    if (v.ret && fromKey !== 'IXZ') fix.push({label:`Return cab · ${inr(v.ret)}`, act:'quickadd', kind:'cab', ref:r.id, rev, ret:1, date:e.it.date, t:t0, for:e.it.uid});
    if (v.ow) { const back = placeRoute(sr.key, baseKey(cart, z, e.it.date, false), z);
      if (back && (!v.ret || fromKey === 'IXZ')) { const bv = vehFor(back.r); fix.push({label:`Both ways · ${inr(v.ow + bv.ow)}`, act:'quickadd', kind:'cab', ref:r.id, rev, date:e.it.date, t:t0, for:e.it.uid, ref2:back.r.id, rev2:back.rev ? 1 : '', t2:tEnd, back2:1}); }
      fix.push({label:`One way · ${inr(v.ow)}`, act:'quickadd', kind:'cab', ref:r.id, rev, date:e.it.date, t:t0, for:e.it.uid}); }
    fix.push({label:'I have transport', act:'dismiss', key:'cab' + e.it.uid});
    add(e.it.uid, {rule:4, sev:'soft', kind:'cab', title:`How will you get to ${dest.replace(/ \(.*\)$/, '')}?`, msg:`${v.c} from ${origin} takes about ${r.mins} min. Pickup at ${t0}.${v.ret && fromKey !== 'IXZ' ? ` Return includes ${r.wait} h waiting${e.e - e.s > r.wait * 60 ? `; your visit is ${durTxt(e.e - e.s)}, so extra waiting is paid to the driver` : ''}.` : ''}`, fix});
  });
  // two cabs to the same place on the same day, because two plans moved together
  const cabs = cart.filter(c => c.kind === 'cab' && c.for && !c.back);
  cabs.forEach((c, i) => { const o = cabs.slice(0, i).find(x => x.ref === c.ref && x.date === c.date && Math.abs(tm(x.t) - tm(c.t)) < 180); if (!o || S.dismissed['dup' + c.uid]) return;
    add(c.uid, {rule:4, sev:'soft', title:'Two cabs to the same place', msg:`${info(o).title} already runs at ${o.t}. One cab can cover both plans.`, fix:[{label:'Use one cab', act:'del', uid:c.uid}, {label:'Keep both', act:'dismiss', key:'dup' + c.uid}]}); });
  return airSite;
}

/* ============ ART (generated postcards, no photos) ============ */
const ICONS = {
  ferry:'<path d="M3 16l2 4h14l2-4z"/><path d="M6 16v-5h12v5"/><path d="M9 11V8h6v3"/>',
  bed:'<path d="M3 18V7"/><path d="M3 14h18v4"/><path d="M21 18v-5a2 2 0 0 0-2-2h-8v3"/><circle cx="7" cy="11.5" r="1.6"/>',
  car:'<path d="M3 16v-4l2-5h14l2 5v4z"/><path d="M7 16v2M17 16v2M6 12h12"/>',
  mask:'<path d="M3 9h18v4.5a2.5 2.5 0 0 1-2.5 2.5H15l-1.6-2h-2.8L9 16H5.5A2.5 2.5 0 0 1 3 13.5z"/><path d="M19 9V5"/>',
  fish:'<path d="M3 12c3-4.5 8.5-5.5 12.5-2L20 7v10l-4.5-3C11.5 17.5 6 16.5 3 12z"/><circle cx="8" cy="11" r=".8"/>',
  kayak:'<path d="M2 15c5 3 15 3 20 0"/><path d="M6 5l12 13"/><path d="M4.5 3.5l3 3M16.5 16.5l3 3"/>',
  boat:'<path d="M3 15h18l-3 4H6z"/><path d="M12 15V4l6 9h-6"/>',
  leaf:'<path d="M5 19c8 0 14-6 14-14C11 5 5 11 5 19z"/><path d="M5 19l7-7"/>',
  camera:'<path d="M4 8h3l2-2h6l2 2h3v11H4z"/><circle cx="12" cy="13" r="3"/>',
  scooter:'<circle cx="6" cy="17" r="2"/><circle cx="18" cy="17" r="2"/><path d="M8 17h7l3-7h-3M13 10l-2 7"/>',
  wave:'<path d="M2 12c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2.5 5-1"/><path d="M2 17c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2.5 5-1"/>',
  plane:'<path d="M2 14l20-7-7 13-2.5-5.5z"/><path d="M12.5 14.5L22 7"/>'
};
const UI = {
  explore:'<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  trip:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>',
  ticket:'<path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z"/><path d="M14 6v12" stroke-dasharray="2 2"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  back:'<path d="M15 5l-7 7 7 7"/>',
  swap:'<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
  alert:'<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/>',
  check:'<path d="M4 12l5 5L20 6"/>',
  x:'<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
  bulb:'<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
  door:'<path d="M5 21V4h10v17"/><path d="M15 6h4v15H3"/><circle cx="12" cy="13" r=".8"/>',
  stamp:'<path d="M8 14h8l1 3H7z"/><path d="M12 14V9"/><circle cx="12" cy="6" r="3"/><path d="M5 20h14"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin:'<path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  chat:'<path d="M4 20l1.5-4A8 8 0 1 1 9 19.5z"/><path d="M9 10.5c.5 2 2 3.5 4.5 4.5l1.5-1.5"/>',
  wifioff:'<path d="M2 2l20 20"/><path d="M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5.2-2.7M19 13a10 10 0 0 0-2-1.5M2 9a15 15 0 0 1 4.5-2.7M22 9a15 15 0 0 0-10-4"/><circle cx="12" cy="20" r="1"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="currentColor" stroke="none"/>',
  cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  moon:'<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  qr:'<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2v2"/>',
  shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  store:'<path d="M4 9l1.5-5h13L20 9"/><path d="M4 9v11h16V9"/><path d="M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0"/>',
  table:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10"/>'
};
const ic = (n, s = 20, w = 1.8) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${UI[n] || ICONS[n]}</svg>`;


/* Generated seascapes: sky by time of day → far island with its own landmark → three water bands → shore → product badge.
   Every island has one motif you can recognise: the North Bay lighthouse on the ₹20 note, Havelock palms, Neil's natural bridge… */
/* ============ ILLUSTRATION SYSTEM (the brand: every picture is drawn from code, no photos) ============
   A sky by time of day, a sea, and one subject picked from what the product is (reef, hut, ferry, mangrove creek…).
   art(zone, icon, seed, opts) keeps the prototype's signature, so every card and page calls it the same way. */
const TODS = {
  dawn:{k:'dawn', far:'#9CC7C4', mid:'#5BA896', land:'#2F8468', dark:'#1E6152', sand:'#FAE8CB', wet:'#EDD2A8', foam:'#FFFFFF', cloud:'#FFF8EF', sun:'#FFF4D2', glint:'#FFE9C4', rock:'#A98C73', rockD:'#7E6652', wall:'#F3D9B4', roof:'#9A6240', wood:'#B9794B', win:'#5C7F8C'},
  day:{k:'day', far:'#86C9BD', mid:'#45AD80', land:'#2A9160', dark:'#1B6E4C', sand:'#FCEDCF', wet:'#EFD9AE', foam:'#FFFFFF', cloud:'#FFFFFF', sun:'#FFF7CF', glint:'#FFFFFF', rock:'#B0957C', rockD:'#84705C', wall:'#FBE9CC', roof:'#A66A43', wood:'#C4844F', win:'#3F7F93'},
  gold:{k:'gold', far:'#9A5E8C', mid:'#64457C', land:'#41316A', dark:'#2B214E', sand:'#F0B98D', wet:'#D99673', foam:'#FFE6C4', cloud:'#FFB7A0', sun:'#FFEDAF', glint:'#FFE3A3', rock:'#6A4A70', rockD:'#47325A', wall:'#E9A77E', roof:'#4A2F55', wood:'#6B4466', win:'#FFD98A'},
  night:{k:'night', far:'#22357A', mid:'#16265C', land:'#0F1B47', dark:'#0A1233', sand:'#3A4B80', wet:'#2C3B6E', foam:'#8CF5EA', cloud:'#2A3A78', sun:'#F6F1DC', glint:'#BFD3FF', rock:'#1A2659', rockD:'#101A40', wall:'#27386F', roof:'#0E173B', wood:'#1D2A5C', win:'#FFD98A'}
};
const SKYG = {dawn:['#F4A387', '#FFD0AE', '#FFF0DB'], day:['#38A8E4', '#8DD5F2', '#DFF5F6'], gold:['#3B3879', '#D15F7B', '#FFB661'], night:['#040A22', '#0D1A4C', '#28418B']};
const SEAG = {dawn:['#A6E0D5', '#4EB4B6', '#1E8096'], day:['#84E6D8', '#1BB4BF', '#097391'], gold:['#FFBE7C', '#C36489', '#463980'], night:['#2A4E98', '#112A63', '#060E31']};
const GLOW = {dawn:'#FFE7B8', day:'#FFFFFF', gold:'#FFC46B', night:'#BCD0FF'};
const ACC = ['#FF6B4A', '#FFC145', '#35C9C3', '#FF8FA3', '#7C6BF0'];   // boats, fish, canopies: the bright things
/* gradients are defined once for the whole page so thousands of pictures stay small */
function artDefs() {
  const lg = (id, c, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${c.map((x, i) => `<stop offset="${(i / (c.length - 1)).toFixed(2)}" stop-color="${x}"/>`).join('')}</linearGradient>`;
  let s = '';
  Object.keys(TODS).forEach(k => { s += lg(`g-${k}-sky`, SKYG[k]) + lg(`g-${k}-sea`, SEAG[k]) + `<radialGradient id="g-${k}-glow"><stop offset="0" stop-color="${GLOW[k]}" stop-opacity=".85"/><stop offset="1" stop-color="${GLOW[k]}" stop-opacity="0"/></radialGradient>`; });
  s += lg('g-uw-day', ['#8DEBDD', '#27AFC4', '#0C6C96', '#073F68']) + lg('g-uw-night', ['#1B4C9C', '#0B2260', '#040B2B']) + lg('g-ray', ['#FFFFFF', '#FFFFFF00']) + lg('g-fall', ['#FFFFFF', '#D9F6F5']);
  s += `<radialGradient id="g-map-sea" cx=".5" cy=".46" r=".75"><stop offset="0" stop-color="#2496B8"/><stop offset=".55" stop-color="#1A7EA2"/><stop offset="1" stop-color="#146C92"/></radialGradient>` + lg('g-map-land', ['#5CC48A', '#2F9467', '#1F7557'], .6, 1) + `<filter id="f-reef" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter><filter id="f-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2"/></filter>`;
  return `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>${s}</defs></svg>`;
}
const f1 = n => Math.round(n * 10) / 10;
function prng(seed) { let a = hash(String(seed)) || 1; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const smooth = pts => { let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`; for (let i = 1; i < pts.length - 1; i++) d += `Q${f1(pts[i][0])} ${f1(pts[i][1])} ${f1((pts[i][0] + pts[i + 1][0]) / 2)} ${f1((pts[i][1] + pts[i + 1][1]) / 2)}`; const L = pts[pts.length - 1]; return d + `L${f1(L[0])} ${f1(L[1])}`; };
/* ---- building blocks ---- */
function aSky(P, r, o = {}) {
  const k = P.k, hz = o.hz ?? 118;
  const sx = o.sx ?? (k === 'dawn' ? 56 + r() * 70 : k === 'gold' ? 186 + r() * 84 : k === 'night' ? 214 + r() * 70 : 60 + r() * 200);
  const sy = o.sy ?? (k === 'day' ? 28 + r() * 20 : k === 'night' ? 30 + r() * 18 : hz - 12 - r() * 12);
  let s = `<rect width="320" height="${hz + 2}" fill="url(#g-${k}-sky)"/>`;
  if (k === 'night') { for (let i = 0; i < 30; i++) s += `<circle cx="${f1(r() * 320)}" cy="${f1(r() * (hz - 10))}" r="${r() < .18 ? 1.2 : .65}" fill="#fff" opacity="${f1(.35 + r() * .65)}"/>`;
    s += `<circle cx="${f1(sx)}" cy="${f1(sy)}" r="30" fill="url(#g-night-glow)"/><circle cx="${f1(sx)}" cy="${f1(sy)}" r="10" fill="${P.sun}"/><circle cx="${f1(sx - 3)}" cy="${f1(sy - 2)}" r="2.2" fill="#D9D3BC"/><circle cx="${f1(sx + 3.5)}" cy="${f1(sy + 3)}" r="1.5" fill="#D9D3BC"/>`; }
  else s += `<circle cx="${f1(sx)}" cy="${f1(sy)}" r="${k === 'day' ? 34 : 50}" fill="url(#g-${k}-glow)"/><circle cx="${f1(sx)}" cy="${f1(sy)}" r="${k === 'day' ? 11 : 17}" fill="${P.sun}"/>`;
  if (o.clouds !== 0) { const n = k === 'day' ? 3 : 2; for (let i = 0; i < n; i++) { const cx = r() * 300, cy = 16 + r() * 46, w = 20 + r() * 26;
    s += `<g fill="${P.cloud}" opacity="${k === 'day' ? .92 : k === 'night' ? .5 : .6}"><ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(w)}" ry="${f1(w * .2)}"/><ellipse cx="${f1(cx - w * .3)}" cy="${f1(cy - w * .13)}" rx="${f1(w * .42)}" ry="${f1(w * .19)}"/><ellipse cx="${f1(cx + w * .26)}" cy="${f1(cy - w * .1)}" rx="${f1(w * .36)}" ry="${f1(w * .16)}"/></g>`; } }
  return {s, sx, sy, hz};
}
function aSea(P, r, sky, o = {}) {
  const hz = sky.hz; let s = `<rect y="${hz}" width="320" height="${200 - hz}" fill="url(#g-${P.k}-sea)"/>`;
  if (o.glint !== 0) for (let i = 0; i < 6; i++) { const y = hz + 5 + i * 9, w = 24 - i * 2.6 + r() * 6; s += `<path d="M${f1(sky.sx - w)} ${y}h${f1(w * 2)}" stroke="${P.glint}" stroke-width="${f1(1.4 + i * .4)}" stroke-linecap="round" opacity="${f1(.8 - i * .1)}"/>`; }
  for (let i = 0; i < 6; i++) { const x = r() * 300, y = hz + 8 + r() * 66, w = 10 + r() * 22; s += `<path d="M${f1(x)} ${f1(y)}h${f1(w)}" stroke="${P.foam}" stroke-width="1.2" stroke-linecap="round" opacity=".32"/>`; }
  return s;
}
function aIsle(r, x, w, base, amp, col, n = 6) { const pts = [[x, base]]; for (let i = 1; i < n; i++) { const t = i / n; pts.push([x + w * t, base - amp * Math.pow(Math.sin(Math.PI * t), .7) * (.55 + .45 * r())]); } pts.push([x + w, base]); return `<path d="${smooth(pts)}Z" fill="${col}"/>`; }
const aFar = (P, r, hz) => aIsle(r, -30 + r() * 60, 150 + r() * 70, hz + 1, 16 + r() * 10, P.far, 7) + aIsle(r, 170 + r() * 50, 120 + r() * 60, hz + 1, 10 + r() * 9, P.far, 6);
function aPalm(x, y, h, lean, P, s = 1) {
  const tx = x + lean, ty = y - h, L = h * .46; let o = `<path d="M${f1(x)} ${f1(y)}Q${f1(x + lean * .15)} ${f1(y - h * .62)} ${f1(tx)} ${f1(ty)}" stroke="${P.rockD}" stroke-width="${f1(3.4 * s)}" fill="none" stroke-linecap="round"/>`;
  [[-1, .34], [-.92, -.12], [-.5, -.6], [.1, -.78], [.62, -.52], [.98, -.08], [.95, .4]].forEach(([dx, dy], i) => { const ex = tx + dx * L, ey = ty + dy * L * .8 + L * .2, cx = tx + dx * L * .5, cy = ty + dy * L - L * .3;
    o += `<path d="M${f1(tx)} ${f1(ty)}Q${f1(cx)} ${f1(cy)} ${f1(ex)} ${f1(ey)}Q${f1(cx)} ${f1(cy + L * .3)} ${f1(tx)} ${f1(ty)}Z" fill="${i % 2 ? P.land : P.dark}"/>`; });
  return o + `<circle cx="${f1(tx)}" cy="${f1(ty + 1)}" r="${f1(2.2 * s)}" fill="${P.rockD}"/>`;
}
const aBush = (x, y, w, c1, c2) => `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(w)}" ry="${f1(w * .62)}" fill="${c1}"/><ellipse cx="${f1(x + w * .7)}" cy="${f1(y + w * .12)}" rx="${f1(w * .72)}" ry="${f1(w * .48)}" fill="${c2}"/><ellipse cx="${f1(x - w * .66)}" cy="${f1(y + w * .16)}" rx="${f1(w * .6)}" ry="${f1(w * .42)}" fill="${c2}"/>`;
function aShore(P, r, o = {}) { const y0 = o.y ?? 158; const d = `M-10 ${y0 + 8}C40 ${y0 - 12} 120 ${y0 - 14} 190 ${y0 + 6}S290 ${y0 + 20} 330 ${y0 + 4}`;
  return `<path d="${d}V210H-10Z" fill="${P.foam}" opacity=".55" transform="translate(0 -5)"/><path d="${d}V210H-10Z" fill="${P.wet}"/><path d="${d}V210H-10Z" fill="${P.sand}" transform="translate(0 6)"/>`; }
const aBirds = (r, n, c) => Array.from({length:n}, () => { const x = 40 + r() * 240, y = 22 + r() * 50, s = 3 + r() * 3; return `<path d="M${f1(x - s)} ${f1(y)}q${f1(s / 2)} ${f1(-s * .7)} ${f1(s)} 0q${f1(s / 2)} ${f1(-s * .7)} ${f1(s)} 0" stroke="${c}" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".7"/>`; }).join('');
function aFerry(x, y, L, P, col) { const lit = P.k === 'night' || P.k === 'gold';
  return `<g><path d="M${f1(x - L * .5)} ${y + 3}h${f1(L * .44)}" stroke="${P.foam}" stroke-width="2" stroke-linecap="round" opacity=".7"/><path d="M${f1(x - L * .62)} ${y + 7}h${f1(L * .5)}" stroke="${P.foam}" stroke-width="1.4" stroke-linecap="round" opacity=".45"/>
    <path d="M${f1(x)} ${y - 7}h${f1(L)}l${f1(-L * .1)} 9h${f1(-L * .84)}Z" fill="#FFFFFF"/><path d="M${f1(x + L * .03)} ${y - 1}h${f1(L * .93)}l-2 3h${f1(-L * .88)}Z" fill="${col}"/>
    <rect x="${f1(x + L * .12)}" y="${y - 16}" width="${f1(L * .66)}" height="9" rx="2" fill="#F4F8F9"/><rect x="${f1(x + L * .24)}" y="${y - 22}" width="${f1(L * .36)}" height="6.5" rx="2" fill="#FFFFFF"/>
    ${Array.from({length:6}, (_, i) => `<rect x="${f1(x + L * .16 + i * L * .1)}" y="${y - 13.5}" width="${f1(L * .06)}" height="3.4" rx=".8" fill="${lit ? '#FFD98A' : '#2F6F86'}"/>`).join('')}
    <path d="M${f1(x + L * .5)} ${y - 22}v-8" stroke="#DDE7EA" stroke-width="1.2"/><path d="M${f1(x + L * .5)} ${y - 30}h7l-2 2.2 2 2.2h-7z" fill="${col}"/></g>`; }
function aBoat(x, y, L, P, col, canopy = true) { return `<g><path d="M${f1(x - 8)} ${y + 4}h${f1(L + 16)}" stroke="${P.foam}" stroke-width="1.5" stroke-linecap="round" opacity=".55"/><path d="M${f1(x)} ${y - 5}q${f1(L / 2)} 11 ${f1(L)} 0l${f1(-L * .1)} 7h${f1(-L * .8)}Z" fill="${col}"/><path d="M${f1(x + 2)} ${y - 4.4}q${f1(L / 2 - 2)} 3 ${f1(L - 4)} 0" stroke="#fff" stroke-width="1.3" fill="none" opacity=".8"/>
    ${canopy ? `<path d="M${f1(x + L * .24)} ${y - 4}v-10M${f1(x + L * .76)} ${y - 4}v-10" stroke="${P.rockD}" stroke-width="1.2"/><path d="M${f1(x + L * .16)} ${y - 13}q${f1(L * .34)} -6 ${f1(L * .68)} 0v2.4h${f1(-L * .68)}Z" fill="#FFFFFF"/><circle cx="${f1(x + L * .4)}" cy="${y - 6.5}" r="2" fill="${P.rockD}"/><circle cx="${f1(x + L * .58)}" cy="${y - 6.5}" r="2" fill="${P.rockD}"/>` : ''}</g>`; }
const aGlow = (r, n, x0, x1, y0, y1) => Array.from({length:n}, () => `<circle cx="${f1(x0 + r() * (x1 - x0))}" cy="${f1(y0 + r() * (y1 - y0))}" r="${f1(.6 + r() * 1.5)}" fill="#7DF9EC" opacity="${f1(.35 + r() * .65)}"/>`).join('');

/* ---- scenes ---- */
const SCENES = {
  beach(P, r, o) { const sky = aSky(P, r), flip = r() < .5; const hz = sky.hz;
    return sky.s + aFar(P, r, hz) + aSea(P, r, sky) + `<g ${flip ? 'transform="translate(320 0) scale(-1 1)"' : ''}>${aShore(P, r)}${aBush(18, 150, 20, P.dark, P.land)}${aPalm(36, 166, 88, 34, P)}${aPalm(14, 172, 66, 20, P, .9)}${o.extra || ''}${r() < .5 ? `<g transform="translate(206 176) rotate(-8)">${aBoat(0, 0, 44, P, ACC[Math.floor(r() * 3)], false)}</g>` : `<path d="M226 186l10-26 10 26z" fill="${ACC[0]}"/><path d="M236 160v30" stroke="${P.rockD}" stroke-width="1.4"/><path d="M222 186h28" stroke="${P.wet}" stroke-width="3" stroke-linecap="round"/>`}</g>${P.k === 'night' ? aGlow(r, 26, 60, 320, 150, 170) : aBirds(r, 2, P.dark)}`; },
  stay(P, r, o) { const sky = aSky(P, r, {hz:112}), hz = sky.hz, lit = P.k === 'night' || P.k === 'gold', tier = o.tier || 'Standard'; const win = lit ? '#FFD98A' : P.win;
    const hut = (x, y, w) => { const h = w * .46; return `<path d="M${x + 5} ${y}v-9M${x + w - 5} ${y}v-9M${x + w / 2} ${y}v-9" stroke="${P.rockD}" stroke-width="2.4"/><rect x="${x - 4}" y="${y - 11}" width="${w + 8}" height="3.4" rx="1.2" fill="${P.wood}"/><rect x="${x}" y="${f1(y - 11 - h)}" width="${w}" height="${f1(h)}" fill="${P.wall}"/><rect x="${f1(x + w * .14)}" y="${f1(y - 11 - h * .72)}" width="${f1(w * .22)}" height="${f1(h * .44)}" rx="1.5" fill="${win}"/><rect x="${f1(x + w * .58)}" y="${f1(y - 11 - h * .78)}" width="${f1(w * .22)}" height="${f1(h * .78)}" rx="1.5" fill="${P.wood}"/><path d="M${x - 9} ${f1(y - 9 - h)}L${f1(x + w / 2)} ${f1(y - 14 - h - w * .4)}L${x + w + 9} ${f1(y - 9 - h)}Z" fill="${P.roof}"/><path d="M${x - 9} ${f1(y - 9 - h)}h${w + 18}" stroke="${P.rockD}" stroke-width="2" opacity=".5"/>`; };
    const villa = (x, y) => `<rect x="${x}" y="${y - 44}" width="96" height="44" rx="2" fill="${P.wall}"/><rect x="${x - 6}" y="${y - 50}" width="108" height="7" rx="2" fill="${P.roof}"/><rect x="${x + 20}" y="${y - 68}" width="56" height="20" rx="2" fill="${P.wall}"/><rect x="${x + 14}" y="${y - 73}" width="68" height="6" rx="2" fill="${P.roof}"/>${[8, 38, 68].map(dx => `<rect x="${x + dx}" y="${y - 36}" width="22" height="28" rx="1.5" fill="${win}"/>`).join('')}<rect x="${x + 30}" y="${y - 63}" width="36" height="11" rx="1.5" fill="${win}"/><rect x="${x - 26}" y="${y + 6}" width="150" height="14" rx="7" fill="${P.k === 'night' ? '#3BD6D0' : '#6FE3DA'}" opacity=".95"/><path d="M${x - 14} ${y + 11}h34M${x + 44} ${y + 15}h40" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>`;
    const body = /Premium|Luxury/.test(tier) ? villa(112, 150) + aPalm(86, 168, 84, -22, P) + aPalm(238, 162, 74, 24, P) : /Deluxe/.test(tier) ? hut(70, 160, 72) + hut(170, 152, 64) + aPalm(52, 170, 82, -18, P) + aPalm(262, 162, 78, 20, P) : hut(118, 158, 84) + aPalm(86, 170, 86, -26, P) + aPalm(236, 166, 70, 22, P, .9);
    return sky.s + aFar(P, r, hz) + aSea(P, r, sky) + `<path d="M-10 142C60 128 130 132 200 138S300 130 330 134V210H-10Z" fill="${P.wet}"/><path d="M-10 148C60 134 130 138 200 144S300 136 330 140V210H-10Z" fill="${P.sand}"/>` + aBush(20, 156, 24, P.dark, P.land) + aBush(300, 150, 22, P.land, P.dark) + body + (lit ? `<circle cx="160" cy="118" r="60" fill="url(#g-gold-glow)" opacity=".25"/>` : ''); },
  ferry(P, r) { const sky = aSky(P, r, {hz:122}), hz = sky.hz; return sky.s + aFar(P, r, hz) + aIsle(r, 190, 170, hz + 1, 30, P.mid, 7) + aSea(P, r, sky) + aFerry(74 + r() * 30, 150, 150, P, ACC[0]) + aBirds(r, 3, P.dark); },
  boat(P, r, o) { const sky = aSky(P, r, {hz:120}), hz = sky.hz; const c = ACC[Math.floor(r() * 3)];
    return sky.s + aFar(P, r, hz) + aIsle(r, -20, 190, hz + 1, 34, P.mid, 7) + `<g opacity=".95">${aPalm(40, hz - 14, 26, 6, P, .5)}${aPalm(70, hz - 20, 30, -5, P, .5)}</g>` + aSea(P, r, sky) + `<path d="M-10 ${hz + 6}q80 -9 170 0" stroke="${P.sand}" stroke-width="4" fill="none" stroke-linecap="round"/>` + (o.sail ? `<g><path d="M176 154q30 12 60 0l-6 9h-48z" fill="#fff"/><path d="M206 152V98" stroke="${P.rockD}" stroke-width="1.6"/><path d="M208 100q26 22 28 50h-28z" fill="${c}"/><path d="M204 106q-18 20 -22 44h22z" fill="#FFFFFF"/></g>` : `<g transform="translate(150 158)">${aBoat(0, 0, 78, P, c)}</g>`) + (o.rods ? `<path d="M168 150l-22-30M214 150l26-32" stroke="${P.rockD}" stroke-width="1.2" fill="none"/><path d="M146 120v22M240 118v26" stroke="${P.foam}" stroke-width=".6" opacity=".8"/>` : '') + aBirds(r, 2, P.dark); },
  reef(P, r, o) { const night = P.k === 'night', surf = o.surface ? 38 : 0; const cc = ['#FF7A66', '#FFB84D', '#FF9EB5', '#B58CFF', '#4FE0C8'];
    const coral = (x, y, h, c) => `<g stroke="${c}" stroke-width="${f1(h * .16)}" stroke-linecap="round" fill="none"><path d="M${x} ${y}v${-h}M${x} ${f1(y - h * .45)}q${f1(-h * .4)} ${f1(-h * .1)} ${f1(-h * .42)} ${f1(-h * .5)}M${x} ${f1(y - h * .3)}q${f1(h * .42)} ${f1(-h * .08)} ${f1(h * .46)} ${f1(-h * .46)}M${x} ${f1(y - h * .7)}q${f1(h * .2)} ${f1(-h * .1)} ${f1(h * .22)} ${f1(-h * .32)}"/></g>`;
    const fan = (x, y, w, c) => `<path d="M${x - w} ${y}a${w} ${f1(w * 1.1)} 0 0 1 ${w * 2} 0z" fill="${c}" opacity=".9"/><path d="M${x} ${y}v${f1(-w)}M${x} ${y}l${f1(-w * .6)} ${f1(-w * .7)}M${x} ${y}l${f1(w * .6)} ${f1(-w * .7)}" stroke="#fff" stroke-width="1" opacity=".45"/>`;
    const fish = (x, y, s, c, dir = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${dir * s} ${s})"><ellipse rx="6" ry="3.4" fill="${c}"/><path d="M-5 0l-5-4v8z" fill="${c}"/><circle cx="3.2" cy="-.8" r=".8" fill="#0B2A35"/></g>`;
    let s = `<rect width="320" height="200" fill="url(#g-uw-${night ? 'night' : 'day'})"/>`;
    if (surf) { const sk = aSky(P, r, {hz:surf, sy:16, clouds:0}); s += sk.s + `<path d="M0 ${surf}q20 -4 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0V${surf + 8}H0z" fill="${night ? '#1B4C9C' : '#8DEBDD'}"/>`; }
    for (let i = 0; i < 4; i++) { const x = 30 + i * 70 + r() * 30; s += `<path d="M${f1(x)} ${surf}l${f1(-30 - r() * 20)} 170h${f1(34 + r() * 20)}z" fill="url(#g-ray)" opacity="${night ? .05 : .16}"/>`; }
    s += `<path d="M-10 172C40 158 90 166 140 170S240 156 330 168V210H-10Z" fill="${night ? '#0A1A4A' : '#0B5578'}"/><path d="M-10 184C50 172 110 180 170 182S270 172 330 180V210H-10Z" fill="${night ? '#060F33' : '#083F5E'}"/>`;
    s += coral(40, 182, 34, cc[0]) + coral(74, 188, 24, cc[2]) + fan(120, 186, 17, cc[3]) + `<ellipse cx="170" cy="184" rx="22" ry="11" fill="${cc[1]}"/><path d="M152 182q6 -6 12 0t12 0 12 0" stroke="#fff" stroke-width="1.2" fill="none" opacity=".5"/>` + coral(236, 186, 30, cc[4]) + fan(282, 190, 20, cc[0]) + coral(304, 184, 22, cc[1]);
    for (let i = 0; i < 3; i++) { const x = 20 + r() * 280, h = 16 + r() * 16; s += `<path d="M${f1(x)} 196q-6 ${f1(-h / 2)} 0 ${f1(-h)}t0 ${f1(-h * .6)}" stroke="${night ? '#1F6C7A' : '#2DBE8F'}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`; }
    const fx = 50 + r() * 60, fy = 96 + r() * 30; for (let i = 0; i < 7; i++) s += fish(fx + (i % 4) * 13 + r() * 6, fy + Math.floor(i / 4) * 10 + r() * 6, .7 + r() * .3, i % 3 ? cc[1] : '#FFFFFF');
    s += fish(250 + r() * 30, 130 + r() * 20, 1.5, cc[0], -1) + fish(210, 152, 1.1, cc[2], -1);
    if (o.who === 'diver') s += `<g transform="translate(${f1(150 + r() * 30)} ${f1(86 + r() * 14)}) rotate(-12)"><rect x="-4" y="-11" width="26" height="6" rx="3" fill="#FFC145"/><rect x="-8" y="-6" width="34" height="10" rx="5" fill="#12303A"/><circle cx="31" cy="-1" r="5.4" fill="#12303A"/><rect x="31" y="-4" width="6" height="5" rx="1.5" fill="#8DEBDD"/><path d="M-8 -1l-18 -5M-8 2l-18 6" stroke="#12303A" stroke-width="4" stroke-linecap="round"/><path d="M-26 -6l-9 -5v8zM-26 8l-9 6v-9z" fill="${cc[0]}"/><path d="M14 4l8 10" stroke="#12303A" stroke-width="3.4" stroke-linecap="round"/><circle cx="38" cy="-12" r="2.2" fill="#fff" opacity=".7"/><circle cx="42" cy="-22" r="3.2" fill="#fff" opacity=".5"/><circle cx="39" cy="-34" r="4.2" fill="#fff" opacity=".35"/></g>`;
    if (o.who === 'snorkel') s += `<g transform="translate(${f1(140 + r() * 40)} ${surf + 6})"><rect x="-10" y="-3" width="36" height="9" rx="4.5" fill="${cc[0]}"/><circle cx="30" cy="2" r="5" fill="#EFC09A"/><rect x="29" y="0" width="7" height="4.4" rx="1.4" fill="#12303A"/><path d="M33 0v-12" stroke="${cc[1]}" stroke-width="2" stroke-linecap="round"/><path d="M-10 1l-16 -2M-10 4l-16 5" stroke="#EFC09A" stroke-width="3" stroke-linecap="round"/><path d="M-26 -1l-8 -4v7zM-26 9l-8 5v-8z" fill="#12303A"/></g>`;
    if (o.who === 'walk') s += `<g transform="translate(${f1(150 + r() * 20)} 168)"><path d="M-4 0v-16M5 0v-16" stroke="#12303A" stroke-width="4" stroke-linecap="round"/><rect x="-8" y="-34" width="17" height="20" rx="5" fill="${cc[1]}"/><circle cx="0" cy="-42" r="10" fill="#E8F4F4" opacity=".92"/><circle cx="0" cy="-42" r="6.4" fill="#EFC09A"/><path d="M0 -52V-200" stroke="#E8F4F4" stroke-width="1.6" opacity=".8"/><circle cx="12" cy="-56" r="2.4" fill="#fff" opacity=".6"/><circle cx="16" cy="-70" r="3.4" fill="#fff" opacity=".4"/></g>`;
    if (o.who === 'glass') s += `<g transform="translate(96 ${surf})"><path d="M0 -8h120l-10 20H10z" fill="#FFFFFF"/><path d="M4 -1h112l-2 4H6z" fill="${cc[0]}"/><rect x="34" y="12" width="52" height="5" rx="2" fill="#8DEBDD" opacity=".9"/><path d="M36 17l-22 90h96l-22 -90z" fill="url(#g-ray)" opacity=".28"/><rect x="24" y="-20" width="72" height="12" rx="3" fill="#F4F8F9"/></g>`;
    if (night) s += aGlow(r, 30, 0, 320, 40, 190);
    return s; },
  kayak(P, r) { const sky = aSky(P, r, {hz:104}), hz = sky.hz, night = P.k === 'night';
    const mg = (x, y, w, c1, c2) => aBush(x, y - w * .5, w, c1, c2) + Array.from({length:5}, (_, i) => `<path d="M${f1(x - w + i * w * .5)} ${f1(y - w * .2)}q${f1((i - 2) * 3)} ${f1(w * .3)} ${f1((i - 2) * 6)} ${f1(w * .56)}" stroke="${P.rockD}" stroke-width="1.5" fill="none"/>`).join('');
    return sky.s + aIsle(r, -20, 360, hz + 2, 24, P.far, 8) + aSea(P, r, sky, {glint:night ? 1 : 0}) + `<g opacity=".28" transform="translate(0 ${hz * 2 + 20}) scale(1 -1)">${aBush(34, hz - 10, 44, P.dark, P.dark)}${aBush(292, hz - 6, 40, P.dark, P.dark)}</g>` + mg(34, hz + 16, 44, P.dark, P.land) + mg(-6, hz + 34, 36, P.land, P.dark) + mg(292, hz + 12, 40, P.land, P.dark) + mg(326, hz + 30, 34, P.dark, P.land)
      + `<g transform="translate(${f1(120 + r() * 30)} 160)"><path d="M-14 6h100" stroke="${P.foam}" stroke-width="1.6" stroke-linecap="round" opacity=".6"/><path d="M0 0q36 10 72 0q-36 -5 -72 0z" fill="${ACC[1]}"/><path d="M6 1q30 5 60 0" stroke="#fff" stroke-width="1.2" fill="none" opacity=".7"/><rect x="30" y="-17" width="11" height="17" rx="5" fill="${ACC[0]}"/><circle cx="35.5" cy="-22" r="5" fill="#EFC09A"/><path d="M12 -28l48 26" stroke="${P.rockD}" stroke-width="1.8" stroke-linecap="round"/><ellipse cx="11" cy="-28.6" rx="5" ry="2.6" transform="rotate(28 11 -28.6)" fill="${P.rockD}"/><ellipse cx="61" cy="-1.4" rx="5" ry="2.6" transform="rotate(28 61 -1.4)" fill="${P.rockD}"/></g>` + (night ? aGlow(r, 44, 70, 260, 150, 196) : aBirds(r, 2, P.dark)); },
  road(P, r, o) { const sky = aSky(P, r, {hz:96}), hz = sky.hz; const lit = P.k === 'night';
    const car = (x, y, c) => `<g transform="translate(${x} ${y})"><rect x="-17" y="-9" width="34" height="10" rx="4" fill="${c}"/><path d="M-10 -9q3 -8 10 -8h4q7 0 10 8z" fill="${c}"/><path d="M-6 -9.6q2 -5 6.4 -5h1v5zM4 -14.6h1.6q4.4 0 6.6 5H4z" fill="${lit ? '#FFD98A' : '#CFEFF2'}"/><circle cx="-9" cy="2" r="4.2" fill="#12303A"/><circle cx="10" cy="2" r="4.2" fill="#12303A"/><circle cx="-9" cy="2" r="1.6" fill="#DDE7EA"/><circle cx="10" cy="2" r="1.6" fill="#DDE7EA"/></g>`;
    const scoot = (x, y) => `<g transform="translate(${x} ${y}) scale(1.5)"><circle cx="-11" cy="0" r="5" fill="#12303A"/><circle cx="12" cy="0" r="5" fill="#12303A"/><circle cx="-11" cy="0" r="1.8" fill="#DDE7EA"/><circle cx="12" cy="0" r="1.8" fill="#DDE7EA"/><path d="M-14 -5h12l5 -11h4l3 12" stroke="${ACC[0]}" stroke-width="4.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="-15" y="-10" width="13" height="4" rx="2" fill="#12303A"/><path d="M5 -17h7" stroke="#12303A" stroke-width="2" stroke-linecap="round"/></g>`;
    return sky.s + aIsle(r, -40, 260, hz + 4, 40, P.far, 7) + `<rect y="${hz}" width="320" height="26" fill="url(#g-${P.k}-sea)"/>` + aIsle(r, 150, 220, hz + 26, 34, P.mid, 6)
      + `<path d="M-10 ${hz + 20}C60 ${hz + 4} 150 ${hz + 22} 330 ${hz + 14}V210H-10Z" fill="${P.land}"/><path d="M-10 150C80 132 200 150 330 138V210H-10Z" fill="${P.dark}" opacity=".55"/>`
      + `<path d="M96 210C120 176 250 170 214 146C190 132 150 134 176 ${hz + 18}h7C166 ${hz + 34} 208 132 240 148C286 172 176 184 190 210Z" fill="${lit ? '#2A3566' : '#56666C'}"/><path d="M143 206C160 180 268 168 226 146" stroke="#FFE9A8" stroke-width="1.6" stroke-dasharray="7 7" fill="none" opacity=".9"/>`
      + aPalm(52, 174, 72, 14, P) + aPalm(288, 168, 64, -18, P, .9) + aBush(24, 182, 26, P.dark, P.land) + (o.scooter ? scoot(150, 186) : car(212, 158, r() < .5 ? '#FFFFFF' : ACC[1])) + aBirds(r, 2, P.dark); },
  heritage(P, r, o) { const sky = aSky(P, r, {hz:130}), lit = P.k === 'night' || P.k === 'gold'; const win = lit ? '#FFD98A' : '#8A6B4C';
    if (o.lighthouse) { const hz = 120; const s2 = aSky(P, prng('lh' + P.k), {hz, sx:70});
      return s2.s + aFar(P, r, hz) + aSea(P, r, s2) + `<path d="M170 210C180 150 220 132 262 130S320 140 330 150V210Z" fill="${P.rock}"/><path d="M200 210C208 172 240 150 276 150S318 160 330 166V210Z" fill="${P.rockD}"/>${aBush(300, 138, 20, P.dark, P.land)}<path d="M238 132l5 -70h18l5 70z" fill="#FFFFFF"/><path d="M240.4 108h23.2l.9 12h-25zM242.2 84h19.6l.8 12h-21.2z" fill="${ACC[0]}"/><rect x="241" y="50" width="22" height="13" rx="2" fill="${lit ? '#FFE9A8' : '#CFEFF2'}"/><path d="M238 50h28l-14 -12z" fill="#12303A"/><rect x="237" y="61" width="30" height="3" fill="#12303A"/>${lit ? `<path d="M241 56L60 20v70z" fill="#FFE9A8" opacity=".22"/>` : ''}` + aBirds(r, 2, P.dark); }
    const arches = (x, y, n, w) => Array.from({length:n}, (_, i) => `<path d="M${f1(x + i * w)} ${y}v-7a${f1(w * .3)} ${f1(w * .3)} 0 0 1 ${f1(w * .6)} 0v7z" fill="${win}"/>`).join('');
    return sky.s + aIsle(r, -30, 400, 132, 26, P.far, 8) + `<rect y="128" width="320" height="80" fill="${P.land}"/><path d="M-10 168C90 150 230 150 330 168V210H-10Z" fill="${P.mid}"/><path d="M120 210C140 180 180 180 200 210Z" fill="${P.sand}"/>`
      + `<rect x="34" y="98" width="252" height="44" fill="${P.wall}"/><rect x="30" y="94" width="260" height="6" fill="${P.rock}"/>${arches(42, 114, 6, 15)}${arches(42, 134, 6, 15)}${arches(192, 114, 6, 15)}${arches(192, 134, 6, 15)}<path d="M34 120h252" stroke="${P.rock}" stroke-width="2"/>`
      + `<rect x="136" y="62" width="48" height="80" fill="${P.wall}"/><rect x="130" y="58" width="60" height="7" fill="${P.rock}"/><path d="M134 58h52l-8 -14h-36z" fill="${P.roof}"/><rect x="152" y="30" width="16" height="16" fill="${P.wall}"/><path d="M148 30h24l-12 -12z" fill="${P.roof}"/><path d="M160 18v-12" stroke="${P.rockD}" stroke-width="1.2"/><path d="M160 6h10l-2.4 3 2.4 3h-10z" fill="${ACC[0]}"/><circle cx="160" cy="80" r="6.5" fill="#FFFFFF"/><path d="M160 76v4l3 2" stroke="#12303A" stroke-width="1.2" fill="none"/><path d="M152 142v-22a8 8 0 0 1 16 0v22z" fill="${P.rockD}"/>${arches(141, 106, 3, 14)}`
      + aPalm(22, 160, 66, 8, P, .9) + aPalm(300, 160, 70, -10, P, .9) + (o.show ? `<path d="M40 200L150 20h30z" fill="#FFE9A8" opacity=".2"/><path d="M280 200L140 30h30z" fill="#7DF9EC" opacity=".16"/>` : ''); },
  forest(P, r, o) { const sky = aSky(P, r, {hz:150}); const tree = (x, y, h, c) => `<path d="M${f1(x)} ${f1(y - h)}l${f1(h * .34)} ${f1(h * .8)}h${f1(-h * .68)}z" fill="${c}"/><path d="M${f1(x)} ${f1(y)}v${f1(-h * .3)}" stroke="${P.rockD}" stroke-width="1.6"/>`;
    let s = sky.s + `<path d="${smooth([[-10, 150], [40, 92], [84, 110], [130, 58], [170, 84], [214, 70], [262, 112], [330, 92]])}V210H-10Z" fill="${P.far}"/><path d="M130 58l-14 20 10 -3 6 8 8 -9 9 4z" fill="#fff" opacity="${P.k === 'night' ? .15 : .5}"/>`
      + `<path d="${smooth([[-10, 150], [50, 120], [110, 138], [170, 108], [240, 132], [330, 112]])}V210H-10Z" fill="${P.mid}"/><path d="${smooth([[-10, 176], [60, 150], [140, 168], [220, 146], [330, 162]])}V210H-10Z" fill="${P.land}"/>`;
    for (let i = 0; i < 9; i++) { const x = 10 + i * 36 + r() * 16; s += tree(x, 164 + Math.sin(x / 40) * 8 + r() * 8, 26 + r() * 20, i % 2 ? P.dark : P.mid); }
    s += `<path d="M150 204C170 182 132 172 160 152S150 124 172 110" stroke="${P.sand}" stroke-width="2.6" stroke-dasharray="1 6" stroke-linecap="round" fill="none"/>` + aBush(26, 192, 30, P.dark, P.land) + aBush(296, 194, 28, P.dark, P.land);
    if (o.birds) s += `<g transform="translate(236 78)"><ellipse rx="9" ry="6" fill="${ACC[2]}"/><circle cx="8" cy="-5" r="4.6" fill="${ACC[2]}"/><path d="M12 -5l6 1.6-6 1.6z" fill="${ACC[1]}"/><path d="M-8 0l-10 4 9 2z" fill="${ACC[0]}"/><circle cx="9.4" cy="-6" r=".9" fill="#12303A"/><path d="M-30 12h60" stroke="${P.rockD}" stroke-width="2.4" stroke-linecap="round"/></g>`;
    return s + aBirds(r, 3, P.dark); },
  volcano(P, r) { const sky = aSky(P, r, {hz:124, sx:60}), hz = sky.hz; const c = P.k === 'night' ? '#141C45' : P.k === 'gold' ? '#3A2A52' : '#5B4A44';
    return sky.s + `<g opacity=".8" fill="${P.k === 'day' ? '#C9D3D6' : P.cloud}"><circle cx="172" cy="52" r="15"/><circle cx="192" cy="36" r="19"/><circle cx="220" cy="24" r="23"/><circle cx="256" cy="18" r="27"/><circle cx="296" cy="20" r="30"/></g>` + aSea(P, r, sky)
      + `<path d="M56 ${hz + 2}C100 ${hz - 6} 132 82 150 66q12 -8 24 0C194 84 232 ${hz - 8} 280 ${hz + 2}Z" fill="${c}"/><path d="M150 66q12 -8 24 0l-4 12 -8 -5 -7 8z" fill="${ACC[0]}"/><path d="M158 74l-10 34M168 78l8 30" stroke="${ACC[1]}" stroke-width="1.6" opacity=".7"/><path d="M104 ${hz}C120 ${hz - 12} 132 108 140 96M226 ${hz}C212 ${hz - 10} 200 110 190 96" stroke="#fff" stroke-width="1.2" fill="none" opacity=".18"/><circle cx="162" cy="62" r="20" fill="url(#g-gold-glow)" opacity=".7"/>` + `<g transform="translate(40 166)">${aBoat(0, 0, 60, P, '#FFFFFF')}</g>`; },
  cave(P, r) { const sky = aSky(P, r, {hz:120, sx:160, sy:60, clouds:0}), hz = sky.hz; const dk = P.k === 'night' ? '#060B22' : '#14262E', dk2 = P.k === 'night' ? '#0C1438' : '#1F3A44';
    return sky.s + aIsle(r, 60, 220, hz + 2, 30, P.mid, 6) + aSea(P, r, sky) + aBush(96, hz + 4, 22, P.dark, P.land) + aBush(226, hz + 2, 24, P.land, P.dark) + `<g transform="translate(134 150)">${aBoat(0, 0, 54, P, ACC[1])}</g>`
      + `<path fill-rule="evenodd" d="M0 0H320V200H0ZM58 200C40 150 50 84 96 54C128 34 196 32 232 56C276 86 280 150 262 200Z" fill="${dk2}"/><path fill-rule="evenodd" d="M0 0H320V200H0ZM40 200C16 140 34 66 86 40C126 18 204 18 244 44C292 74 304 146 280 200Z" fill="${dk}"/>`
      + [[92, 40, 26], [124, 26, 34], [150, 22, 20], [182, 24, 40], [214, 32, 24], [240, 46, 18]].map(([x, y, h]) => `<path d="M${x - 7} ${y}q7 ${h * .5} 7 ${h}q0 ${-h * .5} 7 ${-h}z" fill="${dk}"/>`).join('') + `<path d="M50 200q10 -22 22 0zM246 200q8 -30 20 0z" fill="${dk2}"/>`; },
  arch(P, r) { const sky = aSky(P, r, {hz:116}), hz = sky.hz;
    return sky.s + aFar(P, r, hz) + aSea(P, r, sky) + `<path d="M-10 170C60 158 160 166 330 156V210H-10Z" fill="${P.rockD}"/><ellipse cx="70" cy="184" rx="26" ry="6" fill="${SEAG[P.k][0]}" opacity=".8"/><ellipse cx="250" cy="178" rx="20" ry="5" fill="${SEAG[P.k][0]}" opacity=".8"/>`
      + `<path fill-rule="evenodd" d="M70 176C66 120 92 70 150 62S262 82 276 122C284 146 280 164 282 172ZM124 174C118 138 136 108 166 104S226 120 232 172Z" fill="${P.rock}"/><path d="M70 176C66 120 92 70 150 62q-40 24 -44 112z" fill="${P.rockD}" opacity=".5"/>` + aBush(140, 62, 24, P.dark, P.land) + aBush(206, 72, 20, P.land, P.dark) + aBush(250, 100, 14, P.dark, P.land) + aBirds(r, 3, P.dark); },
  sandbar(P, r) { const k = P.k, c = SEAG[k]; const isl = (x, y, w) => `<ellipse cx="${x}" cy="${y}" rx="${w * 1.5}" ry="${w * .9}" fill="${c[0]}" opacity=".55"/><ellipse cx="${x}" cy="${y}" rx="${w * 1.18}" ry="${w * .66}" fill="${P.sand}"/>${aBush(x, y - w * .12, w * .62, P.land, P.dark)}`;
    return `<rect width="320" height="200" fill="url(#g-${k}-sea)" transform="rotate(180 160 100)"/><path d="M70 62C130 96 150 92 176 112S226 140 252 146" stroke="${c[0]}" stroke-width="38" stroke-linecap="round" fill="none" opacity=".5"/><path d="M70 62C130 96 150 92 176 112S226 140 252 146" stroke="${P.sand}" stroke-width="11" stroke-linecap="round" fill="none"/>` + isl(64, 56, 34) + isl(256, 148, 30) + aPalm(52, 50, 30, 6, P, .55) + aPalm(262, 142, 28, -6, P, .55) + `<g transform="translate(206 62) rotate(14)">${aBoat(0, 0, 40, P, ACC[0], false)}</g>` + Array.from({length:6}, () => `<path d="M${f1(r() * 300)} ${f1(r() * 190)}h${f1(8 + r() * 14)}" stroke="#fff" stroke-width="1.1" stroke-linecap="round" opacity=".3"/>`).join('') + (k === 'night' ? aGlow(r, 30, 80, 250, 60, 150) : ''); },
  waterfall(P, r) { const sky = aSky(P, r, {hz:70, clouds:0});
    return sky.s + `<path d="M-10 60C60 30 120 44 160 34S270 30 330 52V210H-10Z" fill="${P.mid}"/><path d="M112 40h96l14 130H98z" fill="${P.rock}"/><path d="M112 40h30l-12 130H98z" fill="${P.rockD}" opacity=".5"/><path d="M142 42h36l8 122h-52z" fill="url(#g-fall)"/><path d="M150 50v108M160 46v114M170 52v106" stroke="${P.k === 'night' ? '#9FB6FF' : '#BFEDEC'}" stroke-width="1.6" opacity=".7"/>`
      + `<ellipse cx="160" cy="176" rx="96" ry="20" fill="${SEAG[P.k][1]}"/><ellipse cx="160" cy="166" rx="34" ry="9" fill="#fff" opacity=".7"/><circle cx="136" cy="162" r="9" fill="#fff" opacity=".4"/><circle cx="186" cy="160" r="11" fill="#fff" opacity=".35"/>`
      + aBush(40, 110, 46, P.dark, P.land) + aBush(284, 104, 48, P.land, P.dark) + aBush(20, 168, 40, P.land, P.dark) + aBush(304, 170, 40, P.dark, P.land) + aPalm(70, 150, 70, -20, P) + aPalm(252, 148, 66, 22, P); },
  sport(P, r, o) { const sky = aSky(P, r, {hz:124}), hz = sky.hz;
    const para = `<g><path d="M150 40a44 30 0 0 1 88 0q-11 -8 -22 0q-11 -8 -22 0q-11 -8 -22 0q-11 -8 -22 0z" fill="${ACC[0]}"/><path d="M172 40a22 30 0 0 1 22 -30a22 30 0 0 1 22 30q-11 -8 -22 0q-11 -8 -22 0z" fill="${ACC[1]}"/><path d="M150 40l42 52M238 40l-42 52M194 40v52" stroke="${P.rockD}" stroke-width=".8" opacity=".7"/><rect x="190" y="90" width="8" height="12" rx="3" fill="${ACC[2]}"/><circle cx="194" cy="87" r="3.4" fill="#EFC09A"/><path d="M194 102L96 152" stroke="${P.rockD}" stroke-width=".7" opacity=".6"/></g><g transform="translate(52 156)">${aBoat(0, 0, 52, P, '#FFFFFF', false)}</g>`;
    const jet = `<g transform="translate(150 160)"><path d="M-60 6q20 -22 44 -8M-70 12q30 -34 60 -12" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".8"/><path d="M-22 4q30 12 66 -4l-12 -9h-40z" fill="${ACC[1]}"/><path d="M-10 -5h30l-6 -9h-14z" fill="#12303A"/><rect x="-2" y="-28" width="10" height="17" rx="4.5" transform="rotate(14 3 -20)" fill="${ACC[0]}"/><circle cx="9" cy="-33" r="5" fill="#EFC09A"/><path d="M8 -22l14 8" stroke="${ACC[0]}" stroke-width="3.4" stroke-linecap="round"/><path d="M-30 10h90" stroke="${P.foam}" stroke-width="1.8" stroke-linecap="round" opacity=".7"/></g>`;
    return sky.s + aFar(P, r, hz) + aIsle(r, 200, 160, hz + 1, 26, P.mid, 6) + aSea(P, r, sky) + (o.para ? para : jet) + aBirds(r, 2, P.dark); },
  nightbeach(P, r, o) { const sky = aSky(P, r, {hz:112, sx:250, sy:34}), hz = sky.hz;
    let s = sky.s + `<path d="M-20 70C60 20 180 10 340 60" stroke="#BFD3FF" stroke-width="26" fill="none" opacity=".08"/>` + aFar(P, r, hz) + aSea(P, r, sky) + aShore(P, r, {y:150}) + aGlow(r, 50, 0, 320, 142, 160) + aPalm(288, 168, 86, -34, P) + aPalm(306, 174, 62, -18, P, .9);
    if (o.turtle) s += `<g transform="translate(120 178)"><ellipse rx="20" ry="12" fill="#2F8468"/><path d="M-12 -6l8 6 -8 6M0 -11v22M10 -7l-6 7 6 7" stroke="#7BD0A6" stroke-width="1.2" fill="none"/><ellipse cx="25" cy="-2" rx="7" ry="5" fill="#3E9B7B"/><circle cx="28" cy="-3.4" r=".9" fill="#040A22"/><path d="M-14 -9l-12 -7 4 10zM-14 9l-12 8 4 -11zM12 -10l8 -9 2 9zM12 10l8 9 2 -9z" fill="#3E9B7B"/><path d="M-30 4h-34M-28 10h-26" stroke="${P.wet}" stroke-width="1.6" stroke-linecap="round" opacity=".8"/></g>`;
    else s += `<g transform="translate(96 172)"><path d="M0 0l10 -24M20 0l-10 -24M10 0v-24" stroke="#040A22" stroke-width="1.6"/><rect x="-4" y="-34" width="34" height="8" rx="4" transform="rotate(-28 10 -30)" fill="#040A22"/><rect x="44" y="-22" width="9" height="22" rx="4" fill="#040A22"/><circle cx="48.5" cy="-27" r="4.4" fill="#040A22"/></g>`;
    return s; }
};
/* which picture a product gets */
const ZSCENE = {PBL:['heritage', {lighthouse:1}], HAV:['beach', {}], NEI:['arch', {}], WAN:['reef', {surface:1, who:'snorkel'}], BAR:['cave', {}], RAN:['kayak', {}], LON:['boat', {}], MAY:['nightbeach', {turtle:1}], DIG:['sandbar', {tod:'day'}], LIT:['waterfall', {}]};
function sceneFor(zone, icon, seed) {
  const id = String(seed || '');
  if (/^HTL-/.test(id)) return ['stay', {tier:(HOT[id] && HOT[id].t) || ['Standard', 'Deluxe', 'Budget'][hash(id) % 3]}];
  if (/^RT-/.test(id) || icon === 'car') return ['road', {}];
  if (/^RN-/.test(id) || icon === 'scooter') return ['road', {scooter:1}];
  if (/^SAIL|ferry/.test(id) || icon === 'ferry') return ['ferry', {}];
  if (/BARREN/.test(id)) return ['volcano', {}];
  if (/NIGHT|STARGAZE|TURTLE/.test(id) && !/KAYAK|FUN|SPEC/.test(id)) return ['nightbeach', {turtle:/TURTLE/.test(id), tod:'night'}];
  if (/KAYAK|SUP|MANGROVE|DHANI|YERRATA/.test(id)) return ['kayak', /NIGHT/.test(id) ? {tod:'night'} : /SUNSET/.test(id) ? {tod:'gold'} : /SUNRISE/.test(id) ? {tod:'dawn'} : {}];
  if (/DSD|FUN-|PADI|SPEC-|FREEDIVE|REFRESH|adv(scuba)/.test(id)) return ['reef', {who:'diver', tod:/NIGHT/.test(id) ? 'night' : 'day'}];
  if (/SEAWALK|SNUBA/.test(id)) return ['reef', {who:'walk', tod:'day'}];
  if (/GBB|SEMISUB|CORALSAFARI/.test(id)) return ['reef', {who:'glass', surface:1, tod:'day'}];
  if (/SNK|advsnork|SAMUDRIKA|FISHERIES/.test(id)) return ['reef', {who:/SNK|adv/.test(id) ? 'snorkel' : '', surface:/SNK|adv/.test(id) ? 1 : 0, tod:'day'}];
  if (/ROSSSMITH|AVIS|GUITAR|MERK|LALAJI/.test(id)) return ['sandbar', {tod:'day'}];
  if (/CAVE|BARATANG|ALFRED|MUD/.test(id)) return ['cave', {}];
  if (/NATBRIDGE|MORRICE|KALAPATHAR|INTERTIDAL/.test(id)) return ['arch', {}];
  if (/WATERFALL|WHITESURF|WHISP/.test(id)) return ['waterfall', {}];
  if (/PARASAIL/.test(id)) return ['sport', {para:1, tod:'day'}];
  if (/JETSKI|BANANA|SOFA|SPEEDBOAT|SEAKART|SURF|BUTLER|advwater/.test(id)) return ['sport', {tod:'day'}];
  if (/FISH|advfish/.test(id)) return ['boat', {rods:1}];
  if (/CRUISE|SUNSET-HAV|CHARTER|PARTYBOAT|DOLPHIN/.test(id)) return ['boat', {sail:1, tod:/SUNSET|DINNER|PARTY/.test(id) ? 'gold' : undefined}];
  if (/BOAT|TOUR-JOLLY|SPEED-|advboats/.test(id)) return /PARROT/.test(id) ? ['kayak', {tod:'gold'}] : ['boat', {}];
  if (/LIGHTHOUSE/.test(id)) return ['heritage', {lighthouse:1}];
  if (/SHOW|ROSS-LS/.test(id)) return ['heritage', {show:1, tod:'night'}];
  if (/JAIL|MUSEUM|ANTHRO|CHATHAM|BUNKER|SCIENCE|SAGARIKA|GANDHI|MINIZOO|advtours|advplaces/.test(id)) return ['heritage', {}];
  if (/BIRD/.test(id)) return ['forest', {birds:1}];
  if (/TREK|WALK|NATURE|VILLAGE|SADDLE|HARRIET|advnature|advtrek/.test(id)) return ['forest', {}];
  if (/advnight/.test(id)) return ['nightbeach', {tod:'night'}];
  if (/CHIDIYA|LAXMANPUR/.test(id)) return ['beach', {tod:'gold'}];
  if (/SITAPUR/.test(id)) return ['beach', {tod:'dawn'}];
  if (/^ENT-/.test(id)) return ['beach', {}];
  if (/^P\d+$/.test(id)) return [{P1:'beach', P2:'stay', P3:'stay', P4:'heritage', P5:'reef', P6:'forest', P7:'heritage', P8:'sport', P9:'arch', P10:'sandbar'}[id] || 'beach', id === 'P10' ? {tod:'day'} : id === 'P5' ? {who:'diver', tod:'day'} : id === 'P3' ? {tier:'Luxury'} : id === 'P2' ? {tier:'Deluxe', tod:'gold'} : id === 'P4' ? {lighthouse:1} : {}];
  return ZSCENE[zone] || ['beach', {}];
}
function art(zone, icon, seed = '', opts = {}) {
  const [name, so] = sceneFor(zone, icon, seed); const h = hash(String(seed) + zone);
  const tod = so.tod || ({dusk:'gold'}[opts.tod] || opts.tod) || ['day', 'day', 'day', 'dawn', 'gold', 'gold', 'day', 'dawn'][h % 8];
  const P = TODS[name === 'nightbeach' ? 'night' : tod] || TODS.day;
  return `<svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${SCENES[name](P, prng(seed + zone + name), so)}</svg>`;
}

const MAPGEO = {"land":["M281 62C280 62 278 64 277 66C277 68 278 73 277 75C276 77 277 77 274 79C270 80 258 83 254 84C250 86 251 86 250 87C249 88 250 90 248 91C247 92 243 92 241 93C240 94 240 93 240 95C239 98 241 104 240 107C239 110 236 109 236 112C236 115 238 120 238 123C238 126 234 128 234 130C234 132 237 135 238 137C239 139 239 141 238 144C237 146 234 147 233 151C232 155 233 164 232 168C231 172 228 173 228 175C228 177 230 178 230 181C230 184 230 187 230 192C230 196 229 204 228 207C227 210 226 210 225 211C224 212 224 213 225 216C226 219 229 227 229 230C229 232 226 232 224 233C223 233 220 232 218 233C216 234 213 235 212 237C211 240 212 245 212 247C212 249 210 249 210 250C210 251 211 252 210 255C209 257 207 263 206 266C205 269 206 273 206 275C206 277 208 273 208 279C208 285 210 303 208 310C206 317 200 317 199 322C198 327 201 331 201 338C201 345 201 360 201 365C201 370 202 366 203 368C204 370 205 374 205 378C205 382 203 389 205 392C207 396 215 396 217 398C219 400 219 400 218 402C217 403 215 404 214 405C212 405 209 404 207 405C205 406 201 406 200 408C199 410 199 414 200 417C201 419 203 421 204 422C205 423 204 424 204 426C203 427 201 428 200 430C200 432 202 436 201 437C200 439 198 440 196 440C193 440 188 439 185 440C182 441 180 446 179 447C178 449 178 446 178 450C178 454 178 465 177 471C176 477 174 482 172 486C170 490 167 492 164 494C162 496 160 496 158 497C156 498 154 496 152 497C151 498 149 500 148 502C147 504 149 508 149 510C149 512 146 509 146 514C147 518 152 526 153 534C154 542 153 554 153 558C153 563 151 559 150 561C150 563 149 568 149 570C149 571 149 571 150 572C151 572 154 571 156 572C157 573 159 571 160 575C161 579 160 592 159 597C158 601 157 598 157 601C157 604 156 609 157 613C158 616 164 620 165 622C166 624 165 626 165 628C165 630 164 634 163 635C162 637 159 638 158 638C156 638 154 638 153 638C152 639 152 639 152 640C152 641 151 644 152 646C153 649 158 649 159 653C160 657 158 667 158 670C158 673 159 671 160 672C161 672 164 672 166 672C167 671 168 669 169 668C171 667 174 665 175 665C177 665 178 665 180 665C181 666 182 665 184 668C185 670 186 675 187 678C189 680 191 680 193 681C195 681 196 682 198 680C201 679 206 672 208 670C211 668 209 667 212 668C215 669 223 673 226 674C229 675 229 674 230 674C230 673 231 676 231 672C231 667 229 651 230 646C231 641 235 642 236 640C236 637 233 634 233 631C232 627 231 622 232 618C233 614 237 607 238 604C240 602 238 602 239 600C240 600 241 600 242 598C242 597 242 594 242 591C242 588 241 584 240 582C240 580 239 580 238 580C236 580 233 582 232 582C230 583 229 583 227 581C226 579 222 578 222 571C221 564 222 544 223 538C224 533 226 536 228 536C230 537 234 541 236 542C238 542 238 539 239 538C239 537 240 537 238 535C238 534 234 532 233 529C232 525 234 517 233 514C232 511 228 512 227 508C226 505 225 498 226 494C226 490 230 489 230 486C231 484 230 482 231 480C232 478 235 476 238 474C240 472 244 471 246 470C247 470 247 471 247 469C247 466 247 460 247 457C246 454 246 455 244 453C243 452 240 451 239 449C238 448 238 447 239 446C240 444 241 443 244 443C247 442 252 446 254 444C257 441 260 432 260 428C260 423 258 418 254 416C251 414 244 416 241 416C238 415 238 414 237 413C236 412 235 412 237 410C239 407 249 402 251 399C253 396 251 394 252 393C252 392 254 391 255 391C257 391 260 392 262 392C263 391 263 389 264 388C265 387 267 386 268 386C269 386 273 387 273 389C273 392 271 399 271 401C271 403 271 403 273 404C275 404 280 405 283 406C286 406 291 407 294 406C296 405 297 402 298 400C298 398 296 398 296 394C295 389 295 377 295 372C295 367 295 364 296 362C296 360 298 360 299 358C299 355 300 348 300 346C300 344 299 345 298 344C298 344 296 343 294 344C292 345 289 347 288 348C286 348 286 349 284 346C282 343 277 337 276 331C274 325 275 316 275 310C275 304 274 299 276 295C277 291 281 288 282 286C284 284 283 285 283 283C282 281 280 275 280 273C278 271 277 275 277 270C276 266 276 252 276 248C275 244 275 246 274 245C272 244 269 245 268 242C266 238 267 228 266 224C264 221 260 221 259 220C258 218 259 215 260 213C261 211 265 209 267 208C269 208 270 208 272 210C273 212 277 218 278 220C280 221 280 220 282 220C283 218 286 216 286 214C287 211 286 208 287 205C288 202 291 201 292 198C292 196 291 194 292 191C293 188 298 184 299 182C300 179 299 177 299 175C298 173 297 171 297 169C297 167 298 165 298 164C297 162 295 162 295 160C295 159 294 159 295 156C296 153 299 146 300 143C301 139 299 138 300 135C301 132 304 129 305 126C306 122 305 117 305 114C304 111 304 111 302 109C301 107 296 106 295 103C294 101 294 96 295 93C296 90 298 88 300 86C300 83 301 82 301 80C300 78 298 74 296 72C293 70 289 69 286 68C284 66 283 62 281 62Z","M210 800C209 800 206 803 204 804C202 804 200 804 198 804C196 804 193 804 190 803C187 802 184 798 181 797C178 796 175 796 173 797C171 798 169 799 168 800C167 801 168 802 168 804C167 805 167 805 164 807C162 808 156 810 153 811C151 813 153 814 150 815C148 817 141 818 138 819C136 820 137 819 136 821C136 824 136 831 136 834C136 836 134 835 133 837C133 839 132 844 132 847C132 849 134 848 134 852C134 856 133 865 133 869C133 873 136 873 137 875C137 877 136 878 137 880C138 882 141 885 143 887C144 890 145 890 145 893C145 896 145 900 145 903C145 905 145 905 144 906C143 908 140 910 139 912C138 914 140 915 140 916C141 918 141 918 143 920C145 921 148 923 151 923C154 923 157 919 161 920C164 920 169 925 171 926C174 928 172 927 176 927C179 926 187 926 192 924C196 921 199 917 200 912C202 908 200 902 200 899C200 897 201 897 202 896C204 896 205 896 208 894C210 893 213 888 214 886C216 883 215 880 216 877C217 874 222 870 222 867C222 863 218 862 217 856C216 849 216 834 216 829C215 824 216 827 214 824C213 822 210 818 209 815C208 811 208 806 209 804C209 802 211 803 211 802C211 801 211 799 210 800Z","M312 457C310 459 306 464 305 466C304 468 306 468 305 470C304 472 301 476 300 478C298 480 297 480 295 481C293 482 290 481 288 481C287 482 286 483 285 484C285 485 285 487 285 488C286 490 288 494 289 496C291 497 292 496 294 496C296 495 298 493 301 494C303 494 308 497 310 499C312 501 311 503 312 504C313 506 315 506 317 509C318 512 318 519 320 522C322 526 325 529 327 530C330 532 334 533 336 534C337 535 336 536 337 538C339 539 344 543 346 545C348 548 347 552 348 554C349 555 351 555 352 557C353 559 352 561 353 564C354 566 356 572 357 574C358 575 357 575 359 575C361 575 364 576 366 574C369 573 374 568 376 566C377 563 376 561 376 558C375 555 372 551 372 547C371 542 373 534 373 530C372 526 371 524 370 522C368 520 365 518 364 516C363 515 362 513 362 511C361 509 362 507 362 505C361 503 360 500 358 498C357 496 355 495 354 494C353 492 352 492 351 488C350 483 352 474 350 469C349 465 345 463 342 460C338 458 332 454 330 453C327 452 328 452 326 453C324 454 320 458 318 458C315 459 314 456 312 457Z","M300 597C298 598 297 600 295 602C293 603 289 604 288 605C287 607 286 609 288 610C290 612 296 613 299 615C301 618 302 621 303 624C304 627 301 630 303 632C305 635 312 638 314 641C316 643 317 646 318 648C320 649 322 648 324 648C325 647 326 646 326 644C327 643 328 640 328 638C327 636 324 633 323 631C322 628 324 627 323 624C322 621 319 615 318 612C317 608 318 606 318 603C317 601 315 599 312 598C310 598 305 599 303 599C301 599 301 597 300 597Z","M214 684C212 684 208 688 206 689C203 690 202 688 200 689C199 690 196 692 195 694C194 697 194 701 194 705C194 709 194 718 195 721C196 724 197 723 198 724C199 725 198 725 200 724C203 723 208 719 212 717C216 715 222 715 224 714C225 712 224 710 224 708C223 706 220 705 219 702C218 699 220 693 219 690C218 687 216 684 214 684Z","M203 195C202 195 202 195 201 196C201 197 199 198 199 201C199 204 199 213 199 216C199 219 199 218 198 220C196 221 192 222 191 226C190 230 192 242 193 246C194 249 194 248 195 248C196 248 200 248 202 246C203 245 202 240 203 238C204 237 207 239 208 235C208 231 206 222 206 216C205 210 206 203 206 200C205 197 204 196 203 195Z","M75 603C73 604 72 607 72 609C72 611 71 615 72 618C73 620 77 622 79 623C81 623 85 622 86 622C88 621 88 622 88 620C88 617 87 608 86 605C86 602 85 603 83 603C81 603 77 602 75 603Z","M329 50C328 51 328 50 328 52C328 54 328 61 328 62C329 64 329 64 330 64C331 64 335 64 336 64C338 63 338 60 338 58C338 56 336 54 336 52C335 51 334 50 333 50C332 50 330 50 329 50Z","M351 61C350 62 346 65 345 67C344 69 345 71 346 72C347 74 348 76 350 76C352 76 356 72 357 70C358 68 356 67 356 65C355 64 353 61 351 61Z","M185 269C184 269 183 269 183 270C183 272 183 276 184 278C185 279 186 280 187 280C188 280 188 279 189 278C189 277 189 274 189 273C189 272 188 271 188 270C187 270 186 269 185 269Z"],"shal":["M335 48C332 47 326 49 324 51C322 54 324 60 323 63C322 66 321 67 318 69C316 70 313 74 307 72C301 70 290 62 285 59C281 56 282 56 281 53C280 50 282 44 280 41C279 39 273 38 271 38C269 38 268 39 269 42C270 44 277 49 278 52C278 55 280 58 274 61C267 63 242 65 236 68C230 71 239 72 238 79C237 86 229 104 228 110C227 117 231 112 231 117C231 122 231 136 229 140C227 145 222 144 218 143C215 141 210 132 207 132C204 132 200 140 199 142C198 144 198 144 201 146C204 147 213 146 216 148C218 150 220 153 219 158C218 162 215 170 212 176C208 181 200 182 197 188C194 195 197 208 195 215C193 221 189 219 188 226C187 233 192 248 190 255C188 261 181 259 178 264C176 269 175 280 175 284C175 287 178 287 181 287C184 287 192 283 196 284C199 285 201 288 202 292C203 296 204 304 203 309C202 314 196 311 195 322C194 333 197 365 197 376C197 386 193 381 193 385C193 389 200 395 199 401C198 406 187 413 184 417C182 422 186 424 185 428C184 432 178 435 175 442C172 450 169 466 167 472C165 477 165 474 163 474C161 474 156 475 154 472C152 468 151 450 148 452C145 454 136 471 135 484C135 498 144 516 144 532C144 547 136 569 134 578C131 586 132 581 128 583C125 584 117 582 112 586C108 590 105 606 100 608C95 610 87 600 83 598C78 596 76 597 73 598C71 599 69 601 68 604C67 607 66 612 68 616C70 621 76 628 80 629C84 630 88 627 92 624C95 620 96 610 100 608C103 607 108 612 112 617C116 623 121 637 123 643C125 649 121 651 121 654C121 657 124 659 125 661C126 663 127 665 125 668C123 670 116 676 114 678C113 681 113 681 115 682C117 682 121 681 126 683C132 685 145 692 151 694C157 696 159 695 164 695C168 694 174 690 178 690C181 690 184 692 186 694C188 697 189 701 188 706C187 710 178 716 180 722C183 727 199 737 203 741C207 746 206 746 206 748C205 751 203 753 200 755C198 756 198 757 192 757C185 757 166 755 160 755C154 756 156 758 156 760C156 762 147 764 160 765C173 766 222 767 236 767C250 766 242 764 242 762C243 761 244 758 240 757C236 756 222 758 217 757C212 755 207 752 209 748C210 744 222 738 226 734C229 729 224 729 229 723C234 717 250 704 254 699C258 694 255 696 252 694C250 693 241 693 238 691C235 689 236 684 236 681C236 678 236 677 239 675C242 673 252 673 254 670C255 667 249 660 249 656C249 651 254 650 254 644C254 638 249 626 249 620C249 614 255 610 255 607C255 604 250 602 249 600C248 597 246 594 249 590C251 586 262 578 265 574C267 570 266 570 264 567C262 564 253 564 253 557C252 550 257 532 261 526C265 520 271 520 276 520C281 519 289 523 293 523C297 522 298 517 300 516C303 515 305 514 308 517C312 520 319 526 323 534C327 542 326 558 332 566C338 573 353 580 359 582C365 584 366 581 370 578C373 574 380 568 381 563C382 557 376 551 376 545C375 538 379 530 377 524C375 518 367 514 365 508C363 504 365 498 364 494C362 490 358 490 356 486C354 481 358 473 355 467C351 461 342 453 336 449C329 445 320 444 316 443C311 442 309 443 307 445C305 448 307 454 305 458C303 463 298 470 294 472C291 474 286 474 282 472C279 470 274 464 275 459C275 454 283 446 284 441C285 435 278 430 281 424C284 418 298 410 302 404C305 397 300 392 302 387C304 383 312 380 312 376C312 372 303 368 302 363C300 357 305 348 302 343C300 339 290 338 286 336C283 333 282 337 283 329C284 320 293 294 293 284C293 274 284 274 282 268C280 263 285 257 284 252C282 247 275 243 273 240C271 236 271 234 272 232C272 230 272 227 275 225C278 223 286 222 290 220C293 217 296 214 297 211C298 208 294 206 295 201C296 196 303 186 304 179C304 171 296 161 297 156C298 151 308 150 310 147C311 144 306 141 306 138C306 134 310 132 310 126C310 119 306 106 307 100C307 94 310 91 312 87C314 84 314 79 320 78C326 77 342 81 349 80C355 78 357 74 358 70C360 67 358 63 356 61C353 59 345 58 341 56C338 54 338 49 335 48Z","M202 784C199 783 198 782 195 783C192 784 190 788 185 789C180 790 172 785 166 788C160 791 153 802 148 806C144 809 141 808 137 810C134 813 130 817 128 821C126 825 124 827 124 834C124 841 126 857 126 864C126 870 120 869 121 872C122 876 132 879 133 885C134 891 129 902 129 909C129 916 129 924 130 928C132 932 130 931 135 932C141 934 156 937 165 937C174 937 182 936 188 934C194 932 198 930 202 926C207 922 210 920 214 910C219 899 227 879 228 864C229 849 221 828 220 818C219 808 223 809 222 805C221 801 218 797 215 793C212 790 206 786 202 784Z","M268 601C265 604 265 603 267 605C269 607 276 608 280 612C283 616 286 625 289 628C292 632 293 627 298 631C302 635 312 648 317 650C322 653 324 651 326 648C329 646 332 641 333 637C334 633 334 628 333 624C331 620 325 616 323 612C321 607 322 602 320 598C317 595 311 592 306 590C300 588 294 586 288 588C282 590 272 598 268 601Z"]};
/* ============ HERO: one wide Andaman seascape, drawn four times (dawn, day, sunset, night) and cross-faded ============ */
const HERO_TODS = ['dawn', 'day', 'gold', 'night'];
function heroLayer(k) {
  const P = TODS[k], r = prng('hero-scene'), W = 1440, H = 600, hz = 336;
  const sx = {dawn:1000, day:1090, gold:930, night:1120}[k], sy = {dawn:300, day:96, gold:296, night:104}[k];
  let s = `<rect width="${W}" height="${hz + 4}" fill="url(#g-${k}-sky)"/>`;
  if (k === 'night') { for (let i = 0; i < 110; i++) s += `<circle class="${i % 5 ? '' : 'h-tw'}" cx="${f1(r() * W)}" cy="${f1(r() * (hz - 20))}" r="${r() < .15 ? 2.2 : 1.1}" fill="#fff" opacity="${f1(.35 + r() * .65)}"/>`;
    s += `<path d="M-40 250C300 60 900 20 1500 190" stroke="#BFD3FF" stroke-width="90" fill="none" opacity=".06"/><circle cx="${sx}" cy="${sy}" r="130" fill="url(#g-night-glow)"/><circle cx="${sx}" cy="${sy}" r="38" fill="${P.sun}"/><circle cx="${sx - 12}" cy="${sy - 8}" r="8" fill="#D9D3BC"/><circle cx="${sx + 13}" cy="${sy + 11}" r="5.5" fill="#D9D3BC"/><circle cx="${sx + 8}" cy="${sy - 16}" r="3.5" fill="#D9D3BC"/>`; }
  else s += `<circle cx="${sx}" cy="${sy}" r="${k === 'day' ? 150 : 230}" fill="url(#g-${k}-glow)"/><circle cx="${sx}" cy="${sy}" r="${k === 'day' ? 40 : 62}" fill="${P.sun}"/>`;
  const cloud = (cx, cy, w, cls) => `<g class="h-cloud ${cls}" fill="${P.cloud}" opacity="${k === 'day' ? .95 : k === 'night' ? .45 : .6}"><ellipse cx="${cx}" cy="${cy}" rx="${w}" ry="${f1(w * .2)}"/><ellipse cx="${f1(cx - w * .3)}" cy="${f1(cy - w * .13)}" rx="${f1(w * .42)}" ry="${f1(w * .19)}"/><ellipse cx="${f1(cx + w * .26)}" cy="${f1(cy - w * .1)}" rx="${f1(w * .36)}" ry="${f1(w * .16)}"/></g>`;
  s += cloud(180, 96, 110, 'c1') + cloud(640, 150, 84, 'c2') + cloud(860, 62, 120, 'c1') + cloud(1300, 190, 96, 'c2') + cloud(420, 210, 60, 'c2');
  s += aIsle(r, -160, 760, hz + 2, 74, P.far, 10) + aIsle(r, 520, 620, hz + 2, 46, P.far, 9) + aIsle(r, 980, 620, hz + 2, 104, P.mid, 9);
  s += `<g opacity=".95">${aPalm(1150, hz - 62, 70, 14, P, 1.2)}${aPalm(1210, hz - 80, 84, -12, P, 1.3)}${aPalm(1290, hz - 70, 64, 10, P, 1.1)}</g>`;
  s += `<rect y="${hz}" width="${W}" height="${H - hz}" fill="url(#g-${k}-sea)"/><path d="M930 ${hz + 8}q230 -22 520 -4" stroke="${P.sand}" stroke-width="9" fill="none" stroke-linecap="round" opacity=".9"/>`;
  for (let i = 0; i < 10; i++) { const y = hz + 14 + i * 22, w = 84 - i * 5 + r() * 20; s += `<path class="h-gl" style="animation-delay:${-i * .4}s" d="M${f1(sx - w)} ${y}h${f1(w * 2)}" stroke="${P.glint}" stroke-width="${f1(3 + i * .9)}" stroke-linecap="round" opacity="${f1(.8 - i * .06)}"/>`; }
  for (let i = 0; i < 26; i++) { const x = r() * W, y = hz + 16 + r() * 220, w = 30 + r() * 70; s += `<path d="M${f1(x)} ${f1(y)}h${f1(w)}" stroke="${P.foam}" stroke-width="${f1(1.6 + (y - hz) / 90)}" stroke-linecap="round" opacity=".3"/>`; }
  if (k === 'night') s += aGlow(r, 150, 0, W, hz + 60, H).replace(/r="([\d.]+)"/g, (m, v) => `r="${f1(v * 2)}"`);
  s += `<g class="h-ferry"><g class="h-fy" transform="translate(0 ${hz + 142}) scale(1.6)">${aFerry(0, 0, 150, P, ACC[0])}</g></g>`;
  s += `<g class="h-sail" transform="translate(760 ${hz + 30})"><path d="M-24 6q24 10 48 0l-5 8h-38z" fill="#fff"/><path d="M0 5V-40" stroke="${P.rockD}" stroke-width="1.6"/><path d="M2 -38q20 18 21 40H2z" fill="${ACC[1]}"/><path d="M-2 -32q-14 16 -17 34h17z" fill="#fff"/></g>`;
  // foreground: the beach you're standing on, right-hand side
  s += `<path d="M700 ${H + 10}C900 520 1100 468 1240 462S1400 452 1460 440V${H + 10}Z" fill="${P.foam}" opacity=".5"/><path d="M730 ${H + 10}C920 532 1110 480 1250 474S1400 462 1460 452V${H + 10}Z" fill="${P.wet}"/><path d="M790 ${H + 10}C960 546 1120 494 1260 488S1400 478 1460 468V${H + 10}Z" fill="${P.sand}"/>`;
  s += aBush(1400, 470, 70, P.dark, P.land) + aBush(1300, 500, 44, P.land, P.dark) + aPalm(1330, 520, 300, -92, P, 3.3) + aPalm(1400, 540, 250, -40, P, 3) + aPalm(1250, 536, 190, -64, P, 2.4);
  s += `<g transform="translate(1030 520) rotate(-7) scale(1.7)">${aBoat(0, 0, 60, P, ACC[2], false)}</g>`;
  s += [[300, 120], [348, 100], [392, 130], [760, 220], [800, 200]].map(([x, y]) => `<path class="h-bird" d="M${x - 9} ${y}q4.5 -7 9 0q4.5 -7 9 0" stroke="${k === 'night' ? '#BFD3FF' : P.dark}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/>`).join('');
  return `<svg class="hero-l" data-tod="${k}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMaxYMax slice" aria-hidden="true" focusable="false">${s}</svg>`;
}
let _heroHTML = null;
function heroArt() { if (!_heroHTML) _heroHTML = HERO_TODS.map(heroLayer).join(''); return _heroHTML; }
/* the sky follows the real clock in Port Blair (IST) on first load, then drifts through the day; the traveller can pin a time */
const istNow = () => { const d = new Date(Date.now() + 5.5 * 3600e3); return {iso:d.toISOString().slice(0, 10), min:d.getUTCHours() * 60 + d.getUTCMinutes()}; };
function todNow() { const n = istNow(), nat = NAT[n.iso] || NAT[TODAY] || {sr:'05:15', ss:'17:00'}; const sr = tm(nat.sr), ss = tm(nat.ss); return n.min < sr - 30 || n.min > ss + 40 ? 'night' : n.min < sr + 75 ? 'dawn' : n.min > ss - 75 ? 'gold' : 'day'; }
let _heroT = null;
function heroStart() { if (_heroT) return; const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches; if (!still) _heroT = setInterval(heroTick, 10000); }

/* ============ MAP: the archipelago drawn from its real coastline (traced once, kept as vector) ============ */
const MAPV = {w:480, h:960};
const PINS = {DIG:[292, 115, 'r'], MAY:[272, 238, 'r'], RAN:[262, 318, 'l'], LON:[291, 368, 'r'], BAR:[222, 424, 'l'], HAV:[330, 498, 'r'], NEI:[306, 616, 'r'], PBL:[236, 574, 'l'], WAN:[204, 660, 'l'], LIT:[176, 846, 'r']};
let _mapDrawn = false;
function islandMap(sel, o = {}) {
  const anim = !_mapDrawn && !o.trip; if (!o.trip) _mapDrawn = true; const P = z => PINS[z];
  const q = (a, b, cx, cy) => `M${P(a)[0]} ${P(a)[1]}Q${cx} ${cy} ${P(b)[0]} ${P(b)[1]}`;
  const NET = {'PBL-HAV':q('PBL', 'HAV', 300, 556), 'HAV-NEI':q('HAV', 'NEI', 356, 566), 'NEI-PBL':q('NEI', 'PBL', 268, 632), 'PBL-NEI':q('PBL', 'NEI', 268, 632), 'PBL-LIT':q('PBL', 'LIT', 150, 740)};
  const road = `M${P('PBL')[0]} ${P('PBL')[1]}C214 540 210 470 ${P('BAR')[0]} ${P('BAR')[1]}S244 360 ${P('RAN')[0]} ${P('RAN')[1]}S262 280 ${P('MAY')[0]} ${P('MAY')[1]}S286 160 ${P('DIG')[0]} ${P('DIG')[1]}`;
  const legPath = (a, b) => NET[a + '-' + b] || (NET[b + '-' + a]) || `M${P(a)[0]} ${P(a)[1]}L${P(b)[0]} ${P(b)[1]}`;
  let lines;
  if (o.trip) lines = `<path class="rt road dim" d="${road}"/>` + ['PBL-HAV', 'HAV-NEI', 'NEI-PBL'].map(k => `<path class="rt ferry dim" d="${NET[k]}"/>`).join('') + o.trip.legs.map(([a, b]) => P(a) && P(b) ? `<path class="rt mine" d="${legPath(a, b)}"/>` : '').join('');
  else lines = `<path class="rt road" d="${road}"/><path class="rt ship" d="${NET['PBL-LIT']}"/>` + ['PBL-HAV', 'HAV-NEI', 'NEI-PBL'].map(k => `<path class="rt ferry" d="${NET[k]}"/>`).join('');
  const stops = o.trip ? o.trip.stops : null;
  const pins = Object.entries(PINS).map(([z, [x, y, side]], i) => { const on = z === sel || (stops && stops.includes(z)); const nm = ZN[z].name; const n = stops ? stops.indexOf(z) : -1; const lab = o.trip ? (n >= 0 ? `${nm}${o.trip.nights[z] ? ' · ' + o.trip.nights[z] + 'N' : ''}` : '') : nm;
    const w = Math.round(lab.length * (on ? 9.6 : 8.4) + 24), h = on ? 32 : 26, lx = side === 'r' ? x + 16 : x - 16 - w;
    const pill = lab ? `<g class="pill"><rect x="${lx}" y="${y - h / 2}" width="${w}" height="${h}" rx="${h / 2}"/><text x="${lx + w / 2}" y="${y + (on ? 5.5 : 4.6)}" text-anchor="middle">${lab}</text></g>` : '';
    const inner = `<circle class="hit" cx="${x}" cy="${y}" r="30" fill="transparent"/><circle class="halo" cx="${x}" cy="${y}" r="${on ? 19 : 12}"/><circle class="dot" cx="${x}" cy="${y}" r="${on ? 9.5 : 6.5}"/>${n >= 0 ? `<text class="ord" x="${x}" y="${y + 4.6}" text-anchor="middle">${n + 1}</text>` : ''}${pill}`;
    return `<g class="pin${on ? ' on' : ''}${o.trip && n < 0 ? ' off' : ''}" style="--i:${i};--zc:${ZC(z)}">${o.trip ? inner : `<a href="#" data-a="mapsel" data-zone="${z}" role="button" aria-label="${nm}" aria-pressed="${z === sel}">${inner}</a>`}</g>`; }).join('');
  const lat = [[13, 188], [12, 459], [11, 729]].map(([d, y]) => `<path d="M0 ${y}H480" class="grat"/><text x="472" y="${y - 6}" text-anchor="end" class="gratl">${d}°N</text>`).join('');
  let vb = `0 0 ${MAPV.w} ${MAPV.h}`;
  if (o.trip) { // zoom to the islands on this trip, in the banner's shape
    const xs = stops.map(z => P(z)[0]), ys = stops.map(z => P(z)[1]); let x0 = Math.min(...xs) - 210, x1 = Math.max(...xs) + 200, y0 = Math.min(...ys) - 60, y1 = Math.max(...ys) + 60; let w = x1 - x0, h = y1 - y0; const ar = 1.8;
    if (w / h < ar) { const nw = h * ar; x0 -= (nw - w) / 2; w = nw; } else { const nh = w / ar; y0 -= (nh - h) / 2; h = nh; } vb = `${Math.round(x0)} ${Math.round(y0)} ${Math.round(w)} ${Math.round(h)}`; }
  return `<div class="mapbox${anim ? ' anim' : ''}${o.trip ? ' tripmap' : ''}"><svg viewBox="${vb}" ${o.trip ? 'preserveAspectRatio="xMidYMid slice"' : ''} role="group" aria-label="${o.trip ? 'Your route through the islands' : t('mapH')}">
    <rect x="-1200" y="-400" width="2880" height="1760" fill="#146C92"/><rect width="${MAPV.w}" height="${MAPV.h}" fill="url(#g-map-sea)"/>${lat}
    <g class="reef">${MAPGEO.shal.map(d => `<path d="${d}"/>`).join('')}</g><g class="reef2">${MAPGEO.shal.map(d => `<path d="${d}"/>`).join('')}</g>
    <g class="land">${MAPGEO.land.map(d => `<path d="${d}"/>`).join('')}</g>
    <path d="M262 150l7 -13 7 13z" class="peak"/><text x="252" y="168" class="cmp peakl">Saddle Peak 732 m</text>
    <text x="22" y="330" class="cmp sea">Bay of</text><text x="22" y="350" class="cmp sea">Bengal</text><text x="${MAPV.w - 20}" y="420" class="cmp sea" text-anchor="end">Andaman</text><text x="${MAPV.w - 20}" y="440" class="cmp sea" text-anchor="end">Sea</text><text x="356" y="770" class="cmp sea" text-anchor="middle">Duncan Passage</text>
    <g class="rose" transform="translate(64 96)"><circle r="26"/><path d="M0 -34L7 0L0 34L-7 0Z" class="ns"/><path d="M-34 0L0 -7L34 0L0 7Z" class="ew"/><text y="-40" text-anchor="middle">N</text></g>
    <g class="routes">${lines}</g>${pins}</svg>
    ${o.trip ? '' : `<div class="maplegend"><span><i class="lg ferry"></i>Ferry · 1–1½ h</span><span><i class="lg road"></i>Road · 11 h to Diglipur</span><span><i class="lg ship"></i>Govt ship · ~8 h</span></div>`}</div>`;
}
/* the mark: a sun setting behind one wave */
const logoMark = (s = 34) => `<svg class="logo" width="${s}" height="${s}" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" fill="#F75940"/><circle cx="20" cy="18" r="8.5" fill="#FFD166"/><path d="M0 24q5 -5 10 0t10 0 10 0 10 0v16H0z" fill="#FFFFFF"/><path d="M0 31q5 -5 10 0t10 0 10 0 10 0v9H0z" fill="#FFC9BD"/></svg>`;

function qr(code, n = 25) { // decorative pseudo-QR from a hash (prototype; real passes use a signed payload)
  let h = hash(code); const cells = []; const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return (h >>> 0) / 4294967296; };
  const finder = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7" fill="#0F2A2C"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="#0F2A2C"/>`;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const inF = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9); if (!inF && rnd() < .48) cells.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`); }
  return `<svg viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" aria-label="QR code ${esc(code)}"><rect width="${n}" height="${n}" fill="#fff"/><g fill="#0F2A2C">${cells.join('')}</g>${finder(0, 0)}${finder(n - 7, 0)}${finder(0, n - 7)}</svg>`;
}


/* auto-fix: try our own fixes one at a time, keep a change only if it removes problems */
function hardCount() { syncTrip(); return run(S.cart).hard; }
function applyFix(f, base) {
  if (f.act === 'patch') { const it = S.cart.find(x => x.uid === f.uid); if (!it) return null; const name = info(it).title; Object.assign(it, f.patch); if (it.kind === 'ferry' && !it.own) { delete it.reseat; it.seats = autoSeats({sid:it.ref, cls:it.cls, date:it.date}); }
    if (f.patch.reseat) return {t:`Picked seats for all ${pax()} travellers`, s:`${name} · ${it.seats.join(', ')}`, icon:'ferry'};
    if (f.patch.nights) return {t:`${name}: now ${it.nights} night${it.nights > 1 ? 's' : ''}`, s:fD(it.date), icon:'bed'};
    if (f.patch.qty) return {t:`${name}: now ${it.qty} rooms`, s:fD(it.date), icon:'bed'};
    if (f.patch.pk != null) return {t:`${name}: booked for those old enough`, s:fD(it.date), icon:'user'};
    if (f.patch.date) return {t:`Moved ${name} to ${fD(f.patch.date)}`, s:`at ${it.t}${it.kind === 'act' && ACT[it.ref].closed ? ' · closed on the original day' : ''}`, icon:'cal'};
    return {t:f.patch.t ? `Moved ${name} to ${f.patch.t}` : `Switched to the ${SAIL[it.ref].dep} ${SAIL[it.ref].op.replace(/ \d$/, '')} ferry`, s:fD(it.date), icon:f.patch.t ? 'clock' : 'ferry'}; }
  if (f.act === 'quickadd') { const it = quickAdd(f); const I = info(it); return {t:`Added ${I.title}`, s:`${fD(f.date)} · ${f.t}${I.price ? ' · ' + inr(I.price) : ''}`, icon:I.icon}; }
  if (f.act === 'ferry') {
    const opts = BOOKABLE.filter(s => s.f === f.from && s.to === f.to && sailsOn(s, f.date)).sort((a, b) => tm(a.dep) - tm(b.dep));
    for (const s of opts) { const c = classFares(s).find(x => seats(s.id, x.name, f.date) >= pax()); if (!c) continue;
      const it = addItem({kind:'ferry', ref:s.id, date:f.date, cls:c.name, seats:autoSeats({sid:s.id, cls:c.name, date:f.date})}, true);
      if (hardCount() < base) return {t:`Added the ${s.dep} ${s.op.replace(/ \d$/, '')} ferry, ${ZN[s.f].name} → ${ZN[s.to].name}`, s:`${fD(f.date)} · ${c.name} · seats ${it.seats.join(', ')} · ${inr(c.fare * pax())}`, icon:'ferry'};
      S.cart = S.cart.filter(x => x.uid !== it.uid); }
    return null;
  }
  return null;
}
function autoFix() {
  const before = JSON.parse(JSON.stringify(S.cart)); const seqBefore = S.seq; const log = [];
  for (let iter = 0; iter < 15; iter++) {
    syncTrip(); const R = run(S.cart); if (!R.hard) break;
    const order = {4:0, 2:1, 6:2, 1:3, 3:4}; const list = [];
    Object.entries(R.by).forEach(([uid, al]) => { const it = S.cart.find(x => x.uid === uid); al.filter(a => a.sev === 'hard').forEach(a => list.push({a, d:it ? it.date : '9', r:order[a.rule] ?? 5})); });
    R.anchors.out.filter(a => a.sev === 'hard').forEach(a => list.push({a, d:'9', r:0}));
    list.sort((p, q) => p.d.localeCompare(q.d) || p.r - q.r);
    let done = false;
    for (const {a} of list) {
      for (const f of (a.fix || []).filter(x => ['patch', 'quickadd', 'ferry'].includes(x.act) && !x.own)) {
        const snap = JSON.stringify(S.cart); const res = applyFix(f, R.hard);
        if (res && hardCount() < R.hard) { log.push(res); done = true; break; }
        S.cart = JSON.parse(snap); syncTrip();
      }
      if (done) break;
    }
    if (!done) break;
  }
  S.autoLog = log; S.autoUndo = {cart:before, seq:seqBefore}; syncTrip();
}


/* one place that turns a suggestion into basket items (also adds the second leg of "both ways") */
function quickAdd(f) {
  const it = addItem(Object.assign({kind:f.kind, ref:f.ref, date:f.date, t:f.t, qty:1}, f.rev ? {rev:true} : {}, f.ret ? {ret:true} : {}, f.for ? {for:f.for} : {}, f.leg ? {leg:f.leg} : {}, f.kind === 'stay' ? {nights:1, room:HOT[f.ref].rooms[0].n} : {}), true);
  if (f.ref2) addItem(Object.assign({kind:f.kind, ref:f.ref2, date:f.date, t:f.t2, qty:1}, f.rev2 ? {rev:true} : {}, f.for ? {for:f.for} : {}, f.back2 ? {back:true} : {}, f.leg2 ? {leg:f.leg2} : {}), true);
  if (f.kind === 'cab' && ROUTE[f.ref] && ROUTE[f.ref].kind === 'road') trimStays();
  syncTrip(); return it;
}
/* after a ferry or road trip is added: shorten any stay whose later nights are now on another island */
function trimStays() {
  syncTrip(); const evs = expand(S.cart); const pos = makePos(evs); const done = [];
  S.cart.filter(i => i.kind === 'stay').forEach(i => { const z = HOT[i.ref].z, d0 = dayIdx(i.date);
    for (let k = 1; k < i.nights; k++) { const p = pos(abs(d0 + k, 1380)); if (p !== 'transit' && p !== z) { done.push(`${HOT[i.ref].n}: ${i.nights} → ${k} night${k > 1 ? 's' : ''}`); i.nights = k; break; } } });
  syncTrip(); return done;
}

/* ============ v1 UI on the latest engine ============ */
Object.assign(T.en, {onReq:'On request', seeBreakdown:'See price breakdown', breakdown:'breakdown', trust1:'The price you see, plus GST. Nothing else', trust2:'Passes open with no signal', trust3:'Every ferry and check-in time checked', islandsNS:'Islands, north to south', north:'North', south:'South', mostVisited:'Most visited', thingsToDo:'things to do', freeEntry:'Free entry', beforeGst:'Price before GST', noHidden:'No hidden charges', details:'Details', ifPlans:'If plans change', kProblem:'Does not fit', kSuggest:'Tip', kIdea:'Free time', startExploring:'Start exploring', tk1:'Secure payment by UPI, card or netbanking', tk2:'GST shown separately below. No other charges', tk3:'Every pass works offline at jetties and gates', leadTraveller:'Lead traveller', whereMoney:'Check your total', payWith:'Pay with', viewPasses:'View passes', appearance:'Appearance', theme:'Theme', themeSub:'Dark saves battery; light reads best in sun', thSystem:'Auto', thLight:'Light', thDark:'Dark', save:'Save', fixForMe:'Fix it for me', explore:'Explore', trip:'Trip', passes:'Passes', profile:'Profile', getThere:'Get there', stay:'Stay', move:'Move around', doo:'Do', search:'Search beaches, dives, hotels…', addDates:'Add your travel dates', addToTrip:'Add to trip', update:'Update trip', remove:'Remove', checkout:'Checkout', pay:'Pay', fits:'Fits your trip', findFerries:'Find ferries', from:'From', to:'To', date:'Date', travellers:'Travellers', adults:'Adults', kids:'Children', infants:'Infants', islands:'Island stores', beyond:'Beyond the hubs', seaWeek:'Sea & sky on your dates', sunset:'Sunset', moon:'Moon', bio:'Bioluminescence', turtle:'Turtle nesting', perNight:'/ night', perPerson:'/ person', total:'Total', fix:'Fix', taxes:'+ GST', offline:'Saved offline', yourTrip:'Your trip', emptyTrip:'Your trip is empty', sample:'Show me an example trip', night:'Night at', noStay:'Where are you staying tonight?', freeGap:'free', fitsHere:'These fit the time you have', change:'Change', done:'Done'});
Object.assign(T.hi, {onReq:'अनुरोध पर', seeBreakdown:'कीमत का ब्योरा देखें', breakdown:'ब्योरा', trust1:'कीमतें GST से पहले। कोई छिपा शुल्क नहीं', trust2:'पास बिना नेटवर्क के खुलते हैं', trust3:'हर फ़ेरी और चेक-इन समय की जाँच', islandsNS:'द्वीप, उत्तर से दक्षिण', north:'उत्तर', south:'दक्षिण', mostVisited:'सबसे लोकप्रिय', thingsToDo:'करने को', freeEntry:'मुफ़्त प्रवेश', beforeGst:'GST से पहले की कीमत', noHidden:'कोई छिपा शुल्क नहीं', details:'जानकारी', ifPlans:'योजना बदले तो', kProblem:'समस्या', kSuggest:'सुझाव', kIdea:'खाली समय', startExploring:'खोजना शुरू करें', tk1:'UPI, कार्ड या नेटबैंकिंग से सुरक्षित भुगतान', tk2:'GST नीचे अलग दिखाया गया है। कोई और शुल्क नहीं', tk3:'हर पास जेट्टी और गेट पर बिना नेटवर्क चलता है', leadTraveller:'मुख्य यात्री', whereMoney:'अपनी कुल राशि देखें', payWith:'भुगतान का तरीका', viewPasses:'पास देखें', appearance:'दिखावट', theme:'थीम', themeSub:'डार्क बैटरी बचाता है; लाइट धूप में साफ़ दिखता है', thSystem:'ऑटो', thLight:'लाइट', thDark:'डार्क', save:'सेव करें', fixForMe:'मेरे लिए ठीक करें', explore:'खोजें', trip:'यात्रा', passes:'पास', profile:'प्रोफ़ाइल', getThere:'कैसे पहुँचें', stay:'ठहरें', move:'घूमें-फिरें', doo:'करें', search:'बीच, डाइव, होटल खोजें…', addDates:'अपनी यात्रा की तारीखें जोड़ें', addToTrip:'यात्रा में जोड़ें', update:'यात्रा अपडेट करें', remove:'हटाएँ', checkout:'चेकआउट', pay:'भुगतान करें', fits:'आपकी यात्रा में फिट', findFerries:'फ़ेरी खोजें', from:'कहाँ से', to:'कहाँ तक', date:'तारीख', travellers:'यात्री', adults:'वयस्क', kids:'बच्चे', infants:'शिशु', islands:'द्वीप स्टोर', beyond:'मुख्य द्वीपों से आगे', seaWeek:'आपकी तारीखों पर समुद्र और आसमान', sunset:'सूर्यास्त', moon:'चाँद', bio:'समुद्री चमक', turtle:'कछुआ घोंसला', perNight:'/ रात', perPerson:'/ व्यक्ति', total:'कुल', fix:'ठीक करें', taxes:'+ GST', offline:'ऑफ़लाइन सेव', yourTrip:'आपकी यात्रा', emptyTrip:'आपकी यात्रा खाली है', sample:'नमूना यात्रा देखें', night:'रात यहाँ', noStay:'आज रात कहाँ ठहरेंगे?', freeGap:'खाली समय', fitsHere:'इस समय में फिट', change:'बदलें', done:'हो गया'});

/* ---------- cart ops ---------- */
function addItem(it, silent) { it.uid = 'i' + (S.seq++); S.cart.push(it); syncTrip(); if (!silent) toast(`Added to ${S.trip ? 'Day ' + (dayIdx(it.date) + 1) : 'trip'}`); return it; }
function sampleTrip() {
  S.cart = []; S.seq = 1; S.dismissed = {}; S.planDate = null; S.pax = {adults:2, kids:0, infants:0}; S.win = {start:addD(SAMPLE0, 0), end:addD(SAMPLE0, 5)};
  S.fin = {no:'6E526', date:addD(SAMPLE0, 0)}; S.fout = {no:'AI2898', date:addD(SAMPLE0, 5)};
  const A = o => addItem(o, true);
  A({kind:'cab', ref:'RT-IXZ-ABERDEEN', date:addD(SAMPLE0, 0), t:'07:10', vc:'Sedan'});
  A({kind:'stay', ref:'HTL-PBL-005', date:addD(SAMPLE0, 0), nights:1, qty:1, room:'Standard room'});
  A({kind:'act', ref:'ENT-CORBYNS', date:addD(SAMPLE0, 0), t:'14:00'});
  A({kind:'act', ref:'ACV-SHOW-LS-HIN', date:addD(SAMPLE0, 0), t:'17:50'});
  A({kind:'ferry', ref:'SAIL-006', date:addD(SAMPLE0, 1), cls:'Premium', seats:['5C', '5D']});
  A({kind:'stay', ref:'HTL-HAV-006', date:addD(SAMPLE0, 1), nights:2, qty:1, room:'Nicobari Cottage'});
  A({kind:'act', ref:'ACV-SNK-HAV-GUIDED', date:addD(SAMPLE0, 1), t:'09:00'});
  A({kind:'act', ref:'ACV-DSD-HAV-SHORE', date:addD(SAMPLE0, 2), t:'09:00'});
  A({kind:'act', ref:'ACV-KAYAK-HAV-NIGHT', date:addD(SAMPLE0, 2), t:'19:00'});
  A({kind:'stay', ref:'HTL-NEI-002', date:addD(SAMPLE0, 3), nights:1, qty:1, room:'Double Room'});
  A({kind:'ferry', ref:'SAIL-025', date:addD(SAMPLE0, 4), cls:'Premium', seats:['3A', '3B']});
  A({kind:'stay', ref:'HTL-PBL-005', date:addD(SAMPLE0, 4), nights:1, qty:1, room:'Standard room'});
}
const subtotal = () => S.cart.reduce((s, it) => s + (info(it).price || 0), 0);
const gstTotal = () => S.cart.reduce((s, it) => { const I = info(it); return s + Math.round((I.price || 0) * (I.gst || 0) / 100); }, 0);
const total = () => subtotal() + gstTotal();
const onReq = () => S.cart.filter(it => info(it).price == null).length;

/* ---------- router ---------- */
const cur = () => S.stack[S.stack.length - 1];
function go(v) { const c = cur(); if (c) c._y = typeof window !== 'undefined' ? window.scrollY : 0; S.stack.push(v); render(true); }
function tab(v) { S.stack = [{v}]; render(true); }
function back() { if (S.stack.length > 1) S.stack.pop(); render(true); }   // render() returns you to where you were on that screen
const TABV = {adv:'explore', pkgs:'explore', pkg:'explore', home:'explore', store:'explore', product:'explore', route:'explore', seats:'explore', search:'explore', trip:'trip', checkout:'trip', paid:'trip', passes:'passes', pass:'passes', profile:'profile', vendor:'profile', scanner:'profile', admin:'profile'};

/* ---------- shared ---------- */
const ORDER_Z = ['PBL', 'HAV', 'NEI'], BEYOND_Z = ['WAN', 'BAR', 'RAN', 'LON', 'MAY', 'DIG', 'LIT'];
const CATS = [
  {k:'places', n:'Places to visit', fams:['Places to visit']},
  {k:'scuba', n:'Scuba diving', fams:['Scuba - Try dive', 'Scuba - Certified dives', 'Scuba - Courses'], subs:[['Try a dive, no experience needed', 'Scuba - Try dive'], ['For certified divers', 'Scuba - Certified dives'], ['Courses', 'Scuba - Courses']]},
  {k:'snork', n:'Snorkelling & sea walk', fams:['Snorkelling', 'Sea walk', 'Glass bottom & semi-sub']},
  {k:'boat', n:'Island & boat trips', fams:['Boat trips', 'Cruises & charters']},
  {k:'water', n:'Water sports', fams:['Motor water sports']},
  {k:'kayak', n:'Kayaking', fams:['Kayaking']},
  {k:'fish', n:'Game fishing', fams:['Fishing']},
  {k:'tours', n:'Tours & shows', fams:['Sightseeing tours']},
  {k:'nature', n:'Nature & walks', fams:['Walks & nature']}
];
const HIDDEN = id => /^ACV-(FISH-PERMIT|EQUIP|NITROX|ADDON|SCOOTY|CYCLE|HELI|TOUR-DIGLIPUR)/.test(id);   // the Diglipur 'trip' is really a package; the road cabs + stays cover it
const catOf = a => CATS.find(c => c.fams.includes(a.fam));
const shown = a => !HIDDEN(a.id) && !!catOf(a);
const TAGNAME = {ns:'Non-swimmers OK', kid:'Kids OK', sen:'Seniors OK', cpl:'Couples', adr:'Adrenaline', rain:'Rainy day OK', sun:'Sunrise & sunset', night:'Night', nat:'Nature & wildlife', his:'History', off:'Offbeat', uw:'Underwater', sea:'Seasickness risk', fit:'Fitness needed'};
const priceLine = (p, unit, est) => p == null ? `<span class="price" style="font-size:14px">Rate on request</span>` : `<span class="price">${inr(p)} <small>${unit}${est ? ' · est.' : ''}</small></span>`;
const unitOf = b => ({per_pax:t('perPerson'), per_boat:'/ boat', per_group:'/ group', per_vehicle:'/ vehicle', per_unit:'/ day'})[b] || '';
const stars = (r, n) => r ? `<span class="rating">${ic('star', 13)}${r}${n ? `<span class="faint" style="font-weight:600">&nbsp;(${Number(n).toLocaleString('en-IN')})</span>` : ''}</span>` : '';
const paxTxt = () => `${S.pax.adults} adult${S.pax.adults > 1 ? 's' : ''}${S.pax.kids ? ` · ${S.pax.kids} child${S.pax.kids > 1 ? 'ren' : ''}` : ''}${S.pax.infants ? ` · ${S.pax.infants} infant${S.pax.infants > 1 ? 's' : ''}` : ''}`;
function fitTag(f) {
  if (!f || f.state === 'none' || f.state === 'alone') return '';
  if (f.state === 'ok') return `<span class="tag ok">${ic('check', 12, 2.6)} ${t('fits')}</span>`;
  const h = f.hard[0]; return `<span class="tag ${h.rule === 6 ? '' : 'bad'}">${esc(h.title)}</span>`;
}
function baseDate() { const inTrip = d => S.trip && d >= S.trip.start && d <= S.trip.end; if (!S.planDate || S.planDate < TODAY || (S.trip && S.cart.length && !inTrip(S.planDate))) S.planDate = S.trip ? (S.trip.start >= TODAY ? S.trip.start : TODAY) : addD(TODAY, 7); return S.planDate; }
function zoneAt(date) { if (!S.trip || !S.cart.length) return null; const p = makePos(expand(S.cart))(abs(dayIdx(date), 720)); return p === 'transit' ? 'PBL' : p; }
function defaultDayFor(zone) {
  if (!S.trip || !S.cart.length) return baseDate(); const pos = makePos(expand(S.cart));
  for (let n = 0; n < nDays(); n++) if (reach(zone, pos(abs(n, 600)))) return addD(S.trip.start, n);
  return S.planDate && S.planDate >= TODAY ? S.planDate : S.trip.start;
}
/* day picker: trip days carry their island; other days can carry a note (e.g. lowest fare) */
function dayPicker(sel, act, noteFn) {
  sel = sel || baseDate(); const set = new Set();
  if (S.trip) for (let n = 0; n < nDays() && n < 21; n++) set.add(addD(S.trip.start, n));
  for (let i = -3; i <= 10; i++) { const d = addD(sel, i); if (d >= TODAY) set.add(d); }
  const days = [...set].filter(d => d >= TODAY).sort();
  const inTrip = d => S.trip && S.cart.length && d >= S.trip.start && d <= S.trip.end;
  return `<div class="daypick" role="group" aria-label="Day">${days.map(d => { const dt = pDate(d); const z = inTrip(d) ? zoneAt(d) : null; const nt = noteFn ? noteFn(d) : '';
    return `<button class="dp" data-a="${act}" data-date="${d}" aria-pressed="${d === sel}"><small>${S.lang === 'hi' ? DOW_HI[dt.getUTCDay()] : DOW[dt.getUTCDay()]}</small><b>${dt.getUTCDate()}</b>${z ? `<i style="background:${ZC(z)}">${ZSHORT[z] || ZN[z].name}</i>` : nt ? `<i class="nt">${nt}</i>` : `<i class="nt">${MON[dt.getUTCMonth()]}</i>`}</button>`; }).join('')}
    <label class="dp more" for="dmore">${ic('cal', 18)}<i class="nt">More</i><input id="dmore" data-act="${act}" type="date" min="${TODAY}" value="${sel}"></label></div>`;
}
const primary = btn => btn.replace(/class="btn"(?![^>]*\bghost\b)/, 'class="btn primary"');   // only the main action gets the marigold ticket
const ctaBar = (amt, sub, btn) => `<div class="cta wrap"><div class="tot"><b>${amt == null ? t('onReq') : inr(amt)}</b><small>${sub}</small></div>${primary(btn)}</div>`;
const ctaBarBd = (amt, sub, btn) => `<div class="cta wrap"><button class="tot bd" data-a="breakdown" aria-label="${t('seeBreakdown')}"><b>${amt == null ? t('onReq') : inr(amt)} ${ic('back', 14, 2.4).replace('<svg', '<svg style="transform:rotate(90deg)"')}</b><small>${sub} · ${t('breakdown')}</small></button>${primary(btn)}</div>`;

/* ---------- HOME ---------- */
/* signature: the archipelago as one chain, north to south. Draws itself once per visit. */
const NS = ['DIG', 'MAY', 'RAN', 'LON', 'BAR', 'HAV', 'NEI', 'PBL', 'WAN', 'LIT'];


function zoneOpts(sel, list = ['PBL', 'HAV', 'NEI', 'BAR', 'RAN', 'LON', 'MAY', 'DIG', 'LIT']) { return list.map(z => `<option value="${z}" ${z === sel ? 'selected' : ''}>${ZN[z].name}</option>`).join(''); }

/* ---------- SEARCH ---------- */
function vSearch(v) {
  const q = (v.q || '').trim().toLowerCase(); const tag = v.tag;
  const score = (name, rest) => { if (!q) return 1; const n = name.toLowerCase(), r = rest.toLowerCase(); const wb = new RegExp('(^|[^a-z])' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return n.startsWith(q) ? 100 : wb.test(n) ? 80 : n.includes(q) ? 50 : wb.test(r) ? 30 : r.includes(q) ? 5 : 0; };
  let acts = D.acts.filter(a => shown(a) && (!tag || a.tags.includes(tag))).map(a => ({a, sc:score(a.n, a.v + ' ' + a.fam + ' ' + ZN[a.z].name + ' ' + (a.site || ''))})).filter(x => x.sc > 0).sort((x, y) => y.sc - x.sc).map(x => x.a);
  let hot = q ? D.hotels.map(h => ({h, sc:score(h.n, ZN[h.z].name + ' ' + (h.a || ''))})).filter(x => x.sc >= 30).sort((x, y) => y.sc - x.sc).map(x => x.h) : [];
  const zs = q ? D.zones.filter(z => (z.name + ' ' + z.official).toLowerCase().includes(q)) : [];
  acts = acts.slice(0, 40); hot = hot.slice(0, 12);
  return {title:'Search', body:`<div class="wrap"><div class="sec">
    <div class="search">${ic('search', 20)}<input id="q" type="search" placeholder="${t('search')}" value="${esc(v.q || '')}" autocomplete="off"></div>
    <div class="chips">${Object.keys(TAGNAME).filter(k => !['uw', 'sea', 'fit', 'sen'].includes(k)).map(g => `<button class="chip" data-a="search" data-tag="${g === tag ? '' : g}" aria-pressed="${g === tag}">${TAGNAME[g]}</button>`).join('')}</div>
    ${zs.map(z => `<button class="mini" data-a="store" data-zone="${z.id}"><span class="sw">${art(z.id, null, z.id + 'm', {noGlyph:true})}</span><div><b>${z.name}</b><span>${z.official} · ${z.region}</span></div></button>`).join('')}
    <div class="list">${hot.map(h => hotelCard(h)).join('')}${acts.map(a => actCard(a)).join('')}</div>
    ${!acts.length && !hot.length && !zs.length ? `<p class="muted">Nothing matches “${esc(v.q)}”. Try a beach, an island or an activity like “snorkelling”.</p>` : ''}
  </div></div>`};
}

/* ---------- CARDS ---------- */
const offSeason = (a, date) => date && !seasonOk(a.sea, date) ? `Not running in ${MON[pDate(date).getUTCMonth()]}` : '';
function actCard(a, date) {
  const off = offSeason(a, date || baseDate()); const f = date && !off ? fitOf({kind:'act', ref:a.id, date, t:slotsFor(a)[0]}) : null; const p = actUnit(a, date || baseDate());
  return `<button class="pcard${off ? ' off' : ''}" data-a="product" data-kind="act" data-id="${a.id}" ${date ? `data-date="${date}"` : ''} style="--zc:${ZC(a.z)}"><span class="art">${art(a.z, a.entry ? 'camera' : (FAMICON[a.fam] || 'wave'), a.id)}<span class="zt">${ZN[a.z].name}</span></span><span class="bd"><h3>${esc(a.n)}</h3><span class="meta"><span>${esc(a.v)}</span>${gChip(a)}${a.new ? `<span class="tag ok">New ${a.new}</span>` : ''}</span><span class="meta"><span>${ic('clock', 13)} ${durOf(a) || 'Flexible'}</span><span>${ic('pin', 13)} ${ZN[a.z].name}</span>${a.age ? `<span>${a.age}+ yrs</span>` : ''}</span><span class="foot">${a.entry ? `<span class="price">${p ? 'Entry ' + inr(p) : 'Free entry'}</span>` : priceLine(p, unitOf(a.b), a.est)}${off ? `<span class="tag">${off}</span>` : fitTag(f)}</span></span></button>`;
}
function hotelFrom(h, date) { const sz = season(date || baseDate()); return Math.min(...h.rooms.map(r => r['s_' + sz] || r.s_hi)); }
function hotelCard(h, date, nights) {
  const room = h.rooms[0]; const f = date ? fitOf({kind:'stay', ref:h.id, date, nights:nights || 1, qty:1, room:room.n}) : null;
  return `<button class="pcard" data-a="product" data-kind="stay" data-id="${h.id}" ${date ? `data-date="${date}"` : ''} style="--zc:${ZC(h.z)}"><span class="art">${art(h.z, 'bed', h.id)}<span class="zt">${h.t || ZN[h.z].name}</span></span><span class="bd"><h3>${esc(h.n)}</h3><span class="meta">${stars(h.rt, h.rv)}${h.t ? `<span>${h.t}</span>` : ''}<span>${ic('pin', 13)} ${ZN[h.z].name}</span></span><span class="meta"><span>${esc(h.rooms.slice(0, 2).map(r => r.n).join(' · '))}${h.rooms.length > 2 ? ' +' + (h.rooms.length - 2) : ''}</span></span><span class="foot"><span class="price">${inr(hotelFrom(h, date))} <small>${t('perNight')}${h.est ? ' · est.' : ''}</small></span>${fitTag(f)}</span></span></button>`;
}
function cabCard(r, date) {
  const v = vehFor(r);
  return `<button class="pcard" data-a="product" data-kind="cab" data-id="${r.id}" ${date ? `data-date="${date}"` : ''} style="--zc:${ZC(r.z)}"><span class="art">${art(r.z, 'car', r.id)}<span class="zt">${r.km} km</span></span><span class="bd"><h3>${esc(r.b)}</h3><span class="meta"><span>from ${esc(r.a)}</span></span><span class="meta"><span>${ic('clock', 13)} ${r.km} km · ${durTxt(r.mins)}</span>${r.wait ? `<span>return with ${r.wait} h wait</span>` : ''}</span><span class="foot">${priceLine(v.ow || v.ret, v.ow ? `${v.c} · one way` : `${v.c} · return`)}</span></span></button>`;
}
function rentCard(r) {
  return `<button class="pcard" data-a="product" data-kind="rent" data-id="${r.id}" style="--zc:${ZC(r.z)}"><span class="art">${art(r.z, 'scooter', r.id)}<span class="zt">${ZN[r.z].name}</span></span><span class="bd"><h3>${esc(r.n)}</h3><span class="meta"><span>Rental · 24 hours · ${esc(r.fuel)}</span></span><span class="meta"><span>Deposit ${inr(r.dep)}</span></span><span class="foot">${priceLine(r.p, '/ day')}</span></span></button>`;
}

/* ---------- STORE ---------- */
/* the four aisles as big, obvious tabs with what's inside */
function aisleTabs(z, aisle) {
  const n = {get:BOOKABLE.filter(s => s.to === z || s.f === z).length, stay:D.hotels.filter(h => h.z === z).length, move:D.routes.filter(r => r.z === z).length + D.rentals.filter(r => r.z === z).length, do:D.acts.filter(a => (a.z === z || (z === 'PBL' && (a.z === 'WAN' || a.z === 'BAR'))) && shown(a)).length};
  const T4 = [['get', 'ferry', t('getThere'), n.get ? `${n.get} sailings` : 'Road / ship'], ['stay', 'bed', t('stay'), `${n.stay} places`], ['move', 'car', t('move'), `${n.move} rides`], ['do', 'mask', t('doo'), `${n.do} things`]];
  return T4.map(([k, i, l, c]) => `<button role="tab" data-a="aisle" data-aisle="${k}" aria-selected="${aisle === k}"><span class="ai">${ic(i, 22, 1.9)}</span><b>${l}</b><small>${c}</small></button>`).join('');
}
/* one expandable guide instead of two small tiles */
function aboutTile(z) {
  const Z = ZN[z], A = ABOUT[z] || {};
  return `<details class="about" style="--zc:${ZC(z)}"><summary><div class="ab-top"><b>${t('aboutH')} ${Z.name}</b><span>${esc(A.why || Z.notes)}</span></div>
      <div class="ab-facts"><span>${ic('ferry', 16)} ${esc(Z.reach)}</span><span>${ic('moon', 16)} ${Z.typN ? `${t('nightsTyp')}: ${Z.typN}N` : t('dayTrip')}</span></div><span class="ab-more">${t('readMore')} ${ic('back', 14, 2.4).replace('<svg', '<svg style="transform:rotate(-90deg)"')}</span></summary>
    <dl class="ab-dl">${[['bestFor', A.best], ['getAround', A.around], ['goodTime', A.time], ['tips', A.tips], ['nightsTyp', Z.nNote || (Z.typN ? Z.typN + ' nights' : '')]].filter(x => x[1]).map(([k, x]) => `<dt>${t(k)}</dt><dd>${esc(x)}</dd>`).join('')}</dl></details>`;
}
function vStore(v) {
  const z = v.zone, Z = ZN[z]; const aisle = v.aisle || 'do'; const date = v.date || defaultDayFor(z);
  const tabs = [['get', t('getThere')], ['stay', t('stay')], ['move', t('move')], ['do', t('doo')]];
  let content = '';
  if (aisle === 'stay') {
    const tier = v.tier || ''; const nights = Math.max(1, Z.typN || 1); const sort = v.sort || 'rec';
    let hs = D.hotels.filter(h => h.z === z && (!tier || h.t === tier) && stayOk(h));
    hs.sort((a, b) => sort === 'price' ? hotelFrom(a, date) - hotelFrom(b, date) : sort === 'rating' ? (b.rt || 0) - (a.rt || 0) : ((a.est ? 1 : 0) - (b.est ? 1 : 0)) || ((b.rt || 0) * Math.log10((b.rv || 1) + 1) - (a.rt || 0) * Math.log10((a.rv || 1) + 1)));
    const tiers = ['Budget', 'Standard', 'Deluxe', 'Premium', 'Luxury'].filter(x => D.hotels.some(h => h.z === z && h.t === x));
    content = `<div class="eyebrow">Check-in day · ${SEASON_NAME[season(date)].toLowerCase()} prices</div>${dayPicker(date, 'storedate')}
      ${tiers.length ? `<div class="chips"><button class="chip" data-a="tier" data-tier="" aria-pressed="${!tier}">All</button>${tiers.map(x => `<button class="chip" data-a="tier" data-tier="${x}" aria-pressed="${tier === x}">${x}</button>`).join('')}</div>` : ''}${stayFilterBar(z)}
      <div style="display:flex;justify-content:space-between;align-items:center"><span class="muted" style="font-size:13px">${hs.length} stays · lowest room price</span><select id="sort" style="border:1px solid var(--line);border-radius:10px;background:var(--surface);height:34px;padding:0 8px;font-size:13px;font-weight:600"><option value="rec" ${sort === 'rec' ? 'selected' : ''}>Recommended</option><option value="price" ${sort === 'price' ? 'selected' : ''}>Price: low to high</option><option value="rating" ${sort === 'rating' ? 'selected' : ''}>Rating</option></select></div>
      <div class="list">${hs.map(h => hotelCard(h, date, nights)).join('') || `<p class="muted">No stays listed here yet.</p>`}</div>`;
  } else if (aisle === 'move') {
    const rs = D.routes.filter(r => r.z === z || (z === 'WAN' && /Wandoor/.test(r.b)) || (z === 'BAR' && /Baratang/.test(r.b)));
    const origins = [...new Set(rs.map(r => r.a))]; const og = v.og && origins.includes(v.og) ? v.og : origins[0];
    const rents = D.rentals.filter(r => r.z === z);
    content = moveContent(z, rs, rents, date, v);
  } else if (aisle === 'get') {
    const from = v.from || (z === 'PBL' ? 'HAV' : 'PBL');
    content = routeBody(from, z, v.fdate || date, v);
  } else {
    const ck = v.ck || ''; const zs = z === 'PBL' ? ['PBL', 'WAN', 'BAR'] : [z];
    let acts = D.acts.filter(a => zs.includes(a.z) && shown(a) && actOk(a));
    const cats = CATS.filter(c => acts.some(a => c.fams.includes(a.fam)));
    acts.sort((a, b) => (!!offSeason(a, date) - !!offSeason(b, date)) || (CATS.indexOf(catOf(a)) - CATS.indexOf(catOf(b))) || ((a.p || 0) - (b.p || 0)));
    const c = CATS.find(x => x.k === ck);
    let list;
    if (c && c.subs) list = c.subs.map(([lab, fam]) => { const l = acts.filter(a => a.fam === fam); return l.length ? `<div class="eyebrow" style="margin-top:6px">${esc(lab)}</div>` + l.map(a => actCard(a, date)).join('') : ''; }).join('');
    else list = (c ? acts.filter(a => c.fams.includes(a.fam)) : acts).map(a => actCard(a, date)).join('');
    content = `<div class="eyebrow">Checking fit for</div>${dayPicker(date, 'storedate')}
      <div class="chips"><button class="chip" data-a="cat" data-ck="" aria-pressed="${!ck}">All</button>${cats.map(x => `<button class="chip" data-a="cat" data-ck="${x.k}" aria-pressed="${ck === x.k}">${esc(x.n)}</button>`).join('')}</div>${actFilterBar(acts.length)}<p class="note"><button class="linkish" data-a="go" data-v="exp">See experiences on every island</button></p>
      ${z === 'PBL' ? `<p class="note">Includes day trips to Wandoor (Jolly Buoy, Red Skin) and Baratang.</p>` : ''}
      <div class="list">${list || `<p class="muted">Activities here are being added.</p>`}</div>`;
  }
  return {title:Z.name, hero:true, body:`
    <div class="storehero" style="--zc:${ZHEX[z]}">${art(z, null, z + 'hero')}<div class="in wrap"><div class="eyebrow"><i></i>${Z.region} · ${Z.status}</div><h1>${Z.name}</h1><p>${Z.official !== Z.name ? Z.official + ' · ' : ''}${esc(Z.notes)}</p></div></div>
    <div class="wrap isl-sw"><div class="chips" aria-label="${t('otherIsl')}">${NS.map(x => `<button class="chip" data-a="store" data-zone="${x}" data-aisle="${aisle}" aria-pressed="${x === z}"><span class="dot" style="background:${ZC(x)}"></span>${ZN[x].name}</button>`).join('')}</div></div>
    <div class="aisles wrap" role="tablist">${aisleTabs(z, aisle)}</div>
    <div class="wrap"><div class="sec">
      ${aboutTile(z)}
      ${aisle === 'do' ? blocksRail(z, date) : ''}
      ${aisle === 'do' ? `<div class="sechd" style="margin-top:6px"><h2 style="font-size:22px">Single activities and places</h2></div>` : ''}
      ${content}
    </div></div>`};
}

/* ---------- FERRY (Get there) ---------- */
function routeBody(from, to, date, v) {
  const sails0 = BOOKABLE.filter(s => s.f === from && s.to === to); const both = sails0.some(s => s.gov) && sails0.some(s => !s.gov);
  const sails = (both && S.ff ? sails0.filter(s => (S.ff === 'gov') === !!s.gov) : sails0).sort((a, b) => tm(a.dep) - tm(b.dep));
  const dayMin = d => { const ok = sails.filter(s => sailsOn(s, d) && classFares(s).some(c => seats(s.id, c.name, d) >= pax())); if (!ok.length) return sails.some(s => sailsOn(s, d)) ? 'Full' : 'No ship'; return inr(Math.min(...ok.map(s => Math.min(...classFares(s).filter(c => seats(s.id, c.name, d) >= pax()).map(c => c.fare))))); };
  const head = `<div class="finder">
    <div class="row"><div class="sel"><label for="rf">${t('from')}</label><select id="rf">${zoneOpts(from)}</select></div><button class="swap" data-a="swaproute" aria-label="Swap">${ic('swap', 16)}</button><div class="sel"><label for="rt">${t('to')}</label><select id="rt">${zoneOpts(to)}</select></div></div>
    ${dayPicker(date, 'routedate', sails.length ? dayMin : null)}
    <button class="ownrow" data-a="ownmode" role="switch" aria-checked="${!!v.own}"><span style="flex:1;text-align:left"><b>Already booked this ferry?</b><small>Add it to your trip without paying, so we can check your timings</small></span><span class="toggle" aria-hidden="true" ${v.own ? 'aria-checked="true"' : ''}></span></button>
  </div>`;
  if (from === to) return `<div class="route">${head}<div class="route-res"><p class="muted">Pick two different islands.</p></div></div>`;
  const ownForm = (v.own || !sails.length) ? `<div class="card"><h3>${sails.length ? 'Not in this list?' : 'Booked a ferry on this route elsewhere?'}</h3><p class="note" style="margin-top:-4px">Add it with its times so we can plan around it. You won't pay for it here.</p>
    <div class="field"><label for="oop">Ferry or operator</label><input id="oop" placeholder="e.g. Makruzz, Green Ocean, govt ship"></div>
    <div class="two"><div class="field"><label for="odep">Departs</label><input id="odep" type="time" value="09:00"></div><div class="field"><label for="oarr">Arrives</label><input id="oarr" type="time" value="10:30"></div></div>
    <button class="btn block ghost" data-a="addown">Add my ferry · ${fD(date)}</button></div>` : '';
  let body = '';
  if (sails.length) {
    const ev = sails.map(s => { const cls = classFares(s); const avail = cls.filter(c => seats(s.id, c.name, date) >= pax()); const off = (!avail.length || !sailsOn(s, date)) && !v.own;
      const f = S.cart.length && !off ? fitOf({kind:'ferry', ref:s.id, date, cls:(avail[0] || cls[0]).name, own:v.own, uid:v.editUid}) : null; return {s, cls, avail, off, f}; });
    const usable = ev.filter(x => !x.off && (!x.f || x.f.state !== 'bad')); const best = S.cart.length ? usable.slice().sort((p, q) => ferryPref(q.s) - ferryPref(p.s) - (q.f && q.f.soft.length ? 5 : 0) + (p.f && p.f.soft.length ? 5 : 0))[0] : null;
    const clash = ev.filter(x => x.off || (x.f && x.f.state === 'bad'));
    const card = (x, isBest) => { const {s, cls, avail, off, f} = x;
      const open = v.sel === s.id;
      const dur = (tm(s.arr) - tm(s.dep) + 1440) % 1440; const short = s.op.replace(/ \d$/, ''); const left = Math.min(...avail.map(c => seats(s.id, c.name, date)));
      const conf = /Conflict|Estimate/.test(s.conf) ? `<span class="tag warn">Time not yet confirmed by operator</span>` : '';
      return `<div class="fare ${off ? 'off' : ''}${isBest ? ' best' : ''}" aria-pressed="${open}">${isBest ? `<div class="bestbar">${ic('star', 14)} Best for your trip · ${esc(prefWhy(s))}</div>` : ''}<button class="fhead" data-a="pick" data-id="${s.id}" ${off ? 'disabled' : ''} aria-expanded="${open}">
        <span class="op"><span class="lg" style="background:${s.gov ? '#5b6b6a' : ZHEX[to]}">${short.slice(0, 2).toUpperCase()}</span>${esc(short)}${s.gov ? ' <span class="tag">Government</span>' : ''}${v.editUid && S.cart.some(i => i.uid === v.editUid && i.ref === s.id) ? ' <span class="tag">Your ferry now</span>' : ''}<span style="margin-left:auto">${off ? `<span class="tag">${sailsOn(s, date) ? 'Full' : 'Not this day'}</span>` : `<span class="price">${inr(Math.min(...(avail.length ? avail : cls).map(c => c.fare)))}</span>`}</span></span>
        <span class="tl"><span class="t">${s.dep}<small>${esc(s.fromPt)}</small></span><span class="ln"><span>${durTxt(dur)}</span></span><span class="t" style="text-align:right">${s.est ? '~' : ''}${s.arr}${s.nxt ? '<sup>+1</sup>' : ''}<small>${esc(s.toPt)}</small></span></span>
        ${govLine(s, date)}<span class="ft"><span class="muted" style="font-size:12.5px">${cls.map(c => c.name).join(', ')} · report ${s.rep} min early</span><span style="display:flex;gap:6px;flex-wrap:wrap">${!off && left < 8 ? `<span class="tag mg">${left} seats left</span>` : ''}${fitTag(f)}${conf}</span></span>${f && f.state === 'bad' && f.hard[0].msg ? `<span class="fwhy">${esc(f.hard[0].msg)}</span>` : ''}</button>
        ${open ? `<div class="classes" role="radiogroup" aria-label="Class">${(() => { const ch = cls.slice().sort((a, b) => a.fare - b.fare)[0]; const nn = seats(s.id, ch.name, date); return !v.own && nn < pax() && avail.length ? `<div class="fitbox warn"><div class="ln">${ic('alert', 16)}<p>${esc(ch.name)} has ${nn ? 'only ' + nn + ' seat' + (nn > 1 ? 's' : '') : 'no seats'} left for your ${pax()}, so we've picked ${esc(v.cls || avail[0].name)} at ${inr(fareOf(s, v.cls || avail[0].name))}.</p></div></div>` : ''; })()}${cls.map(c => { const n = seats(s.id, c.name, date); const dis = n < pax() && !v.own; return `<button class="cls" role="radio" data-a="cls" data-cls="${esc(c.name)}" aria-checked="${v.cls === c.name}" ${dis ? 'disabled' : ''}><span class="rd"></span><span style="flex:1;min-width:0"><b>${esc(c.name)}</b><small>${dis ? (n ? `Only ${n} seat${n > 1 ? 's' : ''} left` : 'Full') : n < 8 ? `<span style="color:var(--warn);font-weight:700">${n} seats left</span>` : 'Seats available'}</small></span><span class="price">${inr(c.fare)}</span></button>`; }).join('')}</div>` : ''}
      </div>`; };
    const main = S.cart.length ? usable.filter(x => x !== best) : ev;
    body = `<div class="sechd"><h2 style="font-size:17px">${ev.filter(x => !x.off).length} of ${sails.length} sailing${sails.length === 1 ? '' : 's'} · ${fD(date)}</h2><span class="muted" style="font-size:12px">Fare / seat · ${paxTxt()}</span></div>${both ? `<div class="chips">${[['', 'All ferries'], ['priv', 'Private'], ['gov', 'Government']].map(([k, l]) => `<button class="chip sm" data-a="ffset" data-k="${k}" aria-pressed="${(S.ff || '') === k}">${l}</button>`).join('')}</div>` : ''}
      ${S.cart.length && best ? `<p class="note" style="margin-top:-4px">Sorted around your trip: the one we'd pick first, then others that fit.</p>` : ''}
      <div class="legs">${best ? card(best, true) : ''}${main.map(x => card(x)).join('')}</div>
      ${S.cart.length && clash.length ? `<details class="clash"${clash.some(x => x.s.id === v.sel) ? ' open' : ''}><summary>${clash.length} more that don't fit your plans</summary><div class="legs">${clash.map(x => card(x)).join('')}</div></details>` : ''}`;
    if (v.sel && v.cls && !v.own) body += chainView(SAIL[v.sel], date, v);
    body += ownForm;
  } else {
    const via = D.zm.find(r => r.f === from && r.t === to); const road = D.routes.filter(r => r.kind === 'road' && from === 'PBL' && r.move === to);
    const loc = D.local.filter(l => new RegExp(ZN[to].name, 'i').test(l.rt) && new RegExp(ZN[from].name === 'Port Blair' ? 'Rangat|Yerrata|Chatham|Middle Strait|Mayabunder' : ZN[from].name, 'i').test(l.rt));
    body = `<div class="card"><h3>${via && via.ok ? esc(via.mode) : 'No direct private ferry'}</h3><p class="note" style="font-size:13.5px">${esc(via ? via.note || '' : 'Route through Port Blair.')}${via && via.h ? ` About ${via.h} hrs.` : ''}</p></div>
      ${road.length ? `<div class="list">${road.map(r => cabCard(r, date)).join('')}</div><p class="note">Government ships also sail to ${ZN[to].name} a few times a week; tickets open 2 days before at the Phoenix Bay counter.</p>` : ''}
      ${loc.map(l => `<div class="card"><b>${esc(l.rt)}</b><span class="muted" style="font-size:13px">${esc(l.op)} · ${esc(l.days)}</span><span style="font-size:13px">${l.fares.map(f => `${esc(f.n)} <b>${inr(f.f)}</b>`).join(' · ')}</span><span class="note">Bought at the jetty on the day.</span></div>`).join('')}
      ${from !== 'PBL' && to !== 'PBL' ? `<div class="chain">${[[from, 'PBL'], ['PBL', to]].map(([a, b], i) => `<div class="cl"><span class="ct">${i + 1}</span><span class="rail"><span class="nd leg"></span></span><span class="cx"><b>${ZN[a].name} → ${ZN[b].name}</b><small>${BOOKABLE.some(s => s.f === a && s.to === b) ? 'Ferry' : 'Road or govt ship'}</small></span><button class="btn sm quiet" data-a="route" data-from="${a}" data-to="${b}" data-date="${date}">Find</button></div>`).join('')}</div>` : ''}`;
  }
  return `<div class="route">${head}<div class="route-res">${body}${sails.length ? '' : ownForm}${dssLink()}${boatOffer(from, to, date)}</div></div>`;
}
function jettyLegs(s, date) {
  const preF = placeRoute(baseKey(S.cart, s.f, date, true), JKEY(s), s.f), postF = placeRoute(JKEY_TO(s), baseKey(S.cart, s.to, date, false), s.to);
  const leg = (f, z, toJetty) => { if (!f) return null; const r = f.r; const st = stayOn(S.cart, z, date, toJetty);
    const place = toJetty ? (f.rev ? r.b : r.a) : (f.rev ? r.a : r.b); return {r, rev:f.rev, v:vehFor(r), place:st ? HOT[st.ref].n : place}; };
  return {pre:leg(preF, s.f, true), post:leg(postF, s.to, false)};
}
function chainView(s, date, v) {
  const n = pax(); const fare = fareOf(s, v.cls); const L = jettyLegs(s, date);
  const preR = L.pre && L.pre.r, postR = L.post && L.post.r;
  const pre = L.pre && L.pre.v, post = L.post && L.post.v; const withPre = v.pre ?? false, withPost = v.post ?? true;
  const legs = [
    pre && {t:hm(tm(s.dep) - s.rep - preR.mins - 10), node:'leg', b:`Cab to ${s.fromPt}`, s:`${pre.c} from ${L.pre.place} · about ${preR.mins} min`, p:pre.ow, opt:'pre'},
    {t:hm(tm(s.dep) - s.rep), node:'stop', b:`Report at ${s.fromPt}`, s:`Gate closes 30 min before departure. Carry photo ID.`},
    {t:s.dep, node:'leg', b:`${s.op.replace(/ \d$/, '')} ferry · ${v.cls}`, s:`${durTxt((tm(s.arr) - tm(s.dep) + 1440) % 1440)} · ${n} × ${inr(fare)}`, p:fare * n},
    {t:s.arr, node:'stop', b:`Arrive ${s.toPt}`, s:ZN[s.to].name},
    post && {t:s.arr, node:'leg', b:`Cab to ${L.post.place}`, s:`${post.c} for ${n} · switch off if you have transport`, p:post.ow, opt:'post'}
  ].filter(Boolean);
  const sum = fare * n + (withPre && pre ? pre.ow : 0) + (withPost && post ? post.ow : 0);
  return `<div class="sechd" style="margin-top:6px"><h2 style="font-size:17px">Door to door</h2><span class="muted mono" style="font-size:12px">${inr(sum)}</span></div>
    <div class="chain">${legs.map(l => `<div class="cl"><span class="ct">${l.t}</span><span class="rail"><span class="nd ${l.node === 'leg' ? 'leg' : ''}"></span></span><span class="cx"><b>${esc(l.b)}</b><small>${esc(l.s)}</small></span>${l.opt ? `<button class="toggle" role="switch" aria-label="Include ${esc(l.b)}" aria-checked="${l.opt === 'pre' ? withPre : withPost}" data-a="leg" data-leg="${l.opt}"></button>` : l.p ? `<span class="cp">${inr(l.p)}</span>` : '<span></span>'}</div>`).join('')}</div>`;
}
function chainTotal(v) {
  const s = SAIL[v.sel]; if (v.own) return 0; const fare = fareOf(s, v.cls) * pax(); const L = jettyLegs(s, v.date);
  return fare + ((v.pre ?? false) && L.pre ? L.pre.v.ow : 0) + ((v.post ?? true) && L.post ? L.post.v.ow : 0);
}
function vRoute(v) {
  const s = v.sel && SAIL[v.sel]; let cta = '';
  if (s && (v.cls || v.own)) cta = ctaBar(chainTotal(v), v.own ? 'Booked elsewhere · no payment here' : `${ZN[v.from].name} → ${ZN[v.to].name} · ${t('taxes')}`,
    v.own ? `<button class="btn" data-a="addferry">Add to my trip</button>` : s.gov ? `<button class="btn" data-a="addferry">${v.editUid ? t('update') : t('addToTrip')}</button>` : `<button class="btn" data-a="toseats">Choose seats</button>`);
  return {title:t('getThere'), body:`<div class="wrap"><div class="sec">${dateNudge('ferry')}${routeBody(v.from, v.to, v.date, v)}</div></div>`, cta};
}
/* seat map (illustrative layout) */
function layoutFor(s, cls) { const lux = /Royal|Majesty|Business|Luxury|AC/i.test(cls); return {cols:lux ? ['A', 'B', '', 'C', 'D'] : ['A', 'B', 'C', '', 'D', 'E', 'F'], rows:lux ? 6 : 12}; }
function seatState(s, cls, date) {
  const {cols, rows} = layoutFor(s, cls); const all = []; for (let r = 1; r <= rows; r++) cols.forEach(c => { if (c) all.push(r + c); });
  const n = seats(s.id, cls, date); const freeN = n >= 40 ? Math.round(all.length * .55) : n;
  const order = all.slice().sort((a, b) => hash(s.id + cls + date + a) - hash(s.id + cls + date + b)); return {cols, rows, free:new Set(order.slice(0, freeN))};
}
function autoSeats(v) {
  const s = SAIL[v.sid]; const st = seatState(s, v.cls, v.date); const n = pax();
  for (let r = 1; r <= st.rows; r++) { const runs = []; let c0 = []; st.cols.forEach(c => { if (c && st.free.has(r + c)) c0.push(r + c); else { if (c0.length) runs.push(c0); c0 = []; } }); if (c0.length) runs.push(c0); const fit = runs.find(x => x.length >= n); if (fit) return fit.slice(0, n); }
  for (let r = 1; r <= st.rows; r++) { const row = st.cols.filter(c => c && st.free.has(r + c)).map(c => r + c); if (row.length >= n) return row.slice(0, n); }
  for (let r = 1; r < st.rows; r++) { const two = [r, r + 1].flatMap(x => st.cols.filter(c => c && st.free.has(x + c)).map(c => x + c)); if (two.length >= n) return two.slice(0, n); }
  const all = []; for (let r = 1; r <= st.rows; r++) st.cols.forEach(c => { if (c && st.free.has(r + c)) all.push(r + c); }); return all.slice(0, n);
}
function vSeats(v) {
  const s = SAIL[v.sid]; const fare = fareOf(s, v.cls); const st = seatState(s, v.cls, v.date); const sel = v.picked || []; const n = pax();
  let grid = ''; for (let r = 1; r <= st.rows; r++) grid += `<div class="srow"><span class="rn">${r}</span>${st.cols.map(c => { if (!c) return '<span class="aisle"></span>'; const id = r + c; const isSel = sel.includes(id); const free = st.free.has(id); return `<button class="seat ${isSel ? 'sel' : free ? '' : 'taken'}" data-a="seat" data-seat="${id}" ${free || isSel ? '' : 'disabled'} aria-label="Seat ${id}${free ? '' : ' booked'}" aria-pressed="${isSel}">${c}</button>`; }).join('')}<span class="rn">${r}</span></div>`;
  const done = sel.length === n;
  return {title:'Choose seats', body:`<div class="wrap"><div class="sec">
    <div class="card" style="gap:4px"><span class="eyebrow">${esc(s.op.replace(/ \d$/, ''))} · ${esc(v.cls)}</span><b style="font-size:16px">${ZN[s.f].name} → ${ZN[s.to].name}</b><span class="muted" style="font-size:13.5px">${fD(v.date)} · ${s.dep}–${s.arr} · report by ${hm(tm(s.dep) - s.rep)}</span></div>
    <div class="legend"><span><i class="seat mini"></i>Free</span><span><i class="seat mini sel"></i>Your seat</span><span><i class="seat mini taken"></i>Booked</span></div>
    <p style="margin:0;font-weight:700">Pick ${n} seat${n > 1 ? 's' : ''} <span class="muted" style="font-weight:600">· ${sel.length} of ${n}${sel.length ? ': ' + sel.join(', ') : ''}</span></p>
    <div class="deck"><div class="bow">Front of the ferry</div><div class="sgrid">${grid}</div><div class="stern">Back · luggage area</div></div>
    <button class="btn ghost block" data-a="autoseat">Pick the best seats for me</button>
    <p class="note">Seat plan is illustrative for the prototype.${S.pax.infants ? ' Infants sit on a lap and do not need a seat.' : ''}</p>
  </div></div>`, cta:ctaBar(fare * n, `${n} × ${inr(fare)} · ${t('taxes')}`, `<button class="btn" data-a="addferry" ${done ? '' : 'disabled'}>${done ? (v.editUid ? t('update') : t('addToTrip')) : `Pick ${n - sel.length} more`}</button>`)};
}

/* ---------- PRODUCT ---------- */
function initCfg(k, id, date, after) {
  if (k === 'act') { const a = ACT[id]; const sl = slotsFor(a); const base = {kind:k, ref:id, qty:a.b === 'per_unit' ? Math.max(1, Math.ceil(pax() / 2)) : 1};
    if (a.b === 'per_pax') { base.pa = S.pax.adults; base.pk = kidsOk(a); }
    // rides on another booking (sea walk on the Elephant Beach boat): same day, during that trip
    const carr = RULES.filter(r => isCarrierRule(r) && inList(r.a, id)).flatMap(r => S.cart.filter(c => inRefs(r.b, c) && c.kind === 'act'))[0];
    if (carr && (!date || carr.date === date)) { const ct = tm(carr.t || ACT[carr.ref].t); const s1 = sl.find(x => tm(x) >= ct + 60) || sl.find(x => tm(x) >= ct) || hm(ct + 60); return Object.assign(base, {date:carr.date, t:s1}); }
    const days = [date || defaultDayFor(a.z)]; if (!date && S.trip && S.cart.length) { for (let n = 0; n < nDays(); n++) { const d = addD(S.trip.start, n); if (!days.includes(d) && zoneAt(d) && reach(a.z, zoneAt(d))) days.push(d); } }
    const order = after ? sl.filter(x => tm(x) >= tm(after)).concat(sl.filter(x => tm(x) < tm(after))) : sl;
    if (S.cart.length) for (const d of days) for (const t0 of order) { const c = Object.assign({}, base, {date:d, t:t0}); if (fitOf(c).state !== 'bad') return c; }
    if (!S.cart.length) { const d = days.find(d0 => !availability(Object.assign({}, base, {date:d0, t:order[0]}))); if (d) return Object.assign(base, {date:d, t:order[0]}); }
    return Object.assign(base, {date:days[0], t:order[0]}); }
  if (k === 'stay') { const h = HOT[id]; const d = date || firstFreeNight(h.z); return {kind:k, ref:id, date:d, nights:defaultNights(h.z, d), qty:Math.max(1, Math.ceil(S.pax.adults / (h.rooms[0].ma || 2))), room:h.rooms[0].n}; }
  if (k === 'cab') { const r = ROUTE[id]; const fi = flightIn(); const air = r.kind === 'airport' && fi; return {kind:k, ref:id, date:date || (air ? fi.date : defaultDayFor(r.z)), t:air ? hm(tm(fi.arr) + 20) : (after || '09:00'), vc:vehFor(r).c, ret:false, rev:false}; }
  if (k === 'rent') { const r = RENT[id]; return {kind:k, ref:id, date:date || defaultDayFor(r.z), t:'09:00', qty:Math.max(1, Math.ceil(pax() / 2)), days:1}; }
}
function firstFreeNight(zone) {
  if (!S.trip || !S.cart.length) return defaultDayFor(zone); const pos = makePos(expand(S.cart)); const last = flightOut() ? dayIdx(flightOut().date) : nDays() - 1;
  const free = d => !S.cart.some(i => i.kind === 'stay' && i.date <= d && addD(i.date, i.nights) > d);
  for (let n = 0; n < last; n++) { const d = addD(S.trip.start, n); if (reach(zone, pos(abs(n, 1380))) && free(d)) return d; }
  for (let n = 0; n < last; n++) { const d = addD(S.trip.start, n); if (free(d)) return d; }   // a night with no stay yet: you may be heading there
  return defaultDayFor(zone);
}
function defaultNights(zone, date) { // nights until you leave the island, the next stay starts, or you fly home
  const typ = Math.max(1, ZN[zone].typN || 1); if (!S.trip || !S.cart.length) return typ;
  const evs = expand(S.cart); const pos = makePos(evs); const fo = flightOut(); const last = fo ? dayIdx(fo.date) : nDays() - 1;
  const leaves = evs.some(e => e.move && e.zone === zone && e.s >= abs(dayIdx(date), 0));
  let n = 0; for (let k = dayIdx(date); k < last; k++) { const d = addD(S.trip.start, k); if (pos(abs(k, 1380)) !== zone && k > dayIdx(date)) break; if (S.cart.some(i => i.kind === 'stay' && i.date <= d && addD(i.date, i.nights) > d)) break; n++; }
  n = Math.max(1, n); return leaves ? n : Math.min(n, typ);
}
function vProduct(v) {
  const k = v.kind; const editing = v.uid && S.cart.find(x => x.uid === v.uid);
  const cfg = v.cfg || (v.cfg = editing ? JSON.parse(JSON.stringify(editing)) : initCfg(k, v.id, v.date, v.after));
  const I = info(cfg); const f = fitOf(Object.assign({}, cfg, {uid:editing ? editing.uid : undefined}));
  let title = I.title, sub = I.sub, z = I.zone, extra = '', details = '', expect = '', unitLbl = '';
  const stepper = (a, val, lab) => `<div class="stepper"><button data-a="${a}" data-d="-1" aria-label="Less ${lab}">−</button><span>${val}</span><button data-a="${a}" data-d="1" aria-label="More ${lab}">+</button></div>`;
  const dateRow = `<div class="eyebrow">${k === 'stay' ? 'Check-in' : 'Day'}</div>${dayPicker(cfg.date, 'cfgdate', k === 'act' ? (d => { const av = availability({kind:'act', ref:cfg.ref, date:d, t:cfg.t}); return av && !av.sold ? 'Closed' : ''; }) : null)}`;
  if (k === 'act') { const a = ACT[cfg.ref]; unitLbl = a.entry ? 'entry ' + t('perPerson') : unitOf(a.b);
    const slots = slotsFor(a);
    extra = `${a.b === 'per_unit' ? `<div class="eyebrow">Quantity</div>${stepper('qty', cfg.qty || 1, 'units')}` : ''}
      ${!(a.b === 'per_unit' && a.d >= 1440) ? `<div class="eyebrow">${a.fixed ? 'Departs' : 'Start time'}</div><div class="opts">${slots.map(s => { const n = a.entry ? 20 : seatsAct(a.id, cfg.date, s); return `<button class="opt" data-a="slot" data-t="${s}" aria-pressed="${cfg.t === s}" ${n === 0 ? 'disabled title="Sold out"' : ''}>${s}${n === 0 ? '<small class="sf">Sold out</small>' : slotFit(a, cfg, s)}</button>`; }).join('')}</div>${slotNote(a, cfg)}` : ''}
      ${a.b === 'per_pax' ? (() => { const {pa, pk} = partyOf(cfg); const ok = kidsOk(a); const young = S.pax.kids - ok;
        return `<div class="eyebrow">Who's going</div><div class="two"><div><small class="muted" style="font-size:12px;font-weight:700">${t('adults')}</small>${stepper('ppa', pa, 'adults')}</div>${S.pax.kids ? `<div><small class="muted" style="font-size:12px;font-weight:700">${t('kids')}${a.age ? ` (${a.age}+ only)` : ''}</small>${ok ? stepper('ppk', pk, 'children') : `<div class="note" style="padding-top:8px">Not for under-${a.age}s</div>`}</div>` : ''}</div>
        ${young > 0 && a.age ? `<p class="note" style="margin-top:-4px">${young} of your children ${young > 1 ? 'are' : 'is'} under ${a.age}, so ${young > 1 ? 'they' : 'they'} can't join this one.</p>` : ''}`; })() : ''}`;
    details = `<div class="kv"><div><small>Duration</small><b>${durOf(a) || 'Flexible'}</b></div>${a.entry ? `<div><small>Hours</small><b>${a.open ? `${a.open}–${a.close || ''}` : 'Open all day'}</b></div>` : `<div><small>Report</small><b>${I.rep} min before</b></div>`}<div><small>Where</small><b>${esc(a.site || ZN[a.z].name)}</b></div><div><small>Season</small><b>${esc(a.sea || 'All year')}</b></div>${a.age ? `<div><small>Minimum age</small><b>${a.age} years</b></div>` : ''}${a.fb ? `<div><small>Before flying</small><b>Finish ${a.fb} hrs before your flight</b></div>` : ''}${a.cond ? `<div><small>Conditions</small><b>${esc(a.cond)}</b></div>` : ''}<div><small>Run by</small><b>${esc(I.vendor)}</b></div>${a.ops && a.ops.child != null && a.b === 'per_pax' && !a.entry ? `<div><small>Children under 12</small><b>${a.ops.child}% of the adult price</b></div>` : ''}</div>
      ${productNotes(a.id).map(m => `<div class="fitbox warn"><div class="ln">${ic('alert', 16)}<p>${esc(m)}</p></div></div>`).join('')}
      ${a.tags.length ? `<div class="opts">${a.tags.filter(x => TAGNAME[x]).map(x => `<span class="tag ${x === 'sea' || x === 'fit' ? 'warn' : 'acc'}">${TAGNAME[x]}</span>`).join('')}</div>` : ''}`;
    expect = (a.note || '') + (I.peak ? ` Peak-season price applies (15 Dec–15 Jan).` : '');
  }
  if (k === 'stay') { const h = HOT[cfg.ref]; const sp = stayPrice(h, cfg); unitLbl = t('perNight') + ', ' + SEASON_NAME[season(cfg.date)].toLowerCase();
    extra = `<div class="eyebrow">Room</div><div class="opts">${h.rooms.map(r => `<button class="opt txt" data-a="room" data-room="${esc(r.n)}" aria-pressed="${cfg.room === r.n}">${esc(r.n)} · ${inr(r['s_' + season(cfg.date)] || r.s_hi)}</button>`).join('')}</div>
      <div class="two"><div><div class="eyebrow" style="margin-bottom:6px">Nights</div>${stepper('nights', cfg.nights, 'nights')}</div><div><div class="eyebrow" style="margin-bottom:6px">Rooms</div>${stepper('qty', cfg.qty || 1, 'rooms')}</div></div>
      <p class="note">Check-in ${fD(cfg.date)} from ${hm(CHECKIN)} · check-out ${fD(addD(cfg.date, cfg.nights))} by ${hm(CHECKOUT)} (free till ${hm(CHECKOUT + GRACE)}; later depends on room availability) · ${paxTxt()}${Object.keys(sp.per).length > 1 ? ` · nights span ${Object.keys(sp.per).map(x => SEASON_NAME[x].toLowerCase()).join(' and ')}` : ''}</p>`;
    details = `<div class="kv"><div><small>Rating</small><b>${h.rt ? `${h.rt} ★ · ${Number(h.rv).toLocaleString('en-IN')} reviews` : 'New listing'}</b></div><div><small>Category</small><b>${h.t || 'To be graded'}</b></div><div><small>Meal plan</small><b>${esc(sp.r.mp || 'CP')} (breakfast)</b></div><div><small>Island</small><b>${ZN[h.z].name}</b></div><div><small>Extra adult</small><b>${inr(sp.r.s_eb)} / night</b></div><div><small>Child, no bed</small><b>${inr(sp.r.s_cwb)} / night</b></div></div>`;
    expect = `Prices are per room per night and change with the season: Peak 15 Dec–15 Jan, High Oct–May, Lean Jun–Sep.${h.est ? ' This hotel’s rate is an estimate until the hotel confirms.' : ''}`;
    sub = `${ZN[h.z].official}${h.t ? ' · ' + h.t : ''}`;
  }
  if (k === 'cab') { const m = cabMeta(cfg); const r = m.r; unitLbl = cfg.ret ? 'return' : 'one way';
    const times = ['05:30', '06:30', '07:00', '08:00', '09:00', '10:00', '12:00', '14:00', '16:00', '18:00']; if (cfg.t && !times.includes(cfg.t)) times.push(cfg.t); times.sort();
    extra = `<div class="eyebrow">Trip</div><div class="opts"><button class="opt txt" data-a="cabret" data-v="0" aria-pressed="${!cfg.ret}">One way (drop)</button>${r.prices.some(p => p.ret) ? `<button class="opt txt" data-a="cabret" data-v="1" aria-pressed="${!!cfg.ret}">Return${r.wait ? ` with ${r.wait} h wait` : ''}</button>` : ''}<button class="opt txt" data-a="cabrev">${ic('swap', 14)} Reverse</button></div>
      <div class="eyebrow">Vehicle</div><div class="opts">${r.prices.filter(p => cfg.ret ? p.ret : p.ow).map(p => `<button class="opt txt" data-a="vcls" data-v="${esc(p.c)}" aria-pressed="${vehFor(r, cfg.vc).c === p.c}" ${p.seats < pax() ? 'disabled' : ''}>${esc(p.c)} · ${inr(cfg.ret ? p.ret : p.ow)}</button>`).join('')}</div>
      <div class="eyebrow">Pickup time</div><div class="opts">${times.map(s => `<button class="opt" data-a="slot" data-t="${s}" aria-pressed="${cfg.t === s}">${s}</button>`).join('')}</div>`;
    details = `<div class="kv"><div><small>From</small><b>${esc(m.from)}</b></div><div><small>To</small><b>${esc(m.to)}</b></div><div><small>Distance</small><b>about ${r.km} km · ${durTxt(r.mins)}</b></div><div><small>Vehicle</small><b>${esc(VSUB[vehFor(r, cfg.vc).c] || '')}</b></div></div>`;
    expect = `Point-to-point fare, fixed before you travel. Night pickups after 21:00 and extra waiting are charged by the driver.${peakUp(r.ops, cfg.date) > 1 ? ' Peak-season fare applies.' : ''}`;
    title = m.to; sub = 'from ' + m.from;
  }
  if (k === 'rent') { const r = RENT[cfg.ref]; unitLbl = '/ day';
    extra = `<div class="two"><div><div class="eyebrow" style="margin-bottom:6px">How many</div>${stepper('qty', cfg.qty || 1, 'units')}</div><div><div class="eyebrow" style="margin-bottom:6px">Days</div>${stepper('days', cfg.days || 1, 'days')}</div></div>`;
    details = `<div class="kv"><div><small>Deposit</small><b>${inr(r.dep)} each, refunded</b></div><div><small>Fuel</small><b>${esc(r.fuel)}</b></div><div><small>Island</small><b>${ZN[r.z].name}</b></div><div><small>You need</small><b>Driving licence</b></div></div>`;
    expect = 'Picked up from the rental shop or delivered to your hotel.';
  }
  const pol = D.pol[I.pol], wx = D.wx[I.wx];
  let fitBox = '';
  if (f.state === 'alone') fitBox = '';
  else if (f.state === 'ok') fitBox = `<div class="fitbox ok"><div class="ln">${ic('check', 18, 2.4)}<p><b style="color:var(--ok)">${t('fits')}.</b> ${k === 'stay' ? `You'll be on ${ZN[z].name} that night.` : `No clashes with what you've booked.`}</p></div>${f.soft.slice(0, 2).map(s => `<div class="ln">${ic('alert', 16)}<p class="muted" style="font-size:13px">${esc(s.title)} ${esc(s.msg)}</p></div>`).join('')}</div>`;
  else fitBox = `<div class="fitbox bad">${f.hard.map(h => `<div class="ln">${ic('alert', 18)}<p><b style="color:var(--bad)">${esc(h.title)}.</b> ${esc(h.msg)}</p></div>`).join('')}<p class="muted" style="font-size:12.5px">You can still add it and fix it from your trip.</p></div>`;
  const btn = editing ? `<button class="btn ghost sm" data-a="remove" data-uid="${editing.uid}" style="height:48px">${t('remove')}</button><button class="btn" data-a="save">${t('update')}</button>` : `<button class="btn" data-a="add">${t('addToTrip')}</button>`;
  const est = (k === 'act' && ACT[cfg.ref].est) || (k === 'stay' && HOT[cfg.ref].est);
  const pbtn = primary(btn);
  return {title, hero:true, side:true, body:`
    <div class="pd wrap" style="--zc:${ZC(z)}">
      <div class="pd-hero dhero">${art(z, I.icon, cfg.ref, {big:true})}</div>
      <div class="pd-title dsec dtitle"><span class="eyebrow"><i></i>${ZN[z].name}${k === 'act' ? ' · ' + esc(ACT[cfg.ref].fam) : k === 'cab' ? ' · Cab' : k === 'stay' ? ' · Stay' : ''}</span><h1>${esc(title)}</h1><div class="muted">${esc(sub)}</div>
        <div class="pricetag"><div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">${k === 'act' && ACT[cfg.ref].entry && !I.unit ? `<span class="price">${t('freeEntry')}</span>` : priceLine(I.unit, unitLbl, est)}${k === 'stay' && HOT[cfg.ref].rt ? stars(HOT[cfg.ref].rt, HOT[cfg.ref].rv) : ''}</div>
          <div class="trustline"><span>${ic('check', 14, 2.6)}${I.gst === 0 ? 'No GST on this' : t('beforeGst')}</span><span>${ic('check', 14, 2.6)}${t('noHidden')}</span><span>${ic('check', 14, 2.6)}${esc(pol.n)}</span></div></div></div>
      <aside class="pd-side" aria-label="Book"><div class="dsec">
        <div class="pd-price">${k === 'act' && ACT[cfg.ref].entry && !I.unit ? `<span class="price">${t('freeEntry')}</span>` : priceLine(I.unit, unitLbl, est)}${k === 'stay' && HOT[cfg.ref].rt ? stars(HOT[cfg.ref].rt, HOT[cfg.ref].rv) : ''}</div>
        ${dateNudge('product')}${dateRow}${extra}${fitBox}
        <div class="pd-buy"><div class="tot"><b>${I.price == null ? t('onReq') : inr(I.price)}</b><small>${I.perTxt ? I.perTxt + ' · ' : I.per > 1 && I.unit ? `${I.per} × ${inr(I.unit)} · ` : ''}${I.gst === 0 ? 'no GST' : t('taxes')}</small></div><div class="btns">${pbtn}</div>
          <div class="trustline"><span>${ic('check', 14, 2.6)}${t('noHidden')}</span><span>${ic('check', 14, 2.6)}${esc(pol.n)}</span></div></div>
      </div></aside>
      <div class="pd-body">
        ${k === 'act' ? '' : `<div class="dsec"><h3>${t('details')}</h3>${details}${expect ? `<p class="policy">${esc(expect)}</p>` : ''}</div>`}
        ${k === 'act' ? actPage(ACT[cfg.ref], cfg) : ''}${k === 'stay' ? hotelRevBlock(HOT[cfg.ref]) : ''}
        <div class="dsec"><h3>${t('ifPlans')}</h3><p class="policy"><b>${esc(pol.n)}:</b> ${esc(pol.t)}</p><p class="policy"><b>Bad weather:</b> ${esc(String(wx).split(/(?<=\.)\s+/).filter(x => !/negotiate|our margin|internal|vendor rate/i.test(x)).join(' '))}</p></div>
      </div>
    </div>`, cta:ctaBar(I.price, `${I.perTxt ? I.perTxt + ' · ' : I.per > 1 && I.unit ? `${I.per} × ${inr(I.unit)} · ` : ''}${I.gst === 0 ? 'no GST' : t('taxes')}`, `<div style="display:flex;gap:8px">${btn}</div>`)};
}

/* ============ TRIP (v1 timeline on the new engine) ============ */
function nightStay(evs, n) { return evs.find(e => e.kind === 'stay' && dayIdx(e.it.date) <= n && dayIdx(e.it.date) + e.it.nights > n); }
function vTrip() {
  if (!S.cart.length && !S.win) return {title:t('yourTrip'), body:`<div class="wrap"><div class="empty"><span class="art">${art('HAV', 'trip', 'empty', {noGlyph:true})}</span><h2>${t('emptyTrip')}</h2><p>Add a ferry, a room or something to do. We lay it out day by day and tell you straight away if something does not fit.</p><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><button class="btn primary" data-a="tab" data-v="home">${t('startExploring')}</button><button class="btn ghost" data-a="sample">${t('sample')}</button></div></div></div>`};
  IDEAS_SEEN = new Set(); const R = run(S.cart); const evs = expand(S.cart); const pos = makePos(evs); const N = nDays(); const fi = flightIn(), fo = flightOut();
  const segs = []; for (let n = 0; n < N - 1; n++) { const st = nightStay(evs, n); const z = st ? st.zone : null; const uid = st ? st.it.uid : null; const L = segs[segs.length - 1]; if (L && L.z === z && L.uid === uid) L.n++; else segs.push({z, n:1, uid, d:addD(S.trip.start, n), at:(() => { const p = pos(abs(n, 1380)); return p === 'transit' ? 'PBL' : p; })()}); }
  const strip = segs.length ? `<div class="strip" role="list" aria-label="Where you sleep each night">${segs.map(s => s.z ? `<button role="listitem" style="flex:${s.n};--zc:${ZC(s.z)}" data-a="edit" data-uid="${s.uid}" aria-label="${ZN[s.z].name}, ${s.n} nights, change"><b>${ZN[s.z].name}</b><small>${s.n}N</small></button>` : `<button role="listitem" class="gap" style="flex:${s.n}" data-a="store" data-zone="${s.at}" data-aisle="stay" data-date="${s.d}" aria-label="No stay, ${s.n} nights: find a stay"><b>${ic('plus', 14, 2.6)} Add stay</b><small>${s.n}N</small></button>`).join('')}</div>` : '';
  let days = '';
  for (let n = 0; n < N; n++) {
    const date = addD(S.trip.start, n); const z0 = pos(abs(n, 720)); const zEnd = pos(abs(n, 1380)); const zz = z0 === 'transit' ? (zEnd === 'transit' ? 'PBL' : zEnd) : z0; const nat = NAT[date];
    const rows = [];
    if (fi && dayIdx(fi.date) === n) rows.push({at:tm(fi.arr), html:anchorRow(fi.arr, 'Land at Port Blair', `${fi.no} ${esc(fi.al)} from ${esc(fi.fr)}`, 'plane', R.anchors.in)});
    evs.filter(e => dayOf(e.s) === n && e.kind !== 'stay').forEach(e => rows.push({at:e.s % 1440, html:evRow(e, R)}));
    evs.filter(e => e.kind === 'stay' && dayIdx(e.it.date) === n).forEach(e => { // check in when you get there, from 08:00
      const arr = evs.filter(x => dayOf(x.e) === n && x.e <= abs(n, 1080) && ((x.kind === 'ferry' && x.to === e.zone) || (x.kind === 'veh' && x.move === e.zone) || (x.kind === 'veh' && /Airport|Jetty|Wharf/.test(x.I.title.split(' → ')[0]) && x.zone === e.zone))).map(x => x.e % 1440).sort((a, b) => b - a)[0];
      const fiA = fi && dayIdx(fi.date) === n && e.zone === 'PBL' ? tm(fi.arr) + 30 : null; e.ciAt = Math.max(CHECKIN, arr || fiA || CHECKIN); rows.push({at:e.ciAt, html:evRow(e, R)}); });
    evs.filter(e => e.kind === 'stay' && dayIdx(e.it.date) + e.it.nights === n).forEach(e => { const lv = evs.filter(x => dayOf(x.s) === n && (x.kind === 'ferry' || (x.kind === 'veh' && x.zone === e.zone))).sort((a, b) => a.s - b.s)[0]; const lvAt = lv ? (lv.s % 1440) - (lv.kind === 'ferry' ? lv.rep : 0) : null; const at = lvAt != null && lvAt < CHECKOUT ? lvAt - 1 : CHECKOUT;
      const late = lvAt != null && lvAt > CHECKOUT + GRACE; rows.push({at, html:`<div class="ev"><span class="et">${hm(at)}</span><span class="er"><span class="nd" style="background:var(--faint)">${ic('bed', 12, 2)}</span></span><span class="ec"><div class="anchor">Check out${at < CHECKOUT ? ' before you leave' : ` by ${hm(CHECKOUT)} (free till ${hm(CHECKOUT + GRACE)})`}${e.it.late ? ' · late check-out requested' : late ? ' · bags can stay at the hotel' : ''} · <b>${esc(e.I.title)}</b></div></span></div>`}); });
    (R.day[n] || []).filter(a => a.kind === 'gap').forEach(a => { const h = gapRow(a, date); if (h) rows.push({at:a.at % 1440 + .5, html:h}); });
    if (fo && dayIdx(fo.date) === n) rows.push({at:tm(fo.dep), html:anchorRow(fo.dep, 'Fly out of Port Blair', `${fo.no} ${esc(fo.al)} to ${esc(fo.to)}`, 'plane', R.anchors.out)});
    rows.sort((a, b) => a.at - b.at);
    const st = nightStay(evs, n); const miss = (R.day[n] || []).find(a => a.kind === 'night');
    const stayPicks = (zz, d) => { const tiers = S.cart.filter(i => i.kind === 'stay').map(i => HOT[i.ref].t); const hs = D.hotels.filter(h => h.z === zz && !h.est).sort((a, b) => (b.rt || 0) * Math.log10((b.rv || 1) + 1) - (a.rt || 0) * Math.log10((a.rv || 1) + 1));
      const pick = [hs.find(h => !tiers.length || tiers.includes(h.t)) || hs[0], hs.slice().sort((a, b) => hotelFrom(a, d) - hotelFrom(b, d))[0], hs.find(h => h.t === 'Premium' || h.t === 'Luxury')].filter((h, i, A) => h && A.indexOf(h) === i);
      return pick.length ? `<div class="bleed"><div class="idrail">${pick.map((h, i) => `<div class="idc" style="--zc:${ZC(zz)}"><button class="idc-art" data-a="product" data-kind="stay" data-id="${h.id}" data-date="${d}" aria-label="Details: ${esc(h.n)}">${art(zz, 'bed', h.id)}<span class="why">★ ${['Most loved', 'Best price', 'Treat yourself'][i]}</span></button><div class="idc-b"><b>${esc(h.n)}</b><small>${h.t || ''}${h.rt ? ` · ${h.rt}★` : ''}</small><div class="idc-f"><span class="price">${inr(hotelFrom(h, d))}<small> / night</small></span><button class="btn sm" data-a="fx" data-act="quickadd" data-kind="stay" data-ref="${h.id}" data-date="${d}" data-t="08:00">${ic('plus', 16, 2.6)} Add</button></div></div></div>`).join('')}<button class="idc more" data-a="store" data-zone="${zz}" data-aisle="stay" data-date="${d}">${ic('bed', 24)}<b>All stays on ${ZN[zz].name}</b></button></div></div>` : ''; };
    const nightRow = n === N - 1 ? '' : st ? `<div class="night">${ic('moon', 15)}<span>${t('night')} <b>${esc(st.I.title)}</b> · night ${n - dayIdx(st.it.date) + 1} of ${st.it.nights}</span></div>` : miss ? `<div class="night missing">${ic('moon', 15)}<span style="flex:1"><b style="color:var(--warn)">${esc(miss.title)}</b></span>${miss.fix.map(fixBtn).join('')}</div>${stayPicks(miss.zone, date)}` : '';
    days += `<section class="day" id="day${n + 1}" aria-label="Day ${n + 1}" data-date="${date}">
      <div class="dayhd"><span class="dn" style="--zc:${ZC(zz)}"><small>Day</small><b>${n + 1}</b></span><div style="flex:1;min-width:0"><h3>${fD(date)} · ${ZN[zz].name}</h3><p>${nat ? `<span>${ic('sunrise', 14, 2)} ${nat.sr}</span><span>${ic('sunset', 14, 2)} ${nat.ss}</span>` : ''}${season(date) === 'pk' ? '<span>Peak season</span>' : ''}</p></div><button class="iconbtn" data-a="store" data-zone="${zz}" data-date="${date}" aria-label="Add to day ${n + 1}">${ic('plus', 20)}</button></div>
      ${dayTools(n, date, zz)}
      ${rows.length ? rows.map(r => r.html).join('') : `<div class="anchor" style="padding-left:84px">Nothing planned yet.</div>`}
      ${nightRow}
    </section>`;
  }
  const hardN = R.hard; const req = onReq();
  // every cab we suggest, in one tap
  const cabFixes = []; Object.values(R.by).flat().concat(R.anchors.in, R.anchors.out).forEach(a => { if (a.sev === 'soft' && a.fix && a.fix[0] && a.fix[0].act === 'quickadd' && a.fix[0].kind === 'cab') { const f = a.fix.find(x => x.label.startsWith('Both')) || a.fix[0]; cabFixes.push(f); } });
  S._cabFixes = cabFixes;
  const rides = cabFixes.reduce((n, f) => n + (f.ref2 ? 2 : 1), 0);
  const cabSum = cabFixes.reduce((t0, f) => t0 + (+(f.label.match(/₹([\d,]+)/) || [0, '0'])[1].replace(/,/g, '')), 0);
  const cabCard = cabFixes.length > 1 && S.cart.length ? `<div class="card cabsall"><div style="display:flex;gap:10px;align-items:center">${ic('car', 22)}<div style="flex:1"><b>${rides} cab rides would help</b><div class="muted" style="font-size:13px">Airport, jetties and sightseeing, timed to your plans · ${inr(cabSum)}</div></div></div><button class="btn sm block" data-a="addallcabs">Add all ${rides} · ${inr(cabSum)}</button></div>` : '';
  const startCard = !S.cart.length ? `<div class="card"><b>Start with your ferries</b><span class="muted" style="font-size:14.5px">They determine which island you are on each night. Add stays next; we will suggest activities for your free time.</span><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" data-a="route" data-from="PBL" data-to="HAV" data-date="${addD(S.trip.start, 1)}">Port Blair → Havelock</button><button class="btn sm ghost" data-a="sample">${t('sample')}</button></div></div>` : '';
  const dmeta = []; for (let n = 0; n < N; n++) { const z0 = pos(abs(n, 720)), zE = pos(abs(n, 1380)); const zz = z0 === 'transit' ? (zE === 'transit' ? 'PBL' : zE) : z0; dmeta.push({zz, bad:evs.some(e => dayOf(e.s) === n && (R.by[e.it.uid] || []).some(a => a.sev === 'hard'))}); }
  const seq = []; if (fi) seq.push('PBL'); segs.forEach(s => { const z = s.z || s.at; if (z && seq[seq.length - 1] !== z) seq.push(z); }); if (fo && seq.length && seq[seq.length - 1] !== 'PBL') seq.push('PBL');
  const nightsBy = {}; segs.forEach(s => { if (s.z) nightsBy[s.z] = (nightsBy[s.z] || 0) + s.n; });
  const legs = seq.slice(1).map((z, i) => [seq[i], z]); const stops = [...new Set(seq)];
  const tmap = S.cart.length && stops.length > 1 ? `<div class="tp-map">${islandMap(null, {trip:{legs, stops, nights:nightsBy}})}</div>` : '';
  const health = !S.cart.length ? `<div class="health none"><span class="hi">${ic('trip', 18, 2)}</span><span><b>Nothing here yet</b>Start with a ferry or a place to stay.</span></div>`
    : hardN ? `<button class="health bad" data-a="fixmenu"><span class="hi">${ic('alert', 18, 2.2)}</span><span><b>${hardN} thing${hardN > 1 ? 's' : ''} that ${hardN > 1 ? 'do' : 'does'} not fit to sort out</b>We can fix it for you, and show you every change.</span><span class="go">${t('fix')} ${ic('arrow', 16, 2.4)}</span></button>`
    : `<div class="health ok"><span class="hi">${ic('check', 18, 2.6)}</span><span><b>It all fits</b>Every ferry, check-in and plan lines up.</span></div>`;
  const freeN = S.cart.length ? Object.values(R.day || {}).flat().filter(x => x && x.kind === 'gap' && !x.skipped).length : 0;
  const planCard0 = tripAssist(R, freeN, hardN); const reach = planCard0.includes('lx-reach');   // the way to a far island comes before any 'fix' button
  const planCard = reach ? '' : planCard0;
  const buyBtn = !S.cart.length ? `<button class="btn primary block" disabled>${t('checkout')}</button>` : reach ? `<button class="btn primary block" data-a="complete">${ic('spark', 18, 2)} Plan the way there</button>` : hardN ? `<button class="btn primary block" data-a="fixmenu">${ic('spark', 18, 2)} ${t('fixForMe')}</button>` : `<button class="btn primary block" data-a="go" data-v="checkout">${t('checkout')} ${ic('arrow', 18, 2.2)}</button>`;
  return {title:t('yourTrip'), side:true, body:`
    <div class="tp wrap">
      <aside class="tp-side" aria-label="Trip summary">
        <div class="triphd">
          <div class="r1"><div><span class="eyebrow">${N} days · ${Math.max(0, N - 1)} nights</span><h1>${fD(S.trip.start)} – ${fD(S.trip.end)}</h1><div class="muted" style="font-size:14px">${paxTxt()}</div></div><button class="btn ghost sm" data-a="dates">${t('change')}</button></div>
          <div class="flights">${[[fi, 'Arrive', fi && `${fi.arr} · ${fi.no}`, fi && `${esc(fi.fr.split(' (')[0])} → Port Blair`], [fo, 'Fly home', fo && `${fo.dep} · ${fo.no}`, fo && `Port Blair → ${esc(fo.to.split(' (')[0])}`]].map(([f, k, b, sub], i) => `<button class="fl${f ? '' : ' add'}" data-a="dates"><span class="fi" style="${i ? 'transform:scaleX(-1)' : ''}">${ic('plane', 18, 2)}</span><span><small>${k}${f ? ' · ' + fD(f.date) : ''}</small><b>${f ? b : 'Add your flight'}</b><small>${f ? sub : i ? 'We keep your last day clear' : 'We plan day 1 around it'}</small></span></button>`).join('')}</div>
          ${strip}
          ${dateNudge('trip')}
          ${reach ? planCard0 : health}
          ${tripTools()}
          <div class="sumrow">${R.soft ? `<span class="tag warn">${R.soft} suggestion${R.soft > 1 ? 's' : ''}</span>` : ''}${S.cart.length ? `<span class="tag">${S.cart.length} item${S.cart.length === 1 ? '' : 's'}</span>` : ''}${req ? `<span class="tag">${req} rate on request</span>` : ''}</div>
          <div class="tp-buy"><button class="tot" data-a="breakdown" aria-label="${t('seeBreakdown')}"><b>${inr(total())}</b><small>${req ? `+ ${req} on request · ` : ''}incl. GST · ${t('breakdown')}</small></button>${buyBtn}</div>
        </div>
      </aside>
      <div class="tp-main">
        ${N > 1 ? `<nav class="daynav" aria-label="Jump to a day">${dmeta.map((m, n) => `<a href="#day${n + 1}" class="${m.bad ? 'bad' : ''}" style="--zc:${ZC(m.zz)}"><i></i>Day ${n + 1}<span class="faint" style="font-weight:600">${ZSHORT[m.zz] || ZN[m.zz].name}</span></a>`).join('')}</nav>` : ''}
        ${startCard || cabCard || planCard ? `<div class="pad" style="padding-top:14px;display:flex;flex-direction:column;gap:12px">${startCard}${planCard}${cabCard}</div>` : ''}
        ${extendBtn('before')}${days}${extendBtn('after')}
        <div class="pad"><p class="note" style="padding-block:12px 0">Everything is in day and time order. Reporting times and the travel in between are already counted.</p></div>
      </div>
    </div>`,
    cta:ctaBarBd(total(), req ? `+ ${req} on request · incl. GST` : 'incl. GST', !S.cart.length ? `<button class="btn" disabled>${t('checkout')}</button>` : reach ? `<button class="btn" data-a="complete">Plan the way there</button>` : hardN ? `<button class="btn" data-a="fixmenu">${t('fix')} ${hardN}</button>` : `<button class="btn" data-a="go" data-v="checkout">${t('checkout')}</button>`)};
}
function fixBtn(fx) {
  const ds = Object.entries(fx).filter(([k, v]) => k !== 'label' && k !== 'patch' && v !== '' && v != null).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ');
  return `<button class="btn sm ${fx.act === 'edit' || fx.act === 'dismiss' ? 'ghost' : 'quiet'}" data-a="fx" ${ds} ${fx.patch ? `data-patch='${esc(JSON.stringify(fx.patch))}'` : ''}>${esc(fx.label)}</button>`;
}
function alertHTML(a) { const k = a.sev === 'hard' ? ['x', t('kProblem')] : a.sev === 'soft' ? ['bulb', t('kSuggest')] : ['clock', t('kIdea')];
  return `<div class="alert ${a.sev}" role="${a.sev === 'hard' ? 'alert' : 'note'}"><div class="ah">${ic(k[0], 18, 2.2)}<div><span class="kind">${k[1]}</span><b>${esc(a.title)}</b>${a.msg ? `<span>${esc(a.msg)}</span>` : ''}</div></div>${a.fix && a.fix.length ? `<div class="acts">${a.fix.map(fixBtn).join('')}</div>` : ''}</div>`; }
function anchorRow(time, b, s, icon, alerts) { return `<div class="ev"><span class="et">${time}</span><span class="er"><span class="nd" style="background:var(--ink)">${ic(icon, 12, 2)}</span></span><span class="ec"><div class="anchor"><b>${b}</b>&nbsp;· ${s}</div>${alerts.map(alertHTML).join('')}</span></div>`; }
function evRow(e, R) {
  const al = R.by[e.it.uid] || []; const hard = al.some(a => a.sev === 'hard'); const I = e.I; const tt = e.kind === 'stay' ? hm(e.ciAt || CHECKIN) : clock(e.s);
  let sub;
  if (e.kind === 'ferry') { const s = SAIL[e.it.ref]; sub = `${esc(s.op.replace(/ \d$/, ''))} · ${e.it.own ? 'booked elsewhere' : esc(e.it.cls || '') + (e.it.seats && e.it.seats.length ? ' · seats ' + e.it.seats.join(', ') : '')} · report ${e.rep} min early`; }
  else if (e.kind === 'stay') sub = `Check in${e.it.early ? ' · early check-in requested' : ''} · ${esc(I.sub)}`;
  else if (e.parts) sub = `Day ${e.part} of ${e.parts} · ${esc(e.lbl || I.sub)}${e.lbl ? ` · until ${clock(e.e)}` : ''}`;
  else if (e.lbl) sub = `${esc(e.lbl)} · until ${clock(e.e)}`;
  else sub = `${esc(I.sub)}${e.e > e.s ? ' · until ' + clock(e.e) : ''}`;
  const show = !e.parts || e.part === 1;
  const price = e.kind === 'act' && ACT[e.it.ref] && ACT[e.it.ref].meal ? 'Pay there' : e.parts && e.part > 1 ? 'Included' : I.own ? 'Booked' : I.price != null ? inr(I.price) : 'On request';
  const zc = e.kind === 'ferry' ? e.to : e.zone;
  const drag = e.kind === 'act' && show && !e.it.own && !(ACT[e.it.ref] && ACT[e.it.ref].seaRoute);
  return `<div class="ev" data-uid="${e.it.uid}" data-k="${e.kind}" data-e="${e.kind === 'stay' ? '' : e.e % 1440 + (Math.floor(e.e / 1440) - Math.floor(e.s / 1440)) * 1440}"><span class="et">${tt}${e.kind === 'ferry' ? `<small>→ ${clock(e.e)}</small>` : ''}${drag ? `<button class="lx-grip" data-drag="${e.it.uid}" aria-label="Move or swap ${esc(I.title)}: tap for options, or drag" title="Tap for options, or drag">${ic('grip', 14, 2.2)}<span>Move</span></button>` : ''}</span><span class="er"><span class="nd" style="background:${ZC(zc)}">${ic(I.icon, 13, 2)}</span></span><span class="ec">
    <button class="item ${hard ? 'hard' : ''}${S.flashUid === e.it.uid ? ' flash' : ''}" data-a="edit" data-uid="${e.it.uid}"><span class="ith">${art(zc, I.icon, e.it.ref)}</span><span class="ib"><b>${esc(I.title)}</b><small>${sub}</small>${bkTag(e.it)}</span><span class="ip">${price}${(e.parts && e.part > 1) || (e.kind === 'act' && ACT[e.it.ref] && ACT[e.it.ref].meal) ? '' : I.perTxt && !I.own ? `<small>${I.perTxt}</small>` : I.per > 1 && !I.own ? `<small>${I.per} × ${inr(I.unit)}</small>` : ''}</span></button>
    ${show ? al.map(alertHTML).join('') : ''}${e.kind === 'stay' && !e.it.own ? stayCompare(e.it) : ''}${e.kind === 'act' && show && S.justAdded === e.it.uid ? pairRail(e) : ''}</span></div>`;
}
/* free time: what a well-read local would actually suggest for this gap.
   REC is a shortlist per island, ranked from what guidebooks (Lonely Planet), the big agencies' day plans and visitor ratings agree on.
   when: am = boats and reefs that run in the morning · day = any daylight hour · pm = afternoon · sunset = ends near sunset · eve = after dark */
const REC = {
  PBL:[['ENT-CELLULAR-JAIL', 'day', 'The one sight every visitor sees'], ['ACV-SHOW-LS-HIN', 'eve', 'The story of Cellular Jail, told at night'], ['ACV-SHOW-LS-ENG', 'eve', 'The story of Cellular Jail, told at night'], ['ACV-BOAT-ROSSNB', 'am', 'Ross Island ruins and North Bay corals in one trip'], ['ENT-CORBYNS', 'pm', 'Port Blair’s town beach, close to most hotels'], ['ACV-CHIDIYA-SUNSET', 'sunset', 'Port Blair’s best sunset point'], ['ENT-ANTHRO-MUSEUM', 'day', 'The best way to learn about the islands’ tribes'], ['ACV-BOAT-ROSS-PM', 'pm', 'Ross Island in the soft afternoon light'], ['ENT-SAMUDRIKA', 'day', 'Corals and shells, run by the Navy'], ['ACV-TREK-MTHARRIET', 'am', 'Forest views over the harbour'], ['ENT-CHATHAM', 'day', 'One of Asia’s oldest saw mills'], ['ACV-KAYAK-PB-DAY', 'am', 'Paddle through the mangroves'], ['ENT-JAPBUNKER', 'day', 'WWII bunkers above Corbyn’s Cove'], ['ENT-FISHERIES', 'day', 'Andaman fish up close, good with kids'], ['ENT-SCIENCE-CENTRE', 'day', 'Hands-on galleries, good with kids'], ['ENT-SAGARIKA', 'day', 'Government emporium for shell and wood crafts'], ['ACV-CRUISE-SUNSET-PB', 'sunset', 'Harbour cruise as the sun goes down']],
  WAN:[['ACV-BOAT-JOLLY', 'am', 'The clearest water near Port Blair'], ['ACV-BOAT-REDSKIN', 'am', 'The clearest water near Port Blair'], ['ACV-KAYAK-PB-MGMNP', 'am', 'Mangroves inside the marine park']],
  HAV:[['ENT-RADHANAGAR', 'sunset', 'One of Asia’s best-rated beaches, best at sunset'], ['ACV-BOAT-ELEPH', 'am', 'Reef you can snorkel straight from the beach'], ['ACV-DSD-HAV-SHORE', 'am', 'Havelock is India’s top place to try diving'], ['ENT-KALAPATHAR', 'day', 'Quiet beach with black rocks and clear water'], ['ACV-KAYAK-HAV-MANGROVE', 'am', 'Paddle through mangrove creeks'], ['ACV-SNK-HAV-GUIDED', 'am', 'Guided reef snorkel with a pro'], ['ENT-VIJAYNAGAR', 'day', 'Long calm beach close to most hotels'], ['ACV-KAYAK-HAV-SUNSET', 'sunset', 'Paddle out as the sun sets'], ['ACV-NIGHTWALK-HAV', 'eve', 'Glowing plankton and night creatures'], ['ACV-GBB-HAV', 'am', 'See the corals without getting wet'], ['ACV-INTERTIDAL-HAV', 'day', 'Rock pools with a marine guide'], ['ENT-GOVIND-NAGAR', 'day', 'Shallow beach by the cafés']],
  NEI:[['ACV-NATBRIDGE-NEI', 'day', 'Neil’s famous rock arch'], ['ENT-LAXMANPUR', 'sunset', 'Neil’s sunset beach'], ['ENT-BHARATPUR', 'day', 'Clear lagoon for a swim'], ['ACV-GBB-NEI', 'am', 'See the corals without getting wet'], ['ACV-SNK-NEI-STD', 'am', 'Easy snorkel off Bharatpur'], ['ENT-SITAPUR', 'day', 'Wild beach on the island’s eastern tip'], ['ACV-STARGAZE-NEI', 'eve', 'Very dark skies, guided'], ['ACV-VILLAGE-NEI', 'day', 'Farms and village life, guided'], ['ACV-NATUREWALK-NEI', 'am', 'Short forest walk']],
  BAR:[['ACV-BOAT-BAR-CAVE', 'am', 'Mangrove creek boat to the limestone caves'], ['ACV-BOAT-PARROT', 'sunset', 'Thousands of parrots come home at dusk']],
  RAN:[['ACV-DHANINALLAH', 'day', 'Mangrove boardwalk to a turtle beach'], ['ENT-AMKUNJ', 'pm', 'Eco-park beach near Rangat'], ['ENT-MORRICE-DERA', 'day', 'Rocky beach with a natural arch'], ['ENT-YERRATA', 'day', 'Mangrove watchtower']],
  LON:[['ACV-BOAT-LALAJI', 'am', 'Remote white beach by boat']],
  MAY:[['ENT-KARMATANG', 'pm', 'Long beach where turtles nest'], ['ACV-BOAT-AVIS', 'am', 'Tiny coconut island by boat']],
  DIG:[['ACV-BOAT-ROSSSMITH-2', 'am', 'Two islands joined by a sandbar'], ['ENT-LAMIYA-BAY', 'pm', 'Pebble beach under Saddle Peak'], ['ACV-ALFRED-CAVES', 'am', 'Swiftlet caves with a guide'], ['ENT-RAMNAGAR-DIG', 'pm', 'Quiet village beach'], ['ENT-MUD-VOL-DIG', 'day', 'Small bubbling mud volcano']],
  LIT:[['ENT-BUTLER', 'pm', 'The islands’ surfing beach'], ['ACV-WATERFALL-LIT', 'am', 'Two jungle waterfalls'], ['ENT-LIGHTHOUSE-LIT', 'day', 'Lighthouse with sea views']]
};
const WET = x => /Scuba|Snorkel|Sea walk|Motor water|Kayak|Fishing|Glass bottom/.test(x.fam) || /SUP|SNUBA|JETSKI|PARASAIL/.test(x.id);
let IDEAS_SEEN = new Set();
function gapPicks(a, date) {
  const len = a.end - a.at; const nat = NAT[date]; const sunset = nat ? tm(nat.ss) : 1020; const fi = flightIn();
  const dayEvs = expand(S.cart).filter(e => e.it.date === date && e.kind !== 'stay');
  const next = dayEvs.find(e => e.s >= a.end);
  const landing = !!(fi && fi.date === date && a.zone === 'PBL' && (a.at % 1440) < tm(fi.arr) + 240);   // just off the plane, bags still with you
  const leaving = !!(next && (next.kind === 'ferry' || (next.kind === 'veh' && (next.vk === 'Road trip' || /Airport|Jetty|Wharf/.test(next.I.title.split(' → ')[1] || '')))));
  const st = stayAt(S.cart, a.zone, date, a.at % 1440); const hk = st ? hotelKey(HOT[st.ref]) : HUB[a.zone];
  const s0 = a.at % 1440, e0 = a.end % 1440; const ok = ideaFilter(date, {landing, leaving}); const EVX = evFor(date); const fiT = fi && fi.date === date ? tm(fi.arr) : null;
  /* ---- single stops: ranked by how popular the place really is, how far it is from where you are, and whether the hour suits it ---- */
  const pool = new Map(); (REC[a.zone] || []).forEach(([id, when, why], rank) => pool.set(id, {when, why, rank}));
  Object.keys(POP).forEach(id => { const x = ACT[id]; if (x && x.z === a.zone && !pool.has(id)) pool.set(id, {when:x.slot === 'Night' ? 'eve' : x.tags.includes('sun') ? 'sunset' : 'day', why:'', rank:9}); });
  if (a.night) D.acts.forEach(x => { if ((x.z === a.zone || (a.zone === 'PBL' && x.z === 'WAN')) && x.slot === 'Night' && !pool.has(x.id)) pool.set(x.id, {when:'eve', why:'', rank:9}); });
  const cands = [];
  pool.forEach(({when, why, rank}, id) => { const x = ACT[id]; if (!x || !ok(x)) return; if (when === 'eve' && !a.evening) return; if (a.night && when !== 'eve') return;
    const tr = travelMin(hk, x); if (leaving && tr > 20) return; if (landing && tr > 25) return;
    const own = x.entry ? Math.max(Math.ceil((s0 + tr) / 15) * 15, x.open ? tm(x.open) : 0) : null;   // open places can start the moment you arrive, not only on the hour
    const slots = (own != null && (!x.close || own + x.d <= tm(x.close)) ? [hm(own)] : []).concat(slotsFor(x)).filter((sl, i, A) => A.indexOf(sl) === i).sort().filter(sl => { const t0 = tm(sl), t1 = t0 + x.d; if (inBreak(x, t0, t1)) return false;
      if (when === 'eve') return t0 >= sunset - 20 && t0 >= s0 + tr && t1 <= Math.min(1320, e0 + 30);   // inside your free window
      if (t0 < s0 + tr) return false;                                    // you have to get there first
      if (when === 'sunset') return t1 <= e0 + 30 && t1 >= sunset - 60 && t0 <= sunset;
      if (t1 + tr > e0) return false;                                    // and be back in time
      if (when === 'am') return t0 <= 660; if (when === 'pm') return t0 >= 780; return t1 <= sunset + 10; });
    if (!slots.length) return;
    const slot = when === 'sunset' ? slots.slice().sort((p, q) => Math.abs(tm(p) + x.d - sunset - 10) - Math.abs(tm(q) + x.d - sunset - 10))[0] : slots[0];
    if (availability({kind:'act', ref:id, date, t:slot})) return;
    let sc = popOf(id, rank) - tr * .4 + (EVX[id] || 0) * 45;   // what real itineraries do on this kind of day counts most if (IDEAS_SEEN.has(id)) sc -= 35; if (when === 'sunset') sc += 12; if (x.d > len * .8) sc -= 10; if (landing && x.d > 100) sc -= 15;
    if (S.pax.kids && x.tags.includes('kid')) sc += 5; if (S.pax.sen && x.tags.includes('sen')) sc += 5;
    const toAir = leaving && /Airport/.test(next.I.title.split(' → ')[1] || '');
    const where = when === 'eve' ? `Tonight · ${tr} min away` : leaving ? (toAir ? 'Close by, before your flight' : `${tr} min away, back before you leave`) : landing ? 'Easy first stop after you land' : `${tr} min from ${st ? 'your stay' : ZN[a.zone].name + ' centre'}`;
    cands.push({x, slot, sc, why:why || POPWHY(id), where, eve:when === 'eve', key:siteKey(x) || (x.fam === 'Places to visit' ? id : x.fam)});
  });
  cands.sort((p, q) => q.sc - p.sc);
  const pick = []; const seen = new Set(); let tries = 0, eveN = 0;
  for (const c of cands) { if (seen.has(c.key)) continue; if (c.eve && eveN && !a.night) continue;
    if (tries++ < 14 && fitOf({kind:'act', ref:c.x.id, date, t:c.slot, pa:S.pax.adults, pk:kidsOk(c.x)}).state === 'bad') continue;
    seen.add(c.key); if (c.eve) eveN++; pick.push(c); if (pick.length === 3) break; }
  pick.sort((p, q) => p.eve - q.eve);
  /* ---- ready-made blocks that fit this window ---- */
  /* on the day you land, plans start only once you are out of the airport and checked in: 2.5 h after touchdown */
  const bfrom = landing && fiT != null ? Math.max(s0, fiT + 150) : s0;
  const all = (leaving || len < 150 || a.night) ? [] : BLOCKS.filter(b => (b.z === a.zone || (a.zone === 'PBL' && (b.z === 'WAN' || b.z === 'BAR'))) && (!landing || b.arr))
    .map(b => planBlock(b, date, {from:bfrom, to:e0 + (a.evening ? 30 : 0), hk, evening:!!a.evening})).filter(Boolean).filter(p => !IDEAS_SEEN.has(p.b.id))
    .map(p => { p.span = (p.end - p.start) >= 330 ? 'full' : 'half'; p.ev = Math.max(0, ...p.items.map(i => EVX[i.ref] || 0)); p.rank = p.pop + p.ev * 40 + Math.min(25, (p.end - p.start) / len * 25); return p; }).sort((p, q) => q.rank - p.rank);
  const blocks = all.filter(p => p.span === 'full').slice(0, 1).concat(all.filter(p => p.span === 'half').slice(0, 2));
  pick.forEach(c => IDEAS_SEEN.add(c.x.id)); blocks.forEach(p => IDEAS_SEEN.add(p.b.id));
  return {pick, blocks, leaving, landing, fiArr:fi && fi.date === date ? fi.arr : null};
}
function gapRow(a, date) {
  const hd = (extra) => `<div class="ev"><span class="et faint">${clock(a.at)}</span><span class="er"><span class="nd" style="background:var(--sunk);color:var(--ink)">${ic('clock', 12, 2.2)}</span></span><span class="ec"><div class="idhd"><b>${durTxt(Math.floor((a.end - a.at) / 30) * 30)} free on ${ZN[a.zone].name}</b><span>${clock(a.at)}–${clock(a.end)}${extra}</span></div></span></div>`;
  if (a.skipped) return hd(` · <button class="link" data-a="fx" data-act="undismiss" data-key="gapday${date}">Show ideas</button>`);
  const {pick, blocks, leaving, landing, fiArr} = gapPicks(a, date); const grp = (k, n) => `<div class="idgrp"><b>${k}</b><small>${n} that fit${n > 1 ? '' : 's'}</small></div>`; if (!pick.length && !blocks.length) return '';
  const w = `data-date="${date}" data-from="${a.at % 1440}" data-to="${a.end % 1440}" data-eve="${a.evening ? 1 : 0}"`;
  return hd(` · ${leaving ? 'short and close, so you make your connection' : landing ? (fiArr ? `timed for your ${fiArr} landing` : 'light plans for your first hours') : blocks.length ? 'ideas that fit the time you have' : t('fitsHere')}`) + `
    <div class="bleed" role="region" aria-label="Ideas for ${clock(a.at)}–${clock(a.end)}"><div class="idrail">${blocks.map((p, i) => (i === 0 || blocks[i - 1].span !== p.span ? grp(p.span === 'full' ? 'Full day' : 'Half day', blocks.filter(q => q.span === p.span).length) : '') + `<div class="idc blk" style="--zc:${ZC(p.b.z)}"><button class="idc-art" data-a="blk" data-id="${p.b.id}" ${w} aria-label="See what is inside: ${esc(p.b.n)}">${art(p.b.z, null, p.hero)}<span class="bk-n">${p.span === 'full' ? 'Full day' : 'Half day'}</span><span class="why">★ ${esc(p.b.why)}</span></button>
        <div class="idc-b"><b>${esc(p.b.n)}</b><small>${p.items.filter(i => !i.during).map(i => esc(shortName(i.x))).join(' → ')}</small><span class="idc-m">${ic('clock', 14)} ${hm(p.start)}–${hm(p.end)} · ${p.items.length} bookings</span>
        <div class="idc-f"><span class="price">${inr(p.price)}<small> for ${pax()}</small></span><button class="btn sm" data-a="blkadd" data-id="${p.b.id}" ${w}>${ic('plus', 16, 2.6)} Add plan</button></div></div></div>`).join('')}${pick.length ? grp('Single stops', pick.length) : ''}${pick.map(({x, slot, why, where}) => { const u = actUnit(x, date);
      return `<div class="idc" style="--zc:${ZC(x.z)}"><button class="idc-art" data-a="product" data-kind="act" data-id="${x.id}" data-date="${date}" data-after="${slot}" aria-label="Details: ${esc(x.n)}">${art(x.z, null, x.id, {tod:tm(slot) + x.d >= (NAT[date] ? tm(NAT[date].ss) : 1020) - 30 ? 'dusk' : tm(slot) < 480 ? 'dawn' : 'day'})}${why ? `<span class="why">★ ${esc(why)}</span>` : ''}</button>
        <div class="idc-b"><b>${esc(x.n)}</b><small>${esc(x.v || '')}</small><span class="idc-m">${ic('clock', 14)} ${slot} · ${durTxt(x.d)}${where ? ` · ${esc(where)}` : ''}</span>
        <div class="idc-f"><span class="price">${x.entry ? (u ? inr(u) : 'Free') : inr(u)}<small> ${x.b === 'per_pax' ? '/ person' : ''}</small></span><button class="btn sm" data-a="fx" data-act="quickadd" data-kind="act" data-ref="${x.id}" data-date="${date}" data-t="${slot}">${ic('plus', 16, 2.6)} Add</button></div></div></div>`; }).join('')}
      <button class="idc more" data-a="store" data-zone="${a.zone}" data-date="${date}">${ic('search', 24)}<b>Everything on ${ZN[a.zone].name}</b></button></div>
      <div class="idskip"><button class="link" data-a="fx" data-act="dismiss" data-key="gapday${date}">Skip</button></div></div>`;
}

/* ============ CHECKOUT ============ */
function vCheckout() {
  const groups = {}; S.cart.forEach(it => { const I = info(it); if (I.own) return; const g = groups[I.vendor] = groups[I.vendor] || {items:[], sum:0}; g.items.push({it, I}); g.sum += I.price || 0; });
  const sub = subtotal(), gst = gstTotal(), tot = total(); const ferries = S.cart.filter(x => x.kind === 'ferry' && !x.own).length;
  const pays = [['upi', 'UPI', 'Pay from any UPI app'], ['card', 'Debit or credit card', 'Visa, Mastercard, RuPay'], ['nb', 'Netbanking', 'All major Indian banks']];
  return {title:t('checkout'), body:`<div class="wrap"><div class="sec">
    <div class="steps" aria-label="Checkout steps"><span class="done"><i>${ic('check', 14, 3)}</i>${t('trip')}</span><hr><span class="on"><i>2</i>Details &amp; payment</span><hr><span><i>3</i>${t('passes')}</span></div>
    ${dateNudge('checkout')}
    <div class="co"><div class="co-main">
      <div class="card"><h3><span class="stepno">1</span>${t('leadTraveller')}</h3><div class="form">
        <div class="field"><label for="ln">Full name (as on ID)</label><input id="ln" value="${esc(S.lead.name)}" placeholder="e.g. Priya Sharma" autocomplete="name"></div>
        <div class="two"><div class="field"><label for="lp">WhatsApp number</label><input id="lp" value="${esc(S.lead.phone)}" placeholder="+91 98xxx xxxxx" inputmode="tel"></div><div class="field"><label for="le">Email</label><input id="le" value="${esc(S.lead.email)}" placeholder="you@email.com" inputmode="email"></div></div>
        <p class="note">Passes and live updates come on WhatsApp.${ferries ? ` Ferry operators need each passenger's name, age and ID for the manifest; we'll ask for these right after payment.` : ''}</p></div></div>
      <div class="card"><h3><span class="stepno">2</span>${t('payWith')}</h3>${pays.map(([k, b, s]) => `<button class="pay" data-a="paym" data-k="${k}" aria-pressed="${S.pay === k}"><span class="rd"></span><div><b>${b}</b><small>${s}</small></div></button>`).join('')}</div>
      <p class="note">${ic('shield', 14)} This is a prototype. No real payment is taken.</p>
    </div>
    <aside class="co-side">
      <div class="card"><h3><span class="stepno">3</span>${t('whereMoney')}</h3><p class="note">One payment. Each partner is paid their share directly.</p>
        <div class="split">${Object.entries(groups).map(([v, g]) => `<span><b>${esc(v)}</b></span><span class="v">${g.sum ? inr(g.sum) : 'On request'}</span><span class="sub">${g.items.map(x => esc(x.I.title.length > 34 ? x.I.title.slice(0, 32) + '…' : x.I.title) + ' · ' + fD(x.it.date)).join('<br>')}</span>`).join('')}
        <span class="hr"></span><span>Subtotal</span><span class="v">${inr(sub)}</span><span>GST</span><span class="v">${inr(gst)}</span><span class="sub">5% on ferries, cabs and hotels up to ₹7,500 a night; 18% on activities and rentals; none on government fees.</span>
        <span class="hr"></span><span><b>${t('total')}</b></span><span class="v" style="font:800 24px var(--f-display)">${inr(tot)}</span>${onReq() ? `<span class="sub">${onReq()} item(s) confirmed by the partner before you're charged</span>` : ''}</div></div>
      <div class="trustkit">${[['shield', t('tk1')], ['check', t('tk2')], ['wifioff', t('tk3')]].map(([i, x]) => `<div>${ic(i, 18, 2.2)}<span>${x}</span></div>`).join('')}</div>
    </aside></div>
  </div></div>`, cta:ctaBar(tot, `${S.cart.length} item${S.cart.length === 1 ? '' : 's'} · incl. GST`, `<button class="btn" data-a="pay">${t('pay')} ${inr(tot)}</button>`)};
}
function vPaid(v) {
  if (v.processing) return {title:'Payment', body:`<div class="wrap"><div class="empty"><div class="spin"></div><h2>Confirming with partners…</h2><p>Sending each booking to its operator.</p></div></div>`};
  return {title:'Booked', body:`<div class="wrap"><div class="empty"><span class="art">${art('HAV', null, 'ENT-RADHANAGAR', {tod:'dusk'})}</span><span class="tag ok">${ic('check', 12, 2.6)} Paid and confirmed</span><h2>Booking confirmed</h2><p>Your ${S.booked.length} passes are saved on this device and work offline. Copies have been sent on WhatsApp.</p><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><button class="btn primary" data-a="tab" data-v="passes">${t('viewPasses')} ${ic('arrow', 18, 2.2)}</button><button class="btn ghost" style="min-height:52px;border-radius:16px" data-a="tab" data-v="home">Keep exploring</button></div></div></div>`};
}

/* ============ PASSES ============ */
function vPasses() {
  const offl = `<button class="offline" data-a="offline" role="switch" aria-checked="${S.offline}" style="width:100%;text-align:left">${ic('wifioff', 18)}<span style="flex:1">${S.offline ? 'No network. Passes still open and scan.' : 'Try it: switch off the network'}</span><span class="toggle" aria-hidden="true" ${S.offline ? 'aria-checked="true"' : ''}></span></button>`;
  if (!S.booked.length) return {title:t('passes'), body:`<div class="wrap"><div class="empty"><span class="art">${art('PBL', 'ferry', 'SAIL-001', {tod:'dawn'})}</span><h2>No passes yet</h2><p>After payment, every ferry, stay, transfer and activity receives its own QR pass, saved on your phone.</p><button class="btn primary" data-a="tab" data-v="trip">Go to my trip ${ic('arrow', 18, 2.2)}</button></div></div>`};
  const list = S.booked.slice().sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)); let last = null;
  return {title:t('passes'), body:`<div class="wrap"><div class="sec"><div class="sechd"><h2>${t('passes')}</h2><span class="sub">${list.length} saved offline</span></div>${offl}<div class="passgrid">${list.map(p => { const head = p.date !== last ? `<div class="eyebrow" style="margin-top:8px;grid-column:1/-1">${fD(p.date)}</div>` : ''; last = p.date; return head + passCard(p); }).join('')}</div></div></div>`};
}
function passCard(p) {
  const used = S.scans[p.code];
  return `<button class="pass" data-a="go" data-v="pass" data-code="${p.code}"><div class="band" style="--zc:${ZC(p.zone)}"><b>${esc(ZN[p.zone].name)}${p.to ? ' → ' + esc(ZN[p.to].name) : ''}</b><span class="mono" style="font-size:12px">${p.time}</span></div><div class="pb"><div style="min-width:0;display:flex;flex-direction:column;gap:4px"><h3>${esc(p.title)}</h3><span class="muted" style="font-size:12.5px">${esc(p.sub)}</span><span style="display:flex;gap:6px;flex-wrap:wrap"><span class="tag ok">${ic('check', 11, 2.6)} ${t('offline')}</span>${used ? `<span class="tag">Used ${used}</span>` : ''}</span></div><span class="qr">${qr(p.code, 21)}</span></div><div class="pf"><span>${esc(p.report)}</span><span class="mono">${p.code}</span></div></button>`;
}
function vPass(v) {
  const p = S.booked.find(x => x.code === v.code); if (!p) return vPasses();
  return {title:'Pass', body:`<div class="wrap"><div class="sec" style="align-items:stretch">
    ${S.offline ? `<div class="offline">${ic('wifioff', 18)} No network. This pass still works.</div>` : ''}
    <div class="pass" style="cursor:default"><div class="band" style="--zc:${ZC(p.zone)}"><b>${esc(p.title)}</b><span class="mono" style="font-size:12px">${fD(p.date)}</span></div>
    <div style="padding:18px 14px;display:flex;flex-direction:column;gap:14px;align-items:center"><div class="bigqr">${qr(p.code, 29)}</div><div class="mono" style="font-size:18px;font-weight:700;letter-spacing:.08em">${p.code}</div></div>
    <div class="pf" style="flex-direction:column;gap:6px"><div class="kv" style="width:100%"><div><small>When</small><b>${fD(p.date)} · ${p.time}</b></div><div><small>Report</small><b>${esc(p.report)}</b></div><div><small>Travellers</small><b>${p.pax}</b></div><div><small>Partner</small><b>${esc(p.vendor)}</b></div>${p.seats ? `<div><small>Seats</small><b>${esc(p.seats)}</b></div>` : ''}</div></div></div>
    <p class="note">${ic('shield', 14)} The code is signed when you pay, so staff can check it on their phone without internet. Turn up brightness at the gate.</p>
  </div></div>`};
}

/* ============ PROFILE + PARTNER VIEWS ============ */
function vProfile() {
  const ed = Object.keys(S.po || {}).length;
  return {title:t('profile'), body:`<div class="wrap"><div class="sec">
    <div class="card" style="flex-direction:row;align-items:center;gap:12px"><span style="width:48px;height:48px;border-radius:50%;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center">${ic('user', 24)}</span><div style="flex:1"><b>${esc(S.lead.name || 'Guest traveller')}</b><div class="muted" style="font-size:13px">${esc(S.lead.phone || 'Sign in with your WhatsApp number')}</div></div></div>
    <div class="eyebrow">For partners and staff</div>
    <div class="menu">
      <button data-a="go" data-v="dss">${ic('ferry', 22)}<div><b>Government ship timetable</b><small>Every DSS sailing with days, stops and fares</small></div></button>
      <button data-a="go" data-v="admin">${ic('table', 22)}<div><b>Price admin</b><small>Edit cost and selling prices by category${ed ? ` · ${ed} edited` : ''}</small></div></button>
      <button data-a="go" data-v="vendor">${ic('store', 22)}<div><b>Partner inbox</b><small>How a hotel, boat or cab partner gets and accepts bookings</small></div></button>
      <button data-a="go" data-v="scanner">${ic('qr', 22)}<div><b>Gate scanner</b><small>Jetty or counter staff check passes with no network</small></div></button>
    </div>
    <div class="eyebrow">${t('appearance')}</div>
    <div class="menu"><div><div><b>${t('theme')}</b><small>${t('themeSub')}</small></div></div><div style="display:block"><div class="segm" role="group" aria-label="${t('theme')}">${[['system', t('thSystem')], ['light', t('thLight')], ['dark', t('thDark')]].map(([k, l]) => `<button data-a="theme" data-k="${k}" aria-pressed="${(S.theme || 'system') === k}">${l}</button>`).join('')}</div></div></div>
    <div class="eyebrow">Try it out</div>
    <div class="menu">
      <button data-a="sample">${ic('trip', 22)}<div><b>Load an example trip</b><small>6 days across Port Blair, Havelock and Neil, with a few things to fix</small></div></button>
      <button data-a="reset">${ic('swap', 22)}<div><b>Start over</b><small>Clears your trip, vouchers and dates</small></div></button>
    </div>
    <p class="note">Catalogue: ${D.hotels.length} stays, ${D.acts.filter(shown).length} things to do, ${BOOKABLE.length} sailings, ${D.routes.length} point-to-point cab routes and ${D.rentals.length} rentals. Prices are seasonal (Peak 15 Dec–15 Jan, Lean 16 May–30 Sep) and shown before GST.</p>
  </div></div>`};
}
function vVendor() {
  const list = S.booked.filter(p => p.vendor !== 'Booked elsewhere');
  if (!list.length) return {title:'Partner inbox', body:`<div class="wrap"><div class="empty"><h2>No bookings yet</h2><p>Complete a checkout and each partner's booking will appear here as they'd receive it on WhatsApp.</p><button class="btn" data-a="sample">Load sample trip</button></div></div>`};
  const byV = {}; list.forEach(p => (byV[p.vendor] = byV[p.vendor] || []).push(p));
  const vendors = Object.keys(byV); const sel = cur().vendor && byV[cur().vendor] ? cur().vendor : vendors[0]; const ps = byV[sel];
  return {title:'Partner inbox', body:`<div class="wrap"><div class="sec">
    <div class="field"><label for="vsel">Viewing as partner</label><select id="vsel">${vendors.map(v => `<option ${v === sel ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></div>
    <div class="wa">${ps.map(p => { const st = S.vendorStatus[p.code]; return `<div class="bub"><b>New booking ${p.code}</b><br>${esc(p.title)}<br>${fD(p.date)} · ${p.time} · ${p.pax} guest${p.pax > 1 ? 's' : ''}<br>Lead: ${esc(S.lead.name || 'Guest')}<br>You receive: <b>${p.net != null ? inr(p.net) : 'your quoted rate'}</b><br>Reply 1 to accept, 2 to decline.<span class="tm">10:4${p.code.charCodeAt(5) % 10}</span></div>${st ? `<div class="bub me">${st === 'ok' ? '1' : '2'}<span class="tm">✓✓</span></div><div class="bub">${st === 'ok' ? 'Accepted. The traveller has been told. Payout is released after the service date.' : 'Declined. We will offer the traveller an alternative and a full refund for this item.'}<span class="tm">now</span></div>` : ''}`; }).join('')}</div>
    ${ps.filter(p => !S.vendorStatus[p.code]).map(p => `<div class="card"><b>${esc(p.title)}</b><span class="muted" style="font-size:13px">${fD(p.date)} · ${p.time}</span><div style="display:flex;gap:8px"><button class="btn sm" data-a="vacc" data-code="${p.code}" data-s="ok">Accept</button><button class="btn sm ghost" data-a="vacc" data-code="${p.code}" data-s="no">Decline</button></div></div>`).join('')}
    <div class="card"><h3>Payouts</h3><div class="split">${ps.map(p => `<span>${esc(p.code)} · ${fD(p.date)}</span><span class="v">${p.net != null ? inr(p.net) : '—'}</span>`).join('')}<span class="hr"></span><span class="sub">Paid to the partner's bank or UPI ID automatically after the service date.</span></div></div>
  </div></div>`};
}
function vScanner(v) {
  const r = v.result;
  return {title:'Gate scanner', body:`<div class="wrap"><div class="sec">
    <div class="offline">${ic('wifioff', 18)} Offline mode. Signatures are checked on this phone.</div>
    <div class="scanbox"><div class="fr"></div><div class="ln"></div></div>
    ${r ? `<div class="result ${r.cls}"><h3>${r.h}</h3><span>${r.msg}</span></div>` : `<p class="note">Camera scanning works in the app. In this prototype, tap a pass below to scan it.</p>`}
    <div class="eyebrow">Passes to scan</div>
    ${S.booked.length ? S.booked.slice(0, 10).map(p => `<button class="mini" data-a="scan" data-code="${p.code}"><span class="sw" style="background:#fff;padding:3px">${qr(p.code, 21)}</span><div><b>${esc(p.title)}</b><span>${p.code} · ${fD(p.date)} ${p.time}</span></div></button>`).join('') : `<p class="muted">No passes yet. Book the sample trip first.</p>`}
    <button class="mini" data-a="scan" data-code="FAKE"><span class="sw" style="background:#fff;padding:3px">${qr('FAKE-XYZ', 21)}</span><div><b>Edited screenshot</b><span>A pass with a broken signature</span></div></button>
  </div></div>`};
}

/* ============ PRICE ADMIN (category-wise cost & selling) ============ */
const PCATS = [['stay', 'Stays', 'bed'], ['ferry', 'Ferries', 'ferry'], ['cab', 'Cabs', 'car'], ['act', 'Activities', 'mask'], ['place', 'Places & entry', 'camera'], ['rent', 'Rentals', 'scooter'], ['extra', 'Permits & extras', 'ticket']];
const SZN = [['ln', 'Lean'], ['hi', 'High'], ['pk', 'Peak'], ['eb', 'Extra adult'], ['cwb', 'Child no bed']];
let PIDX = null;
function priceIndex() {
  if (PIDX) return PIDX; const L = [];
  const push = (o) => { o.oc = o.obj[o.cf]; o.os = o.obj[o.sf]; L.push(o); };
  D.hotels.forEach(h => h.rooms.forEach(r => SZN.forEach(([sz, nm]) => { if (r['s_' + sz] == null) return; push({key:`${h.id}|${r.n}|${sz}`, cat:'stay', grp:h.id, gname:h.n, z:h.z, name:r.n, sub:nm + (sz === 'eb' || sz === 'cwb' ? ' / night' : ' season / night'), f:sz, obj:r, cf:sz, sf:'s_' + sz, est:h.est, hotel:h}); })));
  D.sails.filter(s => s.fares && s.fares.length).forEach(s => s.fares.forEach(x => push({key:`${s.id}|${x.n}`, cat:'ferry', grp:s.id, gname:`${s.op.replace(/ \d$/, '')} · ${s.dep} ${ZN[s.f].name} → ${ZN[s.to].name}`, z:s.f, name:x.n, sub:'per seat', f:s.op.replace(/ \d$/, ''), obj:x, cf:'c', sf:'f', sail:s})));
  D.routes.forEach(r => r.prices.forEach(p => { [['ow', 'One way'], ['ret', 'Return' + (r.wait ? ` · ${r.wait} h wait` : '')]].forEach(([k, nm]) => { if (p[k] == null) return; push({key:`${r.id}|${p.c}|${k}`, cat:'cab', grp:r.id, gname:`${r.a.replace(/ \(.*\)$/, '')} → ${r.b.replace(/ \(.*\)$/, '')}`, z:r.z, name:p.c, sub:nm, f:p.c, obj:p, cf:'c_' + k, sf:k}); }); }));
  D.acts.filter(a => shown(a) || a.entry).forEach(a => push({key:a.id, cat:a.entry ? 'place' : 'act', grp:a.id, gname:a.n, z:a.z, name:a.v || a.n, sub:a.entry ? 'entry / person' : unitOf(a.b).replace('/ ', 'per '), f:a.entry ? '' : (catOf(a) || {}).n, obj:a, cf:'cost', sf:'p', est:a.est, single:true}));
  D.rentals.forEach(r => push({key:r.id, cat:'rent', grp:r.id, gname:r.n, z:r.z, name:r.n, sub:'per day', obj:r, cf:'cost', sf:'p', single:true}));
  (D.extras || []).forEach(x => push({key:x.id, cat:'extra', grp:x.id, gname:x.n, z:x.z, name:x.n, sub:x.unit || '', f:x.cat, obj:x, cf:'cost', sf:'p', single:true}));
  return PIDX = L;
}
function applyPO() {
  const po = S.po || {};
  priceIndex().forEach(o => { const e = po[o.key]; o.obj[o.cf] = e && e.c != null ? e.c : o.oc; o.obj[o.sf] = e && e.s != null ? e.s : o.os; });
  D.hotels.forEach(h => { const v = h.rooms.map(r => r.s_hi).filter(x => x != null); if (v.length) h.p = Math.min(...v); });
  D.sails.forEach(s => { s._cf = null; if (s.fares && s.fares.length) s.fare = s.fares[0].f; });
}
const mgn = (c, s) => c == null || s == null || !s ? null : Math.round((s - c) / c * 1000) / 10;
function mpill(c, s) { const m = mgn(c, s); if (m == null) return `<span class="mp none">—</span>`; const cls = m < 0 ? 'neg' : m < 8 ? 'low' : m > 40 ? 'high' : 'ok'; return `<span class="mp ${cls}">${m >= 0 ? '+' : '−'}${Math.abs(m)}%<small>${s - c < 0 ? '−' : ''}${inr(Math.abs(s - c))}</small></span>`; }
function adminRows(v) {
  const q = (v.q || '').toLowerCase(); const po = S.po || {};
  return priceIndex().filter(o => o.cat === v.cat && (!v.z || o.z === v.z) && (!v.f || o.f === v.f) && (!q || (o.gname + ' ' + o.name + ' ' + o.key).toLowerCase().includes(q))
    && (v.only !== 'low' || ((x => x != null && x < 8)(mgn(o.obj[o.cf], o.obj[o.sf])))) && (v.only !== 'est' || o.est) && (v.only !== 'edit' || po[o.key]) && (v.only !== 'miss' || o.obj[o.cf] == null));
}
function vAdmin(v) {
  v.cat = v.cat || 'stay'; if (v.cat === 'stay' && v.f === undefined) v.f = 'hi';
  const all = priceIndex(); const po = S.po || {};
  const rows = adminRows(v); const inCat = all.filter(o => o.cat === v.cat);
  const zs = [...new Set(inCat.map(o => o.z))].filter(z => ZN[z]);
  const fs = v.cat === 'stay' ? SZN.map(x => x[0]) : [...new Set(inCat.map(o => o.f).filter(Boolean))];
  const fname = f => v.cat === 'stay' ? (SZN.find(x => x[0] === f) || [, f])[1] : f;
  const ms = rows.map(o => mgn(o.obj[o.cf], o.obj[o.sf])).filter(x => x != null); const avg = ms.length ? Math.round(ms.reduce((a, b) => a + b, 0) / ms.length * 10) / 10 : null;
  const low = ms.filter(x => x < 8).length; const edited = rows.filter(o => po[o.key]).length;
  const lim = v.lim || 60; const shownRows = rows.slice(0, lim);
  // group rows by product
  const groups = []; shownRows.forEach(o => { const g = groups[groups.length - 1]; if (g && g.id === o.grp) g.rows.push(o); else groups.push({id:o.grp, name:o.gname, z:o.z, single:o.single, est:o.est, rows:[o]}); });
  const row = o => { const c = o.obj[o.cf], s = o.obj[o.sf]; const ed = po[o.key]; return `<div class="prow ${ed ? 'ed' : ''}"><div class="pn"><b>${esc(o.single ? o.sub : o.name)}</b>${o.single ? '' : `<small>${esc(o.sub)}</small>`}${ed ? `<button class="rs" data-a="pores" data-k="${esc(o.key)}">Undo edit</button>` : ''}</div>
    <label class="pin"><small>Cost</small><input inputmode="numeric" data-pk="${esc(o.key)}" data-pf="c" value="${c ?? ''}" placeholder="—" aria-label="Cost price, ${esc(o.gname)} ${esc(o.name)}"></label>
    <label class="pin"><small>Selling</small><input inputmode="numeric" data-pk="${esc(o.key)}" data-pf="s" value="${s ?? ''}" placeholder="—" aria-label="Selling price, ${esc(o.gname)} ${esc(o.name)}"></label>${mpill(c, s)}</div>`; };
  const chip = (a, attr, val, cur0, label) => `<button class="chip" data-a="${a}" data-${attr}="${esc(val)}" aria-pressed="${cur0 === val}">${label}</button>`;
  return {title:'Price admin', body:`<div class="wrap"><div class="sec">
    <div class="pcats" role="tablist">${PCATS.map(([k, n, icn]) => { const c = all.filter(o => o.cat === k); const e = c.filter(o => po[o.key]).length; return `<button role="tab" data-a="pcat" data-k="${k}" aria-selected="${v.cat === k}">${ic(icn, 18)}<b>${n}</b><small>${c.length}${e ? ` · ${e} edited` : ''}</small></button>`; }).join('')}</div>
    <div class="facts four"><div class="fact"><small>Prices shown</small><b class="num">${rows.length}</b></div><div class="fact"><small>Avg margin</small><b class="num">${avg == null ? '—' : '+' + avg + '%'}</b></div><button class="fact" data-a="ponly" data-k="${v.only === 'low' ? '' : 'low'}" aria-pressed="${v.only === 'low'}"><small>Below 8%</small><b class="num" style="color:${low ? 'var(--bad)' : 'var(--ok)'}">${low}</b></button><button class="fact" data-a="ponly" data-k="${v.only === 'edit' ? '' : 'edit'}" aria-pressed="${v.only === 'edit'}"><small>Edited</small><b class="num">${edited}</b></button></div>
    <div class="search" style="box-shadow:none">${ic('search', 18)}<input id="aq" type="search" placeholder="Find a hotel, route, boat or activity" value="${esc(v.q || '')}"></div>
    ${fs.length > 1 ? `<div class="chips">${v.cat === 'stay' ? '' : chip('pf', 'f', '', v.f || '', 'All')}${fs.map(f => chip('pf', 'f', f, v.f || '', esc(fname(f)))).join('')}</div>` : ''}
    ${zs.length > 1 ? `<div class="chips">${chip('pz', 'z', '', v.z || '', 'All islands')}${zs.map(z => chip('pz', 'z', z, v.z || '', ZN[z].name)).join('')}</div>` : ''}
    <div class="chips">${[['', 'Everything'], ['low', 'Low margin'], ['est', 'Estimated'], ['miss', 'No cost yet'], ['edit', 'Edited']].map(([k, n]) => chip('ponly', 'k', k, v.only || '', n)).join('')}</div>
    <details class="bulk"${v.bulk ? ' open' : ''}><summary>${ic('table', 16)} Change all ${rows.length} shown at once</summary>
      <div class="form" style="padding-top:10px">
        <div class="brow"><span>Selling = cost +</span><input id="bm" inputmode="decimal" value="${v.bm ?? 15}" aria-label="Margin percent"><span>%</span><button class="btn sm" data-a="pbulk" data-k="margin">Apply</button></div>
        <div class="brow"><span>Raise selling by</span><input id="bp" inputmode="decimal" value="${v.bp ?? 5}" aria-label="Percent change"><span>%</span><button class="btn sm ghost" data-a="pbulk" data-k="pct">Apply</button></div>
        <p class="note">Use a minus number to lower prices. Rounded to the nearest ₹10. Undo is available right after.</p>
        ${S.poUndo ? `<button class="btn sm quiet" data-a="pundo">Undo last bulk change</button>` : ''}
      </div></details>
    <div class="plist">${groups.map(g => `<div class="pg">${g.single && g.rows.length === 1 ? `<div class="pgh"><span class="dot" style="background:${ZC(g.z)}"></span><b>${esc(g.name)}</b>${g.est ? '<span class="tag warn">est.</span>' : ''}</div>` : `<div class="pgh"><span class="dot" style="background:${ZC(g.z)}"></span><b>${esc(g.name)}</b><small>${ZN[g.z] ? ZN[g.z].name : ''}</small>${g.est ? '<span class="tag warn">est.</span>' : ''}</div>`}${g.rows.map(row).join('')}</div>`).join('') || `<p class="muted">Nothing matches these filters.</p>`}</div>
    ${rows.length > lim ? `<button class="btn ghost block" data-a="pmore">Show ${Math.min(60, rows.length - lim)} more of ${rows.length - lim}</button>` : ''}
    <div class="card"><h3>Your changes</h3><p class="note">${Object.keys(po).length} price${Object.keys(po).length === 1 ? '' : 's'} edited. They update the whole app right away and stay on this phone. Copy them to send to your developer or paste into the Rate Desk.</p>
      <div class="two"><button class="btn ghost" data-a="pcopy" ${Object.keys(po).length ? '' : 'disabled'}>Copy as CSV</button><button class="btn ghost" data-a="preset" style="color:var(--bad)" ${Object.keys(po).length ? '' : 'disabled'}>Reset all</button></div></div>
  </div></div>`};
}
function poSet(key, f, val) {
  const o = priceIndex().find(x => x.key === key); if (!o) return;
  const e = Object.assign({}, (S.po || {})[key]); const orig = f === 'c' ? o.oc : o.os;
  if (val === orig) delete e[f]; else e[f] = val;
  S.po = S.po || {}; if (e.c == null && e.s == null) delete S.po[key]; else S.po[key] = e;
  applyPO();
}
function poCSV() {
  const L = ['key,category,product,item,cost_old,cost_new,selling_old,selling_new'];
  Object.entries(S.po || {}).forEach(([k, e]) => { const o = priceIndex().find(x => x.key === k); if (!o) return; const q = s => `"${String(s).replace(/"/g, '""')}"`; L.push([q(k), o.cat, q(o.gname), q(o.name + ' ' + o.sub), o.oc ?? '', e.c ?? o.oc ?? '', o.os ?? '', e.s ?? o.os ?? ''].join(',')); });
  return L.join('\n');
}

/* ============ SHEETS ============ */
const sheetWrap = (label, inner) => `<div class="scrim" data-a="closesheet"><div class="sheet wrap" role="dialog" aria-modal="true" aria-label="${esc(label)}" data-stop="1"><div class="grab"></div><div class="form">${inner}</div></div></div>`;
function datesSheet() {
  const w = S.win || (S.trip ? {start:S.trip.start, end:S.trip.end} : {start:SAMPLE0, end:addD(SAMPLE0, 5)});
  const N0 = Math.max(1, Math.round((pDate(w.end) - pDate(w.start)) / 864e5));
  const arr = D.flights.filter(f => f.dir === 'Arrival'), dep = D.flights.filter(f => f.dir === 'Departure');
  const st = (k, id, val, min) => `<div class="field"><label>${t(k)}</label><div class="stepper"><button data-a="pax" data-k="${id}" data-min="${min}" data-d="-1" aria-label="Fewer ${t(k)}">−</button><span id="${id}">${val}</span><button data-a="pax" data-k="${id}" data-min="${min}" data-d="1" aria-label="More ${t(k)}">+</button></div></div>`;
  return sheetWrap('Trip dates', `<h2>Trip dates</h2>
    <p class="note" style="margin-top:-6px">Pick the day you land, then how many nights. Changing dates keeps your items; we re-check every timing.</p>
    <div class="two"><div class="field"><label for="ds">Arrival day</label><input id="ds" type="date" value="${w.start}" min="${TODAY}"></div>
      <div class="field"><label>Nights</label><div class="stepper"><button data-a="dsn" data-d="-1" aria-label="One night less">−</button><span id="dsn">${N0}</span><button data-a="dsn" data-d="1" aria-label="One more night">+</button></div></div></div>
    <div class="lx-nchips">${[3, 4, 5, 6, 7, 9].map(n => `<button class="chip sm${n === N0 ? ' on' : ''}" data-a="dsn" data-n="${n}">${n}N / ${n + 1}D</button>`).join('')}</div>
    <input id="de" type="hidden" value="${w.end}"><p class="lx-leave" id="dsl">${ic('plane', 14)} Fly home <b>${fD(w.end)}</b> · ${N0} night${N0 > 1 ? 's' : ''}, ${N0 + 1} days</p>
    <div class="three">${st('adults', 'pa', S.pax.adults, 1)}${st('kids', 'pk', S.pax.kids, 0)}${st('infants', 'pi', S.pax.infants, 0)}</div>
    <div id="ages" class="ages">${agesHTML(S.pax.kids)}</div>
    <label class="ownrow" style="cursor:pointer"><span style="flex:1;text-align:left"><b>Someone in the group is 60+</b><small>We'll suggest easier-paced things and skip adventure sports</small></span><input id="psen" type="checkbox" ${S.pax.sen ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--accent)"></label>
    <p class="note" style="margin-top:-4px">Children are 2–11 years; their ages decide which activities they can join. Infants under 2 travel free on ferries.</p>
    <div class="field"><label for="fi">Flight in (optional)</label><select id="fi"><option value="">I'll add it later</option>${arr.map(f => `<option value="${f.no}" ${S.fin && S.fin.no === f.no ? 'selected' : ''}>${f.no} · ${esc(f.fr.split(' (')[0])} → lands ${f.arr}</option>`).join('')}</select></div>
    <div class="field"><label for="fo">Flight out (optional)</label><select id="fo"><option value="">I'll add it later</option>${dep.map(f => `<option value="${f.no}" ${S.fout && S.fout.no === f.no ? 'selected' : ''}>${f.no} · ${f.dep} to ${esc(f.to.split(' (')[0])}</option>`).join('')}</select></div>
    <p class="note">Flights help us check dive-before-flying rules and ferry connections.</p>
    <button class="btn primary block" data-a="savedates">${t('save')}</button>${S.win && !S.datesAssumed ? '' : `<button class="btn ghost block" data-a="skipdates">${t('skipDates')}</button>`}`);
}
function agesHTML(n) { const A = kidAges(); return n ? `<div class="field"><label>Children's ages</label><div class="opts">${Array.from({length:n}, (_, i) => `<select class="agesel" aria-label="Age of child ${i + 1}">${[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(y => `<option value="${y}" ${(A[i] ?? 8) === y ? 'selected' : ''}>${y} yrs</option>`).join('')}</select>`).join('')}</div></div>` : ''; }
function helpSheet() {
  return sheetWrap('Help', `<h2>Talk to us on WhatsApp</h2><p class="note">A local team member replies in Hindi, English, Bengali or Tamil, 7 am to 10 pm.</p>
    <div class="card" style="flex-direction:row;align-items:center"><b class="mono" style="flex:1;font-size:17px;user-select:all">+91 00000 00000</b><button class="btn sm quiet" data-a="copy">Copy</button></div>
    <p class="note">Placeholder number for the prototype.</p><button class="btn ghost block" data-a="closesheet">${t('done')}</button>`);
}
function breakdownSheet() {
  const days = [...new Set(S.cart.map(i => i.date))].sort(); const itemTime = it => it.kind === 'stay' ? hm(CHECKIN) : it.kind === 'ferry' ? SAIL[it.ref].dep : (it.t || '');
  return sheetWrap('Price breakdown', `<h2>Price breakdown</h2>
    <div class="split">${days.map(d => { const its = S.cart.filter(i => i.date === d).sort((a, b) => itemTime(a).localeCompare(itemTime(b))); const sub = its.reduce((s, i) => s + (info(i).price || 0), 0);
      return `<span class="dayrow">${fD(d)}</span><span class="v dayrow">${inr(sub)}</span>` + its.map(i => { const I = info(i); return `<span>${esc(I.title)}<small class="faint" style="display:block">${I.own ? 'Booked elsewhere' : I.perTxt ? I.perTxt : I.per > 1 ? `${I.per} × ${inr(I.unit)}` : esc(I.sub)}</small>${bkTag(i)}</span><span class="v">${I.own ? '—' : I.price == null ? 'On request' : inr(I.price)}</span>`; }).join(''); }).join('')}
      <span class="hr"></span><span>Subtotal</span><span class="v">${inr(subtotal())}</span><span>GST</span><span class="v">${inr(gstTotal())}</span>
      <span class="hr"></span><span><b>${t('total')}</b></span><span class="v" style="font-size:18px">${inr(total())}</span>${onReq() ? `<span class="sub">${onReq()} item(s) priced on request are confirmed before you pay for them.</span>` : ''}</div>
    <button class="btn ghost block" data-a="closesheet">${t('done')}</button>`);
}
function fixMenuSheet() {
  const R = run(S.cart);
  return sheetWrap('Fix issues', `<h2>${R.hard} thing${R.hard > 1 ? 's' : ''} won't work as planned</h2><p class="note" style="margin-top:-6px">We can rearrange your trip using island timing rules: move times, switch to a ferry that fits, or add the missing ferry, cab or boat. You'll see every change and can undo it.</p>
    <button class="btn primary block" data-a="autofix">${ic('check', 18, 2.4)} ${t('fixForMe')}</button><button class="btn ghost block" data-a="firstissue">I'll fix them myself</button>`);
}
function autoFixSheet() {
  const L = S.autoLog || []; const R = run(S.cart);
  return sheetWrap('Fixes', `<h2>${L.length ? `We changed ${L.length} thing${L.length > 1 ? 's' : ''}` : 'This one needs your choice'}</h2><p class="note" style="margin-top:-6px">${R.hard ? `${R.hard} still need${R.hard > 1 ? '' : 's'} you to pick. They're marked in red.` : 'Every timing works now.'}</p>
    ${L.length ? `<div class="menu">${L.map(l => `<div class="fixlog">${ic(l.icon || 'check', 18, 2)}<div><b>${esc(l.t)}</b>${l.s ? `<small>${esc(l.s)}</small>` : ''}</div></div>`).join('')}</div>` : ''}
    <div class="two">${L.length ? `<button class="btn ghost" data-a="autofixundo">Undo</button>` : ''}<button class="btn primary" data-a="${R.hard ? 'firstissue' : 'closesheet'}">${R.hard ? 'Show me' : t('done')}</button></div>`);
}
function ferryAddedSheet() {
  const it = S.cart.find(x => x.uid === S.lastFerry); if (!it) return ''; const s = SAIL[it.ref];
  const hasRet = S.cart.some(x => x.kind === 'ferry' && SAIL[x.ref].f === s.to && SAIL[x.ref].to === s.f && x.date >= it.date);
  const hasStay = !!stayOn(S.cart, s.to, it.date, false);
  return sheetWrap('Ferry added', `<h2>${it.own ? 'Ferry added to your trip' : 'Ferry added'}</h2>
    <p class="note" style="margin-top:-6px">${ZN[s.f].name} → ${ZN[s.to].name} · ${fD(it.date)} · ${s.dep}–${s.arr}${it.seats && it.seats.length ? ` · seats ${it.seats.join(', ')}` : ''}</p>
    <div class="menu">
      ${!hasStay && !(s.to === 'PBL' && flightOut() && flightOut().date === it.date) ? `<button data-a="fasheet" data-go="stay">${ic('bed', 22)}<div><b>Find a stay on ${ZN[s.to].name}</b><small>Check-in ${fD(it.date)}, ${season(it.date) === 'pk' ? 'peak' : season(it.date) === 'ln' ? 'lean' : 'high'}-season prices</small></div></button>` : ''}
      ${!hasRet && s.to !== 'PBL' ? `<button data-a="fasheet" data-go="ret">${ic('ferry', 22)}<div><b>${t('addReturn')}</b><small>${ZN[s.to].name} → ${ZN[s.f].name}</small></div></button>` : ''}
      <button data-a="fasheet" data-go="do">${ic('mask', 22)}<div><b>Things to do on ${ZN[s.to].name}</b><small>We check each one fits around your ferry</small></div></button>
    </div>
    <div class="two"><button class="btn ghost" data-a="closesheet">${t('keep')}</button><button class="btn primary" data-a="fasheet" data-go="trip">${t('viewTrip')}</button></div>`);
}

/* ============ RENDER ============ */
const VIEWS = {adv:vAdv, pkgs:vPkgs, pkg:vPkg, home:vHome, search:vSearch, store:vStore, route:vRoute, seats:vSeats, product:vProduct, trip:vTrip, checkout:vCheckout, paid:vPaid, passes:vPasses, pass:vPass, profile:vProfile, vendor:vVendor, scanner:vScanner, admin:vAdmin};
let _toastT;
function toast(m) { clearTimeout(_toastT); const app = document.getElementById('app'); if (!app) return; const el0 = document.querySelector('.toast'); if (el0) el0.remove(); app.insertAdjacentHTML('beforeend', `<div class="toast" role="status">${esc(m)}</div>`); _toastT = setTimeout(() => { const el = document.querySelector('.toast'); if (el) el.remove(); }, 2200); }
function toastUndo(m) { clearTimeout(_toastT); const el0 = document.querySelector('.toast'); if (el0) el0.remove(); const app = document.getElementById('app'); if (!app) return;
  app.insertAdjacentHTML('beforeend', `<div class="toast" role="status"><span>${esc(m)}</span><button data-a="undo">Undo</button></div>`); _toastT = setTimeout(() => { const el = document.querySelector('.toast'); if (el) el.remove(); }, 5000); }
function render(top) {
  syncTrip(); save();
  const v = cur(); const out = VIEWS[v.v](v); const root = S.stack.length === 1; const tb = TABV[v.v]; const home = v.v === 'home';
  const R = S.cart.length ? run(S.cart) : {hard:0};
  const tabs = [['home', 'explore', t('explore')], ['trip', 'trip', t('trip')], ['passes', 'ticket', t('passes')], ['profile', 'user', t('profile')]];
  const badge = k => k === 'trip' && S.cart.length ? `<span class="badge ${R.hard ? 'bad' : ''}">${R.hard ? R.hard : S.cart.length}</span>` : k === 'passes' && S.booked.length ? `<span class="badge">${S.booked.length}</span>` : '';
  const head = `<div class="topin wrap">
    <button class="iconbtn back" data-a="back" aria-label="Back" style="margin-left:-8px">${ic('back', 22, 2.2)}</button>
    <button class="brand" data-a="tab" data-v="home" aria-label="Andaman Travel Planner, home">${logoMark(36)}<span>Andaman<small>Travel Planner</small></span></button>
    <span class="topttl">${esc(out.title || '')}</span>
    <nav class="dnav" aria-label="Main">${tabs.map(([k, , l]) => `<button data-a="tab" data-v="${k}" aria-current="${TABV[k] === tb ? 'page' : 'false'}">${l}${badge(k)}</button>`).join('')}</nav>
    <div class="tools"><div class="lang" role="group" aria-label="Language"><button data-a="lang" data-l="en" aria-pressed="${S.lang === 'en'}">EN</button><button data-a="lang" data-l="hi" aria-pressed="${S.lang === 'hi'}">हिं</button></div>
      <button class="iconbtn" data-a="themecycle" aria-label="Switch between light and dark">${ic('theme', 20, 1.8)}</button>
      ${S.cart.length && tb !== 'trip' ? `<button class="tripbtn" data-a="tab" data-v="trip">${ic('trip', 18, 2)}<span>${t('trip')}</span><b>${inr(total())}</b></button>` : ''}</div></div>`;
  const nav = `<nav class="nav" aria-label="Main">${tabs.map(([k, icn, l]) => `<button data-a="tab" data-v="${k}" aria-current="${TABV[k] === tb ? 'page' : 'false'}">${ic(icn, 22)}<span>${l}</span>${badge(k)}</button>`).join('')}</nav>`;
  const SH = {pkgload:pkgSheet, dates:datesSheet, help:helpSheet, breakdown:breakdownSheet, fixmenu:fixMenuSheet, autofix:autoFixSheet, ferryadded:ferryAddedSheet, block:blockSheet, move:moveSheet};
  const sheet = S.sheet && SH[S.sheet] ? SH[S.sheet]() : '';
  const y = window.scrollY; const both = out.cta && root;
  const crumb = root ? '' : `<div class="crumb wrap d-only flex"><button data-a="back">${ic('back', 16, 2.4)} Back</button></div>`;
  const app = document.getElementById('app');
  app.innerHTML = `<header class="top${home ? ' over' : ''}${root ? (home ? '' : ' rootp') : ' sub'}">${head}</header><main class="${both ? 'tall ' : ''}${out.side ? 'has-side ' : ''}${top ? 'enter' : ''}">${crumb}${out.body}</main>${out.cta ? (both ? out.cta.replace('class="cta wrap"', 'class="cta wrap abovenav"') : out.cta) : ''}${out.cta && !root ? '' : nav}${!out.cta && ['home', 'store', 'product'].includes(v.v) ? `<button class="fab" data-a="help" aria-label="Help on WhatsApp">${ic('chat', 24, 2)}</button>` : ''}${sheet}`;
  if (!S._tod) S._tod = todNow(); app.dataset.tod = S._tod;
  document.documentElement.lang = S.lang === 'hi' ? 'hi' : 'en';
  if (S.theme === 'light' || S.theme === 'dark') document.documentElement.dataset.theme = S.theme; else delete document.documentElement.dataset.theme;
  const bdg = document.querySelector('.nav button[data-v="trip"] .badge'); if (bdg && S.cart.length > (render._n || 0) && render._n != null) bdg.classList.add('bump'); render._n = S.cart.length;
  if (S.flashUid) setTimeout(() => { S.flashUid = null; }, 50);
  if (top && v._y != null) { const y0 = v._y; delete v._y; window.scrollTo(0, y0); if (S.flashUid && typeof document.querySelector === 'function') { const el = document.querySelector('.item.flash'); if (el && el.scrollIntoView) el.scrollIntoView({block:'center'}); } }
  else window.scrollTo(0, top ? 0 : y);
  const tp = document.querySelector('.top'); if (tp && window.scrollY > 4) tp.classList.add('scrolled');
  const q = document.getElementById('q'); if (q && v.v === 'search' && top) q.focus();
  document.querySelectorAll('.chips,.daypick').forEach(c => { if (c.scrollWidth <= c.clientWidth + 4) return; const on = c.querySelector('[aria-pressed="true"]'); if (on) c.scrollLeft = Math.max(0, on.offsetLeft - c.offsetLeft - (c.clientWidth - on.offsetWidth) / 2); });
  if (home) heroStart();
}
function rerender() { render(false); }

/* ============ HOME v3: warm intro, what-you-need shortcuts, live map, packages, adventures ============ */
Object.assign(T.en, {
  heroP:"Hi! Tell us which islands you love and we'll build the trip with you, one piece at a time: ferries, stays, cabs and adventures. We quietly check every timing, so nothing clashes.",
  whatNeed:'What do you need?', cFerry:'Ferries', cStay:'Stays', cMove:'Cabs & scooters', cDo:'Things to do', cPkg:'Planned trips', cAdv:'Adventures',
  cFerryS:'Between islands', cStayS:'Hotels & resorts', cMoveS:'Point to point', cDoS:'Places & activities', cPkgS:'10 curated plans', cAdvS:'Dive, kayak, trek',
  mapH:'Where do you want to go?', mapS:'Tap an island on the map', explore:'Explore', nightsTyp:'Most people stay', dayTrip:'Day trip', stays:'stays',
  pkgH:'Ready-made trips', pkgS:'Curated by locals. Pick one, then change anything in your trip.', seeAll:'See all', forN:'for', nightsN:'nights', usePlan:'Use this plan',
  advH:'Adventures & activities', advS:'Every experience on every island, in one place.', sig:'Once-in-a-lifetime', fromP:'from',
  datesOpt:'When are you coming?', datesOptS:'Not sure yet? Look around first. We will ask when it matters.', skipDates:'Skip, plan without dates',
  nudge:'No dates yet. That is fine.', nudgeS:'Add them when you can so we can check seasons, closed days and seats.', addDatesBtn:'Add dates', notNow:'Not now',
  assumed:'We guessed these dates.', assumedS:'Set your real dates and we will move the whole plan with them.',
  aboutH:'About', whyGo:'Why go', bestFor:'Best for', getAround:'Getting around', goodTime:'Best time', tips:'Good to know', readMore:'Read more', otherIsl:'Other islands',
  replaceQ:'Replace your current trip?', replaceS:'You already have plans in your trip. This will replace them. You can undo it straight after.', replace:'Replace with this plan', keepMine:'Keep my trip'
});
Object.assign(T.hi, {
  heroP:'नमस्ते! बताइए कौन से द्वीप आपको पसंद हैं, और हम आपके साथ यात्रा बनाएँगे — फ़ेरी, होटल, कैब और एडवेंचर, एक-एक करके। हर समय की जाँच हम चुपचाप करते रहेंगे, ताकि कुछ न टकराए।',
  whatNeed:'आपको क्या चाहिए?', cFerry:'फ़ेरी', cStay:'ठहरने की जगह', cMove:'कैब और स्कूटर', cDo:'घूमना-फिरना', cPkg:'तैयार यात्राएँ', cAdv:'एडवेंचर',
  cFerryS:'द्वीपों के बीच', cStayS:'होटल और रिज़ॉर्ट', cMoveS:'एक जगह से दूसरी', cDoS:'जगहें और एक्टिविटी', cPkgS:'10 चुनी हुई योजनाएँ', cAdvS:'डाइव, कयाक, ट्रेक',
  mapH:'आप कहाँ जाना चाहते हैं?', mapS:'नक्शे पर किसी द्वीप को छुएँ', explore:'देखें', nightsTyp:'ज़्यादातर लोग रुकते हैं', dayTrip:'एक दिन की सैर', stays:'होटल',
  pkgH:'तैयार यात्राएँ', pkgS:'स्थानीय लोगों द्वारा चुनी गई। एक चुनें, फिर यात्रा में कुछ भी बदलें।', seeAll:'सभी देखें', forN:'के लिए', nightsN:'रातें', usePlan:'यह योजना लें',
  advH:'एडवेंचर और एक्टिविटी', advS:'हर द्वीप का हर अनुभव, एक जगह।', sig:'ज़िंदगी में एक बार', fromP:'से शुरू',
  datesOpt:'यात्रा की तारीखें जोड़ें (वैकल्पिक)', datesOptS:'या बस खोजना शुरू करें। ज़रूरत पड़ने पर हम याद दिलाएँगे।', skipDates:'छोड़ें, बिना तारीख योजना बनाएँ',
  nudge:'अभी तारीखें नहीं हैं, कोई बात नहीं।', nudgeS:'जब हो सके जोड़ें, ताकि हम मौसम, बंद दिन और सीटें जाँच सकें।', addDatesBtn:'तारीखें जोड़ें', notNow:'अभी नहीं',
  assumed:'ये तारीखें अनुमान हैं।', assumedS:'अपनी असली तारीखें डालें, पूरी योजना साथ में खिसक जाएगी।',
  aboutH:'जानकारी', whyGo:'क्यों जाएँ', bestFor:'किसके लिए', getAround:'घूमना कैसे', goodTime:'सबसे अच्छा समय', tips:'जानने लायक', readMore:'और पढ़ें', otherIsl:'दूसरे द्वीप',
  replaceQ:'अपनी मौजूदा यात्रा बदलें?', replaceS:'आपकी यात्रा में पहले से चीज़ें हैं। यह योजना उनकी जगह लेगी; आप तुरंत वापस ला सकते हैं।', replace:'इस योजना से बदलें', keepMine:'अपनी यात्रा रखें'
});

/* ---------- island guide (tourist view) ---------- */
const ABOUT = {
  PBL:{why:'The gateway town: Cellular Jail and its evening Light & Sound Show, the ruins on Ross Island, coral and the lighthouse at North Bay, sunset at Chidiya Tapu.', best:'History, first and last night, water sports at North Bay', around:'Autos and cabs; most sights are 10–20 minutes apart', time:'October to May; peak 15 Dec–15 Jan', tips:'Cellular Jail is closed on Mondays. Ross and North Bay boats leave in the morning from the Rajiv Gandhi Water Sports Complex.'},
  HAV:{why:'Radhanagar (Beach 7) is one of Asia’s best beaches, Elephant Beach has easy snorkelling, and the reefs make Havelock the islands’ diving capital.', best:'Beaches, diving, couples, families', around:'Cabs or rented scooters; Radhanagar is about 20 minutes from the jetty', time:'October to May for clear water', tips:'Elephant Beach boats run in the morning and are back by mid-afternoon. Stay for the sunset at Radhanagar.'},
  NEI:{why:'Small, slow and green: the Natural Bridge at low tide, sunrise at Sitapur, sunset at Laxmanpur and calm water at Bharatpur.', best:'Couples, slow travel, a quiet night between Havelock and Port Blair', around:'Short cab or scooter rides; the whole island is about 5 km across', time:'October to May', tips:'Visit the Natural Bridge at low tide. Ferries are fewer than to Havelock, so book early.'},
  WAN:{why:'Mahatma Gandhi Marine National Park: Jolly Buoy (Nov–Apr) or Red Skin (May–Oct), with some of the clearest coral water in India.', best:'Snorkelling, glass-bottom boats, a day out from Port Blair', around:'About an hour by road from Port Blair to Wandoor jetty', time:'Jolly Buoy Nov–Apr, Red Skin May–Oct', tips:'Park closed on Mondays. Permits are issued at the jetty; plastic is not allowed on the islands.'},
  BAR:{why:'Limestone caves reached through mangrove creeks, a bubbling mud volcano and thousands of parrots coming home at sunset.', best:'A full-day adventure from Port Blair', around:'By road through a protected forest, then small boats', time:'October to May', tips:'Start before dawn. The road crosses a tribal reserve: no stopping, no photos.'},
  RAN:{why:'Dhani Nallah’s mangrove boardwalk, the Amkunj eco-beach and turtles nesting at Cuthbert Bay.', best:'Road trippers heading north, nature lovers', around:'Cabs from Rangat bazaar', time:'Turtle nesting Dec–Feb', tips:'A good one-night stop on the long road to Diglipur.'},
  LON:{why:'Lalaji Bay’s empty white beach and Merk Bay’s clear water, with almost no one else around.', best:'Offbeat travellers, quiet beaches', around:'On foot and by local boat', time:'October to May', tips:'Reached by government ferry from Rangat (Yerrata). Very few stays.'},
  MAY:{why:'Karmatang beach turtles and boat trips to Avis and Interview Islands.', best:'A stop between Rangat and Diglipur', around:'Cabs and local boats', time:'October to May; turtles Dec–Feb', tips:'Ideal for one night on the road north.'},
  DIG:{why:'The far north: Ross & Smith, two islands joined by a sandbar, Saddle Peak (the highest point in the islands) and turtle nights at Kalipur.', best:'Trekkers, nature, people who want the islands to themselves', around:'Cabs from Diglipur bazaar; boats from Aerial Bay', time:'October to May; turtles Dec–Feb', tips:'About 11 hours by road from Port Blair, or an overnight government ship. Plan two nights.'},
  LIT:{why:'Surf at Butler Bay, the White Surf and Whisper Wave waterfalls and real island quiet.', best:'Surfers, explorers', around:'Local transport; few cabs', time:'October to April', tips:'About 8 hours by government ship. Stays are simple; plan ahead.'}
};

/* ---------- map of the islands (real satellite base image; pins in image pixels) ---------- */

// [x, y, label side, always show label?] — names not printed on the base image get a pill



function islandCard(z) {
  const A = ABOUT[z] || {}; const hs = D.hotels.filter(h => h.z === z).length; const ds = D.acts.filter(a => a.z === z && shown(a)).length; const sails = BOOKABLE.some(s => s.f === 'PBL' && s.to === z);
  return `<div class="isle" style="--zc:${ZC(z)}"><span class="art">${art(z, null, z + 'hero', {tod:z === 'NEI' ? 'dawn' : z === 'HAV' ? 'day' : z === 'BAR' ? 'gold' : undefined})}<span class="tag">${esc(ZN[z].region)}</span></span>
    <div class="isle-b"><div class="isle-h"><h3>${ZN[z].name}</h3><span class="muted">${ZN[z].official !== ZN[z].name ? ZN[z].official + ' · ' : ''}${esc(ZN[z].reach)}</span></div>
      <p>${esc(A.why || ZN[z].notes)}</p>
      <div class="isle-f"><span>${ic('bed', 16)} ${hs} ${t('stays')}</span><span>${ic('mask', 16)} ${ds} ${t('thingsToDo')}</span><span>${ic('moon', 16)} ${ZN[z].typN ? `${t('nightsTyp')} ${ZN[z].typN}N` : t('dayTrip')}</span></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" data-a="store" data-zone="${z}">${t('explore')} ${ZN[z].name} ${ic('arrow', 18, 2.2)}</button>${sails ? `<button class="btn ghost" style="min-height:52px;border-radius:16px" data-a="route" data-from="PBL" data-to="${z}" data-date="${baseDate()}">${ic('ferry', 18)} ${t('cFerry')}</button>` : ''}</div></div></div>`;
}

/* ---------- shortcuts ---------- */
function homeZone() { return S.homeZone || 'HAV'; }
function shortcuts() {
  const it = [['ferry', 'scferry', 'PBL', 'cFerry', 'cFerryS', 'data-a="go" data-v="route"', 'day'], ['bed', 'scstay', 'HAV', 'cStay', 'cStayS', 'data-a="catgo" data-go="stay"', 'dusk'], ['car', 'sccab', 'PBL', 'cMove', 'cMoveS', 'data-a="catgo" data-go="move"', 'day'],
    ['camera', 'scdo', 'HAV', 'cDo', 'cDoS', 'data-a="go" data-v="adv"', 'dawn'], ['trip', 'scpkg', 'DIG', 'cPkg', 'cPkgS', 'data-a="go" data-v="pkgs"', 'day'], ['mask', 'scadv', 'HAV', 'cAdv', 'cAdvS', 'data-a="go" data-v="adv" data-k="scuba"', 'day']];
  return `<div class="shortcuts">${it.map(([i, seed, z, a, b, at, tod]) => `<button class="sc" ${at}><span class="art">${art(z, i, seed, {tod})}</span><b>${t(a)}</b><small>${t(b)}</small></button>`).join('')}</div>`;
}

/* ---------- date reminder (dates stay optional) ---------- */
function dateNudge(ctx) {   // one quiet line, never a box in the way
  if (S.win && !S.datesAssumed) return ''; if ((S._nudgeOff || {})[ctx]) return '';
  const hi = S.lang === 'hi';
  const g = S.datesAssumed ? (hi ? 'तारीखें अनुमान हैं' : 'Dates are a guess') : !S.win && S.trip && S.cart.length ? (hi ? `${fD(S.trip.start)} – ${fD(S.trip.end)} सही है?` : `${fD(S.trip.start)} – ${fD(S.trip.end)}, are these your dates?`) : (hi ? 'तारीखें बाद में भी जोड़ सकते हैं' : 'No dates yet. That is fine for now');
  return `<div class="nudge slim" role="note">${ic('cal', 16, 2)}<span>${g}</span><button class="link" data-a="dates">${hi ? 'तारीखें डालें' : 'Set dates'}</button><button class="x" data-a="nudgeoff" data-k="${ctx}" aria-label="${t('notNow')}">${ic('x', 14, 2.4)}</button></div>`;
}

/* ---------- HOME ---------- */
function vHome() {
  const w = S.win && !S.datesAssumed ? S.win : null; const fi = flightIn(); const z = homeZone(); const hi = S.lang === 'hi';
  const now = istNow(); const nd = NAT[now.iso] ? now.iso : TODAY; const nat = NAT[nd] || {}; const h12 = s => { if (!s) return '—'; const m = tm(s), h = Math.floor(m / 60); return `${((h + 11) % 12) + 1}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`; };
  const when = w ? `${fD(w.start)} – ${fD(w.end)} · ${paxTxt()}` : '';
  const rail = (cls, inner) => `<div class="railwrap"><button class="rail-btn prev" data-a="rail" data-d="-1" aria-label="Previous">${ic('back', 20, 2.4)}</button><div class="${cls}">${inner}</div><button class="rail-btn next" data-a="rail" data-d="1" aria-label="Next">${ic('back', 20, 2.4).replace('<svg', '<svg style="transform:scaleX(-1)"')}</button></div>`;
  return {title:null, body:`
  <section class="hero" aria-label="Andaman Travel Planner">${heroArt()}
    <div class="hero-in wrap">
      <span class="eyebrow"><i></i>${hi ? 'पोर्ट ब्लेयर में अभी' : 'Port Blair now'} · ${h12(hm(now.min))} · ${hi ? 'सूर्यास्त' : 'sunset'} ${h12(nat.ss)}</span>
      <h1>${hi ? 'अंडमान,<em>मिनट-दर-मिनट तय.</em>' : 'Andaman,<em>planned to the minute.</em>'}</h1>
      <p>${t('heroP')}</p>
    </div>
    <div class="todsw" role="group" aria-label="Time of day in the picture">${[['dawn', 'sunrise', 'Dawn'], ['day', 'sun', 'Day'], ['gold', 'sunset', 'Sunset'], ['night', 'moon', 'Night']].map(([k, i, l]) => `<button data-a="tod" data-k="${k}" aria-label="${l}" aria-pressed="${S._tod === k}">${ic(i, 18, 2)}</button>`).join('')}</div>
  </section>
  <div class="wrap starter"><div class="starter-card">
      <button class="st-f" data-a="dates"><span class="sti">${ic('cal', 20)}</span><span><small>${hi ? 'कब और कौन' : 'When & who'}</small><b class="${w ? '' : 'ph'}">${w ? when : t('datesOpt')}</b></span></button>
      <span class="st-sep" aria-hidden="true"></span>
      <button class="st-f wide" data-a="go" data-v="search"><span class="sti">${ic('search', 20)}</span><span><small>${hi ? 'खोजें' : 'Find'}</small><b class="ph">${t('search')}</b></span></button>
      <button class="btn primary" data-a="startplan">${S.cart.length ? t('viewTrip') : (hi ? 'यात्रा बनाएँ' : 'Plan my trip')} ${ic('arrow', 18, 2.4)}</button>
    </div>
    <div class="st-alt"><span>${ic('check', 15, 2.6)}${hi ? 'योजना बनाना मुफ़्त' : 'Planning is free. Pay when you are sure'}</span><span>${ic('check', 15, 2.6)}${hi ? 'GST पहले से साफ़' : 'No surprise charges'}</span><span>${ic('check', 15, 2.6)}${hi ? 'UPI, कार्ड, नेटबैंकिंग' : 'UPI, cards and netbanking'}</span><span>${hi ? 'पहली बार अंडमान?' : 'New to the islands?'} <button class="link" data-a="go" data-v="pkgs">${hi ? 'तैयार यात्रा चुनें' : 'Start with a curated itinerary'}</button></span></div>
  </div>
  <div class="wrap">
    <div class="sec"><div class="sechd"><h2>${hi ? 'आज द्वीपों में' : 'The islands today'}</h2><span class="sub">${fD(nd)}</span></div>
      <div class="seastrip"><div><span class="si">${ic('sunrise', 20)}</span><span><small>${hi ? 'सूर्योदय' : 'Sunrise'}</small><b>${h12(nat.sr)}</b></span></div><div><span class="si">${ic('sunset', 20)}</span><span><small>${t('sunset')}</small><b>${h12(nat.ss)}</b></span></div><div><span class="si n">${ic('moon', 20)}</span><span><small>${t('moon')}</small><b>${esc(nat.moon || '—')}</b></span></div><div><span class="si n">${ic(nat.tur ? 'turtle' : 'glow', 20)}</span><span><small>${nat.tur ? t('turtle') : t('bio')}</small><b>${nat.tur ? (hi ? 'मौसम चालू' : 'In season') : /Good/.test(nat.bio || '') ? (hi ? 'आज रात अच्छी' : 'Good tonight') : (hi ? 'हल्की (तेज़ चाँदनी)' : 'Faint, bright moon')}</b></span></div></div></div>
    <div class="sec"><div class="sechd"><h2>${t('whatNeed')}</h2></div>${shortcuts()}</div>
    <div class="sec"><div class="sechd"><h2>${t('mapH')}</h2><span class="sub">${t('mapS')}</span></div>
      <div class="mapsec"><div class="mapwrap">${islandMap(z)}</div>
        <div class="mapside">${islandCard(z)}<div class="isl-list" role="group" aria-label="${t('otherIsl')}">${NS.map(x => `<button data-a="mapsel" data-zone="${x}" aria-pressed="${x === z}" style="--zc:${ZC(x)}"><span class="th">${art(x, null, x + 'hero')}</span><span><b>${ZN[x].name}</b><small>${ZN[x].typN ? ZN[x].typN + 'N · ' : ''}${D.acts.filter(a => a.z === x && shown(a)).length} ${t('thingsToDo')}</small></span></button>`).join('')}</div></div></div></div>
    <div class="sec">${blocksRail(null, null)}</div>
    <div class="sec"><div class="sechd"><h2>${hi ? t('pkgH') : 'Curated itineraries'}</h2><button class="link" data-a="go" data-v="pkgs">${t('seeAll')} ${PKGS.length}</button></div><p class="note" style="margin-top:-8px">${t('pkgS')}</p>
      ${rail('pkgrail', PKGS.map(p => pkgCard(p)).join(''))}</div>
    <div class="sec advmod"><div class="sechd"><h2>${t('sig')}</h2><button class="link" data-a="go" data-v="adv">${t('seeAll')}</button></div><p class="note" style="margin-top:-8px">${t('advS')}</p>
      ${rail('sigrail', SIGNATURE.map(sigCard).join(''))}
      <div class="advgrid">${ADV.map(c => { const l = advActs(c); const fp = fromPrice(l); return `<button class="advc" data-a="go" data-v="adv" data-k="${c.k}"><span class="art">${art(c.z, c.icon, 'adv' + c.k, {tod:c.k === 'night' ? 'night' : 'day'})}</span><span class="advc-b"><b>${hi ? c.hi : c.n}</b><small>${l.length}${fp ? ' · ' + t('fromP') + ' ' + inr(fp) : ''}</small></span></button>`; }).join('')}</div></div>
    <div class="sec"><div class="sechd"><h2>${hi ? 'हर समय की जाँच, अपने आप' : 'Built so nothing is left to chance'}</h2></div>
      <div class="how">${[['route', hi ? 'अपने द्वीप चुनें' : 'One itinerary, your way', hi ? 'नक्शे या तैयार यात्रा से शुरू करें। फ़ेरी, होटल, कैब और एक्टिविटी एक-एक करके जोड़ें।' : 'Begin with the map or a curated plan. Add ferries, stays, transfers and activities in any order.'], ['shield', hi ? 'हम हर समय जाँचते हैं' : 'Every connection verified', hi ? 'रिपोर्टिंग समय, बंद दिन, ज्वार और उड़ान से पहले डाइव का अंतर — हर बदलाव पर।' : 'Reporting times, check-ins, closed days, tides and pre-flight dive limits are re-checked each time you make a change.'], ['ticket', hi ? 'एक भुगतान, ऑफ़लाइन पास' : 'One payment, offline passes', hi ? 'एक बार भुगतान करें। हर बुकिंग का QR पास जेट्टी पर बिना नेटवर्क खुलता है।' : 'Pay once by UPI, card or netbanking. Each booking becomes a QR pass that works without network at the jetty.']].map(([i, b, s]) => `<div class="how-c"><span class="hn">${ic(i, 22, 1.9)}</span><b>${b}</b><span>${s}</span></div>`).join('')}</div>
      <div class="facts3">${[[BOOKABLE.length, hi ? 'फ़ेरी, ऑपरेटर की समय-सारणी से' : 'sailings from operator timetables'], [RULES.length, hi ? 'द्वीप के नियम, हर बुकिंग पर' : 'island rules checked on every booking'], [D.hotels.length, hi ? 'होटल, असली रेटिंग के साथ' : 'stays with real guest ratings']].map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join('')}</div></div>
    <div class="sec"><div class="sechd"><h2>${hi ? 'किसके लिए अच्छा' : 'Find what suits your group'}</h2></div><div class="chips">${['ns', 'kid', 'rain', 'cpl', 'off', 'sun'].map(g => `<button class="chip" data-a="search" data-tag="${g}">${TAGNAME[g]}</button>`).join('')}</div></div>
    ${S.cart.length ? '' : `<div class="sec"><div class="banner"><span class="art">${art('HAV', null, 'ACV-KAYAK-HAV-NIGHT')}</span><h2>${hi ? 'देखें यह कैसे काम करता है' : 'See the planner at work'}</h2><p>${hi ? '6 दिन की नमूना यात्रा खोलें, जिसमें समय की कुछ गड़बड़ियाँ हैं।' : 'Open a six-day sample itinerary with four timing conflicts and resolve them in a single tap.'}</p><button class="btn onart" data-a="sample">${t('sample')} ${ic('arrow', 18, 2.2)}</button></div></div>`}
    <footer class="foot"><div style="display:flex;flex-direction:column;gap:10px;max-width:46ch"><span class="brand">${logoMark(34)}<span>Andaman<small>Travel Planner</small></span></span><span>Ferries, stays, transfers and experiences across the Andaman Islands, booked as one itinerary.</span></div>
      <div style="display:flex;flex-direction:column;gap:10px"><div class="foot-l"><button data-a="go" data-v="route">${t('cFerry')}</button><button data-a="go" data-v="pkgs">${t('pkgH')}</button><button data-a="go" data-v="adv">${t('advH')}</button><button data-a="help">WhatsApp help</button></div><span>© 2026 Andaman Travel Planner Private Limited · Sri Vijaya Puram (Port Blair)</span></div></footer>
  </div>`};
}

/* ---------- ADVENTURES ---------- */
/* Main categories, each split into the sub-categories a dive centre or activity desk would use (dive-centre menus: try dive → fun dives → courses → specialties).
   Inside every sub-category, items are ranked by RANKED: the order guidebooks (Lonely Planet), agency day plans and visitor ratings broadly agree on. */
const has = (a, re) => re.test(a.id) || re.test(a.n + ' ' + a.v);
const ADV = [
  {k:'scuba', n:'Scuba diving', hi:'स्कूबा डाइविंग', icon:'mask', z:'HAV', f:a => /^Scuba/.test(a.fam), subs:[
    ['Try diving', 'No licence needed. A short lesson, then one shallow dive with an instructor.', a => a.fam === 'Scuba - Try dive' && !/FREEDIVE/.test(a.id)],
    ['Fun dives', 'For certified divers. Bring your card.', a => a.fam === 'Scuba - Certified dives'],
    ['Learn to dive', 'PADI courses, from your first licence to Divemaster.', a => /ACV-PADI-/.test(a.id)],
    ['Specialty courses', 'Add a skill: deep, wreck, night, Nitrox, photography.', a => /ACV-SPEC-/.test(a.id)],
    ['Freediving', 'Diving on one breath, with an instructor.', a => /FREEDIVE/.test(a.id)]]},
  {k:'snork', n:'Snorkel & sea walk', hi:'स्नॉर्कलिंग और सी-वॉक', icon:'mask', z:'NEI', f:a => /Snorkelling|Sea walk|Glass bottom/.test(a.fam), subs:[
    ['Snorkelling', 'Mask, fins and a guide. Most spots need the boat there too.', a => a.fam === 'Snorkelling'],
    ['Sea walk & snuba', 'Walk on the sea floor with a helmet. No swimming needed.', a => a.fam === 'Sea walk'],
    ['Glass-bottom & semi-sub', 'See the corals and stay dry. Good for kids and elders.', a => /Glass bottom/.test(a.fam)]]},
  {k:'boats', n:'Boat trips & islands', hi:'नाव से द्वीप', icon:'boat', z:'WAN', f:a => /Boat trips|Cruises/.test(a.fam), subs:[
    ['Island day trips', 'Shared boats to the islands everyone talks about.', a => a.fam === 'Boat trips' && !has(a, /private|charter|Cinque|ROSSSMITH-(5|10)|LALAJI|INTERVIEW|AVIS|GUITAR|MERK|3BEACH/i)],
    ['Sunset & dinner cruises', 'An evening on the water.', a => a.fam === 'Cruises & charters' && has(a, /sunset boat|cruise|party/i) && !has(a, /charter|private/i)],
    ['Far islands & volcano', 'Long days out to remote islands.', a => has(a, /BARREN|INTERVIEW|AVIS|GUITAR|MERK|3BEACH|LALAJI|Cinque/i)],
    ['Private boats', 'Your own boat and timing.', a => has(a, /private|charter|ROSSSMITH-(5|10)|SPEED-/i) && !has(a, /BARREN|Cinque|LALAJI/i)]]},
  {k:'paddle', n:'Kayak & paddle', hi:'कयाक और पैडल', icon:'kayak', z:'HAV', f:a => a.fam === 'Kayaking' || /SUP|CLEARKAYAK/.test(a.id), subs:[
    ['Mangrove kayaking', 'Glide through the creeks with a guide.', a => a.fam === 'Kayaking' && !has(a, /night|sunrise|sunset|Clear-bottom/i)],
    ['Sunrise & sunset paddles', 'The softest light of the day, from the water.', a => a.fam === 'Kayaking' && has(a, /sunrise|sunset/i)],
    ['Night bioluminescence', 'Paddle in the dark and watch the water glow.', a => a.fam === 'Kayaking' && has(a, /night/i)],
    ['Paddleboard & clear kayak', 'Calm-water fun, see the reef below.', a => /SUP|CLEARKAYAK/.test(a.id)]]},
  {k:'water', n:'Water sports', hi:'वॉटर स्पोर्ट्स', icon:'wave', z:'PBL', f:a => a.fam === 'Motor water sports' && !/SUP/.test(a.id), subs:[
    ['Parasailing', 'A few minutes high above the bay.', a => /PARASAIL/.test(a.id)],
    ['Jet ski', 'Short, fast rides with a driver.', a => /JETSKI/.test(a.id)],
    ['Banana, sofa & speed boats', 'Quick rides for the whole group.', a => /BANANA|SOFA|SPEEDBOAT/.test(a.id)],
    ['Sea karting & surfing', 'Drive your own boat, or catch a wave.', a => /SEAKART|SURF/.test(a.id)]]},
  {k:'treks', n:'Treks & nature', hi:'ट्रेक और प्रकृति', icon:'leaf', z:'DIG', f:a => a.fam === 'Walks & nature', subs:[
    ['Treks & hikes', 'Forest trails and viewpoints.', a => has(a, /trek|Mount Harriet|Munda|waterfall/i)],
    ['Shore & rock-pool walks', 'Tide pools, rock arches and mangrove boardwalks.', a => has(a, /Natural Bridge|intertidal|boardwalk|Lalaji|cave|Chidiya/i) && !has(a, /trek/i)],
    ['Birds, turtles & stars', 'Wildlife with a guide, mostly early or after dark.', a => has(a, /bird|turtle|stargaz|night beach/i)],
    ['Villages & forests', 'Slow walks with local guides.', a => has(a, /village|nature walk/i)]]},
  {k:'places', n:'Places & heritage', hi:'जगहें और विरासत', icon:'camera', z:'PBL', f:a => a.fam === 'Places to visit' || a.fam === 'Sightseeing tours', subs:[
    ['History', 'The freedom struggle and the islands’ past.', a => a.tags.includes('his') || /SHOW/.test(a.id)],
    ['Beaches', 'The best-known beaches, island by island.', a => /Beach|Bay|Cove/i.test(a.n) && !a.tags.includes('his')],
    ['Day tours', 'Full-day trips with transport.', a => a.fam === 'Sightseeing tours' && !/SHOW/.test(a.id)],
    ['Nature, parks & shopping', 'Waterfalls, mud volcanoes, parks and the emporium.', a => a.fam === 'Places to visit' && !a.tags.includes('his') && !/Beach|Bay|Cove/i.test(a.n)]]},
  {k:'fish', n:'Fishing', hi:'फ़िशिंग', icon:'fish', z:'HAV', f:a => a.fam === 'Fishing', subs:[
    ['Game fishing', 'Deep-sea boats with crew. Permit needed.', a => /ACV-FISH-/.test(a.id)],
    ['With local fishermen', 'Hand lines from a small boat. Fun for families.', a => /FISHING-LOCAL/.test(a.id)]]},
  {k:'night', n:'After dark', hi:'रात के अनुभव', icon:'moon', z:'NEI', f:a => a.slot === 'Night' || a.tags.includes('night'), subs:[
    ['Shows', 'Light and sound shows at Cellular Jail and Ross Island.', a => /SHOW|LS-/.test(a.id)],
    ['On the water at night', 'Glowing plankton, night dives and dinner cruises.', a => /Kayak|Scuba|Cruises/.test(a.fam)],
    ['Under the stars', 'Night walks, turtles and dark skies.', a => a.fam === 'Walks & nature']]}
];
const RANKED = ['ENT-RADHANAGAR', 'ENT-CELLULAR-JAIL', 'ACV-SHOW-LS-HIN', 'ACV-SHOW-LS-ENG', 'ACV-BOAT-ELEPH', 'ACV-BOAT-ROSSNB', 'ACV-DSD-HAV-SHORE', 'ACV-DSD-HAV-BOAT', 'ACV-NATBRIDGE-NEI', 'ENT-LAXMANPUR', 'ACV-BOAT-JOLLY', 'ACV-SNK-JOLLY', 'ACV-BOAT-REDSKIN', 'ACV-SNK-REDSKIN', 'ACV-TOUR-BARATANG', 'ACV-BOAT-BAR-CAVE', 'ACV-SNK-ELEPH-STD', 'ACV-SEAWALK-ELEPH', 'ACV-SEAWALK-NB', 'ACV-KAYAK-HAV-MANGROVE', 'ACV-KAYAK-HAV-NIGHT', 'ACV-CHIDIYA-SUNSET', 'ENT-CHIDIYA-TAPU', 'ENT-KALAPATHAR', 'ENT-CORBYNS', 'ACV-BOAT-ROSS-AM', 'ACV-BOAT-NB', 'ACV-FUN-HAV-2T', 'ACV-PADI-OW', 'ACV-PADI-AOW', 'ACV-PADI-OW-AOW', 'ACV-SPEC-DEEP', 'ACV-SPEC-WRECK', 'ACV-SPEC-NITROX', 'ACV-BOAT-ROSSSMITH-2', 'ACV-SNK-ROSSSMITH', 'ACV-TREK-SADDLE', 'ACV-TREK-MTHARRIET', 'ENT-ANTHRO-MUSEUM', 'ENT-SAMUDRIKA', 'ENT-BHARATPUR', 'ENT-SITAPUR', 'ACV-GBB-NEI', 'ACV-GBB-HAV', 'ACV-GBB-NB', 'ACV-SEMISUB-NB', 'ACV-SNK-HAV-GUIDED', 'ACV-SNK-NB-STD', 'ACV-SNK-NEI-STD', 'ACV-STARGAZE-NEI', 'ACV-BOAT-PARROT', 'ACV-DHANINALLAH', 'ACV-TURTLE-KALIPUR', 'ACV-BARREN-SHARED', 'ACV-PARASAIL-HAV', 'ACV-PARASAIL-PB', 'ACV-JETSKI-HAV', 'ACV-JETSKI-PB', 'ACV-FISH-HALF-AM', 'ACV-FISHING-LOCAL', 'ACV-CRUISE-SUNSET-PB', 'ACV-DINNER-CRUISE-HAV', 'ACV-NIGHTWALK-HAV', 'ACV-INTERTIDAL-HAV', 'ENT-VIJAYNAGAR', 'ENT-CHATHAM', 'ACV-FUN-HAV-NIGHT', 'ACV-FUN-HAV-1T', 'ACV-PADI-SD', 'ACV-PADI-RESCUE', 'ACV-FREEDIVE-TRY', 'ACV-KAYAK-PB-MGMNP', 'ACV-KAYAK-HAV-SUNSET', 'ACV-SUP-HAV', 'ACV-CLEARKAYAK-HAV', 'ENT-BUTLER', 'ACV-SURF-LESSON', 'ENT-ROSS-LS-HIN', 'ACV-BIRD-GUIDE-PB', 'ACV-TREK-ELEPH'];
const rankOf = id => { const i = RANKED.indexOf(id); return i < 0 ? 999 : i; };
const SIGNATURE = ['ACV-BARREN-SHARED', 'ACV-KAYAK-HAV-NIGHT', 'ACV-DSD-HAV-BOAT', 'ACV-BOAT-ROSSSMITH-2', 'ACV-TOUR-BARATANG', 'ACV-TREK-SADDLE', 'ACV-SNK-JOLLY', 'ACV-FISH-HALF-AM'];
const advActs = c => D.acts.filter(a => shown(a) && c.f(a));
const fromPrice = list => { const ps = list.map(a => actUnit(a, baseDate())).filter(p => p); return ps.length ? Math.min(...ps) : null; };
function sigCard(id) { const a = ACT[id]; if (!a) return ''; const p = actUnit(a, baseDate()); const off = offSeason(a, baseDate());
  return `<button class="sig" data-a="product" data-kind="act" data-id="${a.id}" style="--zc:${ZC(a.z)}"><span class="art">${art(a.z, null, a.id, {tod:a.slot === 'Night' ? 'dusk' : 'dawn'})}</span>
    <span class="sig-b"><span class="tag" style="background:${ZC(a.z)};color:var(--on-zone)">${ZN[a.z].name}</span><b>${esc(a.n)}</b><small>${esc(a.v)}</small><span class="sig-f"><span class="price">${p ? `<small>${t('fromP')}</small> ${inr(p)}` : t('onReq')}</span>${off ? `<span class="tag">${off}</span>` : ''}</span></span></button>`; }

function vAdv(v) {
  const c = ADV.find(x => x.k === v.k) || ADV[0]; const date = baseDate(); const list = advActs(c).filter(actOk);
  const ord = l => l.slice().sort((a, b) => (!!offSeason(a, date) - !!offSeason(b, date)) || rankOf(a.id) - rankOf(b.id) || ((actUnit(a, date) || 0) - (actUnit(b, date) || 0)));
  const used = new Set();
  const secs = (c.subs || [['', '', () => true]]).map(([n, sub, f]) => { const l = ord(list.filter(a => !used.has(a.id) && f(a))); l.forEach(a => used.add(a.id)); return {n, sub, l}; }).filter(x => x.l.length);
  const rest = ord(list.filter(a => !used.has(a.id))); if (rest.length) secs.push({n:'More', sub:'', l:rest});
  const card = (a, top) => actCard(a, S.trip && S.cart.length ? date : null).replace('<span class="bd"><h3>', `<span class="bd">${top ? `<span class="toprec">${ic('star', 12)} Most recommended</span>` : ''}<h3>`);
  return {title:t('advH'), body:`<div class="wrap"><div class="sec">
    <div class="chips advtabs" role="tablist">${ADV.map(x => `<button class="chip" role="tab" data-a="advcat" data-k="${x.k}" aria-selected="${c.k === x.k}" aria-pressed="${c.k === x.k}">${ic(x.icon, 16)} ${S.lang === 'hi' ? x.hi : x.n}</button>`).join('')}</div>${actFilterBar(list.length)}<p class="note"><button class="linkish" data-a="go" data-v="exp">Browse all ${D.acts.filter(shown).length} experiences A–Z, by island</button> · <button class="linkish" data-a="go" data-v="dss">Government ship timetable</button></p>
    ${secs.length > 1 ? `<nav class="subnav" aria-label="Jump to">${secs.map((x, i) => `<a href="#sub${i}">${esc(x.n)} <small>${x.l.length}</small></a>`).join('')}</nav>` : ''}
    ${secs.map((x, i) => `<section class="subsec" id="sub${i}"><div class="sechd"><h2>${esc(x.n)}</h2><span class="muted" style="font-size:14px">${x.l.length}</span></div>${x.sub ? `<p class="note" style="margin-top:-6px">${esc(x.sub)}</p>` : ''}<div class="list">${x.l.slice(0, 30).map((a, j) => card(a, j === 0 && rankOf(a.id) < 999)).join('')}</div></section>`).join('')}
    <p class="note">Ranked by what travel guides, island agencies and visitor ratings recommend most. Prices are per person unless shown.</p>
  </div></div>`};
}

/* ---------- READY-MADE TRIPS ---------- */
/* Ready-made trips. Built the way the islands' agencies plan them (Andaman Islands, Tusk Travel, Pickyourtrail and others agree):
   land in Port Blair and do light sightseeing; sail early to Havelock; Elephant Beach in the morning; Havelock → Neil mid-morning;
   Neil → Port Blair in the afternoon; and always sleep the last night in Port Blair so the flight home is never at the mercy of the sea.
   An act entry may list alternatives: the first one open on that day is used. */
const PKGS = [
  {id:'P1', n:'Andaman in 4 days', hi:'4 दिन में अंडमान', tag:'First-timers', z:'HAV', pax:[2, 0], nights:3, tier:'Standard', hl:['Cellular Jail & the evening show', 'Radhanagar Beach at sunset', 'Elephant Beach snorkel'],
   plan:[['stay', 'PBL', 0, 1], ['act', ['ENT-CELLULAR-JAIL', 'ENT-CORBYNS'], 0, '14:00'], ['act', ['ACV-SHOW-LS-HIN', 'ACV-SHOW-LS-ENG'], 0], ['ferry', 'PBL', 'HAV', 1, '08:00'], ['stay', 'HAV', 1, 1], ['act', 'ENT-RADHANAGAR', 1, '15:00'], ['act', 'ACV-BOAT-ELEPH', 2], ['act', 'ACV-SNK-ELEPH-STD', 2, '10:00'], ['ferry', 'HAV', 'PBL', 2, '15:00'], ['stay', 'PBL', 2, 1]]},
  {id:'P2', n:'Honeymoon by the lagoon', hi:'लैगून किनारे हनीमून', tag:'Couples', z:'NEI', pax:[2, 0], nights:5, tier:'Premium', hl:['Radhanagar sunset, then a sunset paddle', 'Try a dive together', 'Natural Bridge and Laxmanpur on Neil'],
   plan:[['stay', 'PBL', 0, 1], ['act', 'ENT-CORBYNS', 0, '15:00'], ['act', ['ACV-SHOW-LS-HIN', 'ACV-SHOW-LS-ENG'], 0], ['ferry', 'PBL', 'HAV', 1, '08:00'], ['stay', 'HAV', 1, 2], ['act', 'ENT-RADHANAGAR', 1, '15:00'], ['act', 'ACV-DSD-HAV-SHORE', 2, '09:00'], ['act', 'ACV-KAYAK-HAV-SUNSET', 2], ['ferry', 'HAV', 'NEI', 3, '10:00'], ['stay', 'NEI', 3, 1], ['act', 'ENT-LAXMANPUR', 3, '15:00'], ['act', 'ACV-NATBRIDGE-NEI', 4, '08:00'], ['act', 'ENT-BHARATPUR', 4, '10:00'], ['ferry', 'NEI', 'PBL', 4, '15:30'], ['stay', 'PBL', 4, 1]]},
  {id:'P3', n:'Luxury island hop', hi:'लक्ज़री द्वीप यात्रा', tag:'Luxury', z:'HAV', pax:[2, 0], nights:6, tier:'Luxury', hl:['Three nights at a top Havelock resort', 'Boat dive on the outer reef', 'Stargazing on Neil'],
   plan:[['stay', 'PBL', 0, 1, 'Premium'], ['act', ['ENT-CELLULAR-JAIL', 'ENT-CORBYNS'], 0, '14:00'], ['act', ['ACV-SHOW-LS-ENG', 'ACV-SHOW-LS-HIN'], 0], ['ferry', 'PBL', 'HAV', 1, '08:00', 'top'], ['stay', 'HAV', 1, 3], ['act', 'ENT-RADHANAGAR', 1, '15:00'], ['act', 'ACV-DSD-HAV-BOAT', 2], ['act', 'ACV-DINNER-CRUISE-HAV', 2], ['act', 'ACV-BOAT-ELEPH', 3], ['act', 'ACV-SEAWALK-ELEPH', 3, '10:00'], ['ferry', 'HAV', 'NEI', 4, '10:00', 'top'], ['stay', 'NEI', 4, 1], ['act', 'ENT-LAXMANPUR', 4, '15:00'], ['act', 'ACV-STARGAZE-NEI', 4], ['act', 'ACV-NATBRIDGE-NEI', 5, '08:00'], ['ferry', 'NEI', 'PBL', 5, '15:30', 'top'], ['stay', 'PBL', 5, 1, 'Premium']]},
  {id:'P4', n:'Family beach week', hi:'परिवार के साथ समुद्र तट', tag:'Families', z:'PBL', pax:[2, 2], ages:[6, 10], nights:5, tier:'Standard', hl:['Ross Island and North Bay by boat', 'Glass-bottom boat for the kids', 'Elephant Beach'],
   plan:[['stay', 'PBL', 0, 2], ['act', ['ENT-CELLULAR-JAIL', 'ENT-SAMUDRIKA'], 0, '14:00'], ['act', ['ACV-SHOW-LS-HIN', 'ACV-SHOW-LS-ENG'], 0], ['act', ['ACV-BOAT-ROSSNB', 'ACV-BOAT-NB'], 1], ['act', 'ACV-GBB-NB', 1, '11:00'], ['ferry', 'PBL', 'HAV', 2, '08:00'], ['stay', 'HAV', 2, 2], ['act', 'ENT-RADHANAGAR', 2, '15:00'], ['act', 'ACV-BOAT-ELEPH', 3], ['act', 'ACV-SNK-ELEPH-STD', 3, '10:00'], ['ferry', 'HAV', 'PBL', 4, '14:00'], ['stay', 'PBL', 4, 1]]},
  {id:'P5', n:'Dive Havelock', hi:'हैवलॉक डाइव', tag:'Certified divers', z:'HAV', pax:[2, 0], nights:6, tier:'Deluxe', hl:['Five boat dives on Havelock reefs', 'A night dive', 'A dry last day before you fly'],
   plan:[['stay', 'PBL', 0, 1], ['act', ['ENT-CELLULAR-JAIL', 'ENT-CORBYNS'], 0, '14:00'], ['ferry', 'PBL', 'HAV', 1, '08:00'], ['stay', 'HAV', 1, 4], ['act', 'ENT-RADHANAGAR', 1, '15:00'], ['act', 'ACV-FUN-HAV-2T', 2], ['act', 'ACV-FUN-HAV-2T', 3], ['act', 'ACV-FUN-HAV-NIGHT', 3], ['act', 'ACV-FUN-HAV-1T', 4, '09:00'], ['ferry', 'HAV', 'PBL', 5, '14:00'], ['stay', 'PBL', 5, 1]]},
  {id:'P6', n:'Wild north road trip', hi:'उत्तर की रोमांचक सड़क यात्रा', tag:'Offbeat', z:'DIG', pax:[2, 0], nights:6, tier:'Budget', hl:['Up the Andaman Trunk Road', 'Ross & Smith sandbar', 'Saddle Peak, the highest point'],
   plan:[['stay', 'PBL', 0, 1], ['act', ['ENT-CELLULAR-JAIL', 'ENT-CORBYNS'], 0, '14:00'], ['act', ['ACV-SHOW-LS-HIN', 'ACV-SHOW-LS-ENG'], 0], ['cab', 'RT-LONG-84', 1, '05:00'], ['stay', 'RAN', 1, 1], ['act', 'ACV-DHANINALLAH', 1, '14:00'], ['cab', 'RT-LONG-87', 2, '08:00'], ['stay', 'MAY', 2, 1], ['act', 'ENT-KARMATANG', 2, '15:00'], ['cab', 'RT-LONG-88', 3, '05:30'], ['stay', 'DIG', 3, 2], ['act', 'ACV-BOAT-ROSSSMITH-2', 3, '11:00'], ['act', 'ACV-TREK-SADDLE', 4], ['cab', 'RT-LONG-86', 5, '05:00', 'rev'], ['stay', 'PBL', 5, 1]]},
  {id:'P7', n:'Heritage at an easy pace', hi:'आराम से विरासत यात्रा', tag:'Seniors', z:'PBL', pax:[2, 0], sen:true, nights:5, tier:'Deluxe', hl:['Cellular Jail and Ross Island', 'Anthropological Museum', 'Gentle beach days on Havelock'],
   plan:[['stay', 'PBL', 0, 2], ['act', ['ENT-CELLULAR-JAIL', 'ENT-SAMUDRIKA'], 0, '15:00'], ['act', ['ACV-SHOW-LS-ENG', 'ACV-SHOW-LS-HIN'], 0], ['act', ['ACV-BOAT-ROSS-AM', 'ACV-BOAT-NB'], 1], ['act', ['ENT-ANTHRO-MUSEUM', 'ENT-CHATHAM'], 1, '15:00'], ['ferry', 'PBL', 'HAV', 2, '08:00'], ['stay', 'HAV', 2, 2], ['act', 'ENT-RADHANAGAR', 2, '15:00'], ['act', 'ACV-GBB-HAV', 3], ['ferry', 'HAV', 'PBL', 4, '14:00'], ['stay', 'PBL', 4, 1]]},
  {id:'P8', n:'Friends’ island break', hi:'दोस्तों के साथ द्वीप', tag:'Groups', z:'HAV', pax:[6, 0], nights:4, tier:'Budget', hl:['Scooters on Havelock', 'Elephant Beach water sports', 'Radhanagar sunset'],
   plan:[['stay', 'PBL', 0, 1], ['act', 'ENT-CORBYNS', 0, '15:00'], ['act', ['ACV-SHOW-LS-HIN', 'ACV-SHOW-LS-ENG'], 0], ['ferry', 'PBL', 'HAV', 1, '08:00'], ['stay', 'HAV', 1, 2], ['rent', 'HAV', 1, 3, 2], ['act', 'ENT-RADHANAGAR', 1, '15:00'], ['act', 'ACV-BOAT-ELEPH', 2], ['act', 'ACV-JETSKI-HAV', 2, '10:00'], ['act', 'ENT-KALAPATHAR', 2, '15:00'], ['ferry', 'HAV', 'PBL', 3, '14:00'], ['stay', 'PBL', 3, 1]]},
  {id:'P9', n:'Neil slow escape', hi:'नील का सुकून', tag:'Slow travel', z:'NEI', pax:[2, 0], nights:4, tier:'Deluxe', hl:['Two quiet nights on Neil', 'Natural Bridge in the morning', 'Glass-bottom boat at Bharatpur'],
   plan:[['stay', 'PBL', 0, 1], ['act', 'ENT-CORBYNS', 0, '15:00'], ['ferry', 'PBL', 'NEI', 1, '08:00'], ['stay', 'NEI', 1, 2], ['act', 'ENT-LAXMANPUR', 1, '15:00'], ['act', 'ACV-NATBRIDGE-NEI', 2, '08:00'], ['act', 'ACV-GBB-NEI', 2, '10:00'], ['act', 'ENT-SITAPUR', 2, '15:00'], ['ferry', 'NEI', 'PBL', 3, '15:30'], ['stay', 'PBL', 3, 1]]},
  {id:'P10', n:'Andaman grand tour', hi:'अंडमान ग्रैंड टूर', tag:'The full picture', z:'WAN', pax:[2, 0], nights:8, tier:'Premium', hl:['Jolly Buoy or Red Skin snorkelling', 'Baratang caves', 'Havelock and Neil'],
   plan:[['stay', 'PBL', 0, 3], ['act', ['ENT-CELLULAR-JAIL', 'ENT-CORBYNS'], 0, '14:00'], ['act', ['ACV-SHOW-LS-HIN', 'ACV-SHOW-LS-ENG'], 0], ['act', 'MARINE', 1], ['act', 'ACV-TOUR-BARATANG', 2], ['ferry', 'PBL', 'HAV', 3, '08:00'], ['stay', 'HAV', 3, 3], ['act', 'ENT-RADHANAGAR', 3, '15:00'], ['act', 'ACV-BOAT-ELEPH', 4], ['act', 'ACV-SEAWALK-ELEPH', 4, '10:00'], ['act', 'ACV-DSD-HAV-SHORE', 5, '09:00'], ['ferry', 'HAV', 'NEI', 6, '10:00'], ['stay', 'NEI', 6, 1], ['act', 'ENT-LAXMANPUR', 6, '15:00'], ['act', 'ACV-NATBRIDGE-NEI', 7, '08:00'], ['ferry', 'NEI', 'PBL', 7, '15:30'], ['stay', 'PBL', 7, 1]]}
];
const PKG_SOURCES = 'Timings are checked ferry by ferry against operator timetables, opening hours and transfer times. Change any part of it in your trip.';
function pkgHotel(zone, tier) {
  const pool = D.hotels.filter(h => h.z === zone && !h.est); const tiers = ['Budget', 'Standard', 'Deluxe', 'Premium', 'Luxury'];
  for (let i = tiers.indexOf(tier); i >= 0; i--) { const l = pool.filter(h => h.t === tiers[i]).sort((a, b) => (b.rt || 0) * Math.log10((b.rv || 1) + 1) - (a.rt || 0) * Math.log10((a.rv || 1) + 1)); if (l.length) return l[0]; }
  return pool[0] || D.hotels.find(h => h.z === zone) || D.hotels.filter(h => h.z === zone)[0];
}
function buildPkg(p, start) { // fills S.cart around the flights the traveller has (if any); caller sets pax/dates
  const day = n => addD(start, n); const fi = flightIn(), fo = flightOut();
  const landAt = fi ? tm(fi.arr) : null;  // on landing day nothing is planned before you're out of the airport and checked in
  p.plan.forEach(s => {
    if (s[0] === 'stay') { const h = pkgHotel(s[1], s[4] || p.tier); if (h) addItem({kind:'stay', ref:h.id, date:day(s[2]), nights:s[3], qty:Math.max(1, Math.ceil(S.pax.adults / 2)), room:h.rooms[0].n}, true); }
    if (s[0] === 'ferry') { const d = day(s[3]); let want = tm(s[4]);
      if (fi && s[3] === 0) want = Math.max(want, landAt + 120);
      const L = BOOKABLE.filter(x => x.f === s[1] && x.to === s[2] && sailsOn(x, d) && classFares(x).some(c => seats(x.id, c.name, d) >= pax()) && (!x.gov || !BOOKABLE.some(y => y.f === x.f && y.to === x.to && !y.gov)) && !(fi && s[3] === 0 && tm(x.dep) < landAt + 95)).sort((a, b) => Math.abs(tm(a.dep) - want) - Math.abs(tm(b.dep) - want));
      for (const x of L) { const cls = classFares(x).slice().sort((a, b) => s[5] === 'top' ? b.fare - a.fare : a.fare - b.fare).find(c => seats(x.id, c.name, d) >= pax() && (x.gov || autoSeats({sid:x.id, cls:c.name, date:d}).length >= pax())); if (!cls) continue; addItem({kind:'ferry', ref:x.id, date:d, cls:cls.name, seats:autoSeats({sid:x.id, cls:cls.name, date:d})}, true); break; } }
    if (s[0] === 'act') { const d = day(s[2]); let ids = Array.isArray(s[1]) ? s[1] : [s[1]];
      if (ids[0] === 'MARINE') ids = ['ACV-BOAT-JOLLY', 'ACV-BOAT-REDSKIN'];
      for (const id of ids) { const a = ACT[id]; if (!a || offSeason(a, d)) continue;
        let tt = s[3] || slotsFor(a)[0];
        if (fi && s[2] === 0 && tm(tt) < landAt + 90) { const later = slotsFor(a).find(x => tm(x) >= landAt + 90); if (!later) continue; tt = later; }   // landed too late for this one
        let av = availability({kind:'act', ref:id, date:d, t:tt});
        if (av && av.sold) { const alt = slotsFor(a).slice().sort((p0, q0) => (tm(p0) < tm(tt)) - (tm(q0) < tm(tt)) || Math.abs(tm(p0) - tm(tt)) - Math.abs(tm(q0) - tm(tt))).find(x => x !== tt && !(fi && s[2] === 0 && tm(x) < landAt + 90) && !availability({kind:'act', ref:id, date:d, t:x})); if (alt) { tt = alt; av = null; } }   // that slot is full: same day, another time
        if (av) continue;   // closed that day: try the next choice
        if (RULES.some(r => isCarrierRule(r) && inList(r.a, id) && r.b.some(x => /^ACV-/.test(x)) && !S.cart.some(o => o.date === d && inRefs(r.b.filter(x => /^ACV-/.test(x)), o)))) continue;   // its boat didn't make it in: skip, don't leave a broken booking
        if (fi && s[2] === 0 && !/SHOW/.test(id) && tm(tt) + (a.d || 60) > 1040) continue;   // landed late: keep the evening show, skip what would run into it
        const c = {kind:'act', ref:id, date:d, t:tt, qty:1}; if (a.b === 'per_pax') { c.pa = S.pax.adults; c.pk = kidsOk(a); } addItem(c, true);
        if (id === 'ACV-BOAT-JOLLY' || id === 'ACV-BOAT-REDSKIN') { const sn = id === 'ACV-BOAT-JOLLY' ? 'ACV-SNK-JOLLY' : 'ACV-SNK-REDSKIN'; addItem({kind:'act', ref:sn, date:d, t:ACT[sn].t, qty:1}, true); }
        break; } }
    if (s[0] === 'cab') addItem(Object.assign({kind:'cab', ref:s[1], date:day(s[2]), t:s[3], vc:vehFor(ROUTE[s[1]]).c}, s[4] === 'rev' ? {rev:true} : {}), true);
    if (s[0] === 'rent') { const r = D.rentals.find(x => x.z === s[1] && /Scooter/.test(x.n)) || D.rentals.find(x => /Scooter/.test(x.n)); if (r) addItem({kind:'rent', ref:r.id, date:day(s[2]), t:'09:00', qty:s[3], days:s[4]}, true); }
  });
  syncTrip(); trimStays();
  // door-to-door: every cab the trip needs
  for (let k = 0; k < 3; k++) { const R = run(S.cart); const fx = []; Object.values(R.by).flat().concat(R.anchors.in, R.anchors.out).forEach(a => { if (a.sev === 'soft' && a.fix && a.fix[0] && a.fix[0].act === 'quickadd' && a.fix[0].kind === 'cab') fx.push(a.fix.find(x => x.label.startsWith('Both')) || a.fix[0]); }); if (!fx.length) break; fx.forEach(f => quickAdd(f)); }
  syncTrip(); if (run(S.cart).hard) autoFix(); syncTrip();
  S.pkg = {id:p.id, sig:pkgSig()};
}
const pkgSig = () => JSON.stringify(S.cart.map(i => [i.kind, i.ref, i.date, i.t || '', i.nights || 0]).sort());
const PKCACHE = {};
function pkgStart() { return S.win && !S.datesAssumed ? S.win.start : baseDate(); }
function pkgPreview(p) {
  const start = pkgStart(); const key = p.id + start + JSON.stringify(S.po || {}).length + (S.fin ? S.fin.no : '') + (S.fout ? S.fout.no : ''); if (PKCACHE[key]) return PKCACHE[key];
  const snap = JSON.stringify({cart:S.cart, seq:S.seq, dismissed:S.dismissed, pax:S.pax, win:S.win, fin:S.fin, fout:S.fout, autoLog:S.autoLog, autoUndo:S.autoUndo, pkg:S.pkg || null}); const trip0 = S.trip;
  S.cart = []; S.seq = 1; S.dismissed = {}; S.pax = {adults:p.pax[0], kids:p.pax[1], infants:0, ages:p.ages || [], sen:!!p.sen}; S.win = {start, end:addD(start, p.nights)}; const keepF = S.win && !S.datesAssumed; if (S.fin) S.fin = keepF ? {no:S.fin.no, date:start} : null; if (S.fout) S.fout = keepF ? {no:S.fout.no, date:addD(start, p.nights)} : null;
  buildPkg(p, start); const R = run(S.cart);
  const res = {total:total(), items:JSON.parse(JSON.stringify(S.cart)), hard:R.hard, pp:Math.round(total() / Math.max(1, pax())), people:pax(), start, end:addD(start, p.nights)};
  const o = JSON.parse(snap); Object.assign(S, o); S.trip = trip0; syncTrip();
  return PKCACHE[key] = res;
}
const route = p => { const seq = []; p.plan.filter(s => s[0] === 'stay').forEach(s => { const L = seq[seq.length - 1]; if (L && L[0] === s[1]) L[1] += s[3]; else seq.push([s[1], s[3]]); }); return seq; };
function pkgCard(p, big) { const pr = pkgPreview(p);
  return `<button class="pkg${big ? ' big' : ''}" data-a="go" data-v="pkg" data-id="${p.id}" style="--zc:${ZC(p.z)}"><span class="art">${art(p.z, null, p.id, {tod:['dawn', 'day', 'dusk'][p.id.length % 3]})}<span class="pk-n">${p.nights}N · ${p.nights + 1}D</span><span class="pk-t">${esc(p.tag)}</span></span>
    <span class="pk-b"><b>${esc(S.lang === 'hi' ? p.hi : p.n)}</b>
    <span class="pk-r">${route(p).map(([z, n]) => `<i style="--zc:${ZC(z)}">${ZN[z].name} ${n}N</i>`).join('<span aria-hidden="true">→</span>')}</span>
    <span class="pk-h">${p.hl.slice(0, big ? 3 : 2).map(h => `<small>${ic('check', 13, 2.6)} ${esc(h)}</small>`).join('')}</span>
    <span class="pk-f"><span><span class="price">${inr(pr.total)}</span><small>${t('forN')} ${paxLabel(p)} · ${inr(pr.pp)} / person</small></span><span class="go" aria-hidden="true">${ic('arrow', 18, 2.2)}</span></span></span></button>`; }
const paxLabel = p => `${p.pax[0]} adult${p.pax[0] > 1 ? 's' : ''}${p.pax[1] ? ` + ${p.pax[1]} kids` : ''}`;

function vPkgs() { return {title:t('pkgH'), body:`<div class="wrap"><div class="sec"><div class="sechd"><h2>${t('pkgH')}</h2><span class="sub">${PKGS.length} plans</span></div><p class="note" style="margin-top:-8px">${t('pkgS')}</p><div class="pkgrid">${PKGS.slice().sort((a, b) => pkgPreview(a).total - pkgPreview(b).total).map(p => pkgCard(p, true)).join('')}</div></div></div>`}; }
function vPkg(v) {
  const p = PKGS.find(x => x.id === v.id); const pr = pkgPreview(p); const byDay = {};
  pr.items.forEach(it => { (byDay[it.date] = byDay[it.date] || []).push(it); });
  const days = Object.keys(byDay).sort(); const tOf = it => it.kind === 'stay' ? '08:00' : it.kind === 'ferry' ? SAIL[it.ref].dep : (it.t || '');
  return {title:p.n, hero:true, side:true, body:`
    <div class="pd wrap" style="--zc:${ZC(p.z)}">
      <div class="pd-hero dhero">${art(p.z, null, p.id, {big:true, tod:'dusk'})}</div>
      <div class="pd-title dsec dtitle"><span class="eyebrow"><i></i>${esc(p.tag)} · ${p.nights}N · ${p.nights + 1}D</span><h1>${esc(S.lang === 'hi' ? p.hi : p.n)}</h1>
        <div class="pk-r">${route(p).map(([z, n]) => `<i style="--zc:${ZC(z)}">${ZN[z].name} ${n}N</i>`).join('<span aria-hidden="true">→</span>')}</div>
        <div class="pricetag"><div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><span class="price">${inr(pr.total)}</span><small class="muted">${t('forN')} ${paxLabel(p)} · ${inr(pr.pp)} / person · incl. GST</small></div>
          <div class="trustline"><span>${ic('check', 14, 2.6)}Every ferry and check-in timed</span><span>${ic('check', 14, 2.6)}Re-fits to your flights</span><span>${ic('check', 14, 2.6)}${t('noHidden')}</span></div></div></div>
      <aside class="pd-side" aria-label="Use this plan"><div class="dsec">
        ${dateNudge('pkg')}
        <h3>Highlights</h3>${p.hl.map(h => `<div class="ln" style="display:flex;gap:10px;align-items:flex-start"><span style="color:var(--ok);margin-top:2px">${ic('check', 18, 2.4)}</span><span>${esc(h)}</span></div>`).join('')}
        <div class="pd-buy"><div class="tot"><b>${inr(pr.total)}</b><small>${paxLabel(p)} · ${inr(pr.pp)} / person<br>incl. GST</small></div><div class="btns"><button class="btn primary" data-a="usepkg" data-id="${p.id}">${t('usePlan')} ${ic('arrow', 18, 2.2)}</button></div>
          <div class="trustline"><span>${ic('check', 14, 2.6)}Every ferry and check-in timed</span><span>${ic('check', 14, 2.6)}Change anything after</span></div></div>
      </div></aside>
      <div class="pd-body"><div class="dsec"><h3>Day by day</h3><p class="note">Shown for ${fD(pr.start)} – ${fD(pr.end)}${flightIn() ? `, landing ${flightIn().arr}` : ''}. Add your flights and we move each day to fit them. The last night is always in Port Blair, so a rough sea never makes you miss your flight.</p>
        ${days.map((d, i) => `<div class="pkday"><b>Day ${i + 1} · ${fD(d)}</b>${byDay[d].sort((a, b) => tOf(a).localeCompare(tOf(b))).map(it => { const I = info(it); return `<div class="pkrow"><span class="mono">${tOf(it)}</span><span class="nd" style="background:${ZC(it.kind === 'ferry' ? I.to : I.zone)}">${ic(I.icon, 13, 2)}</span><span>${esc(I.title)}<small>${esc(I.sub)}</small></span></div>`; }).join('')}</div>`).join('')}</div>
      <p class="note" style="padding-bottom:10px">${PKG_SOURCES}</p></div>
    </div>`, cta:ctaBar(pr.total, `${pr.items.length} bookings · ${paxLabel(p)}`, `<button class="btn" data-a="usepkg" data-id="${p.id}">${t('usePlan')}</button>`)};
}
function loadPkg(id) {
  const p = PKGS.find(x => x.id === id); const assumed = !(S.win && !S.datesAssumed); const start = pkgStart();
  S.undo = JSON.parse(JSON.stringify(S.cart)); S.cart = []; S.seq = 1; S.dismissed = {};
  S.pax = Object.assign({}, S.pax, {adults:p.pax[0], kids:p.pax[1], ages:p.ages || [], sen:!!p.sen});
  S.win = {start, end:addD(start, p.nights)}; S.datesAssumed = assumed; if (assumed) { S.fin = null; S.fout = null; } else { if (S.fin) S.fin.date = start; if (S.fout) S.fout.date = S.win.end; }
  buildPkg(p, start); S.sheet = null; S.stack = [{v:'trip'}]; render(true); toastUndo(`${p.n} is now your trip`);
}
function pkgSheet() { return sheetWrap(t('replaceQ'), `<h2>${t('replaceQ')}</h2><p class="note">${t('replaceS')}</p><button class="btn primary block" data-a="pkgreplace" data-id="${S.pkgPending}">${t('replace')}</button><button class="btn ghost block" data-a="closesheet">${t('keepMine')}</button>`); }

/* ---------- events for this module ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el) return; const d = el.dataset; const v = cur();
  switch (d.a) {
    case 'mapsel': e.preventDefault(); S.homeZone = d.zone; rerender(); break;
    case 'catgo': go({v:'store', zone:homeZone(), aisle:d.go}); break;
    case 'advcat': v.k = d.k; render(true); break;
    case 'advz': v.z = d.z; rerender(); break;
    case 'usepkg': if (S.cart.length) { S.pkgPending = d.id; S.sheet = 'pkgload'; rerender(); } else loadPkg(d.id); break;
    case 'pkgreplace': loadPkg(d.id); break;
    case 'nudgeoff': S._nudgeOff = Object.assign({}, S._nudgeOff, {[d.k]:1}); rerender(); break;
    case 'skipdates': S.datesSkipped = true; S.sheet = null; rerender(); toast('No problem. Plan away, we will remind you later.'); break;
  }
});

/* ============ EVENTS ============ */
function bookAll() {
  S.booked = S.cart.map(it => { const I = info(it);
    const code = 'ATP-' + hash(it.uid + it.ref + it.date + S.seq).toString(36).toUpperCase().slice(0, 6);
    const time = it.kind === 'stay' ? hm(CHECKIN) : it.kind === 'ferry' ? SAIL[it.ref].dep : (it.t || '09:00');
    const report = it.kind === 'ferry' ? `Report ${hm(tm(time) - I.rep)} at ${SAIL[it.ref].fromPt}` : it.kind === 'stay' ? `Check-in from ${hm(CHECKIN)} · ${it.nights}N` : it.kind === 'cab' ? `Driver meets you at ${time}` : it.kind === 'rent' ? `Pick up from ${time}` : I.rep ? `Report ${hm(tm(time) - I.rep)}` : `Arrive by ${time}`;
    const net = I.own || I.price == null ? null : Math.round(I.price / (1 + (MARKUP[it.kind] || .12)));
    return {code, kind:it.kind, title:I.title, sub:I.sub, zone:I.zone, to:I.to, date:it.date, time, report, vendor:I.vendor, price:I.price, net, pax:pax(), seats:it.seats && it.seats.length ? it.seats.join(', ') : ''};
  });
}
function editItem(uid) {
  const it = S.cart.find(x => x.uid === uid); if (!it) return;
  if (it.kind === 'ferry') { const s = SAIL[it.ref]; go({v:'route', from:s.f, to:s.to, date:it.date, sel:s.id, cls:it.cls, own:!!it.own, editUid:it.uid}); }
  else go({v:'product', kind:it.kind, id:it.ref, uid:it.uid});
}
function dayAct(act, date) { // shared by the day strip buttons and its "More" date input
  const v = cur();
  if (act === 'storedate') { v.date = date; v.fdate = date; S.planDate = date; }
  else if (act === 'routedate') { v.date = date; v.fdate = date; v.sel = null; v.cls = null; S.planDate = date; }
  else if (act === 'cfgdate') { v.cfg.date = date; }
  rerender();
}
function addFerry() {
  const v = cur(); const isSeats = v.v === 'seats';
  const sid = isSeats ? v.sid : v.sel, cls = isSeats ? v.cls : (v.cls || classFares(SAIL[v.sel])[0].name), date = v.date, own = !isSeats && !!v.own;
  const s = SAIL[sid]; const seatsSel = isSeats ? v.picked.slice() : (own ? [] : autoSeats({sid, cls, date}));
  const pre = v.pre ?? false, post = v.post ?? true; const editUid = v.editUid;
  if (isSeats) S.stack.pop(); // leave the seat map
  if (editUid) { const it = S.cart.find(x => x.uid === editUid); if (it) Object.assign(it, {ref:sid, date, cls, seats:seatsSel, own}); S.flashUid = editUid; S.stack.pop(); render(true); toast('Ferry updated'); return; }
  const it = addItem({kind:'ferry', ref:sid, date, cls, seats:seatsSel, own}, true);
  if (!own) {
    const L = jettyLegs(s, date);
    if (post && L.post) addItem(Object.assign({kind:'cab', ref:L.post.r.id, date, t:s.arr, for:it.uid, leg:'post'}, L.post.rev ? {rev:true} : {}), true);
    if (pre && L.pre) addItem(Object.assign({kind:'cab', ref:L.pre.r.id, date, t:hm(Math.floor((tm(s.dep) - s.rep - L.pre.r.mins - 10) / 5) * 5), for:it.uid, leg:'pre'}, L.pre.rev ? {rev:true} : {}), true);
  }
  const trimmed = trimStays(); S.stack.pop(); S.lastFerry = it.uid; S.sheet = 'ferryadded'; render(true); if (trimmed.length) toast(`Adjusted to match your ferry: ${trimmed.join('; ')}`);
}
function removeItem(uid) { // also drops the cabs booked for it
  const it = S.cart.find(x => x.uid === uid); if (!it) return; S.undo = JSON.parse(JSON.stringify(S.cart));
  const linked = S.cart.filter(x => x.for === uid).length; S.cart = S.cart.filter(x => x.uid !== uid && x.for !== uid);
  toastUndo(`Removed ${info(it).title}${linked ? ` and its cab${linked > 1 ? 's' : ''}` : ''}`);
}
function doFx(d) {
  const it = d.uid && S.cart.find(x => x.uid === d.uid);
  switch (d.act) {
    case 'edit': if (it) editItem(it.uid); break;
    case 'patch': if (it) { S.flashUid = it.uid; Object.assign(it, JSON.parse(d.patch)); if (it.kind === 'ferry' && !it.own) { delete it.reseat; it.seats = autoSeats({sid:it.ref, cls:it.cls, date:it.date}); } toast(JSON.parse(d.patch).early ? 'Early check-in requested' : JSON.parse(d.patch).late ? 'Late check-out requested' : 'Fixed'); rerender(); } break;
    case 'quickadd': { const a = quickAdd(d); rerender(); toast(`Added ${info(a).title}${d.ref2 ? ' and the ride back' : ''}`); break; }
    case 'ferry': go({v:'route', from:d.from, to:d.to, date:d.date, own:!!d.own}); break;
    case 'list': go({v:'store', zone:d.zone, aisle:d.cat === 'stay' ? 'stay' : 'do', date:d.date}); break;
    case 'dismiss': S.dismissed[d.key] = 1; rerender(); break;
    case 'undismiss': delete S.dismissed[d.key]; rerender(); break;
    case 'del': if (it) { removeItem(it.uid); rerender(); } break;
    case 'route': go({v:'route', from:d.from, to:d.to, date:d.date}); break;
    case 'store': go({v:'store', zone:d.zone, aisle:d.aisle, date:d.date}); break;
  }
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el) return;
  if (el.dataset.a === 'closesheet' && el.classList.contains('scrim') && e.target.closest('[data-stop]')) return;
  const a = el.dataset.a, d = el.dataset, v = cur();
  switch (a) {
    case 'tab': S.sheet = null; tab(d.v); break;
    case 'back': back(); break;
    case 'go': if (d.v === 'route') { const z = homeZone(); go({v:'route', from:z === 'PBL' ? 'PBL' : 'PBL', to:z === 'PBL' ? 'HAV' : z, date:baseDate()}); break; }
      go(Object.assign({v:d.v}, d.code ? {code:d.code} : {}, d.id ? {id:d.id} : {}, d.k ? {k:d.k} : {})); break;
    case 'lang': S.lang = d.l; rerender(); break;
    case 'store': S.sheet = null; if (v.v === 'store') { S.stack[S.stack.length - 1] = {v:'store', zone:d.zone, aisle:d.aisle || v.aisle || 'do', date:d.date || v.date}; render(true); } else go({v:'store', zone:d.zone, aisle:d.aisle || 'do', date:d.date}); break;
    case 'aisle': v.aisle = d.aisle; v.sel = null; v.cls = null; rerender(); break;
    case 'storedate': case 'routedate': case 'cfgdate': dayAct(a, d.date); break;
    case 'tier': v.tier = d.tier; rerender(); break;
    case 'cat': v.ck = d.ck; rerender(); break;
    case 'og': v.og = d.og; rerender(); break;
    case 'search': if (v.v === 'search') { v.tag = d.tag || null; rerender(); } else go({v:'search', tag:d.tag}); break;
    case 'product': go({v:'product', kind:d.kind, id:d.id, date:d.date, after:d.after}); break;
    case 'edit': editItem(d.uid); break;
    case 'dates': case 'paxsheet': S.sheet = 'dates'; rerender(); break;
    case 'help': S.sheet = 'help'; rerender(); break;
    case 'closesheet': S.sheet = null; rerender(); break;
    case 'copy': { const n = '+91 00000 00000'; try { navigator.clipboard.writeText(n).then(() => toast('Number copied'), () => toast('Select the number to copy')); } catch (x) { toast('Select the number to copy'); } break; }
    case 'pax': { const sp = document.getElementById(d.k); sp.textContent = Math.max(+d.min, Math.min(12, +sp.textContent + (+d.d)));
      if (d.k === 'pk') { const cur0 = [...document.querySelectorAll('.agesel')].map(x => +x.value); S.pax.ages = cur0.concat(kidAges().slice(cur0.length)); const box = document.getElementById('ages'); const n = +sp.textContent; const keep = S.pax.kids; S.pax.kids = n; box.innerHTML = agesHTML(n); S.pax.kids = keep; } break; }
    case 'savedates': {
      const s = document.getElementById('ds').value, en = document.getElementById('de').value;
      if (!s || !en || en <= s) { toast('Leave date must be after arrival'); break; }
      if ((pDate(en) - pDate(s)) / 864e5 > 20) { toast('Plan up to 21 days at a time'); break; }
      const before = pax(); const pkP = S.pkg && S.cart.length && pkgSig() === S.pkg.sig ? PKGS.find(x => x.id === S.pkg.id) : null;   // an untouched ready-made trip is rebuilt around the new dates and flights
      if (S.win && S.win.start !== s && S.cart.length && !pkP) { const delta = Math.round((pDate(s) - pDate(S.win.start)) / 864e5); S.cart.forEach(i => { i.date = addD(i.date, delta); }); setTimeout(() => toast(`Moved your whole plan by ${delta > 0 ? '+' : ''}${delta} day${Math.abs(delta) === 1 ? '' : 's'}`), 80); }
      S.win = {start:s, end:en}; S.datesAssumed = false; S.pax = {adults:+document.getElementById('pa').textContent, kids:+document.getElementById('pk').textContent, infants:+document.getElementById('pi').textContent, ages:[...document.querySelectorAll('.agesel')].map(x => +x.value), sen:document.getElementById('psen').checked};
      if (pax() !== before) { let n = 0; S.cart.filter(i => i.kind === 'ferry' && !i.own).forEach(i => { i.seats = autoSeats({sid:i.ref, cls:i.cls, date:i.date}); n++; }); S.cart.filter(i => i.kind === 'act').forEach(i => { delete i.pa; delete i.pk; }); if (n) setTimeout(() => toast(`Ferry seats updated for ${pax()} travellers`), 50); }
      const fi = document.getElementById('fi').value, fo = document.getElementById('fo').value;
      S.fin = fi ? {no:fi, date:s} : null; S.fout = fo ? {no:fo, date:en} : null;
      if (!S.planDate || S.planDate < s || S.planDate > en) S.planDate = s;
      if (pkP && Math.round((pDate(en) - pDate(s)) / 864e5) >= pkP.nights) { S.undo = JSON.parse(JSON.stringify(S.cart)); S.cart = []; S.seq = 1; S.dismissed = {}; buildPkg(pkP, s); S.sheet = null; render(true); toastUndo(fi || fo ? 'Plan fitted to your flights' : 'Plan moved to your dates'); break; }
      S.sheet = null; rerender(); toast('Dates saved'); break; }
    /* product config */
    case 'slot': v.cfg.t = d.t; rerender(); break;
    case 'room': v.cfg.room = d.room; rerender(); break;
    case 'nights': v.cfg.nights = Math.max(1, Math.min(14, v.cfg.nights + (+d.d))); rerender(); break;
    case 'qty': v.cfg.qty = Math.max(1, Math.min(10, (v.cfg.qty || 1) + (+d.d))); rerender(); break;
    case 'days': v.cfg.days = Math.max(1, Math.min(14, (v.cfg.days || 1) + (+d.d))); rerender(); break;
    case 'cabret': v.cfg.ret = d.v === '1'; rerender(); break;
    case 'cabrev': v.cfg.rev = !v.cfg.rev; rerender(); break;
    case 'vcls': v.cfg.vc = d.v; rerender(); break;
    case 'add': { addItem(Object.assign({}, v.cfg), true); if (v.cfg.kind === 'cab' && ROUTE[v.cfg.ref].kind === 'road') { const tr = trimStays(); if (tr.length) setTimeout(() => toast(`Adjusted: ${tr.join('; ')}`), 60); } const day = S.trip ? dayIdx(v.cfg.date) + 1 : 1; back(); toast(`Added to Day ${day}`); break; }
    case 'save': { const it = S.cart.find(x => x.uid === v.uid); if (it) { S.flashUid = it.uid; Object.assign(it, v.cfg); if (it.kind === 'cab' && it.for) { delete it.for; delete it.back; } } back(); toast('Trip updated'); break; }
    case 'ppa': v.cfg.pa = Math.max(0, Math.min(S.pax.adults, partyOf(v.cfg).pa + (+d.d))); rerender(); break;
    case 'ppk': v.cfg.pk = Math.max(0, Math.min(kidsOk(ACT[v.cfg.ref]), partyOf(v.cfg).pk + (+d.d))); rerender(); break;
    case 'addallcabs': { const L = S._cabFixes || []; S.undo = JSON.parse(JSON.stringify(S.cart)); L.forEach(f => quickAdd(f)); rerender(); toastUndo(`Added ${L.reduce((n, f) => n + (f.ref2 ? 2 : 1), 0)} cab rides`); break; }
    case 'remove': { const nm = (S.cart.find(x => x.uid === d.uid) ? info(S.cart.find(x => x.uid === d.uid)).title : ''); removeItem(d.uid); back(); toastUndo(`Removed ${nm}`); break; }
    case 'undo': if (S.undo) { S.cart = S.undo; S.undo = null; rerender(); toast('Restored'); } break;
    /* ferry */
    case 'finder': go({v:'route', from:document.getElementById('hf').value, to:document.getElementById('ht').value, date:document.getElementById('hd').value || baseDate()}); break;
    case 'swapfinder': { const f = document.getElementById('hf'), to = document.getElementById('ht'); const x = f.value; f.value = to.value; to.value = x; break; }
    case 'swaproute': if (v.v === 'route') { [v.from, v.to] = [v.to, v.from]; v.sel = null; v.cls = null; rerender(); } else go({v:'route', from:v.zone, to:document.getElementById('rf').value, date:v.fdate || v.date || baseDate()}); break;
    case 'route': go({v:'route', from:d.from, to:d.to, date:d.date}); break;
    case 'pick': if (v.v === 'store') { const s = SAIL[d.id]; go({v:'route', from:s.f, to:s.to, date:v.fdate || v.date || baseDate(), sel:d.id, own:v.own}); }
      else { v.sel = v.sel === d.id ? null : d.id; v.cls = null; if (v.sel) { const s = SAIL[v.sel]; const c = classFares(s).find(c => seats(s.id, c.name, v.date) >= pax()); v.cls = c ? c.name : classFares(s)[0].name; } rerender(); } break;
    case 'cls': v.cls = d.cls; rerender(); break;
    case 'ownmode': v.own = !v.own; rerender(); break;
    case 'leg': if (d.leg === 'pre') v.pre = !(v.pre ?? false); else v.post = !(v.post ?? true); rerender(); break;
    case 'toseats': go({v:'seats', sid:v.sel, cls:v.cls, date:v.date, picked:[], pre:v.pre, post:v.post, editUid:v.editUid}); break;
    case 'seat': { const p = v.picked; const i = p.indexOf(d.seat); if (i >= 0) p.splice(i, 1); else { if (p.length >= pax()) p.shift(); p.push(d.seat); } rerender(); break; }
    case 'autoseat': v.picked = autoSeats(v); rerender(); break;
    case 'addferry': addFerry(); break;
    case 'addown': { const dep = document.getElementById('odep').value, arr = document.getElementById('oarr').value; if (!dep || !arr) { toast('Add both times'); break; }
      const o = {id:'OWN-' + Date.now().toString(36), f:v.from, to:v.to, dep, arr, op:document.getElementById('oop').value.trim() || 'Ferry', fromPt:`${ZN[v.from].name} jetty`, toPt:`${ZN[v.to].name} jetty`, rep:45, gov:false, ownSail:true, conf:'Booked elsewhere', fares:[{n:'Booked elsewhere', f:0, c:0}]};
      S.ownSails = (S.ownSails || []).concat([o]); regOwn(o);
      const it = addItem({kind:'ferry', ref:o.id, date:v.date, cls:'Booked elsewhere', seats:[], own:true}, true); const tr = trimStays();
      S.stack.pop(); S.lastFerry = it.uid; S.sheet = 'ferryadded'; render(true); if (tr.length) toast(`Adjusted to match your ferry: ${tr.join('; ')}`); break; }
    case 'fasheet': { const it = S.cart.find(x => x.uid === S.lastFerry); const s = it && SAIL[it.ref]; S.sheet = null;
      if (!s || d.go === 'trip') tab('trip');
      else if (d.go === 'ret') go({v:'route', from:s.to, to:s.f, date:addD(it.date, Math.max(1, ZN[s.to].typN || 1))});
      else go({v:'store', zone:s.to, aisle:d.go, date:it.date});
      break; }
    /* trip */
    case 'fx': doFx(d); break;
    case 'breakdown': S.sheet = 'breakdown'; rerender(); break;
    case 'fixmenu': autoFix(); S.sheet = 'autofix'; rerender(); break;   // one tap: we fix what we can, show every change, undo is one tap away
    case 'firstissue': { S.sheet = null; rerender(); const el2 = document.querySelector('.alert.hard'); if (el2) el2.scrollIntoView({behavior:'smooth', block:'center'}); break; }
    case 'autofix': autoFix(); S.sheet = 'autofix'; rerender(); break;
    case 'autofixundo': if (S.autoUndo) { S.cart = S.autoUndo.cart; S.seq = Math.max(S.seq, S.autoUndo.seq); S.autoUndo = null; S.autoLog = []; } S.sheet = null; rerender(); toast('Changes undone'); break;
    case 'sample': sampleTrip(); S.booked = []; S.scans = {}; S.vendorStatus = {}; S.sheet = null; tab('trip'); toast('Sample trip loaded'); break;
    case 'reset': S.win = null; S.fin = null; S.fout = null; S.cart = []; S.booked = []; S.scans = {}; S.vendorStatus = {}; S.dismissed = {}; S.planDate = null; tab('home'); toast('Cleared'); break;
    /* checkout */
    case 'paym': S.pay = d.k; rerender(); break;
    case 'pay': {
      const nm = document.getElementById('ln').value.trim(), ph = document.getElementById('lp').value.trim();
      S.lead = {name:nm, phone:ph, email:document.getElementById('le').value.trim()};
      if (!checkLead()) break;
      bookAll(); S.stack = [{v:'trip'}, {v:'paid', processing:true}]; render(true);
      setTimeout(() => { if (cur().v === 'paid') { cur().processing = false; S.cart = []; S.win = null; render(true); } }, 1400);
      break; }
    case 'offline': S.offline = !S.offline; rerender(); break;
    case 'theme': S.theme = d.k; rerender(); break;
    case 'scan': {
      const now = new Date(); const at = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
      if (d.code === 'FAKE') v.result = {cls:'bad', h:'Not valid', msg:'Signature check failed. Ask the traveller to open the pass in the app, not a screenshot.'};
      else if (S.scans[d.code]) v.result = {cls:'warn', h:'Already used', msg:`${d.code} was scanned at ${S.scans[d.code]}. Check the traveller's ID before letting them through.`};
      else { const p = S.booked.find(x => x.code === d.code); S.scans[d.code] = at; v.result = {cls:'ok', h:'Valid', msg:`${esc(p.title)} · ${fD(p.date)} ${p.time} · ${p.pax} traveller${p.pax > 1 ? 's' : ''}. Checked on device, no network used.`}; }
      rerender(); break; }
    case 'vacc': S.vendorStatus[d.code] = d.s; toast(d.s === 'ok' ? 'Accepted' : 'Declined'); rerender(); break;
    /* price admin */
    case 'pcat': v.cat = d.k; v.f = undefined; v.z = ''; v.only = ''; v.lim = 60; rerender(); break;
    case 'pf': v.f = d.f; v.lim = 60; rerender(); break;
    case 'pz': v.z = d.z; v.lim = 60; rerender(); break;
    case 'ponly': v.only = d.k; v.lim = 60; rerender(); break;
    case 'pmore': v.lim = (v.lim || 60) + 60; rerender(); break;
    case 'pores': { delete S.po[d.k]; applyPO(); rerender(); toast('Back to the original price'); break; }
    case 'pbulk': {
      const rows = adminRows(v); const pct = parseFloat(document.getElementById(d.k === 'margin' ? 'bm' : 'bp').value);
      if (isNaN(pct)) { toast('Enter a number'); break; }
      if (d.k === 'margin') v.bm = pct; else v.bp = pct; v.bulk = true;
      S.poUndo = JSON.parse(JSON.stringify(S.po || {})); let n = 0;
      rows.forEach(o => { const c = o.obj[o.cf], s = o.obj[o.sf];
        const nv = d.k === 'margin' ? (c != null ? Math.round(c * (1 + pct / 100) / 10) * 10 : null) : (s != null ? Math.round(s * (1 + pct / 100) / 10) * 10 : null);
        if (nv != null && nv !== s) { poSet(o.key, 's', nv); n++; } });
      rerender(); toast(`${n} selling price${n === 1 ? '' : 's'} updated`); break; }
    case 'pundo': if (S.poUndo) { S.po = S.poUndo; S.poUndo = null; applyPO(); rerender(); toast('Bulk change undone'); } break;
    case 'pcopy': { const csv = poCSV(); try { navigator.clipboard.writeText(csv).then(() => toast('Copied. Paste it in WhatsApp or a sheet.'), () => toast('Copy blocked by the browser')); } catch (x) { toast('Copy blocked by the browser'); } break; }
    case 'preset': S.poUndo = JSON.parse(JSON.stringify(S.po || {})); S.po = {}; applyPO(); rerender(); toast('All prices back to the catalogue'); break;
  }
});
document.addEventListener('change', e => {
  const el = e.target; const v = cur();
  if (el.id === 'sort') { v.sort = el.value; rerender(); }
  if (el.id === 'dmore' && el.value) { dayAct(el.dataset.act, el.value < TODAY ? TODAY : el.value); }
  if (el.id === 'rf' || el.id === 'rt') { if (v.v === 'route') { v[el.id === 'rf' ? 'from' : 'to'] = el.value; v.sel = null; v.cls = null; rerender(); } else go({v:'route', from:document.getElementById('rf').value, to:document.getElementById('rt').value, date:v.fdate || v.date || baseDate()}); }
  if (el.id === 'vsel') { v.vendor = el.value; rerender(); }
  if (el.dataset.pk) { const raw = el.value.replace(/[^\d.]/g, ''); const n = raw === '' ? null : Math.round(+raw); if (raw !== '' && isNaN(n)) return; poSet(el.dataset.pk, el.dataset.pf, n); rerender(); toast('Saved'); }
});
let _qT;
document.addEventListener('input', e => {
  const el = e.target; const v = cur();
  if (el.id === 'q' || el.id === 'aq') { v.q = el.value; clearTimeout(_qT); const id = el.id; _qT = setTimeout(() => { v.lim = 60; render(false); const q = document.getElementById(id); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }, 230); }
  if (el.dataset.pk) { const row = el.closest('.prow'); if (!row) return; const ins = row.querySelectorAll('input'); const c = +ins[0].value || null, s = +ins[1].value || null; const mp = row.querySelector('.mp'); if (mp) mp.outerHTML = mpill(c, s); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && S.sheet) { S.sheet = null; rerender(); } if (e.key === 'Enter' && e.target.dataset && e.target.dataset.pk) e.target.blur(); });
window.addEventListener('scroll', () => { const t0 = document.querySelector('.top'); if (t0) t0.classList.toggle('scrolled', window.scrollY > 4); }, {passive:true});
/* ---------- new interactions ---------- */
Object.assign(T.en, {heroP:'Ferries, stays, cabs and dives in a single booking. Every connection is checked before you pay.', viewTrip:'View my trip',
  whatNeed:'Book any part of your trip', cFerryS:'Private and government boats', cStayS:'Simple rooms to beach resorts', cMoveS:'Airport, jetty and sightseeing rides', cDoS:'Beaches, history, sunsets', cPkgS:'Pick one, change anything', cAdvS:'Scuba, sea walk, kayaking',
  mapH:'Choose your islands', mapS:'Select an island on the map', pkgS:'Designed by local planners and verified for timing. Choose one, then customise every detail.',
  sig:'Signature experiences', advS:'An active volcano, bioluminescent waters and your first dive.',
  emptyTrip:'Your trip starts here', sample:'Show me an example trip', datesOpt:'When are you coming?'});
Object.assign(T.hi, {heroP:'फ़ेरी, होटल, कैब और डाइव, एक ही बुकिंग में। भुगतान से पहले हर कनेक्शन की जाँच।'});
Object.assign(UI, {
  sunrise:'<path d="M3 18h18M6 14a6 6 0 0 1 12 0M12 7V3M9.5 5.5L12 3l2.5 2.5M4.2 10.2l1.5 1.5M19.8 10.2l-1.5 1.5"/>',
  sunset:'<path d="M3 18h18M6 14a6 6 0 0 1 12 0M12 3v4M9.5 4.5L12 7l2.5-2.5M4.2 10.2l1.5 1.5M19.8 10.2l-1.5 1.5"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  spark:'<path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z"/><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.700 1.8-.700-1.8-1.8-.700 1.8-.700z"/>',
  theme:'<circle cx="12" cy="12" r="9"/><path d="M12 3v18a9 9 0 0 0 0-18z" fill="currentColor" stroke="none"/>',
  turtle:'<ellipse cx="11" cy="13" rx="6.5" ry="4.5"/><path d="M17.5 12.5l3-1.5 1 2.2-3.5.8M6.5 9.8L4.5 8M6.5 16.2l-2 1.8M14.5 9.2L16 6.8M14.5 16.8l1.5 2.4"/>',
  glow:'<path d="M2 17c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2.5 5-1"/><path d="M8 5v4M6 7h4M16.5 3.5v3M15 5h3M12.5 10v2M11.5 11h2"/>',
  route:'<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5"/>'
});
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el) return; const d = el.dataset;
  if (d.a === 'closesheet' && el.classList.contains('scrim') && e.target.closest('[data-stop]')) return;
  switch (d.a) {
    case 'themecycle': { const dark = S.theme === 'dark' || (S.theme !== 'light' && typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches); S.theme = dark ? 'light' : 'dark'; rerender(); break; }
    case 'rail': { const r = el.parentElement.querySelector('.pkgrail,.sigrail'); if (r) r.scrollBy({left:(+d.d) * r.clientWidth * .8, behavior:'smooth'}); break; }
    case 'tod': S._tod = d.k; S._todPin = true; setHeroTod(); break;
    case 'startplan': if (S.cart.length || (S.win && !S.datesAssumed)) tab('trip'); else { S._afterDates = true; S.sheet = 'dates'; rerender(); } break;
    case 'savedates': if (S._afterDates && !S.sheet) { S._afterDates = false; tab('trip'); } break;
    case 'closesheet': case 'skipdates': S._afterDates = false; break;
  }
});
/* in-page jumps (day chips, sub-sections) glide instead of changing the address */
document.addEventListener('click', e => { const a = e.target.closest('a[href^="#"]'); if (!a || a.dataset.a) return; const el = document.getElementById(a.getAttribute('href').slice(1)); if (!el) return; e.preventDefault(); const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches; el.scrollIntoView({behavior:still ? 'auto' : 'smooth', block:'start'}); });
function setHeroTod() { const app = document.getElementById('app'); if (!app) return; app.dataset.tod = S._tod; app.querySelectorAll('[data-a="tod"]').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === S._tod)); }
function heroTick() { if (S._todPin || document.hidden || !document.querySelector('.hero')) return; S._tod = HERO_TODS[(HERO_TODS.indexOf(S._tod || 'day') + 1) % 4]; setHeroTod(); }
/* ============ PLACE RESEARCH + DAY BLOCKS ============
   POP is a 0–100 popularity index worked out from Google Places listings (rating weighted by how many people reviewed), checked Nov 2026.
   It only orders suggestions; nothing from Google is shown to travellers. Refresh it from the Places API in production (place IDs are kept by the developer notes). */
const POP = {'ENT-CELLULAR-JAIL':100, 'ACV-SHOW-LS-HIN':96, 'ACV-SHOW-LS-ENG':96, 'ENT-RADHANAGAR':95, 'ENT-CORBYNS':87, 'ENT-BHARATPUR':85, 'ENT-SAMUDRIKA':81, 'ACV-BOAT-ROSSNB':80, 'ACV-BOAT-ROSS-AM':79, 'ACV-BOAT-ROSS-PM':79,
  'ACV-BOAT-NB':76, 'ENT-ANTHRO-MUSEUM':76, 'ENT-KALAPATHAR':74, 'ACV-BOAT-BAR-CAVE':73, 'ACV-TOUR-BARATANG':73, 'ACV-BOAT-ELEPH':72, 'ACV-TREK-MTHARRIET':70, 'ENT-LAXMANPUR':67, 'ACV-BOAT-JOLLY':66, 'ACV-BOAT-REDSKIN':66,
  'ENT-CHIDIYA-TAPU':65, 'ACV-CHIDIYA-SUNSET':65, 'ACV-BOAT-ROSSSMITH-2':62, 'ENT-SITAPUR':61, 'ACV-NATBRIDGE-NEI':59, 'ENT-GOVIND-NAGAR':56, 'ENT-VIJAYNAGAR':54, 'ENT-KARMATANG':50, 'ENT-BUTLER':49, 'ACV-TREK-SADDLE':43, 'ENT-AMKUNJ':41, 'ENT-CHATHAM':34, 'ACV-DHANINALLAH':29};
const popOf = (id, rank = 9) => POP[id] != null ? POP[id] : Math.max(28, 58 - rank * 3);
const POPWHY = id => (POP[id] || 0) >= 85 ? 'Among the most visited sights in the islands' : (POP[id] || 0) >= 65 ? 'A favourite with visitors' : '';
/* rough positions, used only when the cab table has no route between two places */
const GEO = {ABERDEEN:[11.668, 92.738], MARINE:[11.672, 92.731], CORBHOT:[11.645, 92.748], HADDO:[11.681, 92.722], B3:[12.031, 93.001], VIJAY:[12.010, 93.009], RADHOT:[11.985, 92.953], HAVJ:[12.043, 92.983], NKENDRA:[11.834, 93.040], NEIJ:[11.842, 93.031], DIGBAZ:[13.250, 92.975], RBAZ:[12.503, 92.913], MAYABAZ:[12.920, 92.900], HUTBAY:[10.590, 92.533], YERRATA:[12.47, 92.93], BARJ:[12.13, 92.77]};
const GEOA = {'ENT-CELLULAR-JAIL':[11.675, 92.748], 'ACV-SHOW-LS-HIN':[11.675, 92.748], 'ACV-SHOW-LS-ENG':[11.675, 92.748], 'ENT-CORBYNS':[11.645, 92.748], 'ENT-JAPBUNKER':[11.645, 92.748], 'ENT-SAMUDRIKA':[11.672, 92.726], 'ENT-ANTHRO-MUSEUM':[11.665, 92.740], 'ENT-CHATHAM':[11.687, 92.724], 'ENT-CHIDIYA-TAPU':[11.504, 92.701],
  'ENT-RADHANAGAR':[11.984, 92.951], 'ENT-KALAPATHAR':[12.001, 93.007], 'ENT-VIJAYNAGAR':[12.010, 93.009], 'ENT-GOVIND-NAGAR':[12.031, 93.001], 'ENT-BEACH1-HAV':[12.040, 92.990], 'ACV-NATBRIDGE-NEI':[11.829, 93.015], 'ENT-LAXMANPUR':[11.847, 93.016], 'ENT-BHARATPUR':[11.836, 93.034], 'ENT-SITAPUR':[11.826, 93.065],
  'ACV-DHANINALLAH':[12.622, 92.957], 'ENT-AMKUNJ':[12.511, 92.966], 'ENT-KARMATANG':[12.844, 92.939], 'ENT-BUTLER':[10.671, 92.576], 'ENT-LAMIYA-BAY':[13.19, 93.03]};
const hav = (a, b) => { const r = x => x * Math.PI / 180, h = Math.sin(r(b[0] - a[0]) / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(r(b[1] - a[1]) / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); };
const estMin = (a, b) => Math.max(8, Math.round((hav(a, b) * 1.4 / 27 * 60 + 4) / 5) * 5);
/* minutes by road from where you are staying to an activity: the cab table first, then position, then the old rule of thumb */
function travelMin(fromKey, x) { const k = siteKey(x); if (k && k === fromKey) return 5; const sr = siteRoute(x, fromKey); if (sr) return sr.r.mins;
  if (GEO[fromKey] && GEOA[x.id]) return estMin(GEO[fromKey], GEOA[x.id]); return siteMin({kind:'act', I:{site:x.site, title:x.n, sub:x.v}}); }
// same buffer the engine checks between two stops (tau), so a day plan never fails the trip check it was built for
function engHop(x, y) { const ev = a => ({kind:'act', zone:a.z === 'WAN' ? 'WAN' : a.z, I:{site:a.site, title:a.n, sub:a.v || ''}}); try { return tau(ev(x), ev(y)); } catch (e) { return 15; } }
function hopMin(x, y) { return Math.max(hopMin0(x, y), engHop(x, y)); }
function hopMin0(x, y) { const kx = siteKey(x), ky = siteKey(y); if (kx && kx === ky) return 5; const f = kx && ky && findRoute(kx, ky); if (f) return f.r.mins; if (GEOA[x.id] && GEOA[y.id]) return estMin(GEOA[x.id], GEOA[y.id]); return ky ? travelMin(HUB[y.z === 'WAN' ? 'PBL' : y.z], y) : 15; }
const inBreak = (x, t0, t1) => !!(x.brk && t0 < tm(x.brk[1]) && t1 > tm(x.brk[0]));
/* opening hours corrected against the current listings */
(() => { const set = (id, o) => { if (ACT[id]) Object.assign(ACT[id], o); };
  set('ENT-CELLULAR-JAIL', {brk:['12:00', '14:00']}); set('ENT-CHATHAM', {open:'09:00', close:'15:00', closed:[0]}); set('ENT-ANTHRO-MUSEUM', {open:'09:30'}); })();
const shortName = x => x.n.replace(/ National Memorial| \(Beach \d\)| Naval Marine Museum| boat$/g, '').replace('Discover Scuba Diving', 'First dive');
/* who and what a suggestion has to respect */
function ideaFilter(date, f = {}) {
  const needsCarrier = id => RULES.some(r => isCarrierRule(r) && inList(r.a, id)); const bookedNames = new Set(S.cart.filter(i => i.kind === 'act').map(i => ACT[i.ref].n));
  const diver = S.cart.some(i => i.kind === 'act' && /Certified|Courses/.test(ACT[i.ref].fam)); const seniors = !!S.pax.sen;
  const tiers = S.cart.filter(i => i.kind === 'stay').map(i => HOT[i.ref].t); const cap = tiers.includes('Luxury') || tiers.includes('Premium') ? 9000 : tiers.includes('Budget') && !tiers.includes('Deluxe') ? 2600 : 4500;
  const pp = x => x.b === 'per_pax' ? actPrice(x) : actPrice(x) / Math.max(1, pax());
  return (x, inBlock) => { if (!shown(x) && !inBlock) return false; if (S.cart.some(it => it.ref === x.id) || bookedNames.has(x.n)) return false;
    if ((!inBlock && needsCarrier(x.id)) || actPrice(x) == null || pp(x) > cap || !seasonOk(x.sea, date)) return false;
    if (x.age && S.pax.kids && kidsOk(x) < S.pax.kids) return false; if (diver && /Try dive|Snorkel/.test(x.fam)) return false;
    if (seniors && (x.tags.includes('adr') || x.tags.includes('fit') || /Scuba|Kayak|trek/i.test(x.fam + x.n))) return false;
    if ((f.landing || f.leaving) && (WET(x) || x.d > 150)) return false; return true; };
}
/* Half-day and full-day blocks: ordered stops sold as one plan. A stop can list alternatives (first one open that day wins),
   'during' means it happens inside the stop before it (snorkelling off the Elephant Beach boat), at:'sunset' ends it as the sun goes down. */
const BLOCKS = [
  {id:'BLK-PBL-ARRIVAL', z:'PBL', arr:1, eve:1, n:'Corbyn’s Cove, Cellular Jail and the evening show', why:'How 9 in 10 Andaman trips begin', stops:[{id:'ENT-CORBYNS'}, {id:'ENT-CELLULAR-JAIL'}, {id:['ACV-SHOW-LS-HIN', 'ACV-SHOW-LS-ENG']}]},
  {id:'BLK-PBL-HERITAGE', z:'PBL', arr:1, n:'Cellular Jail and the evening show', why:'The one afternoon every visitor should have', eve:1, stops:[{id:['ENT-CELLULAR-JAIL', 'ENT-CORBYNS'], t:'14:00'}, {id:['ACV-SHOW-LS-HIN', 'ACV-SHOW-LS-ENG']}]},
  {id:'BLK-PBL-MUSEUMS', z:'PBL', n:'Museums and Corbyn’s Cove', why:'The islands’ story, then the town beach', stops:[{id:'ENT-SAMUDRIKA'}, {id:'ENT-ANTHRO-MUSEUM'}, {id:'ENT-CORBYNS', d:75}]},
  {id:'BLK-PBL-ROSSNB', z:'PBL', n:'Ross Island and North Bay by boat', why:'Colonial ruins and coral in one outing', stops:[{id:['ACV-BOAT-ROSSNB', 'ACV-BOAT-NB']}, {id:'ACV-GBB-NB', t:'11:00', during:1}]},
  {id:'BLK-PBL-HARRIET', z:'PBL', n:'Chatham Saw Mill and Mount Harriet', why:'Timber history, then forest views of the harbour', stops:[{id:'ENT-CHATHAM'}, {id:'ACV-TREK-MTHARRIET'}]},
  {id:'BLK-PBL-CHIDIYA', z:'PBL', n:'Marine museum and Chidiya Tapu sunset', why:'A slow morning, then the southern tip at dusk', stops:[{id:'ENT-SAMUDRIKA'}, {id:'ACV-CHIDIYA-SUNSET'}]},
  {id:'BLK-PBL-SHOP', z:'PBL', arr:1, n:'Corbyn’s Cove and the Sagarika emporium', why:'An easy afternoon and gifts to take home', stops:[{id:'ENT-CORBYNS'}, {id:'ENT-SAGARIKA'}]},
  {id:'BLK-WAN-MARINE', z:'WAN', n:'Marine National Park day', why:'The clearest coral water near Port Blair', stops:[{id:['ACV-BOAT-JOLLY', 'ACV-BOAT-REDSKIN']}, {id:['ACV-SNK-JOLLY', 'ACV-SNK-REDSKIN'], t:'09:00', during:1}]},
  {id:'BLK-HAV-ELEPHANT', z:'HAV', n:'Elephant Beach with snorkelling', why:'Havelock’s reef, back by early afternoon', stops:[{id:'ACV-BOAT-ELEPH'}, {id:'ACV-SNK-ELEPH-STD', t:'10:00', during:1}]},
  {id:'BLK-HAV-SUNSET', z:'HAV', n:'Kalapathar, then sunset at Radhanagar', why:'Two of Havelock’s best beaches, timed for sunset', stops:[{id:'ENT-KALAPATHAR', d:75}, {id:'ENT-RADHANAGAR', at:'sunset'}]},
  {id:'BLK-HAV-CLASSIC', z:'HAV', n:'Havelock in a day', why:'Reef in the morning, Radhanagar at sunset', stops:[{id:'ACV-BOAT-ELEPH'}, {id:'ACV-SNK-ELEPH-STD', t:'10:00', during:1}, {id:'ENT-RADHANAGAR', at:'sunset'}]},
  {id:'BLK-HAV-THREE', z:'HAV', n:'Elephant Beach, Kalapathar and Radhanagar', why:'The full Havelock day most tours run', stops:[{id:'ACV-BOAT-ELEPH'}, {id:'ENT-KALAPATHAR'}, {id:'ENT-RADHANAGAR', at:'sunset'}]},
  {id:'BLK-HAV-DIVE', z:'HAV', n:'First dive and Vijaynagar beach', why:'A guided try-dive, then a quiet beach', stops:[{id:'ACV-DSD-HAV-SHORE'}, {id:'ENT-VIJAYNAGAR', d:75}]},
  {id:'BLK-HAV-KAYAK', z:'HAV', n:'Mangrove kayaking and Govind Nagar', why:'Calm creeks, then the café beach', stops:[{id:'ACV-KAYAK-HAV-MANGROVE'}, {id:'ENT-GOVIND-NAGAR', d:60}]},
  {id:'BLK-NEI-MORNING', z:'NEI', n:'Natural Bridge and Bharatpur lagoon', why:'Neil’s rock arch, then corals without getting wet', stops:[{id:'ACV-NATBRIDGE-NEI'}, {id:'ACV-GBB-NEI'}, {id:'ENT-BHARATPUR', d:75}]},
  {id:'BLK-NEI-SUNSET', z:'NEI', n:'Bharatpur, then sunset at Laxmanpur', why:'A swim in the lagoon and Neil’s sunset beach', stops:[{id:'ENT-BHARATPUR', d:90}, {id:'ENT-LAXMANPUR', at:'sunset'}]},
  {id:'BLK-NEI-ARRIVAL', z:'NEI', eve:1, n:'Laxmanpur sunset and stargazing', why:'How most Neil stays begin', stops:[{id:'ENT-LAXMANPUR', at:'sunset'}, {id:'ACV-STARGAZE-NEI'}]},
  {id:'BLK-NEI-DAY', z:'NEI', n:'Neil in a day', why:'Everything Neil is known for, in the right order', stops:[{id:'ACV-NATBRIDGE-NEI'}, {id:'ACV-GBB-NEI'}, {id:'ENT-BHARATPUR', d:90}, {id:'ENT-LAXMANPUR', at:'sunset'}]},
  {id:'BLK-DIG-ROSS', z:'DIG', n:'Ross & Smith sandbar and Lamiya Bay', why:'Two islands joined by sand, then a pebble beach', stops:[{id:'ACV-BOAT-ROSSSMITH-2'}, {id:'ENT-LAMIYA-BAY', d:75}]},
  {id:'BLK-RAN-COAST', z:'RAN', n:'Dhani Nallah mangroves and Amkunj beach', why:'A boardwalk through mangroves to the coast', stops:[{id:'ACV-DHANINALLAH'}, {id:'ENT-AMKUNJ', d:60}]},
  {id:'BLK-MAY-AVIS', z:'MAY', n:'Avis Island and Karmatang beach', why:'A coconut island by boat, then the turtle beach', stops:[{id:'ACV-BOAT-AVIS'}, {id:'ENT-KARMATANG', d:90}]},
  {id:'BLK-LIT-FALLS', z:'LIT', n:'Waterfalls and Butler Bay', why:'Jungle falls, then the surf beach', stops:[{id:'ACV-WATERFALL-LIT'}, {id:'ENT-BUTLER', d:120}]}
];
const BLK = {}; BLOCKS.forEach(b => BLK[b.id] = b);
/* what 89 real Andaman itineraries do on each kind of day (arrival, transfer day, full day on an island, last day) */
const EVD = D.ev || {ctx:{}, routes:{}, n:0};
function ctxOf(date) { if (!S.trip || !S.cart.length) return null; const n = dayIdx(date), N = nDays(); const pos = makePos(expand(S.cart)); const fx = z => z === 'transit' ? null : z;
  const zt = n >= N - 1 ? null : fx(pos(abs(n, 1380))), zp = n > 0 ? fx(pos(abs(n - 1, 1380))) : null;
  return n === 0 ? 'ARR:' + (zt || 'PBL') : !zt ? 'DEP:' + (zp || 'PBL') : zt !== zp ? `IN:${zt}<${zp}` : 'STAY:' + zt; }
function evFor(date) { let c = null; try { c = ctxOf(date); } catch (e) {} return (c && EVD.ctx[c]) || {}; }
/* fit a block into a window of one day: returns the timed bookings, or null if it cannot work */
function planBlock(b, date, w = {}) {
  const nat = NAT[date]; const sunset = nat ? tm(nat.ss) : 1020; const zb = b.z === 'WAN' || b.z === 'BAR' ? 'PBL' : b.z; const hk = w.hk || HUB[zb];
  const from = w.from ?? 420, to = w.to ?? sunset + 30, evening = w.evening ?? true; if (b.eve && !evening) return null; if (date < TODAY) return null;
  const ok = ideaFilter(date); const items = []; let t = from, prev = null, tr0 = 0;
  for (const st of b.stops) { let placed = null;
    for (const id of [].concat(st.id)) { const x = ACT[id]; if (!x || !ok(x, true)) continue; const d = x.d; let start;
      if (st.during && prev) { start = Math.max(prev.s + 30, st.t ? tm(st.t) : prev.s + 60); if (start + d > prev.s + prev.d) continue; }
      else { const tr = prev ? hopMin(prev.x, x) : travelMin(hk, x); const earliest = t + tr; if (!prev) tr0 = tr;
        if (st.at === 'sunset') { start = Math.floor((sunset + 10 - d) / 5) * 5; if (start < earliest) { if (earliest > sunset - 50) continue; start = Math.ceil(earliest / 5) * 5; } }
        else if (x.entry) { start = Math.max(Math.ceil(earliest / 5) * 5, x.open ? tm(x.open) : 0, st.t ? tm(st.t) : 0); if (inBreak(x, start, start + d)) start = tm(x.brk[1]); if (x.close && start + d > tm(x.close)) continue; }
        else { const sl = slotsFor(x).map(tm).filter(m => m >= earliest && (!st.t || m >= tm(st.t)))[0]; if (sl == null) continue; start = sl; } }
      if (availability({kind:'act', ref:id, date, t:hm(start)})) continue;
      placed = {ref:id, x, s:start, d, during:!!st.during, sun:st.at === 'sunset' || /SUNSET/.test(id)}; break; }
    if (!placed) return null; items.push(placed); if (!placed.during) { t = placed.s + placed.d; prev = placed; } }
  const first = items[0], last = items.filter(i => !i.during).pop(); const day = items.filter(i => !i.sun && i.s < sunset - 20); /* a sunset stop runs past dusk */ const dayEnd = day.length ? Math.max(...day.map(i => i.s + i.d)) : first.s;
  if (first.s - tr0 < from - 1) return null; if (dayEnd > to) return null; if (!evening && items.some(i => i.s >= sunset - 20)) return null;
  const cart = items.map((i, n) => { const c = {kind:'act', ref:i.ref, date, t:hm(i.s), qty:1, blk:b.id}; if (i.x.b === 'per_pax') { c.pa = S.pax.adults; c.pk = kidsOk(i.x); } return c; });
  let base, after; _lite = true; try { base = run(S.cart).hard; const R2 = run(S.cart.concat(cart.map((c, n) => Object.assign({uid:'tmp' + n}, c)))); after = R2.hard - cabFixable(R2); } finally { _lite = false; } if (after > base) return null;
  const price = cart.reduce((s, c) => s + (info(c).price || 0), 0); const end = Math.max(...items.map(i => i.s + i.d)); const span = end - first.s;
  return {b, items, cart, start:first.s, end, price, hero:(items.find(i => !i.x.entry) || first).ref, label:span >= 360 ? 'Full-day plan' : 'Half-day plan', pop:items.reduce((s, i) => s + popOf(i.ref), 0) / items.length, backMin:travelMin(hk, last.x)};
}
// a hard 'needs a cab' (marine park, Baratang) is solved by booking that cab, so it doesn't rule a plan out
function cabFixable(R) { return Object.values(R.by).flat().filter(a => a.sev === 'hard' && (a.fix || []).some(f => f.act === 'quickadd' && f.kind === 'cab')).length; }
function addNeededCabs() { for (let k = 0; k < 4; k++) { const R = run(S.cart); const f = Object.values(R.by).flat().filter(a => a.sev === 'hard').map(a => (a.fix || []).find(x => x.act === 'quickadd' && x.kind === 'cab')).filter(Boolean)[0]; if (!f) break; quickAdd(f); } syncTrip(); }
function addBlock(id, date, w) { const p = planBlock(BLK[id], date, w); if (!p) return 0; S.undo = JSON.parse(JSON.stringify(S.cart)); p.cart.forEach(c => addItem(Object.assign({}, c), true)); syncTrip(); addNeededCabs(); return p.cart.length; }
/* typical shape of a block, for browsing before a day is chosen */
function blockMeta(b) { const xs = b.stops.map(s => ACT[[].concat(s.id)[0]]).filter(Boolean); const mins = b.stops.reduce((m, s, i) => m + (s.during ? 0 : xs[i].d), 0);
  return {xs, mins, full:mins >= 330, pp:xs.reduce((s, x) => s + (x.b === 'per_pax' ? (actUnit(x, baseDate()) || 0) : Math.round((actUnit(x, baseDate()) || 0) / Math.max(1, pax()))), 0)}; }
function blockTile(b, date) { const m = blockMeta(b); const hero = (m.xs.find(x => !x.entry) || m.xs[0]).id;
  return `<button class="pkg blkt" data-a="blk" data-id="${b.id}" ${date ? `data-date="${date}"` : ''} style="--zc:${ZC(b.z)}"><span class="art">${art(b.z, null, BLK[b.id] ? 'BLK:' + b.id : hero)}<span class="pk-n">${m.full ? 'Full day' : 'Half day'}</span><span class="pk-t">${ZN[b.z === 'WAN' ? 'PBL' : b.z].name}</span></span>
    <span class="pk-b"><b>${esc(b.n)}</b><span class="pk-h">${m.xs.map((x, i) => `<small><i class="num">${i + 1}</i>${esc(shortName(x))}</small>`).join('')}</span>
    <span class="pk-f"><span><span class="price">${inr(m.pp)}</span><small>per person · ${m.xs.length} bookings in one</small></span><span class="go" aria-hidden="true">${ic('arrow', 18, 2.2)}</span></span></span></button>`; }
function blocksRail(zone, date) { const L = BLOCKS.filter(b => !zone || b.z === zone || (zone === 'PBL' && b.z === 'WAN')); if (!L.length) return '';
  return `<div class="sechd" style="margin-top:6px"><h2 style="font-size:22px">${zone ? 'Day plans on ' + ZN[zone].name : 'Half-day and full-day plans'}</h2><span class="sub">${L.length} ready to add</span></div><p class="note" style="margin-top:-8px">A few stops in the right order, timed around travel and opening hours. Take the whole plan, or only the parts you like.</p>
    <div class="railwrap"><button class="rail-btn prev" data-a="rail" data-d="-1" aria-label="Previous">${ic('back', 20, 2.4)}</button><div class="pkgrail">${L.map(b => blockTile(b, date)).join('')}</div><button class="rail-btn next" data-a="rail" data-d="1" aria-label="Next">${ic('back', 20, 2.4).replace('<svg', '<svg style="transform:scaleX(-1)"')}</button></div>`; }
function blockSheet() {
  const q = S.blk; const b = q && BLK[q.id]; if (!b) return ''; const zb = b.z === 'WAN' || b.z === 'BAR' ? 'PBL' : b.z; const date = q.date || defaultDayFor(zb);
  const st = stayAt(S.cart, zb, date, 600); const w = q.from != null ? {from:+q.from, to:+q.to + (q.eve ? 30 : 0), evening:!!q.eve, hk:st ? hotelKey(HOT[st.ref]) : undefined} : {hk:st ? hotelKey(HOT[st.ref]) : undefined};
  const p = planBlock(b, date, w); const m = blockMeta(b);
  const rows = p ? p.items.map((i, n) => `<div class="pkrow"><span class="mono">${hm(i.s)}</span><span class="nd" style="background:${ZC(i.x.z)}">${ic(i.x.entry ? 'camera' : (FAMICON[i.x.fam] || 'wave'), 13, 2)}</span><span><b>${esc(i.x.n)}</b><small>${esc(i.x.v || '')} · ${durTxt(i.d)}${i.during ? ' · during the boat trip' : ''}</small></span><button class="link" data-a="product" data-kind="act" data-id="${i.ref}" data-date="${date}" style="grid-column:3;justify-self:start;min-height:32px">Book this on its own</button></div>`).join('')
    : m.xs.map((x, n) => `<div class="pkrow"><span class="mono">${n + 1}</span><span class="nd" style="background:${ZC(x.z)}">${ic(x.entry ? 'camera' : (FAMICON[x.fam] || 'wave'), 13, 2)}</span><span><b>${esc(x.n)}</b><small>${esc(x.v || '')} · ${durTxt(x.d)}</small></span></div>`).join('');
  return sheetWrap(b.n, `<span class="tag acc" style="align-self:flex-start">${(p ? p.label : m.full ? 'Full-day plan' : 'Half-day plan')} · ${ZN[zb].name}</span><h2>${esc(b.n)}</h2><p class="note" style="margin-top:-8px">${esc(b.why)}. ${p ? `${hm(p.start)} to ${hm(p.end)}, with about ${p.backMin} min back to ${st ? 'your stay' : 'the centre'}.` : ''}</p>
    <div class="eyebrow">Day</div>${dayPicker(date, 'blkdate')}
    <div class="pkday" style="border:0;padding:0">${rows}</div>
    ${p ? `<div class="split"><span class="hr"></span><span><b>Plan total</b><span class="sub" style="display:block">${paxTxt()} · before GST · itemised at checkout</span></span><span class="v" style="font:800 24px var(--f-display)">${inr(p.price)}</span></div>
      <button class="btn primary block" data-a="blkadd" data-id="${b.id}" data-date="${date}" ${q.from != null ? `data-from="${q.from}" data-to="${q.to}" data-eve="${q.eve ? 1 : 0}"` : ''}>${ic('plus', 18, 2.6)} Add plan to ${fD(date)}</button>`
      : `<div class="fitbox warn"><div class="ln">${ic('alert', 18)}<p>This plan does not fit on ${fD(date)}: a stop is closed, out of season, already booked, or it clashes with something in your trip. Try another day, or book a stop on its own.</p></div></div>`}
    <button class="btn ghost block" data-a="closesheet">${t('done')}</button>`);
}
/* fill every free window with the best plan that fits, at most two additions a day */
function autoPlan() {
  S.undo = JSON.parse(JSON.stringify(S.cart)); let added = 0, guard = 0; const skip = {}, perDay = {};
  while (guard++ < 14) { syncTrip(); IDEAS_SEEN = new Set(); const R = run(S.cart); let did = false;
    outer: for (let n = 0; n < nDays(); n++) { const date = addD(S.trip.start, n); if ((perDay[date] || 0) >= 2) continue;
      for (const a of (R.day[n] || []).filter(x => x.kind === 'gap' && !x.skipped && !skip[date + x.at])) { const g = gapPicks(a, date); const p = g.blocks[0];
        if (p) { p.cart.forEach(c => addItem(Object.assign({}, c), true)); added += p.cart.length; perDay[date] = (perDay[date] || 0) + 1; did = true; break outer; }
        const s = g.pick.find(c => !c.eve && popOf(c.x.id) >= 50); if (s && !g.leaving && !g.landing) { addItem({kind:'act', ref:s.x.id, date, t:s.slot, qty:1, pa:S.pax.adults, pk:kidsOk(s.x)}, true); added++; perDay[date] = (perDay[date] || 0) + 1; did = true; break outer; }
        skip[date + a.at] = 1; } }
    if (!did) break; }
  syncTrip(); return added;
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el) return; const d = el.dataset;
  const win = () => d.from != null && d.from !== '' ? {from:+d.from, to:+d.to + (d.eve === '1' ? 30 : 0), evening:d.eve === '1'} : {};
  switch (d.a) {
    case 'blk': S.blk = {id:d.id, date:d.date || null, from:d.from != null && d.from !== '' ? +d.from : null, to:d.to != null && d.to !== '' ? +d.to : null, eve:d.eve === '1'}; S.sheet = 'block'; rerender(); break;
    case 'blkdate': if (S.blk) { S.blk.date = d.date; S.blk.from = null; S.blk.to = null; rerender(); } break;
    case 'blkadd': { const zb = BLK[d.id].z === 'WAN' || BLK[d.id].z === 'BAR' ? 'PBL' : BLK[d.id].z; const date = d.date || defaultDayFor(zb); const st = stayAt(S.cart, zb, date, 600); const w = win(); if (st) w.hk = hotelKey(HOT[st.ref]);
      const n = addBlock(d.id, date, w); S.sheet = null; if (n) { if (cur().v !== 'trip') tab('trip'); else rerender(); toastUndo(`${BLK[d.id].n}: ${n} bookings added to ${fD(date)}`); } else { rerender(); toast('That plan no longer fits this day'); } break; }
    case 'autoplan': { const n = autoPlan(); rerender(); if (n) toastUndo(`Added ${n} booking${n > 1 ? 's' : ''} to your free time`); else toast('Nothing more fits your free time'); break; }
  }
});
/* =====================================================================================
   v3 — final prototype layer
   • ready-made tours: every package from the market files, rebuilt from ATP's own catalogue
   • itinerary generator: several complete, checked itineraries from one set of dates
   • saved trips, kept on this device
   • "complete my trip": stays, ferries and transfers first, then what real itineraries do
   • My trips hub replaces the boarding-pass list
   ===================================================================================== */
SAVE_KEYS.push('trips', 'tripId', 'tripName', 'g', 'tf');
S.trips = []; S.tripId = null; S.tripName = ''; S.g = {n:5, tier:'Standard'}; S.tf = {n:'all', tag:'all', isl:'all', show:18};
Object.assign(T.en, {passes:'My trips', viewPasses:'Open itinerary and vouchers', pkgH:'Trips we have planned', pkgS:'Each one is a full trip: rooms, ferries, cabs and sightseeing, already timed. Pick one, then change whatever you like.',
  heroP:'Ferries, rooms, cabs and things to do, in one plan. We check that it all connects before you pay.', whatNeed:'Need one thing, or the whole trip?'});
Object.assign(T.hi, {passes:'मेरी यात्राएँ', pkgH:'तैयार टूर'});
const daysBetween = (a, b) => Math.round((pDate(b) - pDate(a)) / 864e5);
const clone = o => JSON.parse(JSON.stringify(o));

/* ---------- ready-made tours ---------- */
const TOURPF = D.tourpf || {};
(D.tours || []).forEach(x => { if (TOURPF[x.id] === 0) return; PKGS.push({id:x.id, n:x.n, hi:x.n, tag:x.tag, z:x.z, pax:[2, 0], nights:x.nights, tier:x.tier, hl:x.hl, plan:x.plan, mk:1}); });
for (let i = PKGS.length - 1; i >= 0; i--) if (TOURPF[PKGS[i].id] === 0) PKGS.splice(i, 1);
const tourTotal = p => TOURPF[p.id] || pkgPreview(p).total;
pkgCard = function (p, big) { const tot = tourTotal(p);
  return `<button class="pkg${big ? ' big' : ''}" data-a="go" data-v="pkg" data-id="${p.id}" style="--zc:${ZC(p.z)}"><span class="art">${art(p.z, null, p.id, {tod:['dawn', 'day', 'dusk'][p.id.length % 3]})}<span class="pk-n">${p.nights} nights · ${p.nights + 1} days</span><span class="pk-t">${esc(p.tag)}</span></span>
    <span class="pk-b"><b>${esc(S.lang === 'hi' ? p.hi : p.n)}</b>
    <span class="pk-r">${route(p).map(([z, n]) => `<i style="--zc:${ZC(z)}">${ZN[z].name} ${n}N</i>`).join('<span aria-hidden="true">→</span>')}</span>
    <span class="pk-h">${p.hl.slice(0, big ? 3 : 2).map(h => `<small>${ic('check', 13, 2.6)} ${esc(h)}</small>`).join('')}</span>
    <span class="pk-f"><span><span class="price"><small>${t('fromP')}</small> ${inr(tot)}</span><small>${t('forN')} ${paxLabel(p)} · ${inr(Math.round(tot / Math.max(1, p.pax[0] + p.pax[1])))} / person</small></span><span class="go" aria-hidden="true">${ic('arrow', 18, 2.2)}</span></span></span></button>`; };
const NORTH = ['RAN', 'DIG', 'MAY', 'BAR', 'LON'];
function tourList() { const f = S.tf; return PKGS.filter(p => (f.n === 'all' || (f.n === 's' ? p.nights <= 3 : f.n === 'l' ? p.nights >= 7 : p.nights === +f.n)) && (f.tag === 'all' || (f.tag === 'atp' ? !p.mk : p.mk && p.tag === f.tag))
    && (f.isl === 'all' || route(p).some(([z]) => f.isl === 'north' ? NORTH.includes(z) : z === f.isl))).sort((a, b) => a.nights - b.nights || (TOURPF[a.id] || 0) - (TOURPF[b.id] || 0)); }
vPkgs = function () { const f = S.tf; const list = tourList(); const chip = (k, v, l) => `<button class="chip" data-a="tf" data-k="${k}" data-v="${v}" aria-pressed="${String(f[k]) === String(v)}">${l}</button>`;
  const tags = [...new Set(PKGS.filter(p => p.mk).map(p => p.tag))];
  return {title:t('pkgH'), body:`<div class="wrap"><div class="sec"><div class="sechd"><h2>${t('pkgH')}</h2><span class="sub">${list.length} of ${PKGS.length}</span></div><p class="note" style="margin-top:-8px;max-width:70ch">${t('pkgS')} Prices are for two adults on standard dates and update when you set yours.</p>
    <div class="lx-filters"><div class="chips">${[['all', 'Any length'], ['s', '2 to 3 nights'], ['4', '4 nights'], ['5', '5 nights'], ['6', '6 nights'], ['l', '7 nights or more']].map(([v, l]) => chip('n', v, l)).join('')}</div>
      <div class="chips">${chip('tag', 'all', 'Every style')}${chip('tag', 'atp', 'ATP signature')}${tags.map(g => chip('tag', g, g)).join('')}</div>
      <div class="chips">${chip('isl', 'all', 'Any islands')}${chip('isl', 'HAV', 'With Havelock')}${chip('isl', 'NEI', 'With Neil')}${chip('isl', 'north', 'North Andaman')}</div></div>
    <div class="pkgrid">${list.slice(0, f.show).map(p => pkgCard(p, true)).join('') || `<p class="note">No tour matches these filters.</p>`}</div>
    ${list.length > f.show ? `<div style="text-align:center;margin-top:18px"><button class="btn ghost" data-a="tfmore">Show ${Math.min(18, list.length - f.show)} more</button></div>` : ''}
    <div class="lx-cta"><div><b>Nothing fits exactly?</b><span>Give your dates and get four complete itineraries built around your flights.</span></div><button class="btn primary" data-a="go" data-v="gen">Build my itinerary ${ic('arrow', 18, 2.2)}</button></div></div></div>`}; };

/* ---------- itinerary generator: several complete trips from one set of dates ---------- */
const GSTYLES = [{k:'classic', n:'The classic', d:'The route most Andaman trips follow: heritage in Port Blair, then Havelock and Neil.'}, {k:'beach', n:'Slow beaches', d:'One long stay on Havelock. Fewer hotel changes, more time on the sand.'},
  {k:'active', n:'Active', d:'A first dive, reef snorkelling and a sunset paddle built into the days.'}, {k:'explore', n:'Explorer', d:'Extra time around Port Blair for Ross Island, North Bay or the Baratang caves.'}];
const LEGT = {'PBL>HAV':'07:30', 'PBL>NEI':'08:00', 'HAV>NEI':'10:00', 'NEI>HAV':'10:00', 'HAV>PBL':'14:30', 'NEI>PBL':'15:30'};
/* ---------- "made for you": nights are split by what the traveller wants ----------
   Each island gives a little less with every extra night (diminishing returns), and every hotel change costs something.
   value(island, nights) = Σ_j  (appeal · wants) × decay^j      total = Σ value − moves × cost
   Every split of the nights over Port Blair → Havelock → Neil → Port Blair is scored; the best one wins.
   The first and last night stay in Port Blair (flights), as in every plan we sell. */
const LIKES = [['beach', 'Beaches'], ['sea', 'Underwater'], ['history', 'History'], ['nature', 'Nature'], ['easy', 'Take it slow']];
const MINE = {k:'mine', n:'Made for you', d:'Nights split across the islands by what you told us you want most.'};
const APPEAL = {PBL:{beach:.25, sea:.35, history:1, nature:.6}, HAV:{beach:1, sea:1, history:.1, nature:.6}, NEI:{beach:.8, sea:.55, history:.1, nature:.7}};
const DECAY = {PBL:.55, HAV:.78, NEI:.5};
function optSegs(n, likes) { n = Math.max(1, Math.min(12, n)); if (n <= 2) return [['PBL', n]];
  const want = k => likes.includes(k) ? 1 : (likes.filter(x => x !== 'easy').length ? .25 : .5); const easy = likes.includes('easy');
  const per = z => ['beach', 'sea', 'history', 'nature'].reduce((s, k) => s + APPEAL[z][k] * want(k), 0);
  const val = (z, k) => { let s = 0; for (let j = 0; j < k; j++) s += per(z) * Math.pow(DECAY[z], j); return s; };
  const moveCost = easy ? .9 : .45; let best = null;
  for (let h = 0; h <= n - 2; h++) for (let ne = 0; ne <= Math.min(2, n - 2 - h); ne++) { const pb = n - h - ne; if (pb < 2) continue;
    if (h === 1 && n > 3) continue; if (ne && !h) continue; if (ne && n < 5) continue;       // one night on Havelock is a rush; Neil comes after Havelock
    const moves = (h ? 1 : 0) + (ne ? 1 : 0); const score = val('PBL', pb) + val('HAV', h) + val('NEI', ne) - moves * moveCost;
    if (!best || score > best.score + 1e-9) best = {score, h, ne, pb}; }
  const {h, ne, pb} = best; if (!h) return [['PBL', n]];
  return [['PBL', 1], ['HAV', h]].concat(ne ? [['NEI', ne]] : [], [['PBL', pb - 1]]); }
/* which set of activities goes with those wants */
function likeStyle(likes) { if (likes.includes('sea')) return 'active'; if (likes.includes('history') || likes.includes('nature')) return likes.includes('beach') ? 'classic' : 'explore'; if (likes.includes('beach') || likes.includes('easy')) return 'beach'; return 'classic'; }
function genSegs(n, style, early) {
  if (n <= 1) return [['PBL', 1]];
  // every generated itinerary starts and ends with a Port Blair night (owner's rule); shapes follow the market's most common routes
  if (style === 'beach') return n === 2 ? [['PBL', 2]] : n <= 5 ? [['PBL', 1], ['HAV', n - 2], ['PBL', 1]] : [['PBL', 1], ['HAV', Math.min(4, n - 3)], ['NEI', 1], ['PBL', n - 2 - Math.min(4, n - 3)]];
  if (style === 'explore') { if (n <= 3) return [['PBL', n]]; const nei = n >= 9 ? 2 : n >= 6 ? 1 : 0; return [['PBL', 2], ['HAV', n - 3 - nei]].concat(nei ? [['NEI', nei]] : [], [['PBL', 1]]); }
  if (n === 2) return [['PBL', 2]]; if (n === 3) return [['PBL', 1], ['HAV', 1], ['PBL', 1]]; if (n === 4) return [['PBL', 1], ['HAV', 2], ['PBL', 1]];
  if (n <= 6) { const nei = 1; return [['PBL', 1], ['HAV', n - 2 - nei], ['NEI', nei], ['PBL', 1]]; }
  const hav = n >= 8 ? 3 : 2, nei = n >= 9 ? 2 : 1; return [['PBL', 1], ['HAV', hav], ['NEI', nei], ['PBL', n - 1 - hav - nei]];   // market: PB1 HAV2 NEI1 PB3 for 7 nights
}
function genSpec(n, style, tier) {
  const fi = flightIn(); const early = !!(fi && tm(fi.arr) <= 690); n = Math.max(1, Math.min(12, n));
  const segs = style === 'mine' ? optSegs(n, S.g.likes || []) : genSegs(n, style, early); const as = style === 'mine' ? likeStyle(S.g.likes || []) : style;
  const plan = []; let day = 0; const used = new Set(); const start0 = pkgStart(); const moonPoor = (id, d) => RULES.some(r => r.t === 'MOON_DEPENDENT' && inList(r.a, id)) && NAT[addD(start0, d)] && /^Poor/i.test(NAT[addD(start0, d)].bio || '');
  const act = (id, d, tt) => { let ids = [].concat(id);
    if (S.pax.sen) ids = ids.filter(x => !ACT[x] || (ACT[x].tags || []).includes('sen')); if (!ids.length) return;              // senior-friendly picks only
    if (ids.length === 1 && moonPoor(ids[0], d)) { if (ids[0] === 'ACV-KAYAK-HAV-NIGHT') ids = ['ACV-KAYAK-HAV-SUNSET']; else return; }   // no glow-in-the-water trips on bright-moon nights
    const k = ids[0]; if (used.has(k)) return; used.add(k); const v = ids.length === 1 ? ids[0] : ids; plan.push(tt ? ['act', v, d, tt] : ['act', v, d]); };
  const SHOW = ['ACV-SHOW-LS-HIN', 'ACV-SHOW-LS-ENG'], JAIL = ['ENT-CELLULAR-JAIL', 'ENT-CORBYNS'];
  segs.forEach(([z, k], i) => { const prev = i ? segs[i - 1][0] : null; const next = segs[i + 1] ? segs[i + 1][0] : null;
    if (i === 0 && z !== 'PBL') plan.push(['ferry', 'PBL', z, 0, '14:00']);
    if (i > 0) { if (prev === 'NEI' && segs[i - 1][1] === 1) act('ACV-NATBRIDGE-NEI', day, '08:00'); if (prev === 'HAV' && z === 'PBL' && segs[i - 1][1] === 1) act('ACV-BOAT-ELEPH', day); plan.push(['ferry', prev, z, day, LEGT[prev + '>' + z] || '10:00']); }
    plan.push(['stay', z, day, k, tier]);
    for (let j = 0; j < k; j++) { const d = day + j; const arrive = j === 0;
      if (z === 'PBL') { if (i === 0 && arrive) { act(JAIL, d, '14:00'); act(SHOW, d); }
        else if (arrive) { if (!used.has('ACV-SHOW-LS-HIN')) act(SHOW, d); }
        else { const pool = as === 'explore' ? ['ACV-BOAT-ROSSNB', 'ACV-TOUR-BARATANG', 'MARINE'] : ['ACV-BOAT-ROSSNB', 'MARINE', 'ACV-TOUR-BARATANG']; const pick = pool.find(x => !used.has(x)); if (pick) act(pick, d); } }
      if (z === 'HAV') { if (arrive) { if (i > 0) act('ENT-RADHANAGAR', d, '15:00'); }
        else if (j === 1) { act('ACV-BOAT-ELEPH', d); if (as === 'active') act('ACV-SNK-ELEPH-STD', d, '10:00'); if (i === 0) act('ENT-RADHANAGAR', d, '15:30'); else if (as === 'active') act('ACV-KAYAK-HAV-SUNSET', d); else act('ENT-KALAPATHAR', d, '15:00'); }
        else if (j === 2) { if (as === 'active') act('ACV-DSD-HAV-SHORE', d, '09:00'); else if (as === 'beach') act('ENT-VIJAYNAGAR', d, '10:00'); else act('ACV-KAYAK-HAV-MANGROVE', d); if (i === 0 || as === 'beach') act('ENT-RADHANAGAR', d, '15:00'); }
        else if (j === 3 && as === 'active') act('ACV-KAYAK-HAV-NIGHT', d); }
      if (z === 'NEI') { if (arrive) { act('ENT-BHARATPUR', d, '13:30'); act('ENT-LAXMANPUR', d, '15:30'); if (as !== 'active') act('ACV-STARGAZE-NEI', d); }
        else if (j === 1) { act('ACV-NATBRIDGE-NEI', d, '08:00'); if (as === 'active') act('ACV-SNK-NEI-STD', d, '10:30'); } } }
    day += k; });
  const key = {cab:0, ferry:0, stay:1, act:2}; plan.sort((a, b) => (a[0] === 'ferry' ? a[3] : a[2]) - (b[0] === 'ferry' ? b[3] : b[2]) || key[a[0]] - key[b[0]]);
  const st = GSTYLES.find(x => x.k === style) || MINE; const z = segs.slice().sort((a, b) => (b[0] !== 'PBL') - (a[0] !== 'PBL') || b[1] - a[1])[0][0];
  return {id:`G-${style}${style === 'mine' ? (S.g.likes || []).join('') : ''}-${n}-${tier}-${S.pax.adults}-${S.pax.kids}-${early ? 1 : 0}`, n:st.n, hi:st.n, tag:st.n, z, pax:[S.pax.adults, S.pax.kids], ages:S.pax.ages || [], sen:!!S.pax.sen, nights:n, tier, hl:[], plan, style};
}
const genNights = () => S.win && !S.datesAssumed ? Math.max(1, daysBetween(S.win.start, S.win.end)) : S.g.n;
let GENC = {};
function genOptions() { const n = genNights(); const out = [];
  ((S.g.likes || []).length ? [MINE] : []).concat(GSTYLES).forEach(st => { const p = genSpec(n, st.k, S.g.tier); if (out.some(o => JSON.stringify(o.p.plan) === JSON.stringify(p.plan))) return; let pr = null; try { pr = pkgPreview(p); } catch (e) { console.error(e); } if (pr) { GENC[p.id] = {p, pr}; out.push({st, p, pr}); } });
  return out; }
const itemsHL = items => { const seen = new Set(); const out = []; items.filter(i => i.kind === 'act').forEach(i => { const a = ACT[i.ref]; if (!a || a.fam === 'Snorkelling' && seen.has('snk')) return; const nm = shortName(a); if (!seen.has(nm)) { seen.add(nm); out.push(nm); } }); return out; };
function dayLines(items, start, nights) { const out = [];
  for (let d = 0; d <= nights; d++) { const date = addD(start, d); const L = [];
    items.filter(i => i.date === date).slice().sort((a, b) => (a.kind === 'ferry' ? SAIL[a.ref].dep : a.t || '12:00').localeCompare(b.kind === 'ferry' ? SAIL[b.ref].dep : b.t || '12:00')).forEach(i => {
      if (i.kind === 'ferry') { const s = SAIL[i.ref]; L.push(`${s.dep} ferry to ${ZN[s.to].name}`); } else if (i.kind === 'act') L.push(`${i.t || ''} ${shortName(ACT[i.ref])}`.trim()); else if (i.kind === 'stay') L.push(`Check in, ${HOT[i.ref].n}`); });
    const cabs = items.filter(i => i.date === date && i.kind === 'cab').length; out.push({d, date, L, cabs}); }
  return out; }
function vGen() { const n = genNights(); const dated = S.win && !S.datesAssumed; const fi = flightIn(), fo = flightOut(); const opts = genOptions(); const start = pkgStart();
  const card = ({st, p, pr}) => { const hl = itemsHL(pr.items).slice(0, 5); const cnt = k => pr.items.filter(i => i.kind === k).length; const open = S.g.open === p.id;
    return `<article class="lx-opt" style="--zc:${ZC(p.z)}"><div class="lx-opt-art">${art(p.z, null, 'gen' + (st.k === 'mine' ? 'classic' : st.k), {tod:st.k === 'beach' ? 'dusk' : st.k === 'active' ? 'day' : 'dawn'})}<span class="lx-badge">${n} nights · ${n + 1} days</span></div>
      <div class="lx-opt-b"><span class="eyebrow">${esc(S.g.tier)} stays</span><h3>${esc(st.n)}</h3><p>${esc(st.d)}</p>
        <div class="pk-r">${route(p).map(([z, k]) => `<i style="--zc:${ZC(z)}">${ZN[z].name} ${k}N</i>`).join('<span aria-hidden="true">→</span>')}</div>
        <ul class="lx-hl">${hl.map(h => `<li>${ic('check', 13, 2.6)} ${esc(h)}</li>`).join('')}</ul>
        <div class="lx-inc">${cnt('stay')} stay${cnt('stay') > 1 ? 's' : ''} · ${cnt('ferry')} ferr${cnt('ferry') === 1 ? 'y' : 'ies'} · ${cnt('cab')} transfers · ${cnt('act')} things to do${pr.hard ? ` · <span style="color:var(--bad)">${pr.hard} to review</span>` : ''}</div>
        <button class="link" data-a="genopen" data-id="${p.id}" aria-expanded="${open}">${open ? 'Hide' : 'See'} day by day</button>
        ${open ? `<ol class="lx-days">${dayLines(pr.items, pr.start, n).map(x => `<li><b>Day ${x.d + 1}</b><span>${x.L.map(esc).join(' · ') || (x.d === n ? 'Transfer to the airport' : 'At leisure')}${x.cabs ? ` <em>${x.cabs} transfer${x.cabs > 1 ? 's' : ''}</em>` : ''}</span></li>`).join('')}</ol>` : ''}
        <div class="lx-opt-f"><span><span class="price">${inr(pr.total)}</span><small>${inr(pr.pp)} per person · incl. GST</small></span><span class="lx-btns"><button class="btn ghost sm" data-a="gensave" data-id="${p.id}">Save</button><button class="btn primary sm" data-a="genuse" data-id="${p.id}">Use this ${ic('arrow', 16, 2.4)}</button></span></div></div></article>`; };
  return {title:'Plan my trip for me', body:`<div class="wrap"><div class="sec"><div class="sechd"><h2>Your trip, four ways</h2><span class="sub">${fD(start)} to ${fD(addD(start, n))}</span></div>
    <p class="note" style="margin-top:-8px;max-width:70ch">Each one is a full trip: rooms, ferries, every cab and the sightseeing, timed around ${fi ? `your ${fi.arr} landing` : 'a morning arrival'}${fo ? ` and ${fo.dep} departure` : ''}. Save the ones you like and compare them later.</p>
    <div class="lx-genbar"><button class="st-f" data-a="dates"><span class="sti">${ic('cal', 20)}</span><span><small>Dates, flights and travellers</small><b>${dated ? `${fD(S.win.start)} – ${fD(S.win.end)}` : 'Add dates and flights'} · ${paxTxt()}</b></span></button>
      ${dated ? '' : `<div class="lx-nights"><small>Nights</small><span class="stepper"><button data-a="gn" data-d="-1" aria-label="Fewer nights">−</button><span>${n}</span><button data-a="gn" data-d="1" aria-label="More nights">+</button></span></div>`}
      <div class="lx-likes"><small>What do you want most? Pick any</small><div class="chips" role="group" aria-label="What you want most">${LIKES.map(([k, l]) => `<button class="chip" data-a="glike" data-v="${k}" aria-pressed="${(S.g.likes || []).includes(k)}">${l}</button>`).join('')}</div></div>
      <div class="chips" role="group" aria-label="Hotel tier">${['Budget', 'Standard', 'Deluxe', 'Premium', 'Luxury'].map(x => `<button class="chip" data-a="gtier" data-v="${x}" aria-pressed="${S.g.tier === x}">${x}</button>`).join('')}</div></div>
    ${fi ? '' : `<p class="note lx-tip">${ic('bulb', 15)} Add your flights and the first and last day are planned around them: an early landing can go straight to Havelock, a late one keeps the evening light.</p>`}
    <div class="lx-opts">${opts.map(card).join('')}</div>
    <div class="lx-cta"><div><b>Rather pick a finished trip?</b><span>${PKGS.length} planned trips, from 2 to 11 nights.</span></div><button class="btn ghost" data-a="go" data-v="pkgs">See planned trips</button></div></div></div>`}; }
function useGen(id) { const g = GENC[id]; if (!g) return; stashCurrent(); const p = g.p; const start = pkgStart(); const assumed = !(S.win && !S.datesAssumed);
  S.cart = []; S.seq = 1; S.dismissed = {}; S.win = {start, end:addD(start, p.nights)}; S.datesAssumed = assumed; if (assumed) { S.fin = null; S.fout = null; } else { if (S.fin) S.fin.date = start; if (S.fout) S.fout.date = S.win.end; }
  buildPkg(p, start); S.pkg = null; S.tripId = null; S.tripName = `${p.n} · ${p.nights} nights`; S.sheet = null; S.stack = [{v:'trip'}]; render(true); toast(`${p.n} is now your trip. Change anything you like.`); }

/* ---------- saved trips (this device) ---------- */
function tripRoute(cart) { const seq = []; cart.filter(i => i.kind === 'stay').sort((a, b) => a.date.localeCompare(b.date)).forEach(i => { const z = HOT[i.ref].z; const L = seq[seq.length - 1]; if (L && L[0] === z) L[1] += i.nights; else seq.push([z, i.nights]); }); return seq; }
function snapTrip(name) { const r = tripRoute(S.cart); return {id:S.tripId || 'tr' + Date.now().toString(36), name:name || S.tripName || (r.length ? r.map(([z, n]) => `${ZN[z].name} ${n}N`).join(', ') : 'Draft itinerary'), at:Date.now(), cart:clone(S.cart), seq:S.seq, pax:clone(S.pax), win:S.win ? clone(S.win) : null, fin:S.fin ? clone(S.fin) : null, fout:S.fout ? clone(S.fout) : null, datesAssumed:!!S.datesAssumed, total:total(), route:r, n:S.cart.length}; }
function saveCurrent(name) { if (!S.cart.length) return null; syncTrip(); const s = snapTrip(name); const i = S.trips.findIndex(x => x.id === s.id); if (i >= 0) S.trips[i] = s; else S.trips.unshift(s); S.tripId = s.id; S.tripName = s.name; save(); return s; }
function stashCurrent() { if (S.cart.length) saveCurrent(); }   // nothing is ever lost when another itinerary is opened
function openTrip(id) { const x = S.trips.find(q => q.id === id); if (!x) return; if (S.tripId !== id) stashCurrent(); S.cart = clone(x.cart).filter(it => (it.kind === 'stay' && HOT[it.ref]) || (it.kind === 'ferry' && SAIL[it.ref]) || (it.kind === 'act' && ACT[it.ref]) || (it.kind === 'cab' && ROUTE[it.ref]) || (it.kind === 'rent' && RENT[it.ref]));
  S.seq = x.seq || 999; S.pax = clone(x.pax); S.win = x.win ? clone(x.win) : null; S.fin = x.fin ? clone(x.fin) : null; S.fout = x.fout ? clone(x.fout) : null; S.datesAssumed = !!x.datesAssumed; S.dismissed = {}; S.pkg = null; S.tripId = x.id; S.tripName = x.name; S.stack = [{v:'trip'}]; render(true); }
function saveGen(id) { const g = GENC[id]; if (!g) return; const p = g.p, pr = g.pr; const keep = S.win && !S.datesAssumed;
  S.trips.unshift({id:'tr' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name:`${p.n} · ${p.nights} nights · ${S.g.tier}`, at:Date.now(), cart:clone(pr.items), seq:pr.items.length + 5, pax:clone(S.pax), win:{start:pr.start, end:pr.end}, fin:keep && S.fin ? {no:S.fin.no, date:pr.start} : null, fout:keep && S.fout ? {no:S.fout.no, date:pr.end} : null, datesAssumed:!keep, total:pr.total, route:tripRoute(pr.items), n:pr.items.length}); save(); }
const routeChips = r => r.length ? `<div class="pk-r">${r.map(([z, n]) => `<i style="--zc:${ZC(z)}">${ZN[z].name} ${n}N</i>`).join('<span aria-hidden="true">→</span>')}</div>` : '';

/* ---------- My trips: confirmed itinerary with vouchers, the plan in progress, saved itineraries ---------- */
function runSheet() { const list = S.booked.slice().sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)); const first = list[0].date; const dleft = daysBetween(TODAY, first); const by = {}; list.forEach(p => (by[p.date] = by[p.date] || []).push(p));
  return `<div class="lx-conf"><div class="lx-conf-h"><span class="tag ok">${ic('check', 12, 2.6)} Paid and confirmed</span><h2>${dleft > 0 ? `Your trip begins in ${dleft} day${dleft > 1 ? 's' : ''}` : dleft === 0 ? 'Your trip begins today' : 'Your confirmed trip'}</h2>
      <p>${list.length} confirmed services from ${fD(first)} to ${fD(list[list.length - 1].date)}. Each line is its own voucher: tap it for the QR code the operator scans. Everything here opens without a network.</p>
      <div class="lx-btns"><button class="btn ghost sm" data-a="copyrun">${ic('ticket', 16)} Copy itinerary</button><button class="btn ghost sm" data-a="help">${ic('chat', 16)} Help on WhatsApp</button></div></div>
    ${Object.keys(by).map((d, n) => `<section class="lx-rday"><header><b>${fD(d)}</b><span>${by[d].length} voucher${by[d].length > 1 ? 's' : ''}</span></header>${by[d].map(p => `<button class="lx-run" data-a="go" data-v="pass" data-code="${p.code}" style="--zc:${ZC(p.zone)}"><span class="mono t">${p.time}</span><span class="b"><b>${esc(p.title)}</b><small>${esc(p.sub)}</small><small class="rep">${esc(p.report)}</small></span><span class="c"><span class="tag ${S.scans[p.code] ? '' : 'ok'}">${S.scans[p.code] ? 'Used' : 'Confirmed'}</span><span class="mono">${p.code}</span></span></button>`).join('')}</section>`).join('')}
    <div class="lx-note">${ic('bulb', 16)}<span><b>Before you travel</b>Carry a government photo ID for every traveller: ferry operators check it at boarding. Reporting times are printed on each voucher.</span></div></div>`; }
vPasses = function () { const hasPlan = S.cart.length > 0; const others = S.trips.filter(x => x.id !== S.tripId || !hasPlan); const R = hasPlan ? run(S.cart) : null;
  const saved = x => `<article class="lx-trip"><button class="lx-trip-m" data-a="tropen" data-id="${x.id}"><b>${esc(x.name)}</b>${routeChips(x.route || [])}<small>${x.win ? `${fD(x.win.start)} – ${fD(x.win.end)} · ` : ''}${x.n} items · saved ${fD(new Date(x.at + 5.5 * 3600e3).toISOString().slice(0, 10))}</small></button><div class="lx-trip-f"><span class="price">${inr(x.total || 0)}</span><span class="lx-btns"><button class="btn ghost sm" data-a="trdup" data-id="${x.id}">Duplicate</button><button class="btn ghost sm" data-a="trdel" data-id="${x.id}" aria-label="Delete ${esc(x.name)}">${ic('x', 16, 2.2)}</button><button class="btn sm" data-a="tropen" data-id="${x.id}">Open</button></span></div></article>`;
  const empty = !S.booked.length && !hasPlan && !S.trips.length;
  return {title:t('passes'), body:`<div class="wrap"><div class="sec"><div class="sechd"><h2>${t('passes')}</h2><span class="sub">Kept on this device</span></div>
    ${empty ? `<div class="empty"><span class="art">${art('HAV', null, 'ENT-RADHANAGAR', {tod:'dawn'})}</span><h2>No trips yet</h2><p>Let us plan one around your dates, or start from a trip we have planned. Saved trips and your booking vouchers show up here.</p><div class="lx-btns" style="justify-content:center"><button class="btn primary" data-a="go" data-v="gen">Build my itinerary ${ic('arrow', 18, 2.2)}</button><button class="btn ghost" data-a="go" data-v="pkgs">See planned trips</button></div></div>` : ''}
    ${S.booked.length ? runSheet() : ''}
    ${hasPlan ? `<h3 class="lx-h3">Plan in progress</h3><article class="lx-trip cur"><button class="lx-trip-m" data-a="tab" data-v="trip"><b>${esc(S.tripName || 'Current itinerary')}</b>${routeChips(tripRoute(S.cart))}<small>${S.trip ? `${fD(S.trip.start)} – ${fD(S.trip.end)} · ` : ''}${S.cart.length} items · ${R.hard ? R.hard + ' to fix' : 'everything connects'}</small></button><div class="lx-trip-f"><span class="price">${inr(total())}</span><span class="lx-btns"><button class="btn ghost sm" data-a="trsave">${S.tripId ? 'Saved' : 'Save'}</button><button class="btn ghost sm" data-a="trcopy">Save a copy</button><button class="btn sm" data-a="tab" data-v="trip">Open planner</button></span></div></article>` : ''}
    ${others.length ? `<h3 class="lx-h3">Saved itineraries <span>${others.length}</span></h3><div class="lx-trips">${others.map(saved).join('')}</div>` : ''}
    ${others.length + (hasPlan ? 1 : 0) >= 2 ? compareTrips(hasPlan ? [Object.assign(snapTrip(), {name:'Current plan'})].concat(others.slice(0, 2)) : others.slice(0, 3)) : ''}
    ${empty ? '' : `<div class="lx-cta"><div><b>Compare another version</b><span>Generate four complete itineraries for the same dates, or start a blank plan. Your current plan is saved first.</span></div><span class="lx-btns"><button class="btn ghost" data-a="trnew">New blank plan</button><button class="btn primary" data-a="go" data-v="gen">Build options ${ic('arrow', 18, 2.2)}</button></span></div>`}
  </div></div>`}; };
vPaid = function (v) {
  if (v.processing) return {title:'Payment', body:`<div class="wrap"><div class="empty"><div class="spin"></div><h2>Confirming with partners…</h2><p>Sending each booking to its operator.</p></div></div>`};
  return {title:'Booked', body:`<div class="wrap"><div class="empty"><span class="art">${art('HAV', null, 'ENT-RADHANAGAR', {tod:'dusk'})}</span><span class="tag ok">${ic('check', 12, 2.6)} Paid and confirmed</span><h2>Booking confirmed</h2><p>Your day-by-day itinerary with ${S.booked.length} vouchers is saved on this device and opens offline. A copy has been sent on WhatsApp.</p><div class="lx-btns" style="justify-content:center"><button class="btn primary" data-a="tab" data-v="passes">${t('viewPasses')} ${ic('arrow', 18, 2.2)}</button><button class="btn ghost" data-a="tab" data-v="home">Keep exploring</button></div></div></div>`}; };
function runText() { const list = S.booked.slice().sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)); let last = ''; return 'Andaman Travel Planner: confirmed itinerary\n' + list.map(p => (p.date !== last ? `\n${fD(last = p.date)}\n` : '') + `${p.time}  ${p.title} (${p.code})`).join('\n'); }

/* ---------- complete my trip: what is required first, then what fits ---------- */
function tripNeeds(R) { if (!S.trip || !S.cart.length) return {nights:0, cabs:0, gaps:0}; const N = nDays(); let nights = 0;
  for (let n = 0; n < N - 1; n++) { const d = addD(S.trip.start, n); if (!S.cart.some(i => i.kind === 'stay' && i.date <= d && addD(i.date, i.nights) > d) && !S.cart.some(i => (i.kind === 'ferry' && SAIL[i.ref] && SAIL[i.ref].nxt && i.date === d) || (i.kind === 'act' && ACT[i.ref] && ACT[i.ref].slot === 'Overnight' && i.date === d))) nights++; }   // a night on an overnight ship needs no hotel
  const cabs = Object.values(R.by || {}).flat().concat((R.anchors && R.anchors.in) || [], (R.anchors && R.anchors.out) || []).filter(a => a && a.sev === 'soft' && a.fix && a.fix[0] && a.fix[0].act === 'quickadd' && a.fix[0].kind === 'cab').length;
  const gaps = Object.values(R.day || {}).flat().filter(x => x && x.kind === 'gap' && !x.skipped).length; return {nights, cabs, gaps, days:N}; }
const tripTier = () => { const t0 = S.cart.filter(i => i.kind === 'stay').map(i => HOT[i.ref].t).filter(Boolean)[0]; return t0 || S.g.tier || 'Standard'; };
function addCabs() { let n = 0; for (let k = 0; k < 3; k++) { const R = run(S.cart); const fx = []; Object.values(R.by).flat().concat(R.anchors.in, R.anchors.out).forEach(a => { if (a.sev === 'soft' && a.fix && a.fix[0] && a.fix[0].act === 'quickadd' && a.fix[0].kind === 'cab') fx.push(a.fix.find(x => x.label.startsWith('Both')) || a.fix[0]); }); if (!fx.length) break; fx.forEach(f => { quickAdd(f); n++; }); } return n; }
/* completeTrip: see v4 (anchor-first) */
/* days that have nothing planned get one day plan or half-day plan (or the single best stop); days that already have a plan are left alone */
function fillEmptyDays() { let guard = 0; const skip = {};
  const pace = S.pace || 'balanced'; const added = {};
  while (guard++ < (pace === 'packed' ? 24 : 12)) { syncTrip(); IDEAS_SEEN = new Set(); const R = run(S.cart); let did = false;
    outer: for (let n = 0; n < nDays(); n++) { const date = addD(S.trip.start, n); if ((pace !== 'packed' || (added[date] || 0) >= 2) && S.cart.some(i => i.kind === 'act' && i.date === date)) continue;
      for (const a of (R.day[n] || []).filter(x => x.kind === 'gap' && !x.skipped && !skip[date + x.at])) { const g = gapPicks(a, date); const p = pace === 'relaxed' ? g.blocks.find(b => b.label === 'Half-day plan') : g.blocks[0];
        if (p) { p.cart.forEach(c => addItem(Object.assign({}, c), true)); addNeededCabs(); added[date] = (added[date] || 0) + 1; did = true; break outer; }
        const s = g.pick.find(c => !c.eve); if (s && !g.leaving) { addItem({kind:'act', ref:s.x.id, date, t:s.slot, qty:1, pa:S.pax.adults, pk:kidsOk(s.x)}, true); added[date] = (added[date] || 0) + 1; did = true; break outer; }
        skip[date + a.at] = 1; } }
    if (!did) break; }
  syncTrip(); }
function tripAssist(R, freeN, hardN) { if (!S.cart.length) return ''; const rc = reachCard(R); if (rc) return rc; if (hardN) return ''; const nd = tripNeeds(R); if (!nd.nights && !nd.cabs && !nd.gaps) return '';
  const parts = []; if (nd.nights) parts.push(`${nd.nights} night${nd.nights > 1 ? 's' : ''} without a stay`); if (nd.cabs) parts.push(`${nd.cabs} transfer${nd.cabs > 1 ? 's' : ''} not arranged`); if (nd.gaps) parts.push(`${nd.gaps} free ${nd.gaps > 1 ? 'windows' : 'window'}`);
  const fi = flightIn(); const need = nd.nights || nd.cabs;
  return `<div class="card planall lx-assist"><div style="display:flex;gap:12px;align-items:flex-start"><span class="hn">${ic('spark', 22, 1.9)}</span><div style="flex:1;min-width:0"><b>${need ? 'This trip is not complete yet' : 'Fill your free time'}</b><div class="muted" style="font-size:14.5px">${parts.join(' · ')}. One tap adds ${need ? 'the stays, ferries and door-to-door transfers it needs, then ' : ''}what most itineraries do on each day${fi ? `, timed around your ${fi.arr} landing` : ''}. Undo at any time.</div></div></div>
    <div class="lx-btns"><button class="btn primary" data-a="complete">${ic('spark', 18, 2)} ${need ? 'Complete my trip' : 'Plan my free time'}</button><button class="btn ghost" data-a="go" data-v="gen">See other itineraries</button></div></div>`; }
function tripTools() { return S.cart.length ? `${paceCtl()}<div class="lx-tools"><button class="btn ghost sm" data-a="trsave">${ic('check', 15, 2.4)} ${S.tripId ? 'Save changes' : 'Save itinerary'}</button><button class="btn ghost sm" data-a="tab" data-v="passes">My trips${S.trips.length ? ` (${S.trips.length})` : ''}</button><button class="btn ghost sm" data-a="go" data-v="gen">Other options</button><a class="btn ghost sm" href="https://wa.me/?text=${encodeURIComponent(shareText())}" target="_blank" rel="noopener">${ic('chat', 15, 2)} Share on WhatsApp</a></div>` : ''; }

/* ---------- product page: how it runs, other ways to do it, and the day around it ---------- */
function actExtras(a, cfg) { if (!a) return ''; const out = [];
  if (a.steps && a.steps.length) out.push(`<div class="dsec"><h3>How it runs</h3><ol class="lx-steps">${a.steps.map(([tt, l]) => `<li>${tt ? `<span class="mono">${esc(tt.replace(/^0/, ''))}</span>` : '<span></span>'}<span>${esc(l)}</span></li>`).join('')}</ol><p class="policy">Typical timings. Your voucher shows the exact reporting time for your slot.</p></div>`);
  const alt = Object.values(ACT).filter(x => x.id !== a.id && shown(x) && ((x.fam === a.fam && x.z === a.z) || (x.n === a.n))).slice(0, 6);
  if (alt.length) out.push(`<div class="dsec"><h3>${a.fam === 'Places to visit' ? 'Also worth seeing nearby' : 'Other ways and times'}</h3><div class="lx-alts">${alt.map(x => { const u = actUnit(x, cfg.date || baseDate()); const sl = slotsFor(x); return `<button class="lx-alt" data-a="product" data-kind="act" data-id="${x.id}"><span class="th">${art(x.z, null, x.id)}</span><span><b>${esc(x.n)}</b><small>${esc(x.v || '')}</small><small>${ZN[x.z].name} · ${durTxt(x.d)} · ${sl.length > 1 ? `${sl[0]} to ${sl[sl.length - 1]}` : sl[0] || ''}</small></span><span class="price">${u ? inr(u) : u === 0 ? t('freeEntry') : t('onReq')}</span></button>`; }).join('')}</div></div>`);
  const bl = BLOCKS.filter(b => b.stops.some(s => [].concat(s.id).includes(a.id))).slice(0, 3);
  if (bl.length) out.push(`<div class="dsec"><h3>Make a day of it</h3><p class="policy" style="margin-top:-4px">Day and half-day plans that include this, with the order and timings worked out.</p><div class="lx-blks">${bl.map(b => blockTile(b)).join('')}</div></div>`);
  return out.join(''); }

/* ---------- home ---------- */
const ISLE_LINE = {PBL:'Heritage, museums and the gateway to every island', HAV:'Radhanagar, Elephant Beach and the best diving', NEI:'Quiet lagoons, the Natural Bridge and slow days', WAN:'Jolly Buoy and Red Skin marine park', BAR:'Limestone caves by mangrove creek', RAN:'Mangrove walks and turtle beaches', LON:'Lalaji Bay and a village without cars', MAY:'Avis Island and Karmatang', DIG:'Ross & Smith sandbar and Saddle Peak', LIT:'Waterfalls and surf at Butler Bay'};
vHome = function () {
  const w = S.win && !S.datesAssumed ? S.win : null; const hi = S.lang === 'hi'; const now = istNow(); const nd = NAT[now.iso] ? now.iso : TODAY; const nat = NAT[nd] || {};
  const h12 = s => { if (!s) return '—'; const m = tm(s), h = Math.floor(m / 60); return `${((h + 11) % 12) + 1}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`; };
  const rail = (cls, inner) => `<div class="railwrap"><button class="rail-btn prev" data-a="rail" data-d="-1" aria-label="Previous">${ic('back', 20, 2.4)}</button><div class="${cls}">${inner}</div><button class="rail-btn next" data-a="rail" data-d="1" aria-label="Next">${ic('back', 20, 2.4).replace('<svg', '<svg style="transform:scaleX(-1)"')}</button></div>`;
  const feat = PKGS.filter(p => !p.mk).slice(0, 4).concat(PKGS.filter(p => p.mk && [4, 5, 6].includes(p.nights)).filter((p, i) => i % 5 === 0).slice(0, 8));
  const entry = [['route', 'Ferries', 'data-a="go" data-v="route"'], ['bed', 'Stays', 'data-a="catgo" data-go="stay"'], ['car', 'Cabs', 'data-a="catgo" data-go="move"'], ['mask', 'Experiences', 'data-a="go" data-v="adv"'], ['trip', 'Tours', 'data-a="go" data-v="pkgs"']];
  return {title:null, body:`
  <section class="hero lx-hero" aria-label="Andaman Travel Planner">${heroArt()}
    <div class="hero-in wrap">
      <span class="eyebrow"><i></i>${hi ? 'पोर्ट ब्लेयर में अभी' : 'Port Blair'} · ${h12(hm(now.min))} · ${hi ? 'सूर्यास्त' : 'sunset'} ${h12(nat.ss)}</span>
      <h1>${hi ? 'अंडमान,<em>शुरू से अंत तक व्यवस्थित.</em>' : 'The Andamans,<em>without the guesswork.</em>'}</h1>
      <p>${t('heroP')}</p>
    </div>
  </section>
  <div class="wrap starter lx-starter">
    <nav class="lx-entry" aria-label="Book one thing">${entry.map(([i, l, at]) => `<button ${at}>${ic(i, 18, 1.9)}<span>${l}</span></button>`).join('')}</nav>
    <div class="starter-card">
      <button class="st-f" data-a="dates"><span class="sti">${ic('cal', 20)}</span><span><small>${hi ? 'कब और कौन' : 'Dates, flights and travellers'}</small><b class="${w ? '' : 'ph'}">${w ? `${fD(w.start)} – ${fD(w.end)} · ${paxTxt()}` : t('datesOpt')}</b></span></button>
      <span class="st-sep" aria-hidden="true"></span>
      <button class="st-f wide" data-a="go" data-v="search"><span class="sti">${ic('search', 20)}</span><span><small>${hi ? 'खोजें' : 'Find'}</small><b class="ph">${t('search')}</b></span></button>
      <button class="btn primary" data-a="go" data-v="gen">${hi ? 'यात्रा बनाएँ' : 'Plan my trip for me'} ${ic('arrow', 18, 2.4)}</button>
    </div>
    <div class="st-alt"><span>${ic('check', 15, 2.6)}Planning is free. Pay when you are sure</span><span>${ic('check', 15, 2.6)}Every ferry and check-in timed</span><span>${ic('check', 15, 2.6)}No surprise charges</span>${S.cart.length ? `<button class="link" data-a="tab" data-v="trip">Continue my trip · ${inr(total())}</button>` : `<button class="link" data-a="sample">Show me an example trip</button>`}</div>
  </div>
  <div class="wrap">
    <div class="sec"><div class="sechd"><h2>${t('whatNeed')}</h2><span class="sub">Add anything. We will show you what goes with it</span></div>${shortcuts()}</div>
    <div class="sec"><div class="sechd"><h2>${t('pkgH')}</h2><button class="link" data-a="go" data-v="pkgs">${t('seeAll')} ${PKGS.length}</button></div><p class="note" style="margin-top:-8px">Full trips from 2 to 11 nights. We have checked every ferry.</p>
      ${rail('pkgrail', feat.map(p => pkgCard(p)).join(''))}</div>
    <div class="sec">${blocksRail(null, null)}</div>
    <div class="sec advmod"><div class="sechd"><h2>${t('sig')}</h2><button class="link" data-a="go" data-v="adv">${t('seeAll')}</button></div><p class="note" style="margin-top:-8px">${t('advS')}</p>
      ${rail('sigrail', SIGNATURE.map(sigCard).join(''))}</div>
    <div class="sec"><div class="sechd"><h2>The islands</h2><span class="sub">Stays, cabs and things to do on each</span></div>
      <div class="lx-isles">${NS.map(x => `<button class="lx-isle" data-a="store" data-zone="${x}" style="--zc:${ZC(x)}"><span class="art">${art(x, null, x + 'hero', {tod:x === 'HAV' ? 'dusk' : x === 'NEI' ? 'dawn' : 'day'})}</span><span class="lx-isle-b"><b>${ZN[x].name}</b><small>${ISLE_LINE[x] || ''}</small><em>${D.hotels.filter(h => h.z === x).length} stays · ${D.acts.filter(a => a.z === x && shown(a)).length} experiences</em></span></button>`).join('')}</div></div>
    <div class="sec"><div class="sechd"><h2>Why trips booked here work</h2></div>
      <div class="lx-how">${[['route', 'One itinerary', 'Start with a ferry, a hotel or a single dive. Add the rest as you go; everything sits on one timeline.'], ['check', 'Checked as you build', `Reporting times, travel between places, opening hours and seasons are tested against ${RULES.length} island rules on every change.`], ['spark', 'Completed for you', `Stays, ferries and door-to-door transfers are suggested first, then the days are filled the way ${EVD.n || 89} real Andaman itineraries run them.`]].map(([i, h, p], n) => `<div><span class="n">${ic(i, 20, 1.9)}</span><b>${h}</b><p>${p}</p></div>`).join('')}</div>
      <div class="facts3">${[[BOOKABLE.length, 'sailings from operator timetables'], [PKGS.length, 'ready-made tours'], [D.hotels.length, 'stays across ten islands']].map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join('')}</div></div>
    <footer class="foot"><div style="display:flex;flex-direction:column;gap:10px;max-width:46ch"><span class="brand">${logoMark(34)}<span>Andaman<small>Travel Planner</small></span></span><span>Ferries, stays, transfers and experiences across the Andaman Islands, booked as one itinerary.</span></div>
      <div style="display:flex;flex-direction:column;gap:10px"><div class="foot-l"><button data-a="go" data-v="route">${t('cFerry')}</button><button data-a="go" data-v="pkgs">${t('pkgH')}</button><button data-a="go" data-v="gen">Build my itinerary</button><button data-a="help">WhatsApp help</button></div><span>© 2026 Andaman Travel Planner Private Limited · Sri Vijaya Puram (Port Blair)</span></div></footer>
  </div>`}; };

Object.assign(VIEWS, {home:vHome, pkgs:vPkgs, passes:vPasses, paid:vPaid, gen:vGen});
Object.assign(TABV, {gen:'explore'});

/* ---------- actions ---------- */
document.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (!el) return; const d = el.dataset;
  switch (d.a) {
    case 'tf': S.tf[d.k] = d.v; S.tf.show = 18; rerender(); break;
    case 'tfmore': S.tf.show += 18; rerender(); break;
    case 'gn': S.g.n = Math.max(1, Math.min(12, S.g.n + (+d.d))); rerender(); break;
    case 'gtier': S.g.tier = d.v; rerender(); break;
    case 'glike': { const L = S.g.likes || (S.g.likes = []); const i = L.indexOf(d.v); if (i >= 0) L.splice(i, 1); else L.push(d.v); L.sort(); rerender(); break; }
    case 'genopen': S.g.open = S.g.open === d.id ? null : d.id; rerender(); break;
    case 'genuse': useGen(d.id); break;
    case 'gensave': saveGen(d.id); rerender(); toast('Saved to My trips. Save other options to compare them.'); break;
    case 'trsave': { const s = saveCurrent(); rerender(); if (s) toast(`Saved as “${s.name}” in My trips`); break; }
    case 'trcopy': { if (!S.cart.length) break; syncTrip(); const s = snapTrip((S.tripName || 'Itinerary') + ' (copy)'); s.id = 'tr' + Date.now().toString(36) + 'c'; S.trips.unshift(s); save(); rerender(); toast('Copy saved'); break; }
    case 'tropen': openTrip(d.id); break;
    case 'trdup': { const x = S.trips.find(q => q.id === d.id); if (x) { const c = clone(x); c.id = 'tr' + Date.now().toString(36) + 'd'; c.name = x.name + ' (copy)'; c.at = Date.now(); S.trips.unshift(c); save(); rerender(); toast('Duplicated'); } break; }
    case 'trdel': { const i = S.trips.findIndex(q => q.id === d.id); if (i >= 0) { const x = S.trips.splice(i, 1)[0]; if (S.tripId === x.id) S.tripId = null; save(); rerender(); toast('Itinerary deleted'); } break; }
    case 'trnew': stashCurrent(); S.cart = []; S.seq = 1; S.dismissed = {}; S.tripId = null; S.tripName = ''; S.pkg = null; S.stack = [{v:'trip'}]; render(true); toast('New plan started. Your previous plan is in My trips.'); break;
    case 'complete': { const r = completeTrip(); rerender(); if (r && r.n) toastUndo(`Added ${[r.stay && `${r.stay} stay${r.stay > 1 ? 's' : ''}`, r.ferry && `${r.ferry} ferr${r.ferry > 1 ? 'ies' : 'y'}`, r.cab && `${r.cab} transfer${r.cab > 1 ? 's' : ''}`, r.act && `${r.act} experience${r.act > 1 ? 's' : ''}`].filter(Boolean).join(', ')}`); else toast('Nothing more to add for these dates'); break; }
    case 'copyrun': { const tx = runText(); try { navigator.clipboard.writeText(tx).then(() => toast('Itinerary copied'), () => toast('Copy is not available here')); } catch (er) { toast('Copy is not available here'); } break; }
  }
});
/* generated by comp/photos.py */
const PHOTO_CAP = {"i003": "Evening cruise boat", "i004": "Wreck dive", "i005": "Divers over a school of fish", "i006": "Turtle on the reef", "i007": "Coral garden", "i008": "Divers over a deep wreck", "i012": "Coach for airport, jetty and group transfers", "i014": "Andaman scops owl", "i015": "Andaman shama", "i019": "Andaman nightjar", "i021": "Black-backed dwarf kingfisher", "i022": "Ruddy kingfisher", "i027": "Black-naped terns", "i028": "Collared kingfisher · photo: Chanchal Yadav IAS", "i031": "Stork-billed kingfisher", "i032": "Andaman serpent eagle · photo: Gyana Sounder", "i037": "Narcondam hornbills · photo: Satyajit Halder", "i040": "Turtle and reef fish", "i041": "Diver by a coral pinnacle", "i042": "Barren Island glowing at night", "i043": "Barren Island, India’s only active volcano", "i044": "Catch of the day", "i045": "Camping by the shore at night", "i046": "Towed water rides", "i048": "Glass-bottom boat", "i049": "Forest trek", "i052": "Kayaking through the mangroves", "i053": "Stargazing under the Milky Way", "i054": "Parasailing", "i055": "Parasailing", "i060": "Sea walk", "i061": "Jet ski", "i062": "Underwater scooter", "i063": "Snorkelling", "i064": "Sofa ride", "i065": "Banana boat ride", "i066": "Wandoor Beach", "i067": "Shaded beach", "i069": "Quiet shoreline", "i070": "Sunset over the sea", "i071": "Cellular Jail and Port Blair harbour from the air", "i072": "Sunset over the harbour, Port Blair", "i073": "Boats at Chatham", "i079": "Sunset on a quiet beach", "i080": "Lalaji Bay", "i081": "Diglipur coast", "i082": "Butler Bay Beach, Little Andaman", "i083": "Harminder Bay, Little Andaman", "i084": "Rocky shore at low tide", "i085": "Coastline from above", "i086": "Cellular Jail lit up in the national colours", "i087": "A cell corridor, Cellular Jail", "i088": "Cellular Jail National Memorial", "i089": "Cellular Jail wings from above", "i090": "Light and sound show, Cellular Jail", "i092": "Ross Island (Netaji Subhas Chandra Bose Dweep) from the boat", "i093": "Sunset at Wandoor", "i094": "Whale skeleton, Samudrika", "i095": "Cellular Jail at night", "i096": "Museum gallery, Port Blair", "i097": "Science Centre, Port Blair", "i099": "Chatham Saw Mill gate", "i101": "Flag Point by the sea", "i103": "Clock tower, Aberdeen Bazaar, Port Blair", "i104": "Radhanagar Beach, Havelock", "i105": "Lalaji Bay from the air", "i106": "Vijaynagar Beach", "i107": "Sitapur shore", "i108": "Second World War bunker", "i109": "Waves at Kalapathar", "i110": "Still water at sunset", "i111": "Glass-bottom boats at Bharatpur", "i112": "Swaraj Dweep (Havelock) shore", "i113": "Snorkelling at Jolly Buoy", "i115": "Sea walk on the reef", "i116": "Cliff edge on the Munda Pahad trail", "i117": "Driftwood at Chidiya Tapu", "i118": "Tribes of the islands, Anthropological Museum", "i119": "The jail wings from the central tower", "i120": "Elephant Beach, Havelock", "i121": "Natural Bridge at dusk, Neil", "i123": "Coral display, Samudrika", "i126": "Forest Museum gallery", "i127": "Marine life gallery, Samudrika", "i128": "Butterfly collection", "i132": "Naval models, Samudrika", "i133": "Dusk over a quiet bay", "i135": "Boats in a mangrove creek", "i136": "Mangrove creek", "i137": "Dhani Nallah mangrove walk, Rangat", "i138": "Forest rest shelter", "i139": "Forest stream", "i140": "Forest trail, North Andaman", "i141": "Fields and hills, North Andaman", "i142": "Mud volcano", "i144": "Open sea", "i145": "Speedboat ride", "i146": "Rajiv Gandhi Water Sports Complex, Port Blair", "i147": "Ferry out at sea, seen from the jetty", "i148": "Giant trevally, game fishing", "i149": "Fishing boat", "i150": "Divers with a turtle", "i151": "Anemone on the reef", "i152": "Open sea under a passing shower", "i153": "Ferry at the jetty", "i154": "Discover Scuba Diving", "i155": "Hard corals", "i156": "Semi-submarine at North Bay", "i157": "North Bay shore", "i159": "Scooters for hire", "i160": "Mangrove creek boat, Baratang", "i161": "Through the mangroves to the limestone caves", "i162": "Barren Island erupting", "i163": "Barren Island", "i164": "Bharatpur Beach, Neil", "i165": "Bharatpur lagoon", "i166": "Butler Bay Beach", "i167": "Shade by Butler Bay", "i170": "Sunset at Chidiya Tapu", "i171": "Chidiya Tapu shore", "i172": "Cinque Island", "i173": "Sunset at Cinque Island", "i174": "Corbyn's Cove Beach", "i175": "Corbyn's Cove", "i176": "Corbyn's Cove shoreline", "i177": "Evening at Corbyn's Cove", "i178": "Beach shelter, Diglipur", "i179": "Ross & Smith Islands, Diglipur, joined by a sandbar", "i180": "Jet ski at Elephant Beach", "i181": "Elephant Beach", "i182": "Forest Museum, Haddo", "i183": "Woodcraft at the Forest Museum", "i184": "Chatham Saw Mill museum", "i185": "Chatham Island grounds", "i186": "Guitar Island, Long Island", "i187": "Mangrove tree at Guitar Island", "i188": "Japanese bunker, Corbyn’s Cove", "i190": "Jolly Buoy Island", "i191": "Jolly Buoy lagoon", "i192": "Kalapathar Beach, Havelock", "i193": "The black rocks of Kalapathar", "i194": "Kalipur Beach, Diglipur", "i195": "Kalipur at low tide", "i196": "Karmatang Beach, Mayabunder", "i197": "Karmatang, where turtles nest", "i198": "Lalaji Bay, Long Island", "i199": "Forest camp, Long Island", "i200": "Forest shelter at Lamiya Bay", "i201": "Forest camp, Lamiya Bay", "i202": "Laxmanpur Beach, Neil", "i203": "Sea anemone in a Laxmanpur rock pool", "i204": "Mangrove boardwalk on the way to the caves", "i205": "Mangrove forest, Baratang", "i206": "White Surf Waterfall, Little Andaman", "i207": "Butler Bay, the surf beach", "i209": "Jetty, Mahatma Gandhi Marine National Park", "i210": "Marina Park, Port Blair", "i211": "Marina Park at night, Port Blair", "i212": "Merk Bay shore", "i213": "Merk Bay, North Passage", "i214": "Mayabunder creek", "i215": "Mayabunder coast", "i216": "Merk Bay, North Passage Island", "i217": "Merk Bay sand", "i218": "Garden walk", "i219": "Flowers in the garden", "i220": "View from Mount Harriet (Mount Manipur National Park)", "i221": "Mount Harriet hilltop", "i222": "Mud volcano, Baratang", "i223": "Walkway to the mud volcano", "i224": "Sunset over Munda Pahad", "i225": "Munda Pahad Beach", "i226": "Sea off Neil jetty", "i227": "Turquoise water by Neil jetty", "i228": "Palm-lined beach, North Passage", "i230": "Parrot Island at dusk", "i231": "Parakeets coming home at sunset, Parrot Island", "i232": "Radhanagar at low tide", "i233": "Radhanagar Beach shoreline", "i234": "Island coast near Rangat", "i235": "Sunset, Rangat", "i236": "Red Skin Island", "i237": "Coral seen from the boat, Red Skin", "i238": "Ross & Smith beach", "i239": "Island seen from the boat", "i242": "Forest trail, Saddle Peak", "i243": "View from Saddle Peak", "i244": "Looking down from Saddle Peak", "i245": "Saddle Peak, the highest point in the islands", "i246": "Samudrika museum gate", "i247": "Samudrika Naval Marine Museum", "i250": "Sunrise at Sitapur, Neil", "i251": "Sitapur Beach", "i252": "Vijaynagar Beach, Havelock", "i253": "Vijaynagar shoreline", "i256": "Wandoor Beach", "i257": "Terrace with a sea view", "i258": "Anthropological Museum, Port Blair", "i259": "Tribal artefacts on display"};
const PHOTOS = {"Z:PBL": ["i071", "i088", "i174"], "Z:HAV": ["i104", "i192", "i120"], "Z:NEI": ["i121", "i164", "i250"], "Z:WAN": ["i066", "i190", "i236"], "Z:BAR": ["i160", "i161", "i222"], "Z:LON": ["i198", "i216", "i186"], "Z:RAN": ["i234", "i137", "i235"], "Z:MAY": ["i215", "i196", "i214"], "Z:DIG": ["i179", "i245", "i194"], "Z:LIT": ["i082", "i207", "i083"], "HOME": ["i179"], "ENT-CELLULAR-JAIL": ["i088", "i086", "i087", "i119", "i071"], "ACV-SHOW-LS-HIN": ["i090", "i095"], "ACV-SHOW-LS-HIN2": ["i095", "i090"], "ACV-SHOW-LS-ENG": ["i086", "i090", "i095"], "ENT-ANTHRO-MUSEUM": ["i258", "i118", "i259"], "ENT-SAMUDRIKA": ["i247", "i094", "i127", "i132", "i123"], "ENT-CORBYNS": ["i174", "i175", "i176", "i177"], "ENT-CHIDIYA-TAPU": ["i170", "i171", "i117"], "ACV-CHIDIYA-SUNSET": ["i224", "i170", "i171"], "ENT-CHATHAM": ["i184", "i099", "i185", "i073"], "ENT-SCIENCE-CENTRE": ["i097"], "ENT-FOREST-MUSEUM": ["i182", "i183", "i126"], "ENT-RADHANAGAR": ["i104", "i232", "i233"], "ACV-PHOTO-RADHA": ["i232", "i104"], "ENT-KALAPATHAR": ["i192", "i193", "i109"], "ENT-VIJAYNAGAR": ["i252", "i253", "i106"], "ENT-BHARATPUR": ["i164", "i165", "i111"], "ENT-LAXMANPUR": ["i202", "i203"], "ENT-SITAPUR": ["i250", "i251", "i107"], "ACV-NATBRIDGE-NEI": ["i121"], "ENT-KARMATANG": ["i196", "i197"], "ACV-TURTLE-KARMA": ["i197", "i196"], "ENT-KALIPUR": ["i194", "i195"], "ACV-TURTLE-KALIPUR": ["i194", "i195"], "ENT-JAPBUNKER": ["i188", "i108"], "ENT-BUTLER": ["i082", "i207", "i166", "i167"], "ACV-SURF-LESSON": ["i207", "i082"], "ENT-HUTBAY-BEACH": ["i166", "i167"], "ENT-HARMINDER": ["i083"], "ENT-WHITESURF": ["i206"], "ACV-WATERFALL-LIT": ["i206"], "ENT-WANDOOR-BEACH": ["i256", "i093", "i066"], "ENT-MUNDA-PAHAD": ["i225", "i224", "i116"], "ACV-TREK-MUNDAPAHAR": ["i116", "i225"], "ENT-GUITAR": ["i187", "i186"], "ACV-BOAT-GUITAR": ["i186", "i187"], "ACV-BOAT-LALAJI": ["i198", "i105", "i080"], "ACV-WALK-LALAJI": ["i080", "i198", "i199"], "ACV-BOAT-MERK": ["i216", "i217", "i212", "i213"], "ACV-SNK-MERK": ["i212", "i216"], "ACV-BOAT-LONG-3BEACH": ["i105", "i198", "i216", "i186"], "ACV-BOAT-PARROT": ["i231", "i230"], "ACV-BOAT-BAR-CAVE": ["i161", "i204", "i160"], "ACV-MKB-CAVES": ["i204", "i161"], "ACV-MANGROVE-BOAT-BAR": ["i160", "i161"], "ACV-TOUR-BARATANG": ["i205", "i161", "i222", "i204", "i160"], "ACV-BOAT-ROSSSMITH-2": ["i179", "i178"], "ACV-BOAT-ROSSSMITH-5": ["i238", "i179", "i178"], "ACV-BOAT-ROSSSMITH-6": ["i178", "i179"], "ACV-BOAT-ROSSSMITH-10": ["i081", "i179", "i178"], "ACV-SNK-ROSSSMITH": ["i238", "i179", "i063"], "ACV-TOUR-DIGLIPUR": ["i245", "i179", "i194"], "ACV-TREK-SADDLE": ["i245", "i242", "i243", "i244"], "ACV-BOAT-CINQUE": ["i172", "i173"], "ACV-BOAT-JOLLY": ["i190", "i191"], "ACV-TOUR-JOLLY": ["i191", "i190"], "ACV-SNK-JOLLY": ["i113", "i191", "i190"], "ACV-BOAT-REDSKIN": ["i236", "i237"], "ACV-SNK-REDSKIN": ["i237", "i236"], "ACV-KAYAK-PB-MGMNP": ["i209", "i052"], "ACV-BOAT-NB": ["i156", "i157"], "ACV-SEMISUB-NB": ["i156"], "ACV-CORALSAFARI-PB": ["i151", "i156"], "ACV-DHANINALLAH": ["i137"], "ACV-TREK-MTHARRIET": ["i220", "i221"], "ACV-BOAT-ELEPH": ["i181", "i120", "i180"], "ACV-TREK-ELEPH": ["i049", "i120"], "ACV-BARREN-SHARED": ["i043", "i042", "i162", "i163"], "ACV-BARREN-PRIVATE": ["i162", "i043", "i042", "i163"], "ACV-BARREN-DSS": ["i042", "i043", "i163"], "ACV-BARREN-DSS-DLX": ["i163", "i043", "i042"], "ACV-CRUISE-SUNSET-PB": ["i072"], "ACV-TOUR-PB-HALF": ["i089", "i088", "i174"], "ACV-TOUR-PB-FULL": ["i103", "i088", "i170", "i258"], "ACV-TOUR-PB-MUSEUMS": ["i246", "i258", "i247", "i088"], "ACV-TOUR-HAV-HALF": ["i193", "i192", "i104"], "ACV-TOUR-HAV-FULL": ["i253", "i192", "i252", "i104"], "ACV-TOUR-NEI-HALF": ["i165", "i121", "i164"], "ACV-TOUR-NEI-FULL": ["i251", "i250", "i121", "i202"], "ACV-SEAWALK-NB": ["i060", "i115"], "ACV-SEAWALK-ELEPH": ["i115", "i060"], "ACV-USCOOTER-HAV": ["i062"], "ACV-USCOOTER-NB": ["i157", "i062"], "ACV-SNK-ELEPH-STD": ["i181", "i063"], "ACV-SNK-HAV-GUIDED": ["i063", "i040"], "ACV-SNK-HAV-PHOTO": ["i040", "i063"], "ACV-SNK-NB-STD": ["i157", "i063"], "ACV-SNK-NB-GUIDED": ["i151", "i063", "i040"], "ACV-SNK-NEI-STD": ["i165", "i063"], "ACV-SNK-NEI-GUIDED": ["i164", "i063", "i040"], "ACV-SNK-CRAGGY": ["i081", "i063"], "ACV-GBB-NB": ["i048"], "ACV-GBB-HAV": ["i237", "i048"], "ACV-GBB-NEI": ["i111", "i048"], "ACV-GBB-CORB": ["i175", "i048", "i174"], "ACV-JETSKI-HAV": ["i180", "i061"], "ACV-JETSKI-PB": ["i061", "i146"], "ACV-JETSKI-PB-LONG": ["i180", "i061", "i146"], "ACV-JETSKI-NEI": ["i164", "i061"], "ACV-BANANA-PB": ["i065", "i146"], "ACV-BANANA-HAV": ["i065"], "ACV-BANANA-NEI": ["i165", "i065"], "ACV-SOFA-PB": ["i064"], "ACV-SOFA-HAV": ["i064"], "ACV-PARASAIL-HAV": ["i054", "i055"], "ACV-PARASAIL-PB": ["i055", "i054"], "ACV-KAYAK-HAV-MANGROVE": ["i052"], "ACV-KAYAK-HAV-SUNRISE": ["i192", "i052"], "ACV-KAYAK-HAV-SUNSET": ["i070", "i052"], "ACV-KAYAK-HAV-NIGHT": ["i110", "i052"], "ACV-KAYAK-PB-SUNRISE": ["i177", "i052"], "ACV-KAYAK-PB-DAY": ["i174", "i052"], "ACV-KAYAK-PB-NIGHT": ["i211", "i052"], "ACV-KAYAK-NEI-DAY": ["i227", "i052"], "ACV-KAYAK-NEI-NIGHT": ["i133", "i052"], "ACV-KAYAK-CHIDIYA": ["i117", "i052", "i170"], "ACV-FISH-HALF-AM": ["i148", "i149"], "ACV-FISH-HALF-PM": ["i149", "i148"], "ACV-FISH-FULL": ["i044", "i148", "i149"], "ACV-FISHING-LOCAL": ["i135", "i044"], "ACV-FISHING-LOCAL-NEI": ["i226", "i044"], "ACV-STARGAZE-NEI": ["i133", "i053"], "ACV-STARGAZE-HAV": ["i053"], "ACV-STARGAZE-PB": ["i211", "i053"], "ACV-BIRD-CRUISE-PB": ["i027", "i031"], "ACV-BIRD-GUIDE-PB": ["i031", "i021", "i037", "i032", "i028"], "ACV-BIRD-NEI": ["i022", "i028", "i015"], "ACV-BIRD-HAV": ["i015", "i022", "i031"], "ACV-TREK-SECRET-HAV": ["i067", "i049"], "ACV-TREK-LAVA-HAV": ["i084", "i049"], "ACV-NATUREWALK-NEI": ["i138", "i049"], "ACV-DSD-HAV-SHORE": ["i154", "i150", "i151", "i007"], "ACV-DSD-HAV-BOAT": ["i041", "i154", "i150", "i151", "i007"], "ACV-DSD-HAV-VIDEO": ["i150", "i154", "i151", "i007"], "ACV-DSD-NEI-SHORE": ["i151", "i154", "i150", "i007"], "ACV-DSD-NEI-BOAT": ["i155", "i154", "i150", "i151", "i007"], "ACV-DSD-NB": ["i006", "i154", "i150", "i151", "i007"], "ACV-DSD-NB-PHOTO": ["i040", "i154", "i150", "i151", "i007"], "ACV-FUN-HAV-1T": ["i005", "i006", "i007", "i041", "i151"], "ACV-FUN-HAV-2T": ["i007", "i041", "i151", "i155"], "ACV-FUN-HAV-SHORE": ["i155", "i006", "i007", "i041", "i151"], "ACV-FUN-HAV-NIGHT": ["i040", "i007", "i041", "i151", "i155"], "ACV-FUN-NEI-2T": ["i150", "i154", "i006", "i007"], "ACV-FUN-PB-2T": ["i041", "i006", "i007", "i151"], "ACV-REFRESH-HAV": ["i154", "i006", "i007", "i041", "i151"], "ACV-PADI-SD": ["i154", "i006", "i007", "i041"], "ACV-PADI-OW": ["i005", "i150", "i154", "i006", "i007"], "ACV-PADI-AOW": ["i041", "i154", "i006", "i007"], "ACV-PADI-OW-AOW": ["i007", "i150", "i154", "i006"], "ACV-PADI-RESCUE": ["i155", "i154", "i006", "i007", "i041"], "ACV-PADI-DM": ["i150", "i007", "i041", "i151", "i155"], "ACV-SPEC-DEEP": ["i008", "i154", "i006", "i007", "i041"], "ACV-SPEC-NITROX": ["i006", "i007", "i041", "i151", "i155"], "ACV-SPEC-NIGHT": ["i151", "i154", "i006", "i007", "i041"], "ACV-SPEC-PPB": ["i237", "i154", "i006", "i007", "i041"], "ACV-SPEC-UWPHOTO": ["i040", "i154", "i006", "i007", "i041"], "ACV-DIVE-DIG-NEW": ["i179", "i007", "i041", "i151", "i155"], "ACV-DIVE-MAY-NEW": ["i215", "i006", "i007", "i041", "i151"], "ACV-SNUBA-NB": ["i006", "i154", "i007", "i041"], "ACV-SPEC-WRECK": ["i004", "i005", "i041"], "ACV-EQUIP-DAY": ["i041", "i005"], "ACV-NITROX-FILL": ["i150", "i005", "i154"], "ACV-PADI-EFR": ["i154", "i155"], "ACV-SEMISUB-HAV": ["i155", "i156", "i237"], "ACV-SPEEDBOAT-PB": ["i145", "i146"], "ACV-SPEEDBOAT-HAV": ["i145", "i144"], "ACV-SEAKART-PB": ["i146", "i064"], "ACV-SPEED-HAV-NEI": ["i227", "i145", "i226"], "ACV-SPEED-PB-HAV": ["i144", "i145"], "ACV-BOAT-ROSSNB": ["i157", "i092", "i156"], "ACV-BOAT-ROSS-AM": ["i092", "i239", "i072"], "ACV-BOAT-ROSS-PM": ["i072", "i092", "i070"], "ENT-ROSS-LS-HIN": ["i070", "i092"], "ENT-ROSS-LS-ENG": ["i110", "i092", "i070"], "ACV-BOAT-AVIS": ["i214", "i239"], "ENT-AVIS": ["i215", "i239"], "ACV-BOAT-INTERVIEW": ["i239", "i140"], "ACV-CRUISE-DINNER-PB": ["i003", "i072"], "ACV-DINNER-CRUISE-HAV": ["i070", "i003"], "ACV-PARTYBOAT-HAV": ["i145", "i003"], "ACV-CHARTER-HAV-2H": ["i149", "i145"], "ACV-CHARTER-HAV-SUNSET": ["i093", "i070", "i149"], "ACV-CHARTER-PB-6H": ["i147", "i149", "i072"], "ACV-SUNSET-HAV": ["i079", "i070", "i110"], "ACV-FISH-PERMIT-IN": ["i153", "i148"], "ACV-FISH-PERMIT-FOR": ["i239", "i148"], "ACV-INTERTIDAL-HAV": ["i203", "i084"], "ACV-INTERTIDAL-NEI": ["i202", "i203", "i084"], "ACV-TURTLE-CUTHBERT": ["i235", "i234"], "ENT-CUTHBERT-BAY": ["i235", "i234"], "ACV-ALFRED-CAVES": ["i140", "i081"], "ACV-HELI-PB-HAV": ["i071", "i179"], "ENT-FISHERIES": ["i096", "i123"], "ENT-GANDHI-PARK": ["i218", "i219"], "ENT-SIPPIGHAT": ["i101", "i027"], "ENT-BALUDERA": ["i069", "i153"], "ENT-BALUDERA-MAY": ["i153", "i069", "i214"], "ENT-GOVIND-NAGAR": ["i112", "i067"], "ENT-BEACH1-HAV": ["i136", "i067", "i112"], "ENT-AMKUNJ": ["i117", "i235"], "ENT-PANCHAVATI": ["i139"], "ENT-YERRATA": ["i136", "i135"], "ENT-MORRICE-DERA": ["i084", "i235"], "ENT-LAMIYA-BAY": ["i201", "i200"], "ENT-MUD-VOL-DIG": ["i142", "i223"], "ACV-ADDON-PHOTO": ["i041", "i115", "i062"], "ACV-SUP-HAV": ["i112", "i226", "i052"], "ACV-CLEARKAYAK-HAV": ["i237", "i052"], "ACV-FREEDIVE-TRY": ["i006", "i040"], "ACV-FREEDIVE-COURSE": ["i144", "i006", "i040"], "ACV-NIGHTWALK-HAV": ["i019", "i053", "i045"], "ACV-HERPING-HAV": ["i014", "i138", "i140"], "ACV-DOLPHIN-HAV": ["i144", "i152", "i149"], "ACV-VILLAGE-NEI": ["i141", "i218"], "ENT-MINIZOO": ["i128", "i219"], "ENT-SAGARIKA": ["i103"], "ENT-COLLINPUR": ["i079"], "ENT-RAMNAGAR-NEI": ["i067", "i226"], "ENT-WHISPER": ["i139", "i206"], "ENT-LIGHTHOUSE-LIT": ["i085", "i082"], "ENT-RAMNAGAR-DIG": ["i081", "i178"], "ACV-DUCK-HAV": ["i046", "i065"], "ACV-DRAGON-HAV": ["i120", "i046", "i065"], "ACV-OCTOPUS-HAV": ["i181", "i046", "i065"], "ACV-DISCO-HAV": ["i144", "i046", "i065"], "ACV-SEAPLANE-HAV": ["i055", "i046", "i065"], "ACV-UWWEDDING-HAV": ["i115", "i150"], "ACV-HIGHTEA-PB": ["i257", "i072"], "ACV-BBQ-HAV": ["i045", "i053"], "ACV-WALK-NEILSCOVE-HAV": ["i233", "i228"], "ENT-RAMAN-BAGICHA": ["i234", "i235"], "ENT-RAMPUR-MAY": ["i214", "i215"], "ENT-NETAJINAGAR": ["i167", "i085", "i166"], "advplaces": ["i088"], "advscuba": ["i150"], "advsnork": ["i063"], "advboat": ["i190"], "advboats": ["i190"], "advwater": ["i061"], "advkayak": ["i052"], "advpaddle": ["i052"], "advfish": ["i148"], "advtours": ["i090"], "advnature": ["i220"], "advtreks": ["i245"], "advnight": ["i053"], "genbeach": ["i104"], "genclassic": ["i088"], "genactive": ["i150"], "genexplore": ["i179"], "FERRY": ["i153", "i147"], "FERRY:NEI": ["i227", "i226"], "CAB": ["i012"], "RENT": ["i159"], "TOWN:PBL": ["i103", "i210", "i072"], "BAR-MUD": ["i222", "i223"], "scferry": ["i153"], "scstay": ["i218"], "sccab": ["i012"], "scdo": ["i104"], "scpkg": ["i085"], "scadv": ["i150"]};
const PHOTO_CAPK = {"ACV-BOAT-ROSSSMITH-5": {"i238": "Ross & Smith beach"}, "ACV-SNK-ROSSSMITH": {"i238": "Ross & Smith beach"}, "ACV-CORALSAFARI-PB": {"i151": "Reef life on the Coral Safari"}, "ACV-USCOOTER-NB": {"i157": "North Bay, where the scooter dives start"}, "ACV-GBB-HAV": {"i237": "Coral seen through the glass"}, "ACV-JETSKI-PB-LONG": {"i180": "Jet ski ride"}, "ACV-JETSKI-NEI": {"i164": "Bharatpur, where the jet skis run"}, "ACV-BANANA-NEI": {"i165": "Bharatpur lagoon, Neil"}, "ACV-KAYAK-HAV-SUNRISE": {"i192": "Sunrise side of Havelock, Kalapathar"}, "ACV-KAYAK-HAV-NIGHT": {"i110": "Calm water at dusk; the plankton glows once it is dark"}, "ACV-KAYAK-PB-SUNRISE": {"i177": "Early light at Corbyn’s Cove, Port Blair"}, "ACV-KAYAK-PB-DAY": {"i174": "Kayaks on Corbyn’s Cove, Port Blair"}, "ACV-KAYAK-PB-NIGHT": {"i211": "Port Blair waterfront after dark"}, "ACV-KAYAK-NEI-NIGHT": {"i133": "Dusk over the bay before a night paddle"}, "ACV-FISHING-LOCAL": {"i135": "Small local boats in the creek"}, "ACV-FISHING-LOCAL-NEI": {"i226": "Sea off Neil, where the local boats fish"}, "ACV-STARGAZE-NEI": {"i133": "Dusk over the bay as the stars come out"}, "ACV-STARGAZE-PB": {"i211": "Port Blair after dark"}, "ACV-TREK-SECRET-HAV": {"i067": "A quiet beach at the end of the trail"}, "ACV-TREK-LAVA-HAV": {"i084": "Old lava rock on the shore"}, "ACV-SPEC-PPB": {"i237": "Coral seen from above"}, "ACV-DIVE-DIG-NEW": {"i179": "Ross & Smith, near the new Diglipur dive sites"}, "ACV-DIVE-MAY-NEW": {"i215": "Mayabunder coast, near the new dive sites"}, "ACV-SEMISUB-HAV": {"i155": "Corals seen from the semi-submarine", "i156": "Semi-submarine", "i237": "Coral seen through the window"}, "ACV-SPEEDBOAT-HAV": {"i144": "Open sea off Havelock"}, "ACV-SEAKART-PB": {"i064": "Self-drive speed boat"}, "ACV-SPEED-HAV-NEI": {"i227": "Arriving at Neil"}, "ACV-BOAT-ROSSNB": {"i157": "North Bay, the second stop"}, "ACV-BOAT-ROSS-AM": {"i072": "The harbour on the way to Ross"}, "ACV-BOAT-ROSS-PM": {"i072": "Afternoon light over the harbour"}, "ENT-ROSS-LS-HIN": {"i070": "Evening by the sea"}, "ENT-ROSS-LS-ENG": {"i110": "Dusk over the water"}, "ACV-BOAT-AVIS": {"i214": "Mayabunder creek, where boats leave for Avis"}, "ACV-DINNER-CRUISE-HAV": {"i070": "Sunset over the sea before dinner"}, "ACV-PARTYBOAT-HAV": {"i145": "Out on the water"}, "ACV-CHARTER-HAV-2H": {"i149": "Private boat"}, "ACV-CHARTER-HAV-SUNSET": {"i093": "Sunset from the boat", "i149": "Private boat"}, "ACV-CHARTER-PB-6H": {"i147": "Out from Port Blair", "i149": "Private boat"}, "ACV-SUNSET-HAV": {"i079": "Sunset seen from the boat"}, "ACV-FISH-PERMIT-IN": {"i153": "Boats at the jetty"}, "ACV-FISH-PERMIT-FOR": {"i239": "Offshore waters"}, "ACV-INTERTIDAL-NEI": {"i202": "Rock pools at Laxmanpur, Neil"}, "ENT-CUTHBERT-BAY": {"i235": "Sunset on the Rangat coast"}, "ACV-HELI-PB-HAV": {"i179": "Ross & Smith from the air"}, "ENT-FISHERIES": {"i123": "Coral on display"}, "ENT-SIPPIGHAT": {"i027": "Terns over the water"}, "ENT-BALUDERA-MAY": {"i153": "Open shore, Mayabunder", "i069": "Open shore near Mayabunder"}, "ENT-BEACH1-HAV": {"i136": "Mangroves at Beach No. 1"}, "ENT-AMKUNJ": {"i117": "Driftwood on the beach"}, "ACV-ADDON-PHOTO": {"i041": "Underwater photo of your dive", "i115": "Underwater photos on a sea walk"}, "ACV-SUP-HAV": {"i112": "Calm water off Havelock for paddleboarding", "i226": "Calm water for paddling"}, "ACV-CLEARKAYAK-HAV": {"i237": "Coral below the hull"}, "ACV-FREEDIVE-COURSE": {"i144": "Open blue water, where freedivers train"}, "ACV-NIGHTWALK-HAV": {"i019": "Andaman nightjar, seen on night walks", "i053": "Night on the beach"}, "ACV-HERPING-HAV": {"i014": "Andaman scops owl, a night-walk regular", "i140": "Forest at night-fall"}, "ACV-DOLPHIN-HAV": {"i152": "Open sea off Havelock"}, "ACV-VILLAGE-NEI": {"i141": "Fields and hills", "i218": "Village garden path"}, "ENT-RAMNAGAR-NEI": {"i067": "Shaded beach, Neil"}, "ENT-WHISPER": {"i139": "Forest stream (area photo)", "i206": "Forest waterfall, Little Andaman"}, "ACV-DRAGON-HAV": {"i120": "Elephant Beach, where the rides run"}, "ACV-OCTOPUS-HAV": {"i181": "Elephant Beach"}, "ACV-DISCO-HAV": {"i144": "Open sea off Havelock"}, "ACV-SEAPLANE-HAV": {"i055": "Airborne towed ride (parasail shown)"}, "ACV-UWWEDDING-HAV": {"i115": "Together on the reef"}, "ACV-BBQ-HAV": {"i045": "Evening by the shore"}, "ACV-WALK-NEILSCOVE-HAV": {"i228": "Palm-lined beach"}, "ENT-NETAJINAGAR": {"i167": "Area photo · Little Andaman coast", "i166": "Beach, Little Andaman"}, "scferry": {"i153": "Ferry at the jetty"}, "scstay": {"i218": "Cottages in a garden resort"}, "sccab": {"i012": "Coach for transfers"}, "scdo": {"i104": "Radhanagar Beach, Havelock"}, "scpkg": {"i085": "The islands from above"}, "scadv": {"i150": "Diving with a turtle"}};
/* ---------- v4: government (DSS) timetable ---------- */
var DOWN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function sailsOn(s, date) { return !s || !s.days || s.days.includes(dowOf(date)); }
function dayList(days) { const W = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; return !days ? 'daily' : days.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(x => W[x]).join(', '); }
function nextSailDate(s, from) { for (let k = 0; k < 8; k++) { const d = addD(from, k); if (sailsOn(s, d)) return d; } return from; }
function govLine(s, date) { if (!s.gov) return '';
  const bits = []; if (s.via && s.via.length) bits.push('via ' + s.via.join(', ')); bits.push(s.days ? 'sails ' + dayList(s.days) : 'sails daily'); if (s.nxt) bits.push('arrives the next day');
  return `<span class="ft"><span class="muted" style="font-size:12.5px">${esc(bits.join(' · '))}</span><span style="display:flex;gap:6px;flex-wrap:wrap">${date && !sailsOn(s, date) ? `<span class="tag warn">Not sailing ${DOWN[dowOf(date)]}</span>` : ''}<span class="tag">Our Port Blair desk confirms</span>${s.est ? '<span class="tag warn">Times approximate</span>' : ''}</span></span>`; }
const dssLink = () => `<div class="lx-dsslink"><button class="btn ghost sm" data-a="go" data-v="dss">${ic('ferry', 15)} Government ship timetable</button><span class="muted">Every DSS sailing with its days, stops and fares</span></div>`;
const DSS_GROUPS = [
  ['Port Blair, Havelock and Neil', ['F1A', 'F1B', 'F1C', 'F1D', 'F2A', 'F2B', 'F2C', 'F2D', 'F9A']],
  ['Long Island and Rangat', ['R1A', 'R1B', 'R2A', 'R2B', 'H1A', 'H1B']],
  ['Mayabunder and Diglipur', ['N1A', 'N1B', 'N2A']],
  ['Little Andaman (Hut Bay)', ['L1A', 'L1B']]];
function vDss() { const V = {}; (D.dss.voyages || []).forEach(v => { V[v.id] = v; });
  const fareOf = v => { const st = v.stops.filter(x => x[0]); const s = D.sails.find(x => x.voy === v.id && x.f === st[0][0] && x.to === st[st.length - 1][0]); return s; };
  const voy = v => { const s = fareOf(v); const st = v.stops; const first = st.find(x => x[0]), last = st.slice().reverse().find(x => x[0]);
    const nd = s ? nextSailDate(s, baseDate()) : baseDate();
    return `<article class="lx-voy"><div class="lx-voy-h"><div><h3>${esc(v.name)}</h3><span class="muted">${v.days ? 'Sails ' + dayList(v.days) : 'Sails daily'}${s ? ` · from ${inr(s.fare)} a seat` : ''}</span></div>${v.est ? '<span class="tag warn">Times approximate</span>' : '<span class="tag ok">Published times</span>'}</div>
      <ol class="lx-stops">${st.map(x => `<li class="${x[0] ? '' : 'pass'}"><span class="t">${x[2] ? `<small>arr</small> ${x[2]}` : ''}${x[2] && x[3] ? '<br>' : ''}${x[3] ? `<small>dep</small> ${x[3]}` : ''}${!x[2] && !x[3] ? '<small>passes</small>' : ''}</span><span class="dot"></span><span class="p"><b>${x[0] ? esc(ZN[x[0]].name) : esc(x[1])}</b><small>${x[0] ? esc(x[1]) : 'Not open to visitors'}</small></span></li>`).join('')}</ol>
      ${v.note ? `<p class="note">${esc(v.note)}</p>` : ''}
      ${s ? `<p class="note">${s.fares.map(f => `${esc(f.n)} <b>${inr(f.f)}</b>`).join(' · ')}${s.fest ? ' · fare to confirm' : ''}</p>` : ''}
      ${first && last ? `<button class="btn ghost sm" data-a="dssgo" data-f="${first[0]}" data-t="${last[0]}" data-d="${nd}">See ${esc(ZN[first[0]].name)} → ${esc(ZN[last[0]].name)} on ${fD(nd)}</button>` : ''}</article>`; };
  const loc = (D.dss.local || []).map(l => `<div class="lx-loc"><b>${esc(l.n)}</b><span>${esc(l.t)}</span><span class="muted">${inr(l.fare)} a person, bought at the counter · ${esc(l.use)}</span></div>`).join('');
  const bd = (D.dss.barren.dates || []).filter(d => d >= TODAY).slice(0, 6);
  return {title:'Government ships', body:`<div class="wrap"><div class="sec"><div class="sechd"><h2>Government ship timetable</h2><span class="sub">Checked ${fD(D.dss.checked)}</span></div>
    <p class="note" style="max-width:68ch;margin-top:-6px">The Directorate of Shipping Services (DSS) runs the only ships to Long Island, Rangat, Mayabunder, Diglipur and Hut Bay, and the cheapest ones to Havelock and Neil. Add any of them to your trip: our Port Blair desk buys the ticket at the STARS counter and confirms it. DSS can change times at short notice for weather or ship availability; we tell you the moment it does.</p>
    ${DSS_GROUPS.map(([g, ids]) => `<h3 class="lx-dssg">${esc(g)}</h3><div class="lx-voys">${ids.filter(i => V[i]).map(i => voy(V[i])).join('')}</div>`).join('')}
    <h3 class="lx-dssg">Barren Island round voyages</h3>
    <div class="lx-voy"><p>An overnight government cruise to India's only active volcano, seen from the deck at dawn; no landing. ${esc(D.dss.barren.note)}</p>
      <p class="note">${bd.length ? 'Expected departures: ' + bd.map(fD).join(' · ') : 'Next season dates are not out yet.'}</p>
      <button class="btn ghost sm" data-a="dssbarren">See the Barren Island voyage</button></div>
    <h3 class="lx-dssg">Harbour and vehicle ferries</h3><p class="note" style="margin-top:-6px">Short local crossings, bought at the counter on the day. Listed so you know how your cab or day trip crosses the water.</p>
    <div class="lx-locs">${loc}</div></div></div>`}; }
Object.assign(VIEWS, {dss:vDss}); Object.assign(TABV, {dss:'explore'});
document.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (!el) return; const d = el.dataset;
  if (d.a === 'dssgo') go({v:'route', from:d.f, to:d.t, date:d.d});
  if (d.a === 'dssbarren') { const nx = (D.dss.barren.dates || []).find(x => x >= TODAY) || baseDate(); go({v:'product', kind:'act', id:'ACV-BARREN-DSS', date:nx}); }
});
/* ---------- v4: Diglipur road package (one car and driver for three days) ---------- */
// booking the drive up adds the drive back two days later as "included"; extra nights with the car are charged at the partner's rate
var PKG3 = 'RT-DIG-ROADPKG';
function pkg3Back(it) { return S.cart.find(x => x.kind === 'cab' && x.ref === PKG3 && x.rev && x.pkgOf === it.uid); }
(function () {
  const add0 = addItem;
  addItem = function (it, quiet) { const r = add0.apply(this, arguments);
    try { if (it && it.kind === 'cab' && it.ref === PKG3 && !it.rev) { const out = S.cart.find(x => x.kind === 'cab' && x.ref === PKG3 && !x.rev && x.date === it.date) || it;
      if (out.uid && !pkg3Back(out)) add0({kind:'cab', ref:PKG3, rev:true, date:addD(out.date, 2), t:'06:00', vc:out.vc, pkgOf:out.uid}, true); } } catch (e) { console.error(e); }
    return r; };
  const info0 = info;
  info = function (it) { const I = info0.apply(this, arguments);
    // groups bigger than the largest vehicle on the route travel in more than one
    if (it && it.kind === 'cab' && I.price && ROUTE[it.ref]) { const v = vehFor(ROUTE[it.ref], it.vc); const n = v && v.seats ? Math.ceil(pax() / v.seats) : 1;
      if (n > 1) { I.price *= n; I.nveh = n; I.sub = (I.sub || '') + ` · ${n} vehicles`; } }
    if (it && it.kind === 'cab' && it.ref === PKG3) {
      if (it.rev) { I.price = 0; I.unit = 0; I.sub = (I.sub || '') + ' · included in your 3-day car'; }
      else { const back = S.cart.find(x => x.kind === 'cab' && x.ref === PKG3 && x.rev && x.pkgOf === it.uid); const extra = back ? Math.max(0, daysBetween(it.date, back.date) - 2) : 0;
        if (extra) { const r = ROUTE[PKG3]; const per = Math.round(((r.pkg3 || {})[it.vc] || 2000) * 1.075 / 10) * 10; I.price += extra * per; I.sub = (I.sub || '') + ` · ${extra} extra night${extra > 1 ? 's' : ''} with the car`; } } }
    return I; };
  const rm0 = removeItem;
  removeItem = function (uid) { const it = S.cart.find(x => x.uid === uid); const r = rm0.apply(this, arguments);
    if (it && it.kind === 'cab' && it.ref === PKG3 && !it.rev) { const b = S.cart.find(x => x.pkgOf === uid); if (b) rm0(b.uid); }
    return r; };
})();
/* ---------- v4: booking status on every item ---------- */
// instant: confirmed on payment · desk: our Port Blair desk buys and confirms (government ships, offbeat islands, set-date voyages) · request: price or slot confirmed within 24 h
var REMOTE = ['LON', 'DIG', 'LIT', 'MAY', 'RAN', 'BAR'];
function bookStatus(it) { if (!it || it.own) return null;
  if (it.kind === 'ferry') { const s = SAIL[it.ref]; return s && (s.gov || s.ag) ? 'desk' : 'instant'; }
  if (it.kind === 'stay') { const h = HOT[it.ref]; return !h ? null : REMOTE.includes(h.z) ? 'desk' : h.est ? 'request' : 'instant'; }
  if (it.kind === 'act') { const a = ACT[it.ref]; if (!a) return null; return a.ag || a.dates || REMOTE.includes(a.z) ? 'desk' : a.est ? 'request' : 'instant'; }
  if (it.kind === 'cab') { const r = ROUTE[it.ref]; return r && (REMOTE.includes(r.z) || r.move) ? 'desk' : 'instant'; }
  if (it.kind === 'rental') return 'instant';
  return null; }
const BKL = {instant:['ok', 'Confirmed instantly'], desk:['', 'Our Port Blair team confirms'], request:['warn', 'On request · 24 h']};
function bkTag(it) { const k = bookStatus(it); if (!k) return ''; const [c, l] = BKL[k]; return `<span class="tag bk ${c}">${l}</span>`; }
/* ---------- v4: anchor-first trip completion ----------
   Keeps every item the traveller chose, works out which island each night has to be on so those items can happen,
   keeps Port Blair for the first and last night, fills the free nights sensibly, then books the way between islands:
   a ferry on a day it actually sails, the road north, or a same-day connection, moving a night when nothing runs that day. */
var REMOTE_Z = ['LON', 'DIG', 'LIT', 'MAY', 'RAN', 'BAR'];
function zMin(z) { const o = ZN[z] || {}; return o.minN || 1; }
function zMax(z) { const o = ZN[z] || {}; return o.maxN || 3; }
function nightPlan() {
  const nights = Math.max(0, nDays() - 1); const Z = Array(nights).fill(null); const fixed = Array(nights).fill(false); const pbWant = {};
  const put = (n, z, fx) => { if (n < 0 || n >= nights) return; if (Z[n] == null) { Z[n] = z; if (fx) fixed[n] = true; } };
  S.cart.filter(i => i.kind === 'stay' && HOT[i.ref]).forEach(i => { for (let k = 0; k < i.nights; k++) { const n = dayIdx(i.date) + k; if (n >= 0 && n < nights) { Z[n] = HOT[i.ref].z; fixed[n] = true; } } });
  const moves = [];
  S.cart.forEach(i => { let f, t, nx = 0; const d = dayIdx(i.date);
    if (i.kind === 'ferry') { const s = SAIL[i.ref]; if (!s) return; f = s.f; t = s.to; nx = s.nxt || 0; }
    else if (i.kind === 'cab') { const m = cabMeta(i); if (!m.move) return; f = m.rev ? m.r.move : m.r.z; t = m.move; }
    else return;
    moves.push({f, t, d, nx}); put(d - 1, f, true);
    if (nx) { put(d, 'ship', true); put(d + 1, t, true); } else put(d, t, true); });
  S.cart.filter(i => i.kind === 'act' && ACT[i.ref]).forEach(i => { const a = ACT[i.ref]; let z = a.z === 'WAN' ? 'PBL' : a.z; const d = dayIdx(i.date); const t = tm(i.t || a.t || '09:00');
    if (z === 'BAR' && !(t >= 900 && D.hotels.some(h => h.z === 'BAR'))) z = 'PBL';      // Baratang is a day trip from Port Blair unless it's the evening parrot boat
    if (z === 'PBL') { pbWant[d] = 1; put(d - 1, 'PBL', true); if (t >= 720) put(d, 'PBL', true); return; }
    if (d === 0) put(0, z, true);
    else if (Z[d - 1] == null || Z[d - 1] === z) put(d - 1, z, true);
    else put(d, z, true);
    if (REMOTE_Z.includes(z)) put(d, z, true);                                                // no getting back the same day from the far islands
    if (a.d >= 900 && a.slot === 'Overnight') put(d, 'ship', true);
    // a multi-day course keeps you on its island: the night before, and every night the rule book asks for
    const rule = RULES.find(r => r.t === 'ZONE_NIGHT_REQUIRED' && inList(r.a, a.id)); const need = Math.max(rule ? +rule.p1 || 0 : 0, a.sched && a.sched.length > 1 ? a.sched.length : 0);
    if (need > 1) for (let k = 0; k < need; k++) put(Math.max(0, d - 1) + k, z, true); });
  // a local cab on an island also pins you there that day (a lone 'jetty to Radhanagar' cab means a Havelock day)
  S.cart.filter(i => i.kind === 'cab' && ROUTE[i.ref] && !cabMeta(i).move && !i.for).forEach(i => { let z = ROUTE[i.ref].z; if (z === 'WAN' || z === 'BAR') z = 'PBL'; const d = dayIdx(i.date);
    if (z === 'PBL') { pbWant[d] = 1; put(d - 1, 'PBL', true); if (tm(i.t || '10:00') >= 720) put(d, 'PBL', true); return; } if (d === 0) put(0, z, true); else if (Z[d - 1] == null || Z[d - 1] === z) put(d - 1, z, true); else put(d, z, true);
    if (REMOTE_Z.includes(z)) put(d, z, true); });
  return {Z, fixed, pbWant, moves, nights};
}
function fillNights(P) { const {Z, nights} = P; if (!nights) return;
  if (Z[0] == null) Z[0] = 'PBL'; if (Z[nights - 1] == null) Z[nights - 1] = 'PBL';
  const has = z => Z.includes(z); const runLen = (n, dir) => { const z = Z[n]; let k = 0; while (n >= 0 && n < nights && Z[n] === z) { k++; n += dir; } return k; };
  for (let guard = 0; guard < 40; guard++) { const i = Z.indexOf(null); if (i < 0) break; let j = i; while (j + 1 < nights && Z[j + 1] == null) j++;
    let L = i > 0 ? Z[i - 1] : 'PBL'; let Rz = j + 1 < nights ? Z[j + 1] : 'PBL'; if (L === 'ship') L = 'PBL'; if (Rz === 'ship') Rz = 'PBL';
    const len = j - i + 1; const seq = [];
    // top up the island on the left to its minimum, then the one on the right
    if (L !== 'PBL') { const need = Math.max(0, zMin(L) - runLen(i - 1, -1)); for (let k = 0; k < need && seq.length < len; k++) seq.push(L); }
    const tail = []; if (Rz !== 'PBL' && Rz !== L) { const need = Math.max(0, zMin(Rz) - runLen(j + 1, 1)); for (let k = 0; k < need && seq.length + tail.length < len; k++) tail.push(Rz); }
    let room = len - seq.length - tail.length;
    const near = z => ['PBL', 'HAV', 'NEI'].includes(z);
    if (room >= 2 && !has('HAV') && near(L) && near(Rz)) { const h = Math.min(room >= 4 ? 3 : 2, room - (room >= 3 && !has('NEI') ? 1 : 0)); for (let k = 0; k < h; k++) seq.push('HAV'); room -= h;
      if (room >= 1 && !has('NEI')) { seq.push('NEI'); room--; } }
    // rest: stay longer where you already are (up to that island's usual maximum), otherwise Port Blair
    let lz = seq.length ? seq[seq.length - 1] : L; let lk = seq.length ? seq.filter(x => x === lz).length + (lz === L ? runLen(i - 1, -1) : 0) : runLen(i - 1, -1);
    while (room > 0 && lz !== 'PBL' && lk < zMax(lz)) { seq.push(lz); lk++; room--; }
    let rk = tail.length + (Rz !== 'PBL' ? runLen(j + 1, 1) : 0);
    while (room > 0 && Rz !== 'PBL' && rk < zMax(Rz)) { tail.push(Rz); rk++; room--; }
    while (room-- > 0) seq.push('PBL');
    const all = seq.concat(tail.reverse()); for (let k = 0; k < len; k++) Z[i + k] = all[k];
    if (i > 0 && Z[i - 1] !== 'PBL' && P.pbWant[i] && Z[i] !== 'PBL') { /* a Port Blair activity on a day spent elsewhere is left for the traveller to move */ } }
}
const ROADS = () => D.routes.filter(r => r.kind === 'road' && r.move && r.id !== 'RT-DIG-ROADPKG');
function roadPath(a, b) { // fewest road legs, either direction
  const E = []; ROADS().forEach(r => { E.push({f:r.z, t:r.move, r, rev:false}); E.push({f:r.move, t:r.z, r, rev:true}); });
  const Q = [[a, []]]; const seen = new Set([a]);
  while (Q.length) { const [z, path] = Q.shift(); if (z === b) return path; if (path.length >= 3) continue;
    E.filter(e => e.f === z && !seen.has(e.t)).forEach(e => { seen.add(e.t); Q.push([e.t, path.concat([e])]); }); }
  return null; }
function seatFor(s, date) { return classFares(s).slice().sort((x, y) => x.fare - y.fare).find(c => seats(s.id, c.name, date) >= pax() && (s.gov || autoSeats({sid:s.id, cls:c.name, date}).length >= pax())); }
function legOptions(a, b, date, earliest, latestArr) { // ferries that sail that day, private first, then the government ship
  return BOOKABLE.filter(s => s.f === a && s.to === b && sailsOn(s, date) && tm(s.dep) >= earliest && (!latestArr || s.nxt || tm(s.arr) <= latestArr) && seatFor(s, date))
    .sort((x, y) => (x.gov - y.gov) || Math.abs(tm(x.dep) - 480) - Math.abs(tm(y.dep) - 480)); }
function itemZone(i) { if (i.kind === 'act' && ACT[i.ref]) { const z = ACT[i.ref].z; return z === 'WAN' || z === 'BAR' ? 'PBL' : z; } if (i.kind === 'cab' && ROUTE[i.ref] && !cabMeta(i).move) { const z = ROUTE[i.ref].z; return z === 'WAN' || z === 'BAR' ? 'PBL' : z; } return null; }
function dayWindow(a, b, date) { // leave a after the traveller's last item there that day, reach b before their first item there
  let after = 0, before = null; const n = dayIdx(date); const see = (z, s0, len) => { if (z === a && s0 + len + 90 > after) after = s0 + len + 90; /* check-in (up to 60 min for the government ship) plus the cab to the jetty */ if (z === b && (before == null || s0 - 45 < before)) before = s0 - 45; };
  // every day of a multi-day course counts, not only the day it starts
  expand(S.cart.filter(i => i.kind === 'act' && !i.for && ACT[i.ref])).filter(e => e.kind === 'act' && Math.floor(e.s / 1440) === n).forEach(e => { const z = itemZone(e.it); if (z) see(z, e.s - n * 1440, e.e - e.s); });
  S.cart.filter(i => i.date === date && !i.for && i.kind === 'cab').forEach(i => { const z = itemZone(i); if (!z || !i.t) return; see(z, tm(i.t), (ROUTE[i.ref].mins || 30) + ((i.ret && ROUTE[i.ref].wait) ? ROUTE[i.ref].wait * 60 + ROUTE[i.ref].mins : 0)); }); return {after, before}; }
function routeMove(a, b, d, opts) { const date = addD(S.trip.start, d); const fi = flightIn(), fo = flightOut(); const okT = x => /^\d{1,2}:\d{2}$/.test(x || '');
  const W = dayWindow(a, b, date); let earliest = Math.max(opts.earliest || 300, W.after); const landed = fi && okT(fi.arr) && dayIdx(fi.date) === d ? tm(fi.arr) : null; if (landed != null) earliest = Math.max(earliest, landed + 95);
  let latestArr = fo && okT(fo.dep) && dayIdx(fo.date) === d ? tm(fo.dep) - 150 : null; if (W.before != null) latestArr = latestArr == null ? W.before : Math.min(latestArr, W.before);
  const direct = legOptions(a, b, date, earliest, latestArr).filter(s => !s.nxt || opts.nxtOk !== false)[0]; if (direct) return [{kind:'ferry', s:direct, date}];
  const road = (REMOTE_Z.includes(a) || REMOTE_Z.includes(b)) ? roadPath(a, b) : null;
  if (road && !(landed != null && landed > 780) && !(fo && okT(fo.dep) && dayIdx(fo.date) === d)) { let t = Math.max(300, landed != null ? landed + 60 : 0, W.after); if (t > 870) return null; return road.map(e => { const it = {kind:'cab', r:e.r, rev:e.rev, date, t:hm(t)}; t += e.r.mins + 30; return it; }); }
  for (const X of ['PBL', 'HAV']) { if (X === a || X === b) continue;
    for (const s1 of legOptions(a, X, date, earliest, null)) { if (s1.nxt) continue; const s2 = legOptions(X, b, date, tm(s1.arr) + 60, latestArr).filter(s => !s.nxt || opts.nxtOk !== false)[0]; if (s2) return [{kind:'ferry', s:s1, date}, {kind:'ferry', s:s2, date}]; } }
  return null; }
function planRoute(tier) {
  const P = nightPlan(); const {Z, fixed, nights, moves} = P; if (!nights) return {unresolved:[]};
  fillNights(P);
  // where a move has no transport that day, try shifting the change by one night (only nights we chose)
  const zAt = n => n < 0 ? 'PBL' : n >= nights ? 'PBL' : Z[n];
  const changes = () => { const out = []; for (let d = 0; d <= nights; d++) { let A = zAt(d - 1), B = zAt(d); if (A === 'ship' || B === 'ship') continue; if (A !== B) out.push({d, A, B}); } return out; };
  const userMove = (c) => moves.some(m => m.d === c.d && m.f === c.A && m.t === c.B) || moves.some(m => m.nx && m.d + 1 === c.d && m.t === c.B);
  const unresolved = []; const legs = [];
  for (let pass = 0; pass < 3; pass++) { legs.length = 0; unresolved.length = 0; let moved = false;
    for (const c of changes()) { if (userMove(c)) continue; const r = routeMove(c.A, c.B, c.d, {nxtOk:!(c.d < nights && fixed[c.d])}); if (r) { legs.push(...r); continue; }
      // an overnight ship the evening before: night d-1 on board, ashore on day d (only when we chose night d-1)
      if (c.d - 1 >= 0 && !fixed[c.d - 1] && Z[c.d - 1] === c.A) { const ds = addD(S.trip.start, c.d - 1); const W = dayWindow(c.A, c.B, ds); const ov = legOptions(c.A, c.B, ds, Math.max(300, W.after), null).find(x => x.nxt); if (ov) { legs.push({kind:'ferry', s:ov, date:ds}); continue; } }
      // try one day earlier (B starts sooner) or later (A lasts longer)
      if (c.d - 1 >= 0 && !fixed[c.d - 1] && c.d - 1 < nights && Z[c.d - 1] === c.A && (c.d - 2 < 0 || Z[c.d - 2] === c.A)) { Z[c.d - 1] = c.B; moved = true; break; }
      if (c.d < nights && !fixed[c.d] && Z[c.d] === c.B && (c.d + 1 >= nights || Z[c.d + 1] === c.B)) { Z[c.d] = c.A; moved = true; break; }
      unresolved.push(c); }
    if (!moved) break; }
  // stays for the nights we planned
  const have = z => { const st = S.cart.find(i => i.kind === 'stay' && HOT[i.ref] && HOT[i.ref].z === z); return st ? HOT[st.ref] : null; };
  // nights spent on an overnight ship need no hotel
  legs.filter(l => l.kind === 'ferry' && l.s.nxt).forEach(l => { const n = dayIdx(l.date); if (n >= 0 && n < nights) Z[n] = 'ship'; });
  S.cart.filter(i => i.kind === 'ferry' && SAIL[i.ref] && SAIL[i.ref].nxt).forEach(i => { const n = dayIdx(i.date); if (n >= 0 && n < nights) Z[n] = 'ship'; });
  const booked = n => S.cart.some(i => i.kind === 'stay' && dayIdx(i.date) <= n && dayIdx(i.date) + i.nights > n);
  for (let n = 0; n < nights;) { if (!Z[n] || Z[n] === 'ship' || booked(n)) { n++; continue; }
    let k = 1; while (n + k < nights && Z[n + k] === Z[n] && !booked(n + k)) k++;
    const h = have(Z[n]) || pkgHotel(Z[n], tier); if (h) addItem({kind:'stay', ref:h.id, date:addD(S.trip.start, n), nights:k, qty:Math.max(1, Math.ceil(S.pax.adults / 2)), room:h.rooms[0].n}, true);
    n += k; }
  legs.forEach(l => { if (l.kind === 'ferry') { const c = seatFor(l.s, l.date); addItem({kind:'ferry', ref:l.s.id, date:l.date, cls:c.name, seats:l.s.gov ? [] : autoSeats({sid:l.s.id, cls:c.name, date:l.date})}, true); }
    else addItem(Object.assign({kind:'cab', ref:l.r.id, date:l.date, t:l.t, vc:vehFor(l.r).c}, l.rev ? {rev:true} : {}), true); });
  syncTrip(); return {unresolved, Z};
}
function completeTrip() { syncTrip(); if (!S.trip) return null; const before = S.cart.map(i => i.uid); const mine = clone(S.cart); S.undo = clone(S.cart); const tier = tripTier();
  let res = {unresolved:[]}; if (nDays() > 1) res = planRoute(tier);
  syncTrip(); addCabs(); syncTrip(); try { fillEmptyDays(); } catch (e) { console.error(e); } addCabs(); syncTrip();
  try { addCarriers(); } catch (e) { console.error(e); }
  try { nudgeClashes(before); } catch (e) { console.error(e); }
  if (run(S.cart).hard) { autoFix(); syncTrip(); }
  addCabs(); syncTrip(); if (run(S.cart).hard) { try { nudgeClashes(before); } catch (e) {} if (run(S.cart).hard) { autoFix(); syncTrip(); } }
  mine.forEach(o => { if (!S.cart.some(i => i.uid === o.uid)) S.cart.push(o); });        // nothing the traveller chose is ever dropped
  syncTrip(); S.lastComplete = res;
  const added = S.cart.filter(i => !before.includes(i.uid)); const c = k => added.filter(i => i.kind === k).length; return {stay:c('stay'), ferry:c('ferry'), cab:c('cab'), act:c('act'), n:added.length, unresolved:res.unresolved}; }
/* ---------- v4: the way to a far island (chain from a single item) ---------- */
function reachInfo(z) { const out = [];
  const ships = BOOKABLE.filter(s => s.f === 'PBL' && s.to === z);
  const groups = {}; ships.forEach(s => { const k = (s.nxt ? 'overnight ' : '') + (s.gov ? 'government ship' : s.op.replace(/ \d$/, '') + ' ferry'); (groups[k] = groups[k] || []).push(s); });
  Object.entries(groups).forEach(([k, L]) => { const days = L.some(s => !s.days) ? 'daily' : dayList([...new Set(L.flatMap(s => s.days))]); out.push(`${k}, ${days} at ${[...new Set(L.map(s => s.dep))].sort().join(' or ')}`); });
  D.routes.filter(r => r.boat && (r.move === z || r.z === z)).forEach(r => { const other = r.move === z ? r.z : r.move; out.push(`a hired boat from ${ZN[other].name} (about ${durTxt(r.mins)}, any time in daylight, from ${inr(Math.min(...r.prices.map(p => p.ow).filter(Boolean)))} a boat)`); });
  const road = roadPath('PBL', z); if (road) { const mins = road.reduce((a, e) => a + e.r.mins, 0); const viaN = road.slice(0, -1).map(e => ZN[e.rev ? e.r.z : e.r.move].name).join(' and '); out.push(road[road.length - 1].r.boat ? `about ${Math.round(mins / 60)} hours by road to ${viaN}, then a hired boat` : `about ${Math.round(mins / 60)} hours by road${road.length > 1 ? ' via ' + viaN : ''}`); }
  return out; }
function zIn(z) { return (['HAV', 'NEI', 'LON', 'LIT'].includes(z) ? 'on ' : 'in ') + ZN[z].name; }
function reachCard(R) { if (!S.trip || nDays() < 2) return '';
  const zs = new Set(); S.cart.filter(i => i.kind === 'act' && ACT[i.ref]).forEach(i => { const z = ACT[i.ref].z; if (REMOTE_Z.includes(z) && (z !== 'BAR' || (tm(i.t || ACT[i.ref].t || '09:00') >= 900 && D.hotels.some(h => h.z === 'BAR')))) zs.add(z); }); /* Baratang only when it's the evening parrot boat */
  S.cart.filter(i => i.kind === 'stay' && HOT[i.ref] && HOT[i.ref].z !== 'PBL').forEach(i => zs.add(HOT[i.ref].z));
  const cut = [...zs].filter(z => !S.cart.some(i => (i.kind === 'ferry' && SAIL[i.ref] && SAIL[i.ref].to === z) || (i.kind === 'cab' && cabMeta(i).move === z)));
  if (!cut.length) return ''; const z = cut[0]; const what = S.cart.find(i => (i.kind === 'act' && ACT[i.ref] && ACT[i.ref].z === z) || (i.kind === 'stay' && HOT[i.ref] && HOT[i.ref].z === z)); const I = info(what);
  const ways = reachInfo(z); const minN = zMin(z);
  return `<div class="card planall lx-assist lx-reach"><div style="display:flex;gap:12px;align-items:flex-start"><span class="hn">${ic('ferry', 22, 1.9)}</span><div style="flex:1;min-width:0"><b>Getting to ${esc(ZN[z].name)}</b>
    <div class="muted" style="font-size:14.5px">${esc(I.title)} is ${esc(zIn(z))}${ZN[z].region ? ', ' + esc(ZN[z].region) : ''}. Every trip starts in Port Blair; from there: ${esc(ways.join('; ') || 'ask our desk')}. Plan at least ${minN} night${minN > 1 ? 's' : ''} ${esc(zIn(z))}.</div>
    <ol class="lx-chain"><li>Night in Port Blair</li><li>${esc(ways[0] ? ways[0].split(',')[0].replace(/^./, c => c.toUpperCase()) : 'Transfer')} to ${esc(ZN[z].name)}</li><li>${minN}+ night${minN > 1 ? 's' : ''} ${esc(zIn(z))}, with ${esc(I.title)}</li><li>Back to Port Blair for your flight</li></ol></div></div>
    <div class="lx-btns"><button class="btn primary" data-a="complete">${ic('spark', 18, 2)} Plan the way there</button><button class="btn ghost" data-a="go" data-v="dss">Ship timetable</button></div></div>`; }
/* ---------- v4: cabs that keep up with flights and hotel changes ---------- */
// after every change: airport pickups follow the landing time, airport drops leave 2.5 h before take-off,
// and jetty, airport and activity cabs re-pick their route when the hotel at their end changes
var HKEYS = null;
function stayKeyOn(z, date) { const st = S.cart.find(i => i.kind === 'stay' && HOT[i.ref] && HOT[i.ref].z === z && i.date <= date && addD(i.date, i.nights) > date) || S.cart.find(i => i.kind === 'stay' && HOT[i.ref] && HOT[i.ref].z === z && addD(i.date, i.nights) === date); return st ? hotelKey(HOT[st.ref]) : null; }
function keepLinked() { const cart = S.cart; if (!S.trip || !cart.some(i => i.kind === 'cab')) return false; let ch = false;
  HKEYS = HKEYS || new Set(D.hotels.map(h => hotelKey(h)).concat(Object.values(HUB)));
  const okT = x => /^\d{1,2}:\d{2}$/.test(x || ''); let fi = flightIn(), fo = flightOut(); if (fi && !okT(fi.arr)) fi = null; if (fo && !okT(fo.dep)) fo = null;   // flights without a published time are left alone
  const setRoute = (i, f) => { if (!f || !ROUTE[f.r.id]) return; if (f.r.id !== i.ref || !!f.rev !== !!i.rev) { i.ref = f.r.id; if (f.rev) i.rev = true; else delete i.rev; i.vc = vehFor(f.r, i.vc).c; ch = true; } };
  const setT = (i, t) => { if (t && i.t !== t) { i.t = t; ch = true; } };
  cart.filter(i => i.kind === 'cab' && ROUTE[i.ref] && ROUTE[i.ref].kind === 'airport' && !i.for).forEach(i => { const m = cabMeta(i);
    if (/Airport/.test(m.from) && fi && i.date === fi.date) { setT(i, hm(Math.ceil((tm(fi.arr) + 20) / 5) * 5)); const f = placeRoute('IXZ', baseKey(cart, 'PBL', fi.date, false), 'PBL'); if (f && f.r.kind === 'airport') setRoute(i, f); }
    if (/Airport/.test(m.to) && fo && i.date === fo.date) { setT(i, hm(tm(fo.dep) - 150)); const f = placeRoute('IXZ', baseKey(cart, 'PBL', fo.date, true), 'PBL'); if (f && f.r.kind === 'airport') setRoute(i, {r:f.r, rev:!f.rev}); } });
  cart.filter(i => i.kind === 'cab' && i.for).forEach(i => { const a = cart.find(x => x.uid === i.for); if (!a || !ROUTE[i.ref]) return;
    if (a.kind === 'ferry' && (i.leg === 'pre' || i.leg === 'post')) { const s = SAIL[a.ref]; if (!s) return;
      const f = i.leg === 'pre' ? placeRoute(baseKey(cart, s.f, a.date, true), JKEY(s), s.f) : placeRoute(JKEY_TO(s), baseKey(cart, s.to, s.nxt ? addD(a.date, 1) : a.date, false), s.to); setRoute(i, f); return; }
    if (a.kind === 'act' && ACT[a.ref]) { const A = ACT[a.ref]; const z = A.z === 'WAN' ? 'PBL' : A.z; const ks = rkeys(ROUTE[i.ref]);
      const hotelEnd = i.back ? (i.rev ? ks[0] : ks[1]) : (i.rev ? ks[1] : ks[0]); if (!HKEYS.has(hotelEnd)) return;     // starts at the airport or a jetty: leave it
      const now = stayKeyOn(z, a.date) || baseKey(cart, z, a.date, !i.back); if (now === hotelEnd) return;
      if (i.back) setRoute(i, placeRoute(siteKey(A), now, z)); else { const sr = siteRoute(A, now); if (sr) setRoute(i, sr); } } });
  // cabs not tied to a ferry or activity (sightseeing drops, day trips) start from wherever you now stay
  cart.filter(i => i.kind === 'cab' && !i.for && ROUTE[i.ref] && ROUTE[i.ref].kind !== 'airport' && !cabMeta(i).move).forEach(i => { const r = ROUTE[i.ref]; const ks = rkeys(r); const z = r.z === 'WAN' ? 'PBL' : r.z;
    const start = i.rev ? ks[1] : ks[0], dest = i.rev ? ks[0] : ks[1]; if (!HKEYS.has(start)) return; const now = stayKeyOn(z, i.date) || baseKey(cart, z, i.date, true); if (!now || now === start) return;
    const f = placeRoute(now, dest, z); if (f && f.r.kind === r.kind) setRoute(i, f); });
  return ch; }
/* one cab chain through nearby sights: hotel → sight A → sight B → hotel, instead of a return trip to the hotel between them.
   Two plans on the same island and day, less than 3 h apart, both reached by cab: A's cab drops you (no return), a short
   local hop takes you from A to B, and one cab brings you back from the last stop. Same place twice (jail, then the show
   there): no cab in between. If the chain breaks (a stop removed), the missing return leg comes back. */
function chainCabs() { const cart = S.cart; if (!S.trip || !cart.some(i => i.kind === 'cab' && i.for)) return false; let ch = false;
  HKEYS = HKEYS || new Set(D.hotels.map(h => hotelKey(h)).concat(Object.values(HUB)));
  const evs = expand(cart); const zOf = a => a.z === 'WAN' ? 'PBL' : a.z;
  const outOf = u => cart.find(c => c.kind === 'cab' && c.for === u && !c.back), backOf = u => cart.find(c => c.kind === 'cab' && c.for === u && c.back);
  const startKey = c => { const k = rkeys(ROUTE[c.ref]); return c.rev ? k[1] : k[0]; };
  const homeKey = (z, date) => stayKeyOn(z, date) || baseKey(cart, z, date, false);
  const addBack = (A, e) => { const z = zOf(ACT[A.ref]); const f = placeRoute(siteKey(ACT[A.ref]), homeKey(z, A.date), z); if (!f) return;
    const o = outOf(A.uid); cart.push({uid:'i' + (S.seq++), kind:'cab', ref:f.r.id, date:A.date, t:hm(Math.ceil((e.e % 1440) / 5) * 5), qty:1, for:A.uid, back:true, vc:vehFor(f.r, o && o.vc).c, ...(f.rev ? {rev:true} : {})}); ch = true; };
  const byDay = {}; evs.filter(e => e.kind === 'act' && !e.parts && ACT[e.it.ref] && siteKey(ACT[e.it.ref])).forEach(e => (byDay[e.it.date] = byDay[e.it.date] || []).push(e));
  Object.values(byDay).forEach(L => { L.sort((a, b) => a.s - b.s);
    for (let i = 0; i + 1 < L.length; i++) { const eA = L[i], eB = L[i + 1], A = eA.it, B = eB.it; const a = ACT[A.ref], b = ACT[B.ref];
      if (zOf(a) !== zOf(b) || eB.s < eA.e || eB.s - eA.e > 180) continue;
      // a ferry or another booked ride in between ends the chain
      if (evs.some(x => x.it.date === A.date && x.s >= eA.e && x.s < eB.s && (x.kind === 'ferry' || (x.kind === 'veh' && x.it.for !== A.uid && x.it.for !== B.uid)))) continue;
      const oA = outOf(A.uid), bA = backOf(A.uid); let oB = outOf(B.uid); if (!oA || (!oA.ret && !bA)) continue;
      const kA = siteKey(a), kB = siteKey(b); if (kA === kB && eB.s - eA.e > 90) continue;      // same place again much later: go back and rest
      if (oB && (!ROUTE[oB.ref] || !HKEYS.has(startKey(oB)))) continue;                          // already chained, or comes from a jetty
      if (!oB && (cart.some(c => c.for === B.uid) || S.dismissed['cab' + B.uid])) continue;      // has its own arrangement
      let hop = null;
      if (kA !== kB) { hop = findRoute(kA, kB); if (!hop) continue; const v = vehFor(hop.r, oA.vc); if (!v || !v.ow) continue; }
      const bB = backOf(B.uid);
      delete oA.ret; oA.chain = 1; if (bA) cart.splice(cart.indexOf(bA), 1);
      if (!hop) { if (oB) cart.splice(cart.indexOf(oB), 1); }
      else { if (!oB) { oB = {uid:'i' + (S.seq++), kind:'cab', date:B.date, qty:1, for:B.uid}; cart.push(oB); }
        oB.ref = hop.r.id; if (hop.rev) oB.rev = true; else delete oB.rev; delete oB.ret; oB.hop = 1; oB.vc = vehFor(hop.r, oA.vc).c; oB.t = hm(Math.ceil((eA.e % 1440 + 5) / 5) * 5); }
      if (!bB) addBack(B, eB);
      ch = true; } });
  // one way in per plan: a hop from the previous stop replaces a separate ride from the hotel
  cart.filter(c => c.kind === 'cab' && c.hop && !c.back).forEach(h => { cart.filter(c => c !== h && c.kind === 'cab' && c.for === h.for && !c.back && ROUTE[c.ref] && HKEYS.has(startKey(c))).forEach(c => { cart.splice(cart.indexOf(c), 1); ch = true; }); });
  // a cab whose plan was removed goes with it
  for (let k = cart.length - 1; k >= 0; k--) { const c = cart[k]; if (c.kind === 'cab' && c.for && !cart.some(x => x.uid === c.for)) { cart.splice(k, 1); ch = true; } }
  // repair: a hop whose earlier stop is gone starts from the hotel again; a chained drop with nothing after it gets its ride home
  cart.filter(c => c.kind === 'cab' && c.hop && !c.back).forEach(c => { const A = cart.find(x => x.uid === c.for); if (!A || !ACT[A.ref]) return; const k0 = startKey(c);
    const eA = evs.find(x => x.it.uid === A.uid); if (eA && evs.some(x => x.kind === 'act' && x.it.date === c.date && x.it.uid !== A.uid && x.e <= eA.s && eA.s - x.e <= 180 && ACT[x.it.ref] && siteKey(ACT[x.it.ref]) === k0)) return;
    const sr = siteRoute(ACT[A.ref], homeKey(zOf(ACT[A.ref]), A.date)); if (!sr) return; c.ref = sr.r.id; if (sr.rev) c.rev = true; else delete c.rev; delete c.hop; c.t = hm(Math.max(300, Math.floor((tm(A.t || ACT[A.ref].t) - sr.r.mins - 10) / 5) * 5)); ch = true; });
  cart.filter(c => c.kind === 'cab' && c.chain && !c.back).forEach(c => { const A = cart.find(x => x.uid === c.for); if (!A || !ACT[A.ref] || backOf(A.uid)) return; const k = siteKey(ACT[A.ref]);
    const nextHop = cart.some(x => x.kind === 'cab' && x.date === c.date && x !== c && x.for !== A.uid && x.hop && !x.back && startKey(x) === k);
    const sameNext = cart.some(x => x.kind === 'act' && x.uid !== A.uid && x.date === A.date && ACT[x.ref] && siteKey(ACT[x.ref]) === k && tm(x.t || ACT[x.ref].t) > tm(A.t || ACT[A.ref].t) && tm(x.t || ACT[x.ref].t) - tm(A.t || ACT[A.ref].t) - (ACT[A.ref].d || 60) <= 90 && backOf(x.uid));
    if (nextHop || sameNext) return; const e = evs.find(x => x.it.uid === A.uid); delete c.chain; if (e) addBack(A, e); });
  return ch; }
(function () { const sync0 = syncTrip;
  syncTrip = function () { const r = sync0.apply(this, arguments); try { const a = keepLinked(); const b = chainCabs(); if (a || b) sync0.apply(this, arguments); } catch (e) { console.error(e); } return r; }; })();
/* ---------- v4: time slots show whether they fit, and what moves with them ---------- */
function slotFit(a, cfg, s) { if (!S.cart.some(x => x.uid !== cfg.uid && x.for !== cfg.uid)) return '';
  try { const f = fitOf(Object.assign({}, cfg, {kind:'act', ref:a.id, t:s})); return f.state === 'bad' ? '<small class="sf bad">Clashes</small>' : f.soft && f.soft.length ? '<small class="sf warn">Fits, check</small>' : '<small class="sf ok">Fits</small>'; } catch (e) { return ''; } }
function slotNote(a, cfg) { if (!cfg.uid) return ''; const cabs = S.cart.filter(x => x.kind === 'cab' && x.for === cfg.uid); if (!cabs.length) return '';
  const it = Object.assign({}, S.cart.find(x => x.uid === cfg.uid) || {}, {t:cfg.t, date:cfg.date});
  const parts = cabs.map(c => c.back ? `return cab at ${hm(tm(cfg.t) + (a.d || 60))}` : `pickup at ${cabTimeFor(it, c)}`);
  return `<p class="note">${ic('car', 14, 2)} Your cab moves with it: ${parts.join(', ')}.</p>`; }
/* ---------- v4: day toolbar: vehicle class and own wheels for the day ---------- */
var LOCALK = ['drop', 'daytrip', 'transfer'];
function dayCabs(date, z) { return S.cart.filter(i => i.kind === 'cab' && i.date === date && ROUTE[i.ref] && (!z || ROUTE[i.ref].z === z || (z === 'PBL' && ROUTE[i.ref].z === 'WAN'))); }
function sightCabs(date, z) { return dayCabs(date, z).filter(i => { const r = ROUTE[i.ref]; return LOCALK.includes(r.kind) && !r.move && !/^RT-LONG-/.test(r.id); }); }
function moveDay(date) { return S.cart.some(i => (i.kind === 'ferry' && i.date === date) || (i.kind === 'cab' && i.date === date && cabMeta(i).move)) || S.cart.some(i => i.kind === 'ferry' && SAIL[i.ref] && SAIL[i.ref].nxt && addD(i.date, 1) === date); }
function vehClasses(cabs) { const set = new Set(); cabs.forEach(c => ROUTE[c.ref].prices.forEach(p => { if ((c.ret ? p.ret : p.ow) && p.c !== 'Auto') set.add(p.c); })); return VCLS.filter(c => set.has(c)); }
function priceWith(cabs, cls) { return cabs.reduce((s, c) => { const has = ROUTE[c.ref].prices.some(p => p.c === cls && (c.ret ? p.ret : p.ow)); return s + (info(Object.assign({}, c, {vc:has ? cls : c.vc})).price || 0); }, 0); }
function dayTools(n, date, zz) { const cabs = dayCabs(date); const rents = (D.rentals || []).filter(r => r.z === zz);
  const own = S.cart.find(i => i.kind === 'rent' && RENT[i.ref] && RENT[i.ref].z === zz && i.date <= date && addD(i.date, i.days || 1) > date);
  const canWheels = rents.length && !moveDay(date) && !own; const open = S.dayTool && S.dayTool.date === date ? S.dayTool.k : null;
  if (!cabs.length && !canWheels && !own) return '';
  const cur = cabs.length ? (cabs.map(c => c.vc).filter(Boolean)[0] || vehFor(ROUTE[cabs[0].ref]).c) : null;
  let panel = '';
  if (open === 'veh' && cabs.length) { const now = priceWith(cabs, '__none__'); const zc = dayCabs(null, zz).length;
    panel = `<div class="lx-dt-panel"><b>Vehicle for ${cabs.length} cab ride${cabs.length > 1 ? 's' : ''} today</b><div class="lx-vopts">${vehClasses(cabs).map(c => { const p = priceWith(cabs, c), d = p - now; const fits = (ROUTE[cabs[0].ref].prices.find(x => x.c === c) || {}).seats >= pax();
      return `<button class="lx-vopt" data-a="vehset" data-c="${esc(c)}" data-d="${date}" data-z="${zz}" aria-pressed="${c === cur}"><b>${esc(c)}</b><small>${esc(VSUB[c] || '')}${fits ? '' : ' · more than one needed'}</small><span>${d === 0 ? 'current' : (d > 0 ? '+' : '−') + inr(Math.abs(d))}</span></button>`; }).join('')}</div>
      <div class="lx-scope" role="radiogroup" aria-label="Apply to">${[['day', 'This day'], ['isle', `All ${ZN[zz].name} rides`], ['trip', 'Whole trip']].map(([k, l]) => `<button data-a="vehscope" data-k="${k}" aria-pressed="${(S.vscope || 'day') === k}">${l}</button>`).join('')}</div></div>`; }
  if (open === 'wheels' && canWheels) { const sc = sightCabs(date, zz); const save = sc.reduce((s, c) => s + (info(c).price || 0), 0); const q = Math.max(1, Math.ceil(S.pax.adults / 2));
    panel = `<div class="lx-dt-panel"><b>Your own wheels on ${fD(date)}</b><p class="note">${sc.length ? `Replaces ${sc.length} sightseeing cab ride${sc.length > 1 ? 's' : ''} (${inr(save)}). ` : ''}Airport and jetty transfers stay booked. One vehicle per two adults.</p>
      <div class="lx-vopts">${rents.map(r => { const tot = Math.round(r.p / 10) * 10 * (/Bicycle/.test(r.n) ? pax() : q); return `<button class="lx-vopt" data-a="wheelset" data-id="${r.id}" data-d="${date}"><b>${esc(r.n)}</b><small>${/Bicycle/.test(r.n) ? `${pax()} × ${inr(r.p)}` : `${q} × ${inr(r.p)}`} · ${esc(r.fuel || '')}</small><span>${inr(tot)}${sc.length ? ` · ${tot - save <= 0 ? 'save ' + inr(save - tot) : '+' + inr(tot - save)}` : ''}</span></button>`; }).join('')}</div>
      <p class="note">${ic('alert', 14, 2)} Riders need a valid licence for that vehicle and must be 18 or older; helmets are given and compulsory. A refundable deposit is paid to the vendor.</p></div>`; }
  return `<div class="lx-dt"><div class="lx-dt-row">${cabs.length ? `<button class="lx-chip" data-a="daytool" data-k="veh" data-d="${date}" aria-expanded="${open === 'veh'}">${ic('car', 14, 2)} ${esc(cur || 'Car')} ▾</button>` : ''}${own ? `<span class="lx-chip on">${ic('check', 14, 2.4)} ${esc(RENT[own.ref].n)} for the day</span><button class="lx-chip" data-a="del" data-uid="${own.uid}">Back to cabs</button>` : canWheels ? `<button class="lx-chip" data-a="daytool" data-k="wheels" data-d="${date}" aria-expanded="${open === 'wheels'}">${ic('scooter', 14, 2)} Scooter or bike for the day</button>` : ''}</div>${panel}</div>`; }
document.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (!el) return; const d = el.dataset;
  if (d.a === 'daytool') { S.dayTool = S.dayTool && S.dayTool.date === d.d && S.dayTool.k === d.k ? null : {date:d.d, k:d.k}; rerender(); }
  if (d.a === 'vehscope') { S.vscope = d.k; rerender(); }
  if (d.a === 'vehset') { const sc = S.vscope || 'day'; const list = sc === 'day' ? dayCabs(d.d) : sc === 'isle' ? dayCabs(null, d.z) : S.cart.filter(i => i.kind === 'cab');
    let n = 0; list.forEach(c => { if (ROUTE[c.ref].prices.some(p => p.c === d.c && (c.ret ? p.ret : p.ow))) { c.vc = d.c; n++; } }); syncTrip(); S.dayTool = null; rerender(); toast(`${d.c} on ${n} ride${n === 1 ? '' : 's'}`); }
  if (d.a === 'wheelset') { const r = RENT[d.id]; if (!r) return; const z = r.z; sightCabs(d.d, z).forEach(c => removeItem(c.uid));
    addItem({kind:'rent', ref:r.id, date:d.d, t:'09:00', qty:/Bicycle/.test(r.n) ? pax() : Math.max(1, Math.ceil(S.pax.adults / 2)), days:1}, true); syncTrip(); S.dayTool = null; rerender(); toast(`${r.n} booked for ${fD(d.d)}`); }
});
var ZSHORT = {PBL:'P. Blair', HAV:'Havelock', NEI:'Neil', WAN:'Wandoor', BAR:'Baratang', RAN:'Rangat', LON:'Long Is.', MAY:'Mayabndr', DIG:'Diglipur', LIT:'Hut Bay'};
/* ---------- v4: checkout fields ---------- */
function checkLead() { const val = id => ((document.getElementById(id) || {}).value || '').trim(); const bad = [];
  if (!val('ln')) bad.push(['ln', 'Add the lead traveller’s name, as on their photo ID']);
  if (val('lp').replace(/\D/g, '').length < 10) bad.push(['lp', 'Add a 10-digit WhatsApp number; tickets and updates go there']);
  if (val('le') && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val('le'))) bad.push(['le', 'Check the email address, or leave it empty']);
  document.querySelectorAll('.fld-err').forEach(x => x.remove()); ['ln', 'lp', 'le'].forEach(id => { const el = document.getElementById(id); if (el) el.removeAttribute('aria-invalid'); });
  if (!bad.length) return true;
  bad.forEach(([id, m]) => { const el = document.getElementById(id); if (!el) return; el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', id + '-err'); el.insertAdjacentHTML('afterend', `<small class="fld-err" id="${id}-err" role="alert">${m}</small>`); });
  const f = document.getElementById(bad[0][0]); if (f) { f.scrollIntoView({block:'center', behavior:'smooth'}); f.focus({preventScroll:true}); } toast(bad[0][1]); return false; }
document.addEventListener('input', e => { const el = e.target; if (el && el.getAttribute && el.getAttribute('aria-invalid') === 'true') { el.removeAttribute('aria-invalid'); const m = document.getElementById(el.id + '-err'); if (m) m.remove(); } });
/* ---------- v4: swap a hotel with the price difference ---------- */
function stayAlts(it) { const h0 = HOT[it.ref]; if (!h0) return []; const p0 = info(it).price || 0;
  const hs = D.hotels.filter(h => h.z === h0.z && h.id !== h0.id && !h.est); const score = h => (h.rt || 0) * Math.log10((h.rv || 1) + 1);
  const same = hs.filter(h => h.t === h0.t).sort((a, b) => score(b) - score(a))[0]; const cheaper = hs.filter(h => hotelFrom(h, it.date) < hotelFrom(h0, it.date)).sort((a, b) => score(b) - score(a))[0];
  const up = hs.filter(h => ['Premium', 'Luxury'].includes(h.t) && h.t !== h0.t).sort((a, b) => score(b) - score(a))[0]; const loved = hs.slice().sort((a, b) => score(b) - score(a))[0];
  return [[same, 'Same class'], [cheaper, 'Save'], [loved, 'Most loved'], [up, 'Treat yourself']].filter(([h], i, A) => h && A.findIndex(x => x[0] === h) === i)
    .map(([h, why]) => { const c = Object.assign({}, it, {ref:h.id, room:h.rooms[0].n}); const ds = (info(c).price || 0) - p0; return {h, why, ds, d:swapDelta(it, h)}; }); }
// the real change to the trip total: cabs to the jetty and to activities re-route to the new hotel's area
function swapDelta(it, h) { const keep = S.cart, seq = S.seq; const t0 = total(); S.cart = clone(keep);
  try { const c = S.cart.find(x => x.uid === it.uid); c.ref = h.id; c.room = h.rooms[0].n; syncTrip(); return total() - t0; } catch (e) { return null; } finally { S.cart = keep; S.seq = seq; syncTrip(); } }
const sgn = v => (v > 0 ? '+' : '−') + inr(Math.abs(v));
function stayCompare(it) { const cat = `<button class="lx-chip sm" data-a="swapcat" data-uid="${it.uid}">${ic('search', 13, 2)} Change hotel</button>`; if (!S.swapUid || S.swapUid !== it.uid) return `${cat}<button class="lx-chip sm" data-a="swapopen" data-uid="${it.uid}">${ic('swap', 13, 2)} Quick compare</button>`;
  return `<div class="lx-dt-panel"><b>Other stays on ${esc(ZN[HOT[it.ref].z].name)} for these ${it.nights} night${it.nights > 1 ? 's' : ''}</b><div class="lx-vopts">${stayAlts(it).map(x => `<button class="lx-vopt" data-a="swapstay" data-uid="${it.uid}" data-id="${x.h.id}"><b>${esc(x.h.n)}</b><small>${esc(x.why)} · ${esc(x.h.t || '')}${x.h.rt ? ` · ★ ${x.h.rt}${x.h.rv ? ' (' + x.h.rv.toLocaleString('en-IN') + ')' : ''}` : ''}</small><span>${x.d == null ? sgn(x.ds) : x.d === 0 ? 'same trip total' : sgn(x.d) + ' trip total'}</span>${x.d != null && Math.abs(x.d - x.ds) >= 10 ? `<small>stay ${sgn(x.ds)}, transfers and GST ${sgn(x.d - x.ds)}</small>` : ''}</button>`).join('')}</div><p class="note">Cabs to and from the jetty and your activities follow the new hotel automatically.</p><button class="lx-chip sm" data-a="swapopen" data-uid="">Close</button></div>`; }
document.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (!el) return; const d = el.dataset;
  if (d.a === 'swapopen') { S.swapUid = d.uid || null; rerender(); }
  if (d.a === 'swapstay') { const it = S.cart.find(x => x.uid === d.uid); const h = HOT[d.id]; if (!it || !h) return; S.undo = clone(S.cart); it.ref = h.id; it.room = h.rooms[0].n; S.swapUid = null; syncTrip(); rerender(); toast(`Now staying at ${h.n}`); }
});
/* ---------- v4: pace, compare, share ---------- */
function paceCtl() { const p = S.pace || 'balanced';
  return `<div class="lx-pace" role="radiogroup" aria-label="Pace"><span>Pace</span>${[['relaxed', 'Relaxed', 'One half-day plan a day'], ['balanced', 'Balanced', 'A plan for each free day'], ['packed', 'Packed', 'Fill every free window']].map(([k, l, h]) => `<button data-a="pace" data-k="${k}" aria-pressed="${p === k}" title="${h}">${l}</button>`).join('')}</div>`; }
function shareText() { if (!S.trip) return ''; const days = [...new Set(S.cart.map(i => i.date))].sort();
  const line = i => { const I = info(i); const t = i.kind === 'ferry' ? SAIL[i.ref].dep : i.kind === 'stay' ? 'Stay' : (i.t || ''); return `• ${t ? t + ' ' : ''}${I.title}`; };
  const route = tripRoute(S.cart).map(([z, n]) => `${ZN[z].name} ${n}N`).join(' → ');
  return [`Andaman trip · ${fD(S.trip.start)} – ${fD(S.trip.end)} · ${paxTxt()}`, route, ''].concat(days.flatMap(d => [`Day ${dayIdx(d) + 1} · ${fD(d)}`].concat(S.cart.filter(i => i.date === d && !i.for).map(line), ['']))).concat([`Total ${inr(total())} incl. GST`, 'Planned on Andaman Travel Planner']).join('\n').slice(0, 3500); }
function compareTrips(list) { const rows = [
  ['Dates', x => x.win ? `${fD(x.win.start)} – ${fD(x.win.end)}` : '—'],
  ['Route', x => routeChips(x.route || [])],
  ['Stays', x => [...new Set((x.cart || []).filter(i => i.kind === 'stay' && HOT[i.ref]).map(i => HOT[i.ref].t || '—'))].join(', ') || '—'],
  ['Activities', x => String((x.cart || []).filter(i => i.kind === 'act').length)],
  ['Ferries', x => { const f = (x.cart || []).filter(i => i.kind === 'ferry'); const g = f.filter(i => SAIL[i.ref] && SAIL[i.ref].gov).length; return `${f.length}${g ? ` (${g} government)` : ''}`; }],
  ['Cab rides', x => String((x.cart || []).filter(i => i.kind === 'cab').length)],
  ['Total', x => `<b>${inr(x.total || 0)}</b>`]];
  return `<h3 class="lx-h3">Side by side</h3><div class="lx-cmp" style="--n:${list.length}"><div class="h"></div>${list.map(x => `<div class="h"><b>${esc(x.name)}</b></div>`).join('')}${rows.map(([l, f]) => `<div class="l">${l}</div>${list.map(x => `<div>${f(x)}</div>`).join('')}`).join('')}</div>`; }
document.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (!el) return; const d = el.dataset;
  if (d.a === 'pace') { S.pace = d.k; rerender(); toast(`Pace: ${d.k}. It applies the next time free days are planned.`); } });
if (!SAVE_KEYS.includes('pace')) SAVE_KEYS.push('pace');
/* ---------- v4: a full page for every activity and experience ----------
   Family templates (what's included, what to bring, who can join, how it runs, FAQs) plus each activity's own data
   (slots, closed days, season, meeting point, age, booking status, cut-off). */
var FAMINFO = {
  'Scuba - Try dive': {inc:['PADI-certified instructor with you for the whole dive', 'All gear: mask, fins, wetsuit, buoyancy jacket, regulator and tank', 'Briefing and shallow-water practice before the dive', 'Drinking water and a freshwater shower'], not:['Underwater photos and video, unless your option includes them', 'Cab to the dive centre, unless you add one'], bring:['Swimwear and a towel', 'Reef-safe sunscreen', 'A change of clothes', 'Photo ID'],
    who:'No swimming needed: the instructor holds you and controls your depth. You fill a short medical form; asthma, heart conditions, recent surgery or pregnancy need a doctor’s sign-off first.', steps:[[-15, 'Report at the dive centre, fill the medical form'], [0, 'Briefing: breathing, equalising and hand signals'], [20, 'Gear up and practise in shallow water'], [45, 'Dive with your instructor, about 30 minutes underwater'], [90, 'Back on shore, shower, photos shared if booked']],
    faq:[['Do I need to know swimming?', 'No. Discover Scuba is made for non-swimmers; your instructor stays within arm’s reach throughout.'], ['Can I wear glasses?', 'Contact lenses are fine. Some centres keep prescription masks; ask our desk when you book.'], ['When can I fly after diving?', 'Not for 18 hours. The planner checks this against your flight home.'], ['What if the sea is rough?', 'The dive is moved to another slot or refunded in full.']]},
  'Scuba - Certified dives': {inc:['Dive guide, tanks and weights', 'Boat to the dive site where the option says so', 'Drinking water'], not:['Full gear rental unless included in your option', 'Nitrox, unless requested'], bring:['Certification card and logbook', 'Your own mask or computer if you prefer', 'Swimwear, towel, reef-safe sunscreen'],
    who:'For certified divers. If your last dive was more than 12 months ago, the centre will ask for a short refresher first.', steps:[[-30, 'Check-in, paperwork and gear fitting'], [0, 'Boat ride and site briefing'], [30, 'First dive'], [100, 'Surface interval with snacks and water'], [150, 'Second dive, then back to shore']],
    faq:[['Which certifications are accepted?', 'PADI, SSI and other recognised agencies.'], ['When can I fly?', 'Not for 18–24 hours after your last dive. The planner checks it against your flight.'], ['What will I see?', 'Reef fish, corals, turtles on many sites; visibility is best from December to April.']]},
  'Scuba - Courses': {inc:['Instructor-led theory, confined-water and open-water dives', 'All gear for the course', 'Certification processing on completion'], not:['Accommodation and meals', 'Extra fun dives after the course'], bring:['Swimwear, towel, reef-safe sunscreen', 'Photo ID and two passport photos if asked', 'Any medication you take, declared on the medical form'],
    who:'Minimum age 10. You need to swim 200 m (or 300 m with mask and fins) and float for 10 minutes. Plan at least three nights on the island.', steps:[[0, 'Day 1: theory and confined-water skills'], [0, 'Day 2: first open-water dives'], [0, 'Day 3: final open-water dives and certification']],
    faq:[['How many days does it take?', 'Three to four days, depending on the course and the sea.'], ['When can I fly?', 'Not for 24 hours after your final dive.'], ['Is the certificate valid worldwide?', 'Yes, it is recognised by dive centres everywhere.']]},
  'Snorkelling': {inc:['Mask, snorkel and life jacket', 'Guide where your option says guided'], not:['The boat to the beach, if it is booked separately', 'Underwater photos unless included'], bring:['Swimwear and a towel', 'Reef-safe sunscreen', 'Water to drink'],
    who:'Non-swimmers can join with a life jacket. Children are welcome with an adult. Please don’t stand on or touch the coral.', steps:[[-10, 'Meet the guide on the beach'], [0, 'Fit mask and life jacket, quick breathing practice'], [10, 'Snorkel over the reef'], [40, 'Back on the beach']],
    faq:[['Can non-swimmers snorkel?', 'Yes, with a life jacket and a guide close by.'], ['What will I see?', 'Parrotfish, clownfish, corals and, on lucky days, turtles.'], ['Is the price per person?', 'Yes.']]},
  'Sea walk': {inc:['Helmet with air pumped from the boat', 'Guide in the water with you', 'Photos where your option says so'], not:['Boat to the island if booked separately'], bring:['Swimwear and a towel', 'Contact lenses rather than glasses'],
    who:'No swimming needed; you walk on the sea bed at 4–6 m with your head dry inside the helmet. Not advised with heart or lung conditions, epilepsy, a cold or pregnancy.', steps:[[-15, 'Report at the sea-walk platform'], [0, 'Briefing and hand signals'], [15, 'Climb down the ladder and walk on the sea bed for about 20 minutes'], [45, 'Back on the platform, photos shared']],
    faq:[['Will my hair get wet?', 'Usually not; the helmet keeps your head in an air pocket.'], ['Can I go with glasses?', 'Glasses don’t fit in the helmet; lenses are fine.']]},
  'Glass bottom & semi-sub': {inc:['Seat on the boat', 'Life jacket and the operator’s commentary'], not:['Cab to the jetty unless booked'], bring:['Hat and sunscreen', 'Something for motion sickness if you need it'],
    who:'All ages, no swimming. A good choice for older travellers and small children.', steps:[[-20, 'Report at the jetty'], [0, 'Board and sail to the reef'], [10, 'View the coral through the glass hull'], [50, 'Back at the jetty']],
    faq:[['Will I get wet?', 'No, you stay dry inside the boat.'], ['Is it worth it in rain?', 'Visibility drops after heavy rain; the operator reschedules if it is poor.']]},
  'Motor water sports': {inc:['Ride time with an operator', 'Life jacket'], not:['Photos and video unless included', 'Boat to the beach if booked separately'], bring:['Clothes that can get wet', 'A dry bag for your phone'],
    who:'Rides are wind and sea permitting. Weight and age limits apply on some rides; the operator confirms on the spot.', steps:[[-10, 'Report at the water-sports counter'], [0, 'Safety briefing and life jacket'], [5, 'Your ride'], [25, 'Back on the beach']],
    faq:[['What if it is too windy?', 'The ride is moved to another time or refunded.'], ['Can I drive the jet ski?', 'An operator rides with you or drives; self-drive depends on the beach rules that day.']]},
  'Kayaking': {inc:['Kayak, paddle and life jacket', 'Guide throughout', 'Head torch on night trips'], not:['Cab to the start point unless booked'], bring:['Quick-dry clothes and sandals', 'Insect repellent for the mangroves', 'Water to drink'],
    who:'No experience needed; basic fitness helps. Children paddle in a double kayak with an adult.', steps:[[-15, 'Meet the guide at the launch point'], [0, 'Briefing and paddling basics'], [15, 'Paddle through the creek or along the shore'], [120, 'Back at the launch point']],
    faq:[['Will the water glow on the night trip?', 'Bioluminescence needs a dark sky; it is strongest around the new moon and weakest near full moon. The planner flags bright-moon nights.'], ['Is it safe for beginners?', 'Yes, the routes are calm and guided.']]},
  'Boat trips': {inc:['Return boat ticket', 'Life jacket'], not:['Island entry fees unless stated', 'Water sports on the island', 'Cab to the jetty unless booked'], bring:['Original photo ID for every traveller (checked at the jetty)', 'Hat, sunscreen and water', 'Cash for snacks on the island'],
    who:'All ages. Boats run in daylight and stop in rough sea.', steps:[[-30, 'Report at the jetty with ID'], [0, 'Boat leaves'], [20, 'Time on the island'], [180, 'Boat back']],
    faq:[['Can I choose the return time?', 'Boats run to fixed slots; the planner shows them.'], ['What if the boat is cancelled?', 'Full refund or another slot.']]},
  'Cruises & charters': {inc:['Boat and crew', 'Fuel and life jackets'], not:['Meals unless stated', 'Snorkel gear unless stated'], bring:['Photo ID', 'Hat, sunscreen, a light jacket for the wind'],
    who:'All ages. Subject to sea conditions and port clearance.', steps:[[-30, 'Report at the jetty'], [0, 'Sail'], [60, 'Time at sea or at the island'], [240, 'Return']],
    faq:[['Is it private?', 'The option says whether it is shared or private.'], ['What about bad weather?', 'Port control can cancel at short notice; you get a full refund or another date.']]},
  'Fishing': {inc:['Boat and crew', 'Rods, tackle and bait'], not:['Fishing permit from the Fisheries Department (added separately)', 'Food and drinks'], bring:['Hat, sunscreen, water', 'Photo ID for the permit'],
    who:'Catch and release on sport-fishing trips. No experience needed.', steps:[[-20, 'Report at the jetty'], [0, 'Head out to the fishing grounds'], [30, 'Fish with the crew'], [240, 'Back to the jetty']],
    faq:[['Do I need a permit?', 'Yes; our desk arranges it. It is a separate item in your trip.'], ['Can we keep the catch?', 'Sport trips are catch and release.']]},
  'Walks & nature': {inc:['Guide where the option says guided', 'Entry or forest permit where stated'], not:['Cab to the start point unless booked'], bring:['Walking shoes with grip', 'Two litres of water per person', 'Insect repellent and a rain jacket'],
    who:'Basic fitness; some trails are steep or slippery after rain. Start early to avoid the midday heat.', steps:[[-10, 'Meet the guide at the start point'], [0, 'Walk'], [60, 'Viewpoint or beach stop'], [120, 'Back at the start']],
    faq:[['Is a guide compulsory?', 'In national parks such as Saddle Peak, yes; the option includes one.'], ['What if it rains?', 'Trails can close after heavy rain; you get another slot or a refund.']]},
  'Sightseeing tours': {inc:['Private cab with driver for the tour', 'Fuel, parking and the driver’s waiting time'], not:['Entry tickets and boat fares unless stated', 'Meals'], bring:['Photo ID', 'Water, hat, sunscreen', 'Cash for small entry and camera fees'],
    who:'All ages. The driver follows the order in your plan and adjusts for closures.', steps:[[0, 'Pickup from your hotel'], [30, 'First stop'], [120, 'Next stops in the planned order'], [300, 'Drop back at your hotel']],
    faq:[['Can I change the stops?', 'Yes, within the same time and distance; tell the driver or our desk.'], ['Is the price per car?', 'Yes, for the whole group up to the vehicle’s seats.']]},
  'Places to visit': {inc:['Entry ticket where one is needed'], not:['Cab to the place unless you add one', 'Camera fee where charged'], bring:['Photo ID', 'Water and a hat'],
    who:'Open to everyone. Check the opening days below.', steps:[], faq:[['Do I need to book ahead?', 'Not for most places; we add the ticket so the day plan stays on time.'], ['How do I get there?', 'Add the suggested cab, or use your own scooter.']]},
  'Add-ons': {inc:['As described in the option'], not:[], bring:[], who:'Added to your booking.', steps:[], faq:[]}};
const INTERNAL_NOTE = /market review|vendor cost|confirm vendor|Fixed govt fee|our margin|commission/i;
const pubNote = a => a.note && !INTERNAL_NOTE.test(a.note) ? a.note : '';
const WATERF = ['Scuba - Try dive', 'Scuba - Certified dives', 'Scuba - Courses', 'Snorkelling', 'Sea walk', 'Glass bottom & semi-sub', 'Motor water sports', 'Kayaking', 'Boat trips', 'Cruises & charters', 'Fishing'];
function wxLine(a) { if ((a.tags || []).includes('rain')) return 'Runs in light rain.'; if (WATERF.includes(a.fam) || (a.tags || []).includes('sea')) return 'Weather and sea permitting.'; if (a.entry) return ''; return 'Weather permitting.'; }
function famInfo(a) { return FAMINFO[a.fam] || FAMINFO['Add-ons']; }
const DOWS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
function weekGrid(a) { const sl = slotsFor(a);
  return `<div class="lx-week">${[1, 2, 3, 4, 5, 6, 0].map((dw, i) => { const hard = (a.closed || []).includes(dw) || (() => { const r = closedRule(a.id, dw); return r && r.sev === 'HARD'; })(); const soft = !hard && closedRule(a.id, dw);
    return `<div class="${hard ? 'off' : ''}"><b>${DOWS[i]}</b><span>${hard ? 'Closed' : a.dates ? 'Set dates' : a.entry ? `${a.open || '—'}–${a.close || ''}` : esc(sl.slice(0, 3).join(' · ') + (sl.length > 3 ? ' …' : ''))}</span>${soft ? '<i>see note</i>' : ''}</div>`; }).join('')}</div>`; }
function glance(a, it) { const sl = slotsFor(a); const I = info(it); const st = bookStatus(it); const cut = a.ops && a.ops.cut;
  const rows = [['Duration', durOf(a) || 'Flexible'], ['Starts', a.entry ? `${a.open || ''}–${a.close || ''}` : sl.length > 1 ? `${sl[0]} to ${sl[sl.length - 1]}` : sl[0] || '—'],
    ['Meeting point', a.site || ZN[a.z].name], ['Age', a.age ? `${a.age}+` : 'All ages'], ['Swimming', (a.tags || []).includes('ns') ? 'Not needed' : (a.tags || []).includes('uw') ? 'Needed' : 'Not needed'],
    ['Group', a.ops && a.ops.cap ? `Up to ${a.ops.cap}` : '—'], ['Report', I.rep ? `${I.rep} min before` : 'On time'], ['Run by', (() => { try { return a.entry ? 'Government / site office' : vendorFor(a); } catch (e) { return '—'; } })()], ['Children', a.ops && a.ops.child != null && !a.entry ? (a.ops.child === 0 ? 'Not suitable' : `${a.ops.child}% of adult price`) : '—'], ['Season', a.sea || 'All year'], ['Book by', cut ? (cut >= 24 ? `${Math.round(cut / 24)} day${cut >= 48 ? 's' : ''} before` : `${cut} h before`) : 'Same day'], ['Confirmation', st ? BKL[st][1] : '—']];
  return `<div class="lx-glance">${rows.filter(([, v]) => v && v !== '—').map(([k, v]) => `<div><small>${k}</small><b>${esc(String(v))}</b></div>`).join('')}</div>${(a.tags || []).length ? `<div class="lx-tags">${a.tags.map(x => TAGNAME[x] ? `<span class="tag">${esc(TAGNAME[x])}</span>` : '').join('')}</div>` : ''}`; }
function stepsFor(a) { if (a.steps && a.steps.length) return a.steps; const F = famInfo(a); if (!F.steps.length) return [];
  const t0 = tm(slotsFor(a)[0] || a.t || '09:00'); return F.steps.map(([off, l]) => [a.d >= 1440 ? '' : hm(Math.max(0, t0 + off)), l]); }
function getThere(a) { const z = a.z === 'WAN' ? 'PBL' : a.z; let sr = null; try { sr = siteRoute(a, HUB[z]); } catch (e) {}
  const rep = (info({kind:'act', ref:a.id, date:baseDate(), t:a.t, qty:1, pa:1}).rep) || 0;
  return `<p class="policy">${sr ? `About ${sr.r.mins} min by cab from ${esc(sr.rev ? sr.r.b : sr.r.a)}. When you add this to a trip, the planner offers the cab from your hotel, timed to arrive ${rep ? rep + ' min early' : 'on time'}; skip it if you have a scooter.` : `Meet at ${esc(a.site || ZN[a.z].name)}.${rep ? ` Please arrive ${rep} min early.` : ''}`}</p>`; }
function faqFor(a) { const F = famInfo(a); const out = F.faq.slice();
  if (a.age) out.push(['Can children join?', `From age ${a.age}.${a.ops && a.ops.child ? ` Children pay ${a.ops.child}% of the adult price.` : ''}`]); else if ((a.tags || []).includes('kid')) out.push(['Can children join?', 'Yes, with an adult.']);
  if (a.cond) out.push(['Anything that affects it on the day?', a.cond + '.']);
  out.push(['When is it confirmed?', BKL[bookStatus({kind:'act', ref:a.id}) || 'instant'][1] + (bookStatus({kind:'act', ref:a.id}) === 'desk' ? '. Our Port Blair desk confirms within a few hours, before you pay the balance.' : bookStatus({kind:'act', ref:a.id}) === 'request' ? '. The partner confirms within 24 hours; you are only charged once it is confirmed.' : ': your voucher is issued as soon as you pay.')]);
  return out; }
function actPage(a, cfg) { if (!a) return ''; const F = famInfo(a); const it = Object.assign({kind:'act', ref:a.id, qty:1, pa:1}, cfg || {}); const out = [];
  out.push(`<div class="dsec"><h3>At a glance</h3>${glance(a, it)}${pubNote(a) ? `<p class="policy">${esc(pubNote(a))}</p>` : ''}</div>`);
  out.push(`<div class="dsec"><h3>Days and times</h3>${weekGrid(a)}${a.dates ? `<p class="policy">Runs on set dates: ${a.dates.filter(d => d >= TODAY).slice(0, 6).map(fD).join(' · ')}.</p>` : ''}${(() => { const notes = [0, 1, 2, 3, 4, 5, 6].map(dw => closedRule(a.id, dw)).filter(Boolean).filter((r, i, A) => A.indexOf(r) === i).map(r => r.msg); return notes.length ? `<p class="policy">${notes.map(esc).join(' ')}</p>` : ''; })()}<p class="policy">Season: ${esc(a.sea || 'all year')}. ${wxLine(a)}</p></div>`);
  const st = stepsFor(a); if (st.length && !(a.steps && a.steps.length)) out.push(`<div class="dsec"><h3>How it runs</h3><ol class="lx-steps">${st.map(([tt, l]) => `<li>${tt ? `<span class="mono">${esc(tt)}</span>` : '<span></span>'}<span>${esc(l)}</span></li>`).join('')}</ol><p class="policy">Typical timings. Your voucher shows the exact reporting time for your slot.</p></div>`);
  out.push(actExtras(a, cfg));
  out.push(`<div class="dsec lx-two"><div><h3>Included</h3><ul class="lx-ul ok">${F.inc.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>${F.not.length ? `<div><h3>Not included</h3><ul class="lx-ul no">${F.not.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}</div>`);
  if (F.bring.length) out.push(`<div class="dsec"><h3>What to bring</h3><ul class="lx-ul">${F.bring.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`);
  out.push(`<div class="dsec"><h3>Who can join</h3><p class="policy">${esc(F.who)}${a.age ? ` Minimum age ${a.age}.` : ''}${a.fb ? ` No flying for ${a.fb} hours afterwards; the planner checks your flight.` : ''}</p></div>`);
  out.push(`<div class="dsec"><h3>Getting there</h3>${getThere(a)}</div>`);
  out.push(reviewBlock(a));
  const fq = faqFor(a); if (fq.length) out.push(`<div class="dsec"><h3>Questions</h3>${fq.map(([q, an]) => `<details class="lx-faq"><summary>${esc(q)}</summary><p>${esc(an)}</p></details>`).join('')}</div>`);
  return out.join(''); }
/* ---------- v4: categories and filters everywhere ---------- */
var GOODFOR = [['ns', 'Non-swimmers'], ['kid', 'Kids'], ['sen', 'Seniors'], ['cpl', 'Couples'], ['adr', 'Adventure'], ['nat', 'Nature'], ['his', 'History'], ['sun', 'Sunrise & sunset'], ['night', 'After dark'], ['rain', 'Rainy day'], ['off', 'Offbeat']];
var AF_TOD = [['am', 'Morning', 0, 720], ['pm', 'Afternoon', 720, 1020], ['eve', 'Evening', 1020, 1440]];
var BUDS = [['lo', 'Under ₹1,000', 0, 1000], ['mid', '₹1,000–3,000', 1000, 3000], ['hi', '₹3,000+', 3000, 1e9]];
function actPriceOf(a) { return a.entry ? (a.p || 0) : (a.p || 0); }
function actOk(a) { const f = S.af || {}; const sl = slotsFor(a);
  if (f.g && !(a.tags || []).includes(f.g)) return false;
  if (f.tod) { const T = AF_TOD.find(x => x[0] === f.tod); if (!sl.some(s => tm(s) >= T[2] && tm(s) < T[3]) && !(a.entry && f.tod !== 'eve')) return false; }
  if (f.bud) { const B = BUDS.find(x => x[0] === f.bud); const p = actPriceOf(a); if (!(p >= B[2] && p < B[3])) return false; }
  return true; }
function actFilterBar(n) { const f = S.af || {}; const chip = (k, v, l) => `<button class="chip sm" data-a="af" data-k="${k}" data-v="${v}" aria-pressed="${(f[k] || '') === v}">${l}</button>`;
  return `<details class="lx-filters"${S.afOpen || f.g || f.tod || f.bud ? ' open' : ''}><summary>${ic('search', 15, 2)} Filters${f.g || f.tod || f.bud ? ' · on' : ''}<span class="muted">${n != null ? n + ' match' + (n === 1 ? '' : 'es') : ''}</span></summary>
    <div class="eyebrow">Good for</div><div class="chips">${chip('g', '', 'Anyone')}${GOODFOR.map(([k, l]) => chip('g', k, l)).join('')}</div>
    <div class="eyebrow">Time of day</div><div class="chips">${chip('tod', '', 'Any time')}${AF_TOD.map(([k, l]) => chip('tod', k, l)).join('')}</div>
    <div class="eyebrow">Budget per person</div><div class="chips">${chip('bud', '', 'Any')}${BUDS.map(([k, l]) => chip('bud', k, l)).join('')}</div>
    ${f.g || f.tod || f.bud ? `<button class="btn ghost sm" data-a="afclear">Clear filters</button>` : ''}</details>`; }
// stays: area within the island and rating
var AREA = null; function areaName(k) { if (!AREA) { AREA = {}; D.routes.forEach(r => { const ks = rkeys(r); if (ks.length === 2) { AREA[ks[0]] = AREA[ks[0]] || r.a; AREA[ks[1]] = AREA[ks[1]] || r.b; } }); } return (AREA[k] || k).replace(/ \(.*\)$/, '').replace(/ hotels?( & market)?$/, ''); }
function stayOk(h) { const f = S.sf || {}; if (f.area && hotelKey(h) !== f.area) return false; if (f.r4 && !(h.rt >= 4)) return false; return true; }
function stayFilterBar(z) { const f = S.sf || {}; const areas = [...new Set(D.hotels.filter(h => h.z === z).map(h => hotelKey(h)))].filter(Boolean);
  return `${areas.length > 1 ? `<div class="eyebrow">Area</div><div class="chips"><button class="chip sm" data-a="sf" data-k="area" data-v="" aria-pressed="${!f.area}">Anywhere</button>${areas.map(k => `<button class="chip sm" data-a="sf" data-k="area" data-v="${k}" aria-pressed="${f.area === k}">${esc(areaName(k))}</button>`).join('')}</div>` : ''}
    <div class="chips"><button class="chip sm" data-a="sf" data-k="r4" data-v="${f.r4 ? '' : '1'}" aria-pressed="${!!f.r4}">★ 4+ rated</button></div>`; }
// transport: grouped by type
var MOVET = [['air', 'Airport & jetty', r => ['airport', 'jetty'].includes(r.kind)], ['drop', 'Sightseeing drops', r => ['drop', 'transfer'].includes(r.kind)], ['day', 'Full day & tours', r => r.kind === 'daytrip' && !/^RT-LONG-/.test(r.id)], ['boat', 'Boat hire', r => !!r.boat], ['road', 'Road trips north', r => !r.boat && (r.kind === 'road' || /^RT-LONG-/.test(r.id))], ['rent', 'Rentals', null]];
function moveContent(z, rs, rents, date, v) { const types = MOVET.filter(([k, , fn]) => k === 'rent' ? rents.length : rs.some(fn)); const mt = types.some(t => t[0] === v.mt) ? v.mt : (types[0] || [])[0];
  const T = MOVET.find(t => t[0] === mt); const list = T && T[2] ? rs.filter(T[2]) : [];
  const origins = [...new Set(list.map(r => r.a))]; const og = v.og && origins.includes(v.og) ? v.og : origins[0];
  return `<div class="eyebrow">Day</div>${dayPicker(date, 'storedate')}
    <p class="note">Every cab is point to point: a drop, or a return with waiting. Vehicle is picked to seat ${pax()}; change it on your trip page.</p>
    ${types.length ? `<div class="chips">${types.map(([k, l, fn]) => `<button class="chip" data-a="mvt" data-k="${k}" aria-pressed="${k === mt}">${l} <span class="faint">${k === 'rent' ? rents.length : rs.filter(fn).length}</span></button>`).join('')}</div>` : ''}
    ${mt === 'rent' ? `<div class="list">${rents.map(rentCard).join('')}</div>` : `${origins.length > 1 ? `<div class="eyebrow">Starting from</div><div class="chips">${origins.map(o => `<button class="chip sm" data-a="og" data-og="${esc(o)}" aria-pressed="${o === og}">${esc(o.replace(/ \(.*\)$/, ''))}</button>`).join('')}</div>` : ''}<div class="list">${list.filter(r => r.a === og).map(r => cabCard(r, date)).join('')}</div>`}
    ${!rs.length && !rents.length ? `<p class="muted">Local cabs here are booked on arrival for now.</p>` : ''}`; }
// every experience on every island, one page
function vExp(v) { const date = baseDate(); const f = S.af || {}; const isl = v.z || ''; const ck = v.ck || '';
  let acts = D.acts.filter(a => shown(a) && (!isl || a.z === isl || (isl === 'PBL' && a.z === 'WAN')));
  const cats = CATS.filter(c => acts.some(a => c.fams.includes(a.fam))); if (ck) { const c = CATS.find(x => x.k === ck); if (c) acts = acts.filter(a => c.fams.includes(a.fam)); }
  acts = acts.filter(actOk); const sort = v.sort || 'pop';
  acts.sort((a, b) => sort === 'top' ? ((b.g ? b.g.rt : 0) - (a.g ? a.g.rt : 0)) || ((b.g ? b.g.rv : 0) - (a.g ? a.g.rv : 0)) : sort === 'price' ? actPriceOf(a) - actPriceOf(b) : sort === 'short' ? (a.d || 0) - (b.d || 0) : (popOf(b.id) - popOf(a.id)) || (actPriceOf(a) - actPriceOf(b)));
  const isles = [...new Set(D.acts.filter(shown).map(a => a.z === 'WAN' ? 'PBL' : a.z))];
  return {title:'All experiences', body:`<div class="wrap"><div class="sec"><div class="sechd"><h2>All experiences</h2><span class="sub">${acts.length} of ${D.acts.filter(shown).length}</span></div>
    <div class="eyebrow">Island</div><div class="chips"><button class="chip sm" data-a="expset" data-k="z" data-v="" aria-pressed="${!isl}">All islands</button>${isles.map(z => `<button class="chip sm" data-a="expset" data-k="z" data-v="${z}" aria-pressed="${isl === z}">${esc(ZN[z].name)}</button>`).join('')}</div>
    <div class="eyebrow">Category</div><div class="chips"><button class="chip sm" data-a="expset" data-k="ck" data-v="" aria-pressed="${!ck}">All</button>${cats.map(c => `<button class="chip sm" data-a="expset" data-k="ck" data-v="${c.k}" aria-pressed="${ck === c.k}">${esc(c.n)}</button>`).join('')}</div>
    ${actFilterBar(acts.length)}
    <div style="display:flex;justify-content:flex-end;margin:6px 0"><div class="chips">${[['pop', 'Most booked'], ['top', 'Top rated'], ['price', 'Lowest price'], ['short', 'Shortest']].map(([k, l]) => `<button class="chip sm" data-a="expset" data-k="sort" data-v="${k}" aria-pressed="${sort === k}">${l}</button>`).join('')}</div></div>
    <div class="list">${acts.map(a => actCard(a, date)).join('') || '<p class="muted">Nothing matches these filters. Clear one to see more.</p>'}</div></div></div>`}; }
Object.assign(VIEWS, {exp:vExp}); Object.assign(TABV, {exp:'explore'});
document.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (!el) return; const d = el.dataset;
  if (d.a === 'af') { S.af = Object.assign({}, S.af || {}, {[d.k]:d.v}); rerender(); }
  if (d.a === 'afclear') { S.af = {}; rerender(); }
  if (d.a === 'sf') { S.sf = Object.assign({}, S.sf || {}, {[d.k]:d.v}); rerender(); }
  if (d.a === 'mvt') { const c = cur(); c.mt = d.k; c.og = null; rerender(); }
  if (d.a === 'expset') { const c = cur(); c[d.k] = d.v; rerender(); }
});

document.addEventListener('toggle', e => { if (e.target && e.target.classList && e.target.classList.contains('lx-filters')) S.afOpen = e.target.open; }, true);
document.addEventListener('click', e => { const el = e.target.closest('[data-a="ffset"]'); if (el) { S.ff = el.dataset.k || ''; rerender(); } });
/* ---------- v4: Google rating and reviews (snapshot now, live via Places API at launch) ---------- */
function gLink(a) { return a.g ? `https://www.google.com/maps/place/?q=place_id:${a.g.pid}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((a.n || '') + ', ' + (ZN[a.z] ? ZN[a.z].name : '') + ', Andaman')}`; }
function gCount(n) { return n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k' : String(n); }
function gChip(a) { return a && a.g && a.g.rt ? `<span class="gchip" title="Google rating for ${esc(a.g.k)}">★ ${a.g.rt} <small>(${gCount(a.g.rv)}) Google</small></span>` : ''; }
function reviewBlock(a) { const asof = D.gmeta ? fD(D.gmeta.asof) : '';
  if (a.g && a.g.rt) return `<div class="dsec lx-rev"><h3>Reviews</h3><div class="lx-rev-top"><b class="big">${a.g.rt}</b><span class="stars" aria-hidden="true">${'★'.repeat(Math.round(a.g.rt))}${'☆'.repeat(5 - Math.round(a.g.rt))}</span><span class="muted">${a.g.rv.toLocaleString('en-IN')} Google reviews of ${esc(a.g.k)} · as of ${asof}</span></div>
    ${a.gtip ? `<p class="policy"><b>Good to know:</b> ${esc(a.gtip)}</p>` : ''}<p class="policy lx-rev-sum">What reviewers say: a summary from Google appears here once ATP's live Google connection is switched on.</p>
    <a class="btn ghost sm" href="${gLink(a)}" target="_blank" rel="noopener">Read all reviews on Google Maps</a></div>`;
  return `<div class="dsec lx-rev"><h3>Reviews</h3><p class="policy">The Google rating and review summary for this experience appear here once ATP's live Google connection is switched on.</p><a class="btn ghost sm" href="${gLink(a)}" target="_blank" rel="noopener">Look it up on Google Maps</a></div>`; }
function hotelRevBlock(h) { return `<div class="dsec lx-rev"><h3>Reviews</h3>${h.rt ? `<div class="lx-rev-top"><b class="big">${h.rt}</b><span class="muted">${(h.rv || 0).toLocaleString('en-IN')} guest reviews</span></div>` : '<p class="policy">The Google rating and review summary for this stay appear here once ATP\'s live Google connection is switched on.</p>'}<a class="btn ghost sm" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.n + ', ' + ZN[h.z].name + ', Andaman')}" target="_blank" rel="noopener">See it on Google Maps</a></div>`; }
/* ---------- v4: nudge planner-added activities whose cab would clash ----------
   After completion, an activity the planner placed can sit so close to a ferry landing that its cab would leave before the
   jetty cab arrives. Move only planner-added activities to a later slot that clears the clash; never the traveller's own. */
function nudgeClashes(keep) { keep = keep || [];
  for (let pass = 0; pass < 4; pass++) { const R = run(S.cart); if (!R.hard) return; let moved = false; const acts = new Map();
    Object.entries(R.by).forEach(([u, al]) => { if (!al.some(a => a.sev === 'hard' && /Time clash|Not enough time/.test(a.title))) return; const it = S.cart.find(x => String(x.uid) === String(u)); if (!it) return;
      if (it.kind === 'cab' && it.for && !it.leg) { const a = S.cart.find(x => x.uid === it.for); if (a && a.kind === 'act') acts.set(a.uid, a); } else if (it.kind === 'act') acts.set(it.uid, it); });
    for (const a0 of acts.values()) { if (keep.includes(a0.uid)) continue; const A = ACT[a0.ref]; if (!A) continue; const t0 = tm(a0.t || A.t || '09:00'); const sl = slotsFor(A);
      const cands = A.entry || !sl.length ? [15, 30, 45, 60, 90, 120, 150, 180].map(k => t0 + k) : sl.map(tm).filter(x => x > t0);
      const h0 = run(S.cart).hard; const snap = JSON.stringify(S.cart); let ok = false;
      for (const c of cands) { if ((A.close && c + (A.d || 60) > tm(A.close)) || c > 1320) break;
        const x = S.cart.find(q => q.uid === a0.uid); if (!x) break; const dl = c - t0; x.t = hm(c);
        let fine = true; S.cart.filter(q => q.kind === 'act' && q !== x && q.date === x.date && !keep.includes(q.uid) && tm(q.t || '00:00') > t0).forEach(q => { const B = ACT[q.ref]; if (!B) return; const want = tm(q.t) + dl; const bs = slotsFor(B);
          const nt = B.entry || !bs.length ? want : (bs.map(tm).find(v => v >= want) ?? null); if (nt == null || (B.close && nt + (B.d || 60) > tm(B.close)) || nt > 1320) { fine = false; return; } q.t = hm(nt); });
        if (fine) { syncTrip(); if (run(S.cart).hard < h0) { ok = true; moved = true; break; } } S.cart = JSON.parse(snap); }
      if (!ok) { S.cart = JSON.parse(snap); syncTrip(); } }
    if (!moved) return; } }
/* ---------- v4: a hired boat as an alternative on the ferry search ---------- */
function boatOffer(from, to, date) { const L = D.routes.filter(r => r.boat && ((r.z === from && r.move === to) || (r.z === to && r.move === from))); if (!L.length) return '';
  return `<div class="card lx-assist" style="margin-top:12px"><b>Or hire a boat</b>${L.map(r => { const p = Math.min(...r.prices.map(x => x.ow).filter(Boolean));
    return `<div class="muted" style="font-size:14.5px;margin:6px 0">Private boat ${esc(ZN[from].name)} to ${esc(ZN[to].name)}, about ${durTxt(r.mins)}, any time in daylight. From ${inr(p)} for the boat (up to ${Math.max(...r.prices.map(x => x.seats))} people). The Port Blair desk confirms the boat and the weather.</div>
    <button class="btn" data-a="product" data-kind="cab" data-id="${r.id}" data-date="${date || ''}">See boat hire</button>`; }).join('')}</div>`; }
/* ---------- v4: book the boat an activity depends on (Ross & Smith, North Bay, Merk Bay ...) ----------
   The rule offers a choice; when completing a trip we pick the cheapest option that seats the whole group. */
function seatsOfAct(a) { const m = /(?:up to|for)\s*(\d+)|(\d+)\s*pax/i.exec(a.v || ''); return m ? +(m[1] || m[2]) : (a.b === 'per_boat' ? 6 : 99); }
function addCarriers() { for (let k = 0; k < 6; k++) { const R = run(S.cart); let done = false;
  for (const [u, al] of Object.entries(R.by)) { for (const w of al) { if (w.sev !== 'hard' || !w.fix) continue; const opts = w.fix.filter(f => f.act === 'quickadd' && f.kind === 'act' && ACT[f.ref]); if (!opts.length) continue;
      const fit = opts.filter(f => seatsOfAct(ACT[f.ref]) >= pax()); const L = (fit.length ? fit : opts).slice().sort((x, y) => { const a = ACT[x.ref], b = ACT[y.ref]; const px = (actPrice(a) || 0) * (a.b === 'per_pax' ? pax() : 1), py = (actPrice(b) || 0) * (b.b === 'per_pax' ? pax() : 1); return px - py; });
      const n0 = S.cart.length; quickAdd(L[0]); const boat = S.cart.slice(n0).find(i => i.kind === 'act' && i.ref === L[0].ref) || S.cart.filter(i => i.kind === 'act' && i.ref === L[0].ref).pop();
      const own = S.cart.find(i => String(i.uid) === String(u)); if (boat && !(own && ACT[own.ref] && (ACT[boat.ref].d || 0) < (ACT[own.ref].d || 0))) S.cart.filter(c => c.kind === 'cab' && String(c.for) === String(u)).forEach(c => { c.for = boat.uid; });   /* the boat is the outing: its cabs wait for the boat */
      syncTrip(); done = true; break; } if (done) break; }
  if (!done) return; } }
/* ---------- v4: ready-made plans run airport to airport ----------
   Every package starts with the airport pickup and ends with the airport drop. With flights the times follow them;
   without, a usual-time placeholder is set (pickup 10:00, drop pickup 09:00) and it moves once the flight is added. */
(function () { const b0 = buildPkg;
  buildPkg = function (p, start) { const r = b0.apply(this, arguments); try { airportEnds(start, addD(start, p.nights)); } catch (e) { console.error(e); } return r; }; })();
function airportEnds(d0, d1) { const fi = flightIn(), fo = flightOut(); const okT = x => /^\d{1,2}:\d{2}$/.test(x || '');
  const isAir = (c, inbound) => c.kind === 'cab' && /^RT-IXZ-/.test(c.ref) && !c.for && (inbound ? !c.rev : !!c.rev);
  if (!S.cart.some(c => c.date === d0 && isAir(c, true))) { const f = placeRoute('IXZ', baseKey(S.cart, 'PBL', d0, false), 'PBL') || {r:ROUTE['RT-IXZ-ABERDEEN'], rev:false};
    const t = fi && okT(fi.arr) && fi.date === d0 ? hm(Math.ceil((tm(fi.arr) + 20) / 5) * 5) : '10:00'; addItem(Object.assign({kind:'cab', ref:f.r.id, date:d0, t, vc:vehFor(f.r).c, air:'in'}, f.rev ? {rev:true} : {}), true); }
  if (d1 > d0 && !S.cart.some(c => c.date === d1 && isAir(c, false))) { const f = placeRoute('IXZ', baseKey(S.cart, 'PBL', d1, true), 'PBL') || {r:ROUTE['RT-IXZ-ABERDEEN'], rev:false};
    const t = fo && okT(fo.dep) && fo.date === d1 ? hm(Math.floor((tm(fo.dep) - 150) / 5) * 5) : '09:00'; addItem(Object.assign({kind:'cab', ref:f.r.id, date:d1, t, vc:vehFor(f.r).c, air:'out'}, f.rev ? {} : {rev:true}), true); }
  syncTrip(); }
/* ---------- v4: change a hotel from the full catalogue ----------
   "Change hotel" opens the island's hotel list for those dates; picking one there replaces the stay (same nights) and returns to the trip. */
document.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (!el) return; const d = el.dataset;
  if (d.a === 'swapcat') { const it = S.cart.find(x => x.uid === d.uid); if (!it || !HOT[it.ref]) return; S.swapFor = {uid:it.uid, z:HOT[it.ref].z, date:it.date, nights:it.nights, depth:S.stack.length}; S.swapUid = null; go({v:'store', zone:HOT[it.ref].z, aisle:'stay', date:it.date}); }
  if (d.a === 'swapcancel') { const sf = S.swapFor; S.swapFor = null; if (sf) S.stack = S.stack.slice(0, Math.max(1, sf.depth)); render(true); } });
document.addEventListener('click', e => { const el = e.target.closest('[data-a="add"]'); if (!el || !S.swapFor) return; const v = cur(); if (!v || v.v !== 'product' || !v.cfg || v.cfg.kind !== 'stay') return;
  const sf = S.swapFor; const h = HOT[v.cfg.ref]; const it = S.cart.find(x => x.uid === sf.uid); if (!h || !it || h.z !== sf.z) return;
  e.stopImmediatePropagation(); e.preventDefault(); S.undo = clone(S.cart); it.ref = h.id; it.room = v.cfg.room || h.rooms[0].n; if (v.cfg.qty) it.qty = v.cfg.qty; S.flashUid = it.uid; S.swapFor = null;
  S.stack = S.stack.slice(0, Math.max(1, sf.depth)); syncTrip(); render(true); toast(`Now staying at ${h.n}`); }, true);
(function () { const r0 = render; render = function () { const out = r0.apply(this, arguments); try { swapBanner(); } catch (e) {} return out; }; })();
function swapBanner() { const sf = S.swapFor; const old = document.getElementById('lx-swapbar'); if (old) old.remove(); if (!sf) return; const v = cur(); if (!v || !['store', 'product'].includes(v.v)) { if (v && v.v !== 'store' && v.v !== 'product') S.swapFor = null; return; }
  const main = document.querySelector('#app main') || document.querySelector('main'); if (!main) return;
  main.insertAdjacentHTML('afterbegin', `<div id="lx-swapbar" class="card lx-assist" style="margin:10px 12px;display:flex;gap:10px;align-items:center"><span style="flex:1">Choosing a hotel on ${esc(ZN[sf.z].name)} for ${sf.nights} night${sf.nights > 1 ? 's' : ''} from ${esc(fD(sf.date))}. Pick one and it replaces your current stay.</span><button class="btn sm" data-a="swapcancel">Cancel</button></div>`);
  if (v.v === 'product' && v.cfg && v.cfg.kind === 'stay') document.querySelectorAll('[data-a="add"]').forEach(b => { b.textContent = 'Choose this hotel'; }); }
/* ---------- v4: real photos for places, experiences and activities ----------
   art() draws a photo when PHOTOS has one for that place/activity/island; hotels, cabs, ferries and packages keep their illustrations.
   Small spots use img/t (560 px), big spots img/f (1280 px). Photos load as they scroll into view. Tap a big photo to enlarge it. */
const PH_BASE = '/img/';
const PHREG = {};
const PH_FOCUS = {i153:'xMaxYMid', i147:'xMidYMid'}; /* keep the subject in the crop */
const DEST = [[/corbyn/i, 'ENT-CORBYNS'], [/chidiya/i, 'ENT-CHIDIYA-TAPU'], [/radhanagar beach/i, 'ENT-RADHANAGAR'], [/kalapathar beach/i, 'ENT-KALAPATHAR'], [/vijay ?nagar/i, 'ENT-VIJAYNAGAR'],
  [/govind nagar/i, 'ENT-GOVIND-NAGAR'], [/beach 2 dive/i, 'ACV-DSD-HAV-SHORE'], [/elephant/i, 'ACV-TREK-ELEPH'], [/bharatpur/i, 'ENT-BHARATPUR'], [/laxmanpur/i, 'ENT-LAXMANPUR'],
  [/sitapur/i, 'ENT-SITAPUR'], [/natural bridge/i, 'ACV-NATBRIDGE-NEI'], [/wandoor/i, 'ENT-WANDOOR-BEACH'], [/munda/i, 'ENT-MUNDA-PAHAD'], [/chatham saw/i, 'ENT-CHATHAM'],
  [/cellular/i, 'ENT-CELLULAR-JAIL'], [/anthropolog|museum circuit/i, 'ENT-ANTHRO-MUSEUM'], [/samudrika/i, 'ENT-SAMUDRIKA'], [/fisheries/i, 'ENT-FISHERIES'], [/science/i, 'ENT-SCIENCE-CENTRE'],
  [/gandhi park/i, 'ENT-GANDHI-PARK'], [/marina/i, 'TOWN:PBL'], [/sippighat/i, 'ENT-SIPPIGHAT'], [/harriet|manipur/i, 'ACV-TREK-MTHARRIET'], [/baludera/i, 'ENT-BALUDERA'],
  [/mud volcano/i, null], [/baratang day/i, 'ACV-TOUR-BARATANG'], [/yerrata/i, 'ENT-YERRATA'], [/dhani/i, 'ACV-DHANINALLAH'], [/amkunj/i, 'ENT-AMKUNJ'], [/cuthbert/i, 'ENT-CUTHBERT-BAY'],
  [/morrice/i, 'ENT-MORRICE-DERA'], [/panchavati/i, 'ENT-PANCHAVATI'], [/karmatang/i, 'ENT-KARMATANG'], [/kalipur/i, 'ENT-KALIPUR'], [/lamiya|saddle/i, 'ENT-LAMIYA-BAY'],
  [/ramnagar/i, null], [/shyamnagar/i, 'ENT-MUD-VOL-DIG'], [/butler/i, 'ENT-BUTLER'], [/white surf/i, 'ENT-WHITESURF'], [/whisper/i, 'ENT-WHISPER'], [/netaji nagar/i, 'ENT-NETAJINAGAR'],
  [/lighthouse/i, 'ENT-LIGHTHOUSE-LIT'], [/rangat/i, 'Z:RAN'], [/mayabunder$|^mayabunder/i, 'Z:MAY'], [/diglipur/i, 'Z:DIG'], [/baratang$/i, 'Z:BAR'], [/jirkatang/i, 'Z:BAR'],
  [/radhanagar/i, 'ENT-RADHANAGAR'], [/neil sightseeing/i, 'ACV-TOUR-NEI-FULL'], [/cab at your disposal/i, null]];
function destKey(t, zone) { for (const [re, k] of DEST) if (re.test(t)) {
    if (k) return k; if (/mud volcano/i.test(t)) return zone === 'DIG' ? 'ENT-MUD-VOL-DIG' : 'BAR-MUD'; if (/ramnagar/i.test(t)) return zone === 'DIG' ? 'ENT-RAMNAGAR-DIG' : 'ENT-RAMNAGAR-NEI';
    if (/disposal/i.test(t)) return {PBL:'ACV-TOUR-PB-FULL', HAV:'ACV-TOUR-HAV-FULL', NEI:'ACV-TOUR-NEI-FULL'}[zone] || null; }
  return null; }
const phHash = x => { let h = 0; for (const c of String(x)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const _zpool = {};
/* a stay's area photo is scenery: no wildlife close-ups, museum interiors or another island's jetty */
const NOT_SCENE = /tern|butterfly|skeleton|gallery|display|tribes|anemone|museum|jetty|science|saw mill/i;
const scene = L => L.filter(i => !NOT_SCENE.test(PHOTO_CAP[i] || ''));
/* scenery of an island: its header photos and its places (beaches, views), never activity shots with people */
function zonePool(z) { if (_zpool[z]) return _zpool[z]; const L = [...(PHOTOS['Z:' + z] || [])];
  Object.keys(PHOTOS).forEach(k => { const a = ACT[k]; if (a && a.z === z && a.entry && /beach|bay|island|point|tapu|cove|park/i.test(a.n)) PHOTOS[k].slice(0, 2).forEach(i => { if (!L.includes(i)) L.push(i); }); });
  const S2 = scene(L); return (_zpool[z] = S2.length ? S2 : PHOTOS['Z:PBL']); }
let _townP = null;
/* Port Blair town hotels: town scenes first, then the landmarks a short walk or drive away */
function townPool() { if (_townP) return _townP; const L = [...(PHOTOS['TOWN:PBL'] || [])];
  ['ENT-CELLULAR-JAIL', 'ENT-GANDHI-PARK', 'ENT-CHATHAM', 'ENT-SAMUDRIKA', 'ENT-CORBYNS', 'ENT-ANTHRO-MUSEUM', 'ENT-FISHERIES', 'ENT-SCIENCE-CENTRE', 'ENT-SIPPIGHAT'].forEach(k => (PHOTOS[k] || []).slice(0, 2).forEach(i => { if (!L.includes(i)) L.push(i); }));
  return (_townP = scene(L)); }
const rot = (L, n) => L.slice(n % L.length).concat(L.slice(0, n % L.length));
/* which photos a spot shows: its own, else the island's, else the transport set; every spot gets a real photo */
function phResolve(zone, icon, seed) { const s = String(seed || ''), h = phHash(s);
  const own = k => ({k, L:PHOTOS[k], cap:i => (PHOTO_CAPK[k] || {})[i] || PHOTO_CAP[i] || ''});
  if (PHOTOS[s]) return own(s);
  if (s === zone + 'hero' || s === zone + 'm') return PHOTOS['Z:' + zone] ? own('Z:' + zone) : null;
  const pk = (typeof PKGS !== 'undefined' && PKGS.find(p => p.id === s)) || (D.tours || []).find(p => p.id === s);
  if (pk) { const main = [], rest = []; (pk.plan || []).forEach(st => { if (st[0] !== 'act') return; (Array.isArray(st[1]) ? st[1] : [st[1]]).forEach(id => { const a = ACT[id]; (PHOTOS[id] || []).slice(0, 1).forEach(i => { const T = a && a.z === (pk.z || zone) ? main : rest; if (!main.includes(i) && !rest.includes(i)) T.push(i); }); }); });
    /* a trip opens on its main island (Havelock, Neil, Diglipur ...), not on the Port Blair stop every trip shares */
    const ids = main.concat(rest), head = (PHOTOS['Z:' + (pk.z || zone)] || []).slice(0, 1); const L = ids.length ? [...new Set(rot(main.length ? main : ids, h).concat(head, ids))] : zonePool(pk.z || zone);
    return {k:'P:' + s, L:[...new Set(L.slice(0, 8).concat(zonePool(pk.z || zone)))], cap:i => PHOTO_CAP[i] || ''}; }
  /* a day plan: the photos of its own stops, then the island's scenery */
  if (s.startsWith('BLK:') && typeof BLK !== 'undefined' && BLK[s.slice(4)]) { const b = BLK[s.slice(4)]; const L = [];
    b.stops.forEach(st => [].concat(st.id).forEach(id => (PHOTOS[id] || []).slice(0, 2).forEach(i => { if (!L.includes(i)) L.push(i); })));
    const own = L.slice(0, 1).concat(rot(L.slice(1), h)); return {k:'B:' + s, L:[...new Set(own.concat(zonePool(b.z === 'WAN' ? 'PBL' : b.z)))], cap:i => PHOTO_CAP[i] || ''}; }
  const area = (L, pre) => ({k:'A:' + s, area:1, L:rot(L, h).slice(0, 12), cap:i => (pre || 'Area photo · ') + (PHOTO_CAP[i] || ZN[zone].name)});
  const keyed = (k, pre) => ({k:'D:' + s, L:PHOTOS[k], cap:i => (pre || '') + ((PHOTO_CAPK[k] || {})[i] || PHOTO_CAP[i] || '')});
  /* ferries: a ferry at the jetty; Neil's own jetty for Neil */
  if (/^SAIL-/.test(s) || icon === 'ferry') { const sl = SAIL[s], to = sl ? sl.to : zone; const L = PHOTOS['FERRY:' + to] || PHOTOS.FERRY.concat((PHOTOS['Z:' + to] || []).slice(0, 1));
    return {k:'F:' + to, L, cap:i => PHOTO_CAP[i] || ''}; }
  /* stays: no photos of the hotels themselves, so the island they're on: beach resorts get the island's signature beach,
     town hotels in Port Blair get town scenes, everything else the island's main photos */
  if (/^HTL-/.test(s) || icon === 'bed') { const H = HOT[s], n = H ? H.n : '';
    if (zone === 'PBL' && !/resort|beach|bay|cove|ocean|coral|sand|shore|lagoon|island/i.test(n)) return area(townPool());
    return area([...new Set((PHOTOS['Z:' + zone] || []).concat(zonePool(zone)))]); }
  /* cabs: a photo of where the cab is going; transfers to hotels, jetties and the airport show the transfer coach */
  if (/^RT-/.test(s) || icon === 'car') { const r = ROUTE[s]; if (r && r.boat) return {k:'F:' + r.move, L:PHOTOS['FERRY:' + r.move] || PHOTOS.FERRY, cap:i => PHOTO_CAP[i] || ''};
    const dest = r ? (r.b || '') : ''; const k = destKey(dest, zone);
    if (k) return keyed(k, k.startsWith('Z:') ? 'Destination · ' : 'Destination · ');
    return keyed('CAB'); }
  if (/^RN-/.test(s) || icon === 'scooter') return keyed('RENT');
  if (zone && ZN[zone]) return area(zonePool(zone));
  return null; }
const _phUsed = new Set(); let _phTick = false;
/* photos drawn in one go (one screen) share this set; it empties as soon as that screen is drawn */
const _phReserve = {};
/* the day-plan rail sits at the top of an island's page but is drawn last; its photos are picked first so it isn't left with repeats */
(function () { const s0 = VIEWS.store; if (!s0) return; VIEWS.store = function (v) { const z = v && v.zone;
  if (z && (!v.aisle || v.aisle === 'do') && typeof BLOCKS !== 'undefined') { phFrame();
    BLOCKS.filter(b => b.z === z || (z === 'PBL' && b.z === 'WAN')).forEach(b => { const s = 'BLK:' + b.id, R = phResolve(b.z, null, s); if (!R || !R.L) return;
      const pk = R.L.find(i => !_phUsed.has(i)) || R.L[0]; _phUsed.add(pk); _phReserve[s] = pk; }); }
  try { return s0.apply(this, arguments); } finally { Object.keys(_phReserve).forEach(k => delete _phReserve[k]); } }; })();
const phFrame = () => { if (_phTick) return; _phTick = true; Promise.resolve().then(() => { _phUsed.clear(); _phTick = false; }); };
(function () { const a0 = art;
  art = function (zone, icon, seed = '', opts = {}) { if (/^HTL-/.test(String(seed))) return ''; /* no photos for individual hotels */
    let R = phResolve(zone, icon, seed); if (!R || !R.L || !R.L.length) return a0.apply(this, arguments);
    const big = !!opts.big || /hero$/.test(String(seed));
    /* one screen never shows the same photo twice: a card takes the next photo of its own set, and island scenery for stays;
       only if every fitting photo is already on screen does it repeat one */
    phFrame(); let L = R.L; const rv = _phReserve[String(seed)];
    if (rv) { L = [rv].concat(L.filter(i => i !== rv)); R = Object.assign({}, R, {L, k:R.k + '~' + rv}); } else { const pick = L.find(i => !_phUsed.has(i)); if (pick && pick !== L[0]) { L = [pick].concat(L.filter(i => i !== pick)); R = Object.assign({}, R, {L, k:R.k + '~' + pick}); } }
    const i0 = L[0]; _phUsed.add(i0); PHREG[R.k] = R; const cap = R.cap(i0);
    const svg = `<svg class="ph${big ? ' ph-big' : ''}" data-k="${esc(R.k)}" viewBox="0 0 320 200" preserveAspectRatio="${PH_FOCUS[i0] || 'xMidYMid'} slice" role="img" aria-label="${esc(cap)}"><rect width="320" height="200" fill="#cfdfe6"/><image data-src="${PH_BASE}${big ? 'f' : 't'}/${i0}.webp" width="320" height="200" preserveAspectRatio="${PH_FOCUS[i0] || 'xMidYMid'} slice"/></svg>`;
    if (!opts.big) return svg;
    return svg + `<button class="ph-zoom" data-a="phzoom" data-k="${esc(R.k)}" aria-label="Enlarge photo"><span class="ph-cap">${esc(cap)}</span><span class="ph-n">${L.length > 1 ? '1 / ' + L.length + ' · ' : ''}Tap to enlarge</span></button>`; }; })();
let _phIO = null;
function phLoad(root) { const els = (root || document).querySelectorAll('svg.ph:not([data-on])'); if (!els.length) return;
  const on = el => { el.setAttribute('data-on', '1'); const im = el.querySelector('image[data-src]'); if (im) { im.setAttribute('href', im.getAttribute('data-src')); im.removeAttribute('data-src'); } };
  if (typeof IntersectionObserver !== 'function') { els.forEach(on); return; }
  if (!_phIO) _phIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { _phIO.unobserve(e.target); on(e.target); } }), {rootMargin:'300px 300px'});
  els.forEach(el => _phIO.observe(el)); }
(function () { const r0 = render; render = function () { const out = r0.apply(this, arguments); try { phLoad(); } catch (e) {} return out; }; })();
/* landing photo: Ross & Smith from the air */
heroArt = function () { const i = PHOTOS.HOME[0]; return `<svg class="hero-l hero-ph" data-tod="all" viewBox="0 0 1440 600" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(PHOTO_CAP[i])}"><image href="${PH_BASE}f/${i}.webp" width="1440" height="600" preserveAspectRatio="xMidYMid slice"/></svg><span class="hero-phcap">${esc(PHOTO_CAP[i])}</span>`; };
/* full-screen viewer with captions; swipe or use the arrows */
let PHV = null;
function phOpen(k, n) { if (!PHREG[k]) return; PHV = {k, n:n || 0}; phDraw(); }
function phDraw() { let el = document.getElementById('ph-view'); if (!PHV) { if (el) el.remove(); document.body.style.overflow = ''; return; }
  const R = PHREG[PHV.k], L = R.L, i = L[PHV.n], cp = R.cap(i);
  if (!el) { el = document.createElement('div'); el.id = 'ph-view'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); document.body.appendChild(el);
    let x0 = null; el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, {passive:true});
    el.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 40) phStep(dx < 0 ? 1 : -1); }); }
  document.body.style.overflow = 'hidden';
  el.innerHTML = `<button class="ph-x" data-a="phclose" aria-label="Close">×</button>
    <figure><img src="${PH_BASE}f/${i}.webp" alt="${esc(cp)}"><figcaption>${esc(cp)}${L.length > 1 ? `<span>${PHV.n + 1} / ${L.length}</span>` : ''}</figcaption></figure>
    ${L.length > 1 ? `<button class="ph-p" data-a="phprev" aria-label="Previous photo">‹</button><button class="ph-nx" data-a="phnext" aria-label="Next photo">›</button>
    <div class="ph-dots">${L.map((x, j) => `<button data-a="phgo" data-n="${j}" aria-label="Photo ${j + 1}"${j === PHV.n ? ' aria-current="true"' : ''}><img src="${PH_BASE}t/${x}.webp" alt=""></button>`).join('')}</div>` : ''}`; }
function phStep(d) { if (!PHV) return; const n = PHREG[PHV.k].L.length; PHV.n = (PHV.n + d + n) % n; phDraw(); }
document.addEventListener('click', e => { const el = e.target.closest('[data-a]');
  if (!el) { const sv = e.target.closest('.dhero svg.ph, .storehero svg.ph'); if (sv) phOpen(sv.dataset.k, 0); else if (PHV && e.target.id === 'ph-view') { PHV = null; phDraw(); } return; }
  const a = el.dataset.a;
  if (a === 'phzoom') { e.preventDefault(); e.stopPropagation(); phOpen(el.dataset.k, 0); }
  else if (a === 'phclose') { PHV = null; phDraw(); } else if (a === 'phprev') phStep(-1); else if (a === 'phnext') phStep(1); else if (a === 'phgo') { PHV.n = +el.dataset.n; phDraw(); } });
document.addEventListener('keydown', e => { if (!PHV) return; if (e.key === 'Escape') { PHV = null; phDraw(); } else if (e.key === 'ArrowRight') phStep(1); else if (e.key === 'ArrowLeft') phStep(-1); });
/* arrival day + nights: the leave date follows */
function dsSync(n) { const ds = document.getElementById('ds'), de = document.getElementById('de'), sp = document.getElementById('dsn'), l = document.getElementById('dsl'); if (!ds || !de || !sp) return;
  n = Math.max(1, Math.min(20, n)); sp.textContent = n; const s = ds.value || TODAY; de.value = addD(s, n);
  if (l) l.innerHTML = `${ic('plane', 14)} Fly home <b>${fD(de.value)}</b> · ${n} night${n > 1 ? 's' : ''}, ${n + 1} days`;
  document.querySelectorAll('.lx-nchips .chip').forEach(c => c.classList.toggle('on', +c.dataset.n === n)); }
document.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (!el) return; const d = el.dataset; if (d.a === 'dsn') { const sp = document.getElementById('dsn'); if (sp) dsSync(d.n ? +d.n : (+sp.textContent) + (+d.d)); } });
document.addEventListener('change', e => { if (e.target && e.target.id === 'ds') { const sp = document.getElementById('dsn'); if (sp) dsSync(+sp.textContent); } });
/* ---------- add a day at either end, keeping flights, airport rides and the first/last hotel in step ---------- */
function extendBtn(dir) { if (!S.trip || !S.cart.length) return '';
  const d = dir === 'before' ? addD(S.trip.start, -1) : addD(S.trip.end, 1); if (dir === 'before' && d < TODAY) return '';
  return `<div class="wrap lx-ext"><button class="lx-extbtn" data-a="extend" data-dir="${dir}">${ic('plus', 16, 2.4)} Add a day ${dir === 'before' ? 'before' : 'after'} · <b>${fD(d)}</b><small>${dir === 'before' ? 'Arrive a day earlier; your hotel and airport pickup move with it' : 'Stay a day longer; your flight home and airport drop move with it'}</small></button></div>`; }
function extendTrip(dir) { if (!S.trip) return; const w = S.win ? Object.assign({}, S.win) : {start:S.trip.start, end:S.trip.end};
  if (Math.round((pDate(w.end) - pDate(w.start)) / 864e5) >= 20) { toast('Plan up to 21 days at a time'); return; }
  const isAir = c => c.kind === 'cab' && !c.for && ROUTE[c.ref] && ROUTE[c.ref].kind === 'airport';
  if (dir === 'before') { const old = w.start, nw = addD(old, -1); if (nw < TODAY) { toast('That day has passed'); return; }
    if (S.fin && S.fin.date === old) S.fin.date = nw;
    S.cart.filter(c => isAir(c) && c.date === old && /Airport/.test(cabMeta(c).from)).forEach(c => { c.date = nw; });
    const st = S.cart.filter(i => i.kind === 'stay' && HOT[i.ref] && i.date === old).sort((a, b) => (HOT[a.ref].z === 'PBL' ? 0 : 1) - (HOT[b.ref].z === 'PBL' ? 0 : 1))[0];
    if (st && HOT[st.ref].z === 'PBL') { st.date = nw; st.nights += 1; }
    w.start = nw; S.win = w; S.planDate = nw; syncTrip(); rerender(); toast(`Day added: you now arrive ${fD(nw)}`); }
  else { const old = w.end, nw = addD(old, 1);
    if (S.fout && S.fout.date === old) S.fout.date = nw;
    S.cart.filter(c => isAir(c) && c.date === old && /Airport/.test(cabMeta(c).to)).forEach(c => { c.date = nw; });
    const st = S.cart.find(i => i.kind === 'stay' && HOT[i.ref] && addD(i.date, i.nights) === old && HOT[i.ref].z === 'PBL');
    if (st) st.nights += 1;
    w.end = nw; S.win = w; syncTrip(); rerender(); toast(`Day added: you now fly home ${fD(nw)}`); }
  S.datesAssumed = false; }
document.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (!el) return; const d = el.dataset; if (d.a === 'extend') extendTrip(d.dir); });
/* how long something takes, as the traveller sees it: multi-day courses in days */
function durOf(a) { if (!a) return ''; if (a.sched && a.sched.length > 1) return a.sched.length + ' days'; if (a.sched && a.sched.length) return durTxt(a.sched[0].d);
  return a.d >= 1440 && a.b !== 'per_unit' ? Math.ceil(a.d / 480) + ' days' : durTxt(a.d); }
/* ---------- a multi-day course starts on a day when every one of its days is on that island, clear of ferries and the no-fly window ---------- */
function courseFit(a, date, skipUid) { if (!S.trip || !a.sched || a.sched.length < 2) return date;
  const cart = S.cart.filter(i => i.uid !== skipUid); const evs = expand(cart); const pos = makePos(evs); const fo = flightOut(); const N = nDays(); const n = a.sched.length;
  const dive = /Scuba|Freediv/i.test(a.fam + ' ' + a.n);
  const okOn = d => { const d0 = dayIdx(d); if (d0 < 0 || d0 + n - 1 > N - 1) return false;
    for (let k = 0; k < n; k++) { const p = a.sched[k]; const s = (d0 + k) * 1440 + tm(p.t), e = s + p.d;
      if (pos(s - 30) !== a.z || pos(e + 30) !== a.z) return false;
      if (evs.some(x => (x.kind === 'ferry' || (x.kind === 'act' && x.it.ref !== a.id && (x.e - x.s) >= 180)) && x.s < e + 30 && x.e > s - 60)) return false; }
    if (dive && fo) { const last = (d0 + n - 1) * 1440 + tm(a.sched[n - 1].t) + a.sched[n - 1].d; if (dayIdx(fo.date) * 1440 + tm(fo.dep) - last < 18 * 60) return false; }
    return true; };
  for (let k = 0; k <= 6; k++) { const d = addD(date, k); if (okOn(d)) return d; }
  for (let k = 1; k <= 3; k++) { const d = addD(date, -k); if (d >= S.trip.start && okOn(d)) return d; }
  return null; }
(function () { const a0 = addItem;
  addItem = function (it, silent) { try { const a = it && it.kind === 'act' && ACT[it.ref]; if (a && a.sched && a.sched.length > 1 && S.trip && !it._keep) { const d = courseFit(a, it.date);
        if (d && d !== it.date) { it.date = d; it.t = a.sched[0].t; setTimeout(() => toast(`${shortName(a)} starts ${fD(d)}: all ${a.sched.length} days on ${ZN[a.z].name}, clear of ferries`), 60); }
        else if (!d) setTimeout(() => toast(`${shortName(a)} needs ${a.sched.length} full days on ${ZN[a.z].name}. Add nights there to fit it.`), 60); } } catch (e) { console.error(e); }
    return a0.apply(this, arguments); }; })();
/* ---------- suggestions that follow the trip: what real itineraries pair with what you have, and what is close by ---------- */
let _PAIR = null;
const PAIRX = [['ENT-CELLULAR-JAIL', 'ACV-SHOW-LS-HIN'], ['ENT-CELLULAR-JAIL', 'ACV-SHOW-LS-ENG'], ['ENT-CELLULAR-JAIL', 'ENT-CORBYNS'], ['ACV-BOAT-ROSS-AM', 'ENT-ROSS-LS-HIN'], ['ACV-BOAT-ROSS-PM', 'ENT-ROSS-LS-HIN'], ['ACV-BOAT-ELEPH', 'ENT-RADHANAGAR'], ['ENT-KALAPATHAR', 'ENT-RADHANAGAR'], ['ACV-NATBRIDGE-NEI', 'ENT-LAXMANPUR'], ['ENT-BHARATPUR', 'ACV-NATBRIDGE-NEI'], ['ENT-SITAPUR', 'ACV-NATBRIDGE-NEI'], ['ENT-SAMUDRIKA', 'ENT-ANTHRO-MUSEUM'], ['ENT-CORBYNS', 'ENT-JAPBUNKER']];
function pairs() { if (_PAIR) return _PAIR; const P = {}; const bump = (a, b, w) => { if (!a || !b || a === b) return; (P[a] = P[a] || {})[b] = (P[a][b] || 0) + w; (P[b] = P[b] || {})[a] = (P[b][a] || 0) + w; };
  const ids = x => [].concat(x || []).filter(id => ACT[id]);
  (D.tours || []).concat(typeof PKGS !== 'undefined' ? PKGS.filter(p => !p.mk) : []).forEach(t => { const byDay = {}; (t.plan || []).forEach(s => { if (s[0] !== 'act') return; (byDay[s[2]] = byDay[s[2]] || []).push(ids(s[1])); });
    Object.values(byDay).forEach(L => { for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) L[i].forEach(a => L[j].forEach(b => bump(a, b, 1))); }); });
  (typeof BLOCKS !== 'undefined' ? BLOCKS : []).forEach(b => { const L = b.stops.map(s => ids(s.id)); for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) L[i].forEach(a => L[j].forEach(c => bump(a, c, 2))); });
  PAIRX.forEach(([a, b]) => bump(a, b, 4));
  Object.keys(P).forEach(a => { const m = Math.max(...Object.values(P[a])); Object.keys(P[a]).forEach(b => { P[a][b] = P[a][b] / m; }); });
  return (_PAIR = P); }
/* how well a candidate goes with a set of plans: paired in real itineraries, the same family of thing, or a short hop away */
function affinity(x, refs) { const P = pairs(); let s = 0; refs.forEach(r => { const y = ACT[r]; if (!y || y.id === x.id) return; s = Math.max(s, (P[r] && P[r][x.id]) || 0);
    if (y.z === x.z && ((siteKey(x) && siteKey(y)) || (GEOA[x.id] && GEOA[y.id]))) { const m = hopMin0(y, x); if (m <= 12) s = Math.max(s, .3); else if (m <= 25) s = Math.max(s, .12); } });
  return s; }
function dayRefs(date, z) { return S.cart.filter(i => i.kind === 'act' && i.date === date && ACT[i.ref] && (!z || ACT[i.ref].z === z || (z === 'PBL' && ACT[i.ref].z === 'WAN'))).map(i => i.ref); }
/* rank inside the free-time ideas: what goes with the rest of that day counts */
(function () { const g0 = gapPicks; gapPicks = function (a, date) { const r = g0.apply(this, arguments); try { const refs = dayRefs(date, a.zone), trip = S.cart.filter(i => i.kind === 'act').map(i => i.ref);
    if (refs.length || trip.length) { r.pick.forEach(c => { c.aff = affinity(c.x, refs) * 2 + affinity(c.x, trip) * .5; if (c.aff >= .7 && refs.length) { const y = refs.map(id => ACT[id]).find(y => ((pairs()[y.id] || {})[c.x.id] || 0) >= .35); if (y) c.where = `Goes with ${shortName(y)}` + (c.where ? ' · ' + c.where : ''); } });
      r.pick.sort((p, q) => (q.eve ? 0 : 1) - (p.eve ? 0 : 1) || q.aff - p.aff); r.pick.sort((p, q) => p.eve - q.eve); } } catch (e) { console.error(e); } return r; }; })();
/* right after you add something: a short rail of what goes with it, timed to fit that day */
function pairRail(e) { const it = e.it, a = ACT[it.ref]; if (!a || !S.trip) return ''; const z = a.z === 'WAN' ? 'PBL' : a.z; const ok = ideaFilter(it.date);
  const P = pairs(); const nat = NAT[it.date]; const ss = nat ? tm(nat.ss) : 1020;
  const cands = D.acts.filter(x => x.id !== a.id && (x.z === a.z || (z === 'PBL' && x.z === 'WAN') || (a.z === 'WAN' && x.z === 'PBL')) && ok(x) && !/Courses|Certified/.test(x.fam))
    .map(x => ({x, s:affinity(x, [a.id]) + ((P[a.id] || {})[x.id] ? .2 : 0) + Math.min(.2, (POP[x.id] || 0) / 500)})).filter(c => c.s >= .3).sort((p, q) => q.s - p.s).slice(0, 8);
  const out = []; const end = e.e % 1440;
  for (const c of cands) { if (out.length >= 3) break; const x = c.x; const hop = hopMin0(a, x);
    const own = x.entry ? [Math.ceil((end + hop + 10) / 15) * 15] : []; const sl = own.map(hm).concat(slotsFor(x)).filter((s, i, A) => A.indexOf(s) === i).filter(s => { const t0 = tm(s); return (t0 >= end + hop || t0 + x.d + hop <= e.s % 1440) && (!x.close || t0 + x.d <= tm(x.close)) && (!x.open || t0 >= tm(x.open)) && (x.slot === 'Night' || t0 + x.d <= ss + 40); });
    for (const s of sl.slice(0, 3)) { const f = fitOf({kind:'act', ref:x.id, date:it.date, t:s, pa:S.pax.adults, pk:kidsOk(x)}); if (f.state !== 'bad') { out.push({x, s, why:(P[a.id] || {})[x.id] >= .35 ? 'Often done together' : `${hop} min away`}); break; } } }
  if (!out.length) return '';
  return `<div class="lx-pair"><div class="lx-pair-h"><b>${ic('spark', 14, 2)} Goes well with ${esc(shortName(a))}</b><button class="link" data-a="pairx" aria-label="Hide">Hide</button></div><div class="bleed"><div class="idrail">${out.map(({x, s, why}) => { const u = actUnit(x, it.date);
    return `<div class="idc" style="--zc:${ZC(x.z)}"><button class="idc-art" data-a="product" data-kind="act" data-id="${x.id}" data-date="${it.date}" aria-label="Details: ${esc(x.n)}">${art(x.z, null, x.id)}<span class="why">★ ${esc(why)}</span></button><div class="idc-b"><b>${esc(x.n)}</b><small>${esc(x.v || '')}</small><span class="idc-m">${ic('clock', 14)} ${s} · ${durOf(x)}</span><div class="idc-f"><span class="price">${x.entry ? (u ? inr(u) : 'Free') : inr(u)}<small> ${x.b === 'per_pax' ? '/ person' : ''}</small></span><button class="btn sm" data-a="fx" data-act="quickadd" data-kind="act" data-ref="${x.id}" data-date="${it.date}" data-t="${s}">${ic('plus', 16, 2.6)} Add</button></div></div></div>`; }).join('')}</div></div></div>`; }
document.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (!el) return; const d = el.dataset; if (d.a === 'pairx') { S.justAdded = null; rerender(); } });
/* remember the last thing you added yourself (bulk plans do not count) */
let _bulk = 0;
(function () { const a0 = addItem; addItem = function (it) { const r = a0.apply(this, arguments); try { if (!_bulk && r && r.kind === 'act') S.justAdded = r.uid; } catch (e) {} return r; };
  ['buildPkg', 'completeTrip', 'fillEmptyDays', 'addCabs', 'addCarriers'].forEach(n => { const f0 = window[n]; if (typeof f0 !== 'function') return; window[n] = function () { _bulk++; try { return f0.apply(this, arguments); } finally { _bulk--; if (n !== 'addCabs' && n !== 'addCarriers') S.justAdded = null; } }; }); })();
/* ---------- drag to move a plan, like the big trip planners, but every drop is checked against ferries, opening hours,
   travel time and the island you are on. A drop that cannot work snaps back and says why. ---------- */
UI.grip = '<circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>';
let DRG = null;
function rowEnd(r) { if (!r) return null; if (r.dataset.e) return +r.dataset.e; const t = (r.querySelector('.et') || {}).textContent || ''; const m = /(\d{1,2}):(\d{2})/.exec(t); return m ? +m[1] * 60 + +m[2] + 20 : null; }
function rowStart(r) { const t = (r && r.querySelector('.et') || {}).textContent || ''; const m = /(\d{1,2}):(\d{2})/.exec(t); return m ? +m[1] * 60 + +m[2] : null; }
/* the start time a dropped plan gets: right after what sits above it (plus the trip there), or before what sits below */
function dropTime(it, sec, before) { const a = ACT[it.ref]; const rows = [...sec.querySelectorAll('.ev')].filter(r => r.dataset.uid !== it.uid && !r.closest('.lx-pair'));
  const i = before ? rows.indexOf(before) : rows.length; const prev = rows.slice(0, i).reverse().find(r => rowEnd(r) != null && r.dataset.k !== 'stay'), next = rows.slice(i).find(r => rowStart(r) != null);
  const date = sec.dataset.date; const nat = NAT[date]; let t;
  if (prev) { const pu = S.cart.find(x => x.uid === prev.dataset.uid); const hop = pu && pu.kind === 'act' && ACT[pu.ref] ? hopMin0(ACT[pu.ref], a) : 20; t = rowEnd(prev) + Math.max(15, hop) + (it.rep || 0); }
  else if (next) t = rowStart(next) - (a.d || 60) - 30; else t = 540;
  t = Math.max(nat ? tm(nat.sr) : 330, Math.ceil(t / 5) * 5);
  const sl = slotsFor(a); const flex = a.entry || !sl.length || a.slot === 'Any' || a.slot === 'Open';
  if (!flex) { const pick = sl.map(tm).filter(x => x >= t - 20).sort((p, q) => p - q)[0]; if (pick == null) return {err:`${shortName(a)} only runs at ${sl.join(', ')}`}; t = pick; }
  if (a.open && t < tm(a.open)) t = tm(a.open); if (a.close && t + (a.d || 60) > tm(a.close)) return {err:`${shortName(a)} closes at ${a.close}`};
  const pos = (DRG && DRG.pos) || makePos(expand(S.cart.filter(x => x.uid !== it.uid && x.for !== it.uid))); if (DRG) DRG.pos = pos; const z = a.z === 'WAN' ? 'PBL' : a.z;
  const at = pos(dayIdx(date) * 1440 + t), at2 = pos(dayIdx(date) * 1440 + t + (a.d || 60)); const here = p => p === z || (z === 'PBL' && p === 'WAN') || (z === 'BAR' && p === 'PBL');
  if (!here(at) || !here(at2)) { const w = at === 'transit' || at2 === 'transit' ? 'on a ferry' : `on ${ZN[here(at) ? at2 : at] ? ZN[here(at) ? at2 : at].name : 'another island'}`; return {err:`You'll be ${w} then`}; }
  return {date, t:hm(t)}; }
function moveTo(uid, date, t) { const it = S.cart.find(x => x.uid === uid); if (!it) return; const a = ACT[it.ref];
  const f = fitOf(Object.assign({}, it, {date, t})); if (f.state === 'bad') { const h = f.hard[0]; toast(`Can't move here: ${h ? h.title.toLowerCase() + (h.msg ? ' · ' + h.msg.split('.')[0] : '') : 'it clashes'}`); rerender(); return false; }
  S.undo = clone(S.cart); const moved = it.date !== date; const dz = moved ? null : 0; it.date = date; it.t = t;
  // its cabs travel with it: same island → re-timed, another day → moved, another island → dropped (we suggest new ones)
  S.cart.filter(c => c.kind === 'cab' && c.for === uid).forEach(c => { c.date = date; const r = ROUTE[c.ref]; if (!r) return;
    if (c.back) c.t = hm(Math.ceil((tm(t) + (a.d || 60)) / 5) * 5); else c.t = hm(Math.max(300, Math.floor((tm(t) - r.mins - 10 - (it.rep || 0)) / 5) * 5)); });
  const z = a.z === 'WAN' ? 'PBL' : a.z; S.cart = S.cart.filter(c => !(c.kind === 'cab' && c.for === uid && ROUTE[c.ref] && (ROUTE[c.ref].z === 'WAN' ? 'PBL' : ROUTE[c.ref].z) !== z));
  S.cart.filter(c => c.kind === 'cab' && c.hop && c.for === uid).forEach(c => { delete c.hop; });   // a moved stop leaves its chain; the chain re-forms where it fits
  S.flashUid = uid; syncTrip(); rerender(); toastUndo(`Moved to Day ${dayIdx(date) + 1} · ${t}${moved ? '' : ''}`); return true; }
function drgEnd(ok) { if (!DRG) return; const {ghost, line, el, tip} = DRG; ghost.remove(); line.remove(); tip.remove(); el.classList.remove('lx-dragging'); document.body.classList.remove('lx-dragmode'); cancelAnimationFrame(DRG.raf);
  const tgt = DRG.tgt; const uid = DRG.uid; DRG = null; if (!ok || !tgt) return; const it = S.cart.find(x => x.uid === uid); if (!it) return;
  const r = dropTime(it, tgt.sec, tgt.before); if (r.err) { toast(r.err); return; } if (r.date === it.date && r.t === it.t) return; moveTo(uid, r.date, r.t); }
function drgMove(x, y) { if (!DRG) return; DRG.x = x; DRG.y = y; DRG.ghost.style.transform = `translate(${x - DRG.dx}px, ${y - DRG.dy}px)`;
  DRG.ghost.style.visibility = 'hidden'; const under = document.elementFromPoint(Math.min(innerWidth - 2, Math.max(2, x)), y); DRG.ghost.style.visibility = '';
  const sec = under && under.closest('section.day[data-date]'); if (!sec) return;   // over the bars or between days: keep the last place
  const rows = [...sec.querySelectorAll(':scope > .ev, :scope .ev')].filter(r => r.dataset.uid !== DRG.uid && !r.closest('.lx-pair') && r.offsetParent);
  let before = null; for (const r of rows) { const b = r.getBoundingClientRect(); if (y < b.top + b.height / 2) { before = r; break; } }
  const ref = before || rows[rows.length - 1] || sec; const b = ref.getBoundingClientRect(); const top = before ? b.top : b.bottom;
  const sb = sec.getBoundingClientRect(); Object.assign(DRG.line.style, {display:'block', top:(top + scrollY - 2) + 'px', left:(sb.left + 48) + 'px', width:(sb.width - 56) + 'px'});
  const it = S.cart.find(q => q.uid === DRG.uid); const r = it ? dropTime(it, sec, before) : {}; DRG.tip.textContent = r.err ? '✕ ' + r.err : `Drop: Day ${dayIdx(sec.dataset.date) + 1} · ${fD(sec.dataset.date)} · ${r.t}`; DRG.tip.classList.toggle('bad', !!r.err); DRG.line.classList.toggle('bad', !!r.err);
  DRG.tgt = {sec, before}; }
function drgTick() { if (!DRG) return; const m = 70, y = DRG.y; if (y < m) scrollBy(0, -12); else if (y > innerHeight - m - 70) scrollBy(0, 12); drgMove(DRG.x, DRG.y); DRG.raf = requestAnimationFrame(drgTick); }
document.addEventListener('pointerdown', e => { const g = e.target.closest('[data-drag]'); if (!g) return; e.preventDefault(); const el = g.closest('.ev'); const r = el.getBoundingClientRect();
  const ghost = el.cloneNode(true); ghost.classList.add('lx-ghost'); Object.assign(ghost.style, {position:'fixed', left:r.left + 'px', top:r.top + 'px', width:r.width + 'px', zIndex:9999, pointerEvents:'none'}); document.body.appendChild(ghost);
  const line = document.createElement('div'); line.className = 'lx-dropline'; document.body.appendChild(line); const tip = document.createElement('div'); tip.className = 'lx-dragtip'; tip.textContent = 'Drag to a day and time'; document.body.appendChild(tip);
  DRG = {uid:g.dataset.drag, el, ghost, line, tip, dx:e.clientX - r.left, dy:e.clientY - r.top, x:e.clientX, y:e.clientY, pid:e.pointerId}; ghost.style.left = '0px'; ghost.style.top = '0px'; drgMove(e.clientX, e.clientY);
  el.classList.add('lx-dragging'); document.body.classList.add('lx-dragmode'); try { g.setPointerCapture(e.pointerId); } catch (x) {} DRG.raf = requestAnimationFrame(drgTick); });
document.addEventListener('pointermove', e => { if (DRG) { e.preventDefault(); DRG.x = e.clientX; DRG.y = e.clientY; } }, {passive:false});
document.addEventListener('pointerup', e => { if (DRG) drgEnd(true); });
document.addEventListener('pointercancel', () => drgEnd(false));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && DRG) drgEnd(false); });
/* ---------- complete my trip, with a search behind it ----------
   The first plan is tried as asked. If it still has a timing conflict, the planner searches nearby versions of the same trip
   and keeps the smallest change that makes everything connect:
     1. the same plans on a different day of the trip (closest day first),
     2. one more day at the end (only when no flight home is fixed), 3. one day earlier (only when no arrival flight is fixed),
     4. two more days at the end.
   Cost of a version = conflicts × 1000 + days added × 10 + days a plan was moved. The cheapest wins; ties keep what you asked. */
(function () { const c0 = completeTrip; const hardN = () => { try { return run(S.cart).hard; } catch (e) { return 99; } };
  const snap = () => clone({cart:S.cart, win:S.win, fin:S.fin, fout:S.fout, seq:S.seq, dismissed:S.dismissed});
  const put = s => { const c = clone(s); S.cart = c.cart; S.win = c.win; S.fin = c.fin; S.fout = c.fout; S.seq = c.seq; S.dismissed = c.dismissed; syncTrip(); };
  completeTrip = function () { syncTrip(); if (!S.trip) return c0(); const s0 = snap(); const t0 = Date.now(); let r = c0(); let h = hardN(); if (!h) return r;
    let best = {s:snap(), r, cost:h * 1000, note:''}; const N = nDays(); const start = S.trip.start;
    const seeds = s0.cart.filter(i => i.kind === 'act' && ACT[i.ref]).slice(0, 2); const tries = [];
    seeds.forEach(a => { for (let k = 1; k < N; k++) [-k, k].forEach(dd => { const d = addD(a.date, dd); if (d >= start && d <= addD(start, N - 1)) tries.push({uid:a.uid, d, c:Math.abs(dd), note:`${shortName(ACT[a.ref])} moved to ${fD(d)}`}); }); });
    tries.sort((p, q) => p.c - q.c); const list = tries.slice(0, 4);
    const win0 = s0.win || {start:S.trip.start, end:S.trip.end};
    if (!s0.fout) list.push({ext:1, c:seeds.some(a => ACT[a.ref].sched && ACT[a.ref].sched.length > 1) ? 1.5 : 10, note:'One day added at the end'}); if (!s0.fin && addD(win0.start, -1) >= TODAY) list.push({pre:1, c:10, note:'Trip starts one day earlier'}); if (!s0.fout) list.push({ext:2, c:20, note:'Two days added at the end'});
    list.sort((p, q) => p.c - q.c);
    for (const t of list) { if (Date.now() - t0 > 4500 || t.c >= best.cost) break; put(s0);
      if (t.uid) { const it = S.cart.find(x => x.uid === t.uid); it.date = t.d; S.cart.filter(c => c.for === t.uid).forEach(c => { c.date = t.d; }); }
      if (t.ext) S.win = {start:win0.start, end:addD(win0.end, t.ext)}; if (t.pre) S.win = {start:addD(win0.start, -1), end:win0.end};
      syncTrip(); let r2; try { r2 = c0(); } catch (e) { continue; } const h2 = hardN(); const cost = h2 * 1000 + t.c;
      if (cost < best.cost) best = {s:snap(), r:r2, cost, note:t.note}; if (!h2) break; }
    put(best.s); S.undo = clone(s0.cart); if (best.note) { best.r = Object.assign({}, best.r, {note:best.note}); S.rescueNote = best.note; setTimeout(() => { try { toastUndo(best.note + ' so everything connects'); } catch (e) {} }, 400); }
    return best.r; }; })();
/* ---------- meals and shopping, placed where they belong in the day ----------
   Each kind has hours it makes sense in and a time people usually want it. Every 5-minute start in those hours is tested:
   it must not overlap a booking (with its reporting time), you must be on an island (not at sea), and the trip check must pass.
   Among the starts that work, the one closest to the usual time wins. If none works, we say why instead of forcing it. */
const MEALK = {bf:{n:'Breakfast', lo:390, hi:600, want:480, id:'ACV-MEAL-BF-'}, lunch:{n:'Lunch', lo:720, hi:930, want:780, id:'ACV-MEAL-LUNCH-'}, dinner:{n:'Dinner', lo:1110, hi:1350, want:1170, id:'ACV-MEAL-DINNER-'}, shop:{n:'Shopping', lo:600, hi:1230, want:1050, id:'ACV-SHOP-'}};
const isMeal = a => !!(a && a.meal);
function mealSlot(kind, date) { const K = MEALK[kind]; const n = dayIdx(date); const evs = expand(S.cart); const pos = makePos(evs); const day = evs.filter(e => e.kind !== 'stay' && e.kind !== 'rental' && Math.floor(e.s / 1440) <= n && Math.floor((e.e - 1) / 1440) >= n);
  const busy = day.map(e => [e.s - n * 1440 - (e.rep || 0) - 10, e.e - n * 1440 + 10]); const zfix = z => z === 'WAN' ? 'PBL' : z;
  const fi = flightIn(), fo = flightOut(); let lo = K.lo, hi = K.hi; if (fi && fi.date === date) lo = Math.max(lo, tm(fi.arr) + 60); if (fo && fo.date === date) hi = Math.min(hi, tm(fo.dep) - 180);
  let want = K.want; if (kind === 'bf') { const first = day.filter(e => e.s - n * 1440 > 300).sort((a, b) => a.s - b.s)[0]; if (fi && fi.date === date) want = lo; else if (first) want = Math.min(480, first.s - n * 1440 - (first.rep || 0) - 60); if (want < lo) return {err:`You leave early that morning. Ask your hotel for a packed breakfast the night before.`}; }
  if (kind === 'dinner') { const last = day.filter(e => e.e - n * 1440 <= 1320).sort((a, b) => b.e - a.e)[0]; if (last) want = Math.max(want, Math.min(1230, last.e - n * 1440 + 30)); }
  const cands = []; for (let t = lo; t <= hi; t += 5) { const z = zfix(pos(n * 1440 + t)), z2 = zfix(pos(n * 1440 + t)); const a = ACT[K.id + z]; if (!a || z !== z2) continue; const d = a.d;
    if (t + d > hi + (kind === 'dinner' ? 0 : d - 15)) continue; if (busy.some(([s, e]) => t < e && t + d > s)) continue; cands.push({t, z, c:Math.abs(t - want)}); }
  cands.sort((p, q) => p.c - q.c);
  for (const c of cands.slice(0, 10)) { const it = {kind:'act', ref:K.id + c.z, date, t:hm(c.t), qty:1, pa:S.pax.adults, pk:S.pax.kids || 0}; if (fitOf(it).state !== 'bad') return {it}; }
  if (fo && fo.date === date && hi - lo < 60) return {err:kind === 'shop' ? 'You fly home that day. Shop the evening before.' : `You fly home that day. Eat at the hotel or at the airport before your ${fo.dep} flight.`};
  const z0 = zfix(pos(n * 1440 + K.want)); if (z0 === 'transit') return {err:`You are on the ferry around then. Eat before you board; most boats sell only snacks.`};
  if (!ACT[K.id + z0]) return {err:kind === 'shop' ? `No market worth a stop on ${ZN[z0] ? ZN[z0].name : 'this island'}.` : `No ${K.n.toLowerCase()} stop for this island yet.`};
  const long = day.find(e => e.kind === 'act' && e.s - n * 1440 < K.hi && Math.min(e.e - n * 1440, K.hi) - Math.max(e.s - n * 1440, K.lo) >= (K.hi - K.lo) * .6);
  return {err:long ? `${shortName(ACT[long.it.ref])} runs through ${K.n.toLowerCase()} time. Food is usually available there, or carry a snack.` : `No free hour for ${K.n.toLowerCase()} between your plans that day. Move something and try again.`}; }
function addMeal(kind, date, quiet) { const r = mealSlot(kind, date); if (r.err) { if (!quiet) toast(r.err); return null; } _bulk++; let it; try { it = addItem(Object.assign(r.it, {_keep:1}), true); } finally { _bulk--; } if (!quiet) { S.flashUid = it.uid; rerender(); toast(`${MEALK[kind].n} added at ${it.t}`); } return it; }
function dayMeals(date) { return S.cart.filter(i => i.kind === 'act' && i.date === date && ACT[i.ref] && ACT[i.ref].meal).map(i => ACT[i.ref].meal); }
function mealRow(n, date, zz) { if (!S.cart.length) return ''; const have = dayMeals(date); const z = zz === 'WAN' ? 'PBL' : zz; const opts = ['bf', 'lunch', 'dinner', 'shop'].filter(k => !have.includes(k) && (ACT[MEALK[k].id + z] || k !== 'shop'));
  if (!opts.length) return ''; return `<div class="lx-meals" role="group" aria-label="Add meals and shopping to day ${n + 1}"><small>Add</small>${opts.map(k => `<button class="lx-chip sm" data-a="meal" data-k="${k}" data-date="${date}">${ic(k === 'shop' ? 'store' : 'cup', 14, 2)} ${MEALK[k].n}</button>`).join('')}</div>`; }
UI.cup = '<path d="M5 8h12v5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z"/><path d="M17 9h2a2 2 0 0 1 0 4h-2"/><path d="M8 3v2M12 3v2"/>';
function mealsAll() { if (!S.trip) return; S.undo = clone(S.cart); let k = 0; for (let n = 0; n < nDays(); n++) { const d = addD(S.trip.start, n); const have = dayMeals(d); ['lunch', 'dinner'].forEach(m => { if (!have.includes(m) && addMeal(m, d, true)) k++; }); }
  syncTrip(); rerender(); toastUndo(k ? `Lunch and dinner time kept on ${k} slot${k > 1 ? 's' : ''}` : 'No free meal slots found'); }
(function () { const d0 = dayTools; dayTools = function (n, date, zz) { let s = ''; try { s = d0.apply(this, arguments); } catch (e) {} return s + mealRow(n, date, zz); };
  const t0 = tripTools; tripTools = function () { const s = t0.apply(this, arguments); return S.cart.length ? s + `<div class="lx-tools"><button class="btn ghost sm" data-a="mealsall">${ic('cup', 15, 2)} Add lunch and dinner to every day</button></div>` : s; };
  const b0 = bookStatus; bookStatus = function (it) { if (it && it.kind === 'act' && isMeal(ACT[it.ref])) return null; return b0.apply(this, arguments); }; })();
document.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (!el) return; const d = el.dataset; if (d.a === 'meal') addMeal(d.k, d.date); else if (d.a === 'mealsall') mealsAll(); });
/* ---------- "Move or swap": the same checks as drag and drop, as plain buttons (easier on a phone, and for first-timers) ----------
   For every day of the trip we look for the start time closest to the current one that passes the full trip check.
   Only days that really work are offered, each with its time, so there is nothing to get wrong. */
function slotCands(a) { const sl = slotsFor(a); const flex = a.entry || !sl.length || a.slot === 'Any' || a.slot === 'Open'; if (!flex) return sl.map(tm);
  const lo = a.open ? tm(a.open) : 360, hi = (a.close ? tm(a.close) : 1110) - (a.d || 60); const out = []; for (let t = lo; t <= hi; t += 30) out.push(t); return out.concat(sl.map(tm)).filter((x, i, A) => A.indexOf(x) === i).sort((p, q) => p - q); }
function fitOn(it, date, around, dir) { const a = ACT[it.ref]; let c = slotCands(a); if (dir > 0) c = c.filter(t => t > around); else if (dir < 0) c = c.filter(t => t < around).reverse(); else c = c.slice().sort((p, q) => Math.abs(p - around) - Math.abs(q - around));
  for (const t of c.slice(0, 8)) { if (fitOf(Object.assign({}, it, {date, t:hm(t)})).state !== 'bad') return hm(t); } return null; }
function swapsFor(it) { const a = ACT[it.ref]; const ok = ideaFilter(it.date); const rest = S.cart.filter(x => x.uid !== it.uid && x.for !== it.uid); const keep = S.cart; const out = [];
  const pool = D.acts.filter(x => x.id !== a.id && x.z === a.z && !x.meal && ok(x)).map(x => ({x, s:(x.fam === a.fam ? 2 : 0) + (catOf(x) === catOf(a) ? 1 : 0) + (POP[x.id] || 0) / 100 - Math.abs((x.d || 60) - (a.d || 60)) / 240})).sort((p, q) => q.s - p.s).slice(0, 10);
  S.cart = rest; try { for (const {x} of pool) { if (out.length >= 3) break; const t = fitOn({kind:'act', ref:x.id, qty:1, pa:S.pax.adults, pk:kidsOk(x)}, it.date, tm(it.t || a.t), 0); if (t) out.push({x, t}); } } finally { S.cart = keep; }
  return out; }
function moveSheet() { const it = S.cart.find(x => x.uid === S.moveUid); if (!it || !ACT[it.ref]) return ''; const a = ACT[it.ref]; const cur = tm(it.t || a.t);
  const ear = fitOn(it, it.date, cur, -1), lat = fitOn(it, it.date, cur, 1); const days = [];
  for (let n = 0; n < nDays(); n++) { const d = addD(S.trip.start, n); if (d === it.date) continue; const t = fitOn(it, d, cur, 0); if (t) days.push({n, d, t}); }
  const sw = a.meal || a.sched ? [] : swapsFor(it);
  const b = (label, sub, attrs) => `<button class="lx-mv" ${attrs}><b>${label}</b><small>${sub}</small></button>`;
  return sheetWrap('Move or swap', `<h2>${esc(shortName(a))}</h2><p class="note" style="margin-top:-6px">Now on Day ${dayIdx(it.date) + 1}, ${fD(it.date)} at ${it.t || a.t}. We only show options that work with your ferries, opening hours and travel time.</p>
    <div class="eyebrow">Same day</div><div class="lx-mvrow">${ear ? b('Earlier', ear, `data-a="mvto" data-date="${it.date}" data-t="${ear}"`) : b('Earlier', 'Nothing earlier fits', 'disabled')}${lat ? b('Later', lat, `data-a="mvto" data-date="${it.date}" data-t="${lat}"`) : b('Later', 'Nothing later fits', 'disabled')}</div>
    <div class="eyebrow">Another day</div>${days.length ? `<div class="lx-mvrow wrap">${days.map(x => b(`Day ${x.n + 1}`, `${fD(x.d)} · ${x.t}`, `data-a="mvto" data-date="${x.d}" data-t="${x.t}"`)).join('')}</div>` : `<p class="note">No other day works${a.z !== 'PBL' ? `: you are on ${ZN[a.z].name} only on this day, or the other days are full` : ''}.</p>`}
    ${sw.length ? `<div class="eyebrow">Swap for something similar</div><div class="lx-mvcol">${sw.map(({x, t}) => { const u = actUnit(x, it.date); return `<button class="lx-sw" data-a="swapact" data-ref="${x.id}" data-t="${t}"><span><b>${esc(x.n)}</b><small>${esc(x.v || '')} · ${t} · ${durOf(x)}</small></span><span class="price">${u ? inr(u) : 'Free'}</span></button>`; }).join('')}</div>` : ''}
    <div class="lx-mvrow" style="margin-top:14px"><button class="btn ghost block" data-a="edit" data-uid="${it.uid}">Open details</button><button class="btn ghost block" style="color:var(--bad)" data-a="mvdel">Remove</button></div>`); }
document.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (!el) return; const d = el.dataset;
  if (d.a === 'mvto') { const uid = S.moveUid; S.sheet = null; moveTo(uid, d.date, d.t); }
  else if (d.a === 'swapact') { const it = S.cart.find(x => x.uid === S.moveUid); if (!it) return; S.undo = clone(S.cart); const x = ACT[d.ref]; S.cart = S.cart.filter(c => c.for !== it.uid); it.ref = d.ref; it.t = d.t; it.pk = kidsOk(x); S.sheet = null; S.flashUid = it.uid; _bulk++; try { addCabs(); } finally { _bulk--; } syncTrip(); rerender(); toastUndo(`Swapped for ${shortName(x)}`); }
  else if (d.a === 'mvdel') { const uid = S.moveUid; S.undo = clone(S.cart); S.cart = S.cart.filter(c => c.uid !== uid && c.for !== uid); S.sheet = null; syncTrip(); rerender(); toastUndo('Removed'); } });
/* a tap on the handle opens the sheet; a drag moves the plan */
document.addEventListener('pointerdown', e => { const g = e.target.closest('[data-drag]'); if (g) window._drg0 = {x:e.clientX, y:e.clientY, t:Date.now(), uid:g.dataset.drag}; }, true);
document.addEventListener('pointerup', e => { const z = window._drg0; window._drg0 = null; if (!z) return; if (Math.hypot(e.clientX - z.x, e.clientY - z.y) < 8 && Date.now() - z.t < 600) { setTimeout(() => { S.moveUid = z.uid; S.sheet = 'move'; rerender(); }, 0); } }, true);
/* ---------- public build: staff tools and cost prices are not shipped to travellers ---------- */
if (window.__ATP_PUBLIC__) { const STAFF = ['admin', 'vendor', 'scanner'];
  const r0 = render; render = function () { const v = cur(); if (v && STAFF.includes(v.v)) { S.stack = [{v:'profile'}]; }
    const out = r0.apply(this, arguments); document.querySelectorAll('.menu button[data-a="go"]').forEach(b => { if (STAFF.includes(b.dataset.v)) b.remove(); });
    document.querySelectorAll('.eyebrow').forEach(e => { if (/partners and staff/i.test(e.textContent)) e.textContent = 'Timetables'; }); return out; }; }
/* ---------- how full is this day? ----------
   load = (time in plans + time on ferries and in cabs) ÷ (waking hours you have on the islands that day).
   Waking hours run 07:00 to 21:00, cut by your landing and take-off. Under 30 % is an easy day, to 55 % balanced, to 75 % full, above that packed. */
function dayLoad(date) { const n = dayIdx(date); const evs = expand(S.cart).filter(e => e.kind !== 'stay' && e.kind !== 'rental'); const fi = flightIn(), fo = flightOut();
  let lo = 420, hi = 1260; if (fi && fi.date === date) lo = Math.max(lo, tm(fi.arr)); if (fo && fo.date === date) hi = Math.min(hi, tm(fo.dep) - 120); const span = Math.max(60, hi - lo);
  const iv = evs.map(e => [Math.max(lo, e.s - n * 1440 - (e.rep || 0)), Math.min(hi, e.e - n * 1440)]).filter(([s, e]) => e > s).sort((a, b) => a[0] - b[0]);
  let used = 0, c = lo; iv.forEach(([s, e]) => { if (e > c) { used += e - Math.max(s, c); c = e; } }); const r = Math.min(1, used / span);
  return {r, used, label:r < .3 ? 'Easy day' : r < .55 ? 'Balanced day' : r < .75 ? 'Full day' : 'Packed day', k:r < .3 ? 'easy' : r < .55 ? 'ok' : r < .75 ? 'full' : 'packed'}; }
function loadBar(date) { if (!S.cart.length) return ''; const L = dayLoad(date); const free = Math.max(0, Math.round((1 - L.r) * 14));
  return `<div class="lx-load ${L.k}" role="img" aria-label="${L.label}: ${Math.round(L.r * 100)} percent of the day is planned"><span class="lx-load-b"><i style="width:${Math.max(4, Math.round(L.r * 100))}%"></i></span><b>${L.label}</b><small>${L.k === 'packed' ? 'Little room left. Consider moving something.' : `about ${durTxt(Math.round(L.used / 30) * 30) || '0 min'} planned`}</small></div>`; }
(function () { const d0 = dayTools; dayTools = function (n, date, zz) { return loadBar(date) + d0.apply(this, arguments); }; })();
/* checkout sits on a full-screen island photo (the reef), with glass panels over it */
(function () { const r0 = render; render = function () { const out = r0.apply(this, arguments); try { const on = cur() && cur().v === 'checkout'; document.body.classList.toggle('lx-co', !!on);
    let bg = document.getElementById('lx-cobg'); if (on && !bg) { const i = 'i040'; bg = document.createElement('div'); bg.id = 'lx-cobg'; bg.setAttribute('aria-hidden', 'true'); bg.innerHTML = `<img alt="" src="${PH_BASE}f/${i}.webp">`; document.body.prepend(bg); }
    if (!on && bg) bg.remove(); } catch (e) {} return out; }; })();
/* ===== TRIP, FINAL (canvas "Trip, final"): one card per kind, photos first, a 38 px time column ===== */
const TC_ADV = /scuba|div(e|ing)|snorkel|sea ?walk|kayak|jet ?ski|parasail|water ?sport|surf|glass.?bottom|semi.?sub|freedive|trek|adventure/i;
function tcCat(e) { if (e.kind === 'ferry') return 'ferry'; if (e.kind === 'veh') return 'cab'; if (e.kind === 'stay') return 'stay';
  const r = e.it && e.it.ref || ''; const A = ACT[r] || {};
  if (A.meal || /^ACV-MEAL/.test(r)) return /SHOP/.test(r) ? 'shop' : 'meal'; if (/^ACV-SHOP/.test(r)) return 'shop';
  if (A.fam === 'Boat trips' || /^ACV-BOAT-/.test(r)) return 'boat';
  if (TC_ADV.test((A.fam || '') + ' ' + (A.n || '') + ' ' + r)) return 'adv'; return 'do'; }
function tcBig(zone, icon, seed) { return String(art(zone, icon, seed) || '').replace(/(PH_BASE|\/)t\/(i\d+\.webp)/g, '$1f/$2').replace(/img\/t\//g, 'img/f/'); }
const tcMono = s => esc(String(s || '').toUpperCase());
const tcDur = m => { m = Math.max(0, Math.round(m)); const h = Math.floor(m / 60), r = m % 60; return h ? `${h}H${r ? ' ' + r + 'M' : ''}` : `${r} MIN`; };
const tcShort = p => String(p || '').replace(/\s*\(.*?\)\s*/g, ' ').replace(/ (Wharf|Jetty|Harbour)$/i, '').trim();
(function () { const e0 = evRow;
  evRow = function (e, R) { let out = e0.apply(this, arguments);
    try { const it = e.it, I = e.I; const k = tcCat(e); const A = ACT[it.ref] || {};
      const al = R.by[it.uid] || []; const hard = al.some(a => a.sev === 'hard'); const cls = `${hard ? ' hard' : ''}${S.flashUid === it.uid ? ' flash' : ''}`;
      const price = A.meal || /^ACV-(MEAL|SHOP)/.test(it.ref) ? 'Pay there' : e.parts && e.part > 1 ? 'Included' : I.own ? 'Booked' : I.price != null ? inr(I.price) : 'On request';
      const per = (e.parts && e.part > 1) || A.meal || I.own ? '' : I.perTxt ? I.perTxt : I.per > 1 ? `${I.per} × ${inr(I.unit)}` : '';
      const pp = `<span class="tc-pr"><b>${price}</b>${per ? `<small>${per}</small>` : ''}</span>`;
      const st = bkTag(it); const small = ((out.match(/<span class="ib"><b>[\s\S]*?<\/b><small>([\s\S]*?)<\/small>/) || [])[1] || '');
      let grip = ''; out = out.replace(/<button class="lx-grip"[\s\S]*?<\/button>/, m => { grip = m; return ''; });
      const t0 = e.kind === 'stay' ? hm(e.ciAt || CHECKIN) : clock(e.s); const endT = e.kind !== 'stay' && e.e > e.s && k !== 'meal' && k !== 'shop' ? `<small>${clock(e.e)}</small>` : '';
      out = out.replace(/<span class="et">[\s\S]*?<\/span><span class="er">/, `<span class="et">${t0}${endT}</span><span class="er">`);
      out = out.replace('<div class="ev"', `<div class="ev" data-c="${k}"`);
      let card = '';
      const btn = (c, inner, lbl) => `<button class="item tc tc-${c}${cls}" data-a="edit" data-uid="${it.uid}" aria-label="${esc(lbl || I.title)}">${inner}</button>`;
      if (k === 'cab' && /→/.test(I.title)) { const [fr, to] = I.title.split(/\s*→\s*/); const bits = small.split(' · ').filter(x => !/^until /.test(x)).slice(0, 2).join(' · ');
        card = btn('cab', `<span class="tc-bar" aria-hidden="true"></span><span class="tc-b"><span class="tc-top">${ic('car', 14, 2.2)}<span class="tc-k">CAB · ${tcMono(bits)}</span><span class="tc-d">${tcDur(e.e - e.s)}</span></span>`
          + `<span class="tc-rt"><i class="o"></i><b>${esc(fr)}</b>${pp}<i class="l"></i><span></span><i class="f"></i><b>${esc(to)}</b></span>${st}</span>`, 'Cab ' + I.title); }
      else if (k === 'ferry' && SAIL[it.ref]) { const s = SAIL[it.ref]; const zf = (ZN[s.f] && ZN[s.f].name) || s.f, zt = (ZN[s.to] && ZN[s.to].name) || s.to;
        const seats = it.seats && it.seats.length ? it.seats.join(' ') : '';
        card = btn('ferry', `<span class="fp-stub">${art(e.to, 'ship', it.ref)}<em>${ic('ferry', 12, 2.2)}FERRY</em></span><span class="fp-cut" aria-hidden="true"></span><span class="fp-b">`
          + `<span class="fp-top"><span class="tc-k">${tcMono(s.op.replace(/ \d$/, ''))}${it.cls ? ' · ' + tcMono(it.cls) : ''}</span>${pp}</span>`
          + `<span class="fp-mid"><span class="fp-a"><b>${clock(e.s)}</b><small>${esc(zf)}</small></span><span class="fp-line"><i></i><em>${tcDur(e.e - e.s)}</em><i></i></span><span class="fp-a fp-r"><b>${clock(e.e)}</b><small>${esc(zt)}</small></span></span>`
          + `<span class="fp-bot"><span><small>REPORT</small><b class="m">${clock(e.s - (e.rep || s.rep || 45))}</b></span><span><small>JETTY</small><b>${esc(tcShort(s.fromPt) || zf)}</b></span>${seats ? `<span><small>SEATS</small><b class="m">${esc(seats)}</b></span>` : ''}</span>`
          + `${it.own ? '<span class="tag bk">Booked elsewhere</span>' : st}</span>`, `Ferry ${zf} to ${zt}, ${clock(e.s)} to ${clock(e.e)}`); }
      else if (k === 'boat' && (!e.parts || e.part === 1)) { const kind = /private/i.test(A.v || '') ? 'PRIVATE' : 'SHARED'; const from = String(A.site || '').split('->')[0].trim() || (ZN[A.z] && ZN[A.z].name) || '';
        card = btn('boat', `<span class="tc-ph">${tcBig(e.zone, I.icon, it.ref)}<em class="tc-badge">${ic('ferry', 12, 2.2)}BOAT TRIP · ${kind}</em><svg class="tc-wave" viewBox="0 0 390 14" preserveAspectRatio="none" aria-hidden="true"><path d="M0 8 Q 24 0 48 8 T 96 8 T 144 8 T 192 8 T 240 8 T 288 8 T 336 8 T 384 8 T 432 8 V14 H0Z"/></svg><span class="tc-ttl"><b>${esc(I.title)}</b></span></span>`
          + `<span class="tc-b"><span class="tc-grid"><span><small>LEAVES</small><b class="m">${clock(e.s)}</b></span><span><small>BACK BY</small><b class="m">${clock(e.e)}</b></span><span class="w"><small>FROM</small><b>${esc(from)}</b></span>${pp}</span>${st}</span>`); }
      else if (k === 'stay') { const H = HOT[it.ref] || {}; const n = it.nights || 1;
        card = btn('stay', `<span class="ks-key" aria-hidden="true"><span class="ks-card"><i></i></span><b>${n}N</b></span><span class="tc-b">`
          + `<span class="tc-k">CHECK-IN ${t0}${it.early ? ' · EARLY ASKED' : ''}</span><span class="tc-h"><b class="tc-t">${esc(I.title)}</b>${pp}</span><span class="tc-s">${esc(I.sub || '')}</span>`
          + `<span class="tc-f">${H.rt ? `<span class="tc-rate">★ ${H.rt}</span>` : ''}${st}</span></span>`); }
      else if (k === 'meal' || k === 'shop') {
        card = btn(k, `${ic(k === 'shop' ? 'store' : 'cup', 16, 2)}<b>${esc(I.title)}</b><span class="tc-s">${esc(String(small).replace(/ · until \d\d:\d\d$/, ''))}</span><span class="tc-pay">Pay there</span>`); }
      else if ((k === 'do' || k === 'adv') && !I.own) { const rt = A.g && A.g.rt;
        const timing = `${clock(e.s)}–${clock(e.e)}${e.parts ? ` · DAY ${e.part} OF ${e.parts}` : ` · ${tcDur(e.e - e.s)}`}`;
        const sub = String(I.sub || A.v || '').split(' · ')[0];
        card = btn(k, `<span class="tc-ph">${tcBig(e.zone, I.icon, it.ref)}<em class="tc-badge">${ic(k === 'adv' ? 'mask' : 'camera', 12, 2.2)}${tcMono(k === 'adv' ? (A.fam || 'Adventure') : (A.fam || 'Sight'))}</em><span class="tc-ttl"><b>${esc(I.title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span></span>`
          + `<span class="tc-b tc-row"><span class="tc-l"><span class="tc-tm">${timing}</span><span class="tc-f">${rt ? `<span class="tc-rate">★ ${rt}</span>` : ''}${st}</span></span>${pp}</span>`); }
      if (card) out = out.replace(/<button class="item [\s\S]*?<\/button>/, card);
      if (grip) out = out.replace('<span class="ec">', '<span class="ec">' + grip);
    } catch (x) { console.warn('tc', x); } return out; }; })();
/* day header = island photo banner with the day, sun times and how full the day is; the island strip in the trip header gets photos too */
(function () { const v0 = VIEWS.trip; VIEWS.trip = function () { const o = v0.apply(this, arguments); if (!o || !o.body) return o;
  try { const name2z = {}; Object.keys(ZN).forEach(z => { if (ZN[z] && ZN[z].name) name2z[ZN[z].name] = z; });
    o.body = o.body.replace(/(<section class="day" id="day(\d+)"[^>]*data-date="([^"]+)">\s*)<div class="dayhd">([\s\S]*?data-zone="([A-Z]+)"[\s\S]*?<\/button>)<\/div>\s*(<div class="lx-load[\s\S]*?<\/small><\/div>)?/g,
      (m, pre, n, date, inner, z, load) => `${pre}<div class="dayhd tc-dh"><span class="dh-ph">${tcBig(z, 'beach', 'DAYHD:' + z + ':' + date)}</span>${inner}${load || ''}</div>`);
    o.body = o.body.replace(/(<button role="listitem" style="flex:\d+;--zc:[^"]*"[^>]*aria-label="([^",]+),[^"]*">)/g, (m, open, nm) => name2z[nm] ? `${open}<span class="sp-ph">${art(name2z[nm], 'beach', 'STRIP:' + name2z[nm] + m.length)}</span>` : m);
  } catch (x) { console.warn('dh', x); } return o; }; })();
/* ===== BOAT CHARTERS page (canvas "Boat charters page") ===== */
const CHARTER_GROUPS = [
  ['private', 'Private boats', 'whole boat, your group only', ['ACV-CHARTER-HAV-2H', 'ACV-CHARTER-HAV-SUNSET', 'ACV-CHARTER-PB-6H', 'ACV-BOAT-CINQUE', 'ACV-BOAT-LALAJI', 'ACV-BOAT-ROSSSMITH-2', 'ACV-BOAT-ROSSSMITH-5', 'ACV-BOAT-ROSSSMITH-6', 'ACV-BOAT-ROSSSMITH-10', 'ACV-BOAT-LONG-3BEACH']],
  ['speed', 'Speedboat transfers', 'private, leave when you want', ['ACV-SPEED-PB-HAV', 'ACV-SPEED-HAV-NEI']],
  ['fish', 'Fishing boats', 'game fishing and local boats', ['ACV-FISH-HALF-AM', 'ACV-FISH-HALF-PM', 'ACV-FISH-FULL', 'ACV-FISHING-LOCAL', 'ACV-FISHING-LOCAL-NEI']],
  ['cruise', 'Cruises and sunsets', 'shared, pay per person', ['ACV-CRUISE-SUNSET-PB', 'ACV-SUNSET-HAV', 'ACV-CRUISE-DINNER-PB', 'ACV-DINNER-CRUISE-HAV', 'ACV-PARTYBOAT-HAV']],
  ['volcano', 'Barren Island volcano', 'India’s only active volcano', ['ACV-BARREN-PRIVATE', 'ACV-BARREN-SHARED', 'ACV-BARREN-DSS', 'ACV-BARREN-DSS-DLX']]];
const CH_BADGE = {private:'PRIVATE · WHOLE BOAT', speed:'SPEEDBOAT · PRIVATE', fish:'FISHING', cruise:'CRUISE · SHARED', volcano:'VOLCANO TRIP'};
function chList() { return CHARTER_GROUPS.map(([k, n, s, ids]) => ({k, n, s, l:ids.map(id => ACT[id]).filter(a => a && (typeof actOk !== 'function' || actOk(a)))})).filter(g => g.l.length); }
function chCap(a) { const t = String((a.v || '') + ' ' + (a.n || '')); const m = t.match(/(\d+) (?:pax|people)/i) || t.match(/up to (\d+)(?! ?(?:hrs?|hours?|min))/i); return m ? +m[1] : null; }
function chCard(a, k) { const date = baseDate(); const p = actUnit(a, date); const cap = chCap(a); const per = a.b === 'per_boat' ? '/ boat' : a.b === 'per_group' ? '/ group' : a.b === 'per_vehicle' ? '/ vehicle' : '/ person';
  const from = String(a.site || '').split('->')[0].trim() || (ZN[a.z] && ZN[a.z].name) || '';
  const pp = a.b === 'per_boat' && cap && p ? `${inr(Math.round(p / cap))} a person if ${cap} go` : '';
  return `<article class="chc"><button class="chc-ph" data-a="product" data-kind="act" data-id="${a.id}" aria-label="${esc(a.n)}, details">${tcBig(a.z, 'boat', a.id)}<em class="tc-badge">${ic('ferry', 12, 2.2)}${CH_BADGE[k] || 'BOAT'}</em><span class="tc-ttl"><b>${esc(a.n)}</b><small>${esc(a.v || '')}</small></span></button>
    <div class="chc-b"><div class="chc-g"><span><small>UP TO</small><b class="m">${cap || '—'}</b></span><span><small>TIME</small><b class="m">${(durOf(a) || '—').replace(/ hrs?/, 'H').replace(/ min/, 'M')}</b></span><span class="w"><small>FROM</small><b>${esc(from)}</b></span></div>
    <div class="chc-f"><span class="chc-p"><b>${p ? inr(p) : 'On request'}<small> ${p ? per : ''}</small></b>${pp ? `<em>${pp}</em>` : ''}</span><button class="btn primary sm" data-a="product" data-kind="act" data-id="${a.id}">${ic('plus', 15, 2.6)} Pick a time</button></div></div></article>`; }
VIEWS.charter = function () { const G = chList(); const all = G.reduce((s, g) => s + g.l.length, 0); const fk = S.chK || 'all', fz = S.chZ || 'all';
  const zones = [...new Set(G.flatMap(g => g.l.map(a => a.z)))];
  const secs = G.filter(g => fk === 'all' || g.k === fk).map(g => ({...g, l:g.l.filter(a => fz === 'all' || a.z === fz)})).filter(g => g.l.length);
  return {title:'Boat charters', body:`<div class="chhero">${(i => `<img alt="" src="${PH_BASE}f/${i}.webp">`)('i120')}<div class="wrap"><span class="eyebrow">Boat charters · ${all} boats</span><h1>The sea, on your clock</h1><p>Whole boats, private speedboats, fishing and sunset cruises. Pick a boat, we fit it into your trip.</p></div></div>
  <div class="wrap"><div class="sec" style="padding-top:14px">
    <div class="chips" role="tablist" aria-label="Kind of boat"><button class="chip" data-a="chf" data-k="all" aria-pressed="${fk === 'all'}">All ${all}</button>${G.map(g => `<button class="chip" data-a="chf" data-k="${g.k}" aria-pressed="${fk === g.k}">${esc(g.n)} ${g.l.length}</button>`).join('')}</div>
    <div class="chips chz" role="tablist" aria-label="Island" style="margin-top:8px"><button class="chip" data-a="chz" data-k="all" aria-pressed="${fz === 'all'}">Any island</button>${zones.map(z => `<button class="chip" data-a="chz" data-k="${z}" aria-pressed="${fz === z}">${esc(ZN[z].name)}</button>`).join('')}</div>
    ${secs.length ? secs.map(g => `<section class="chsec"><div class="sechd"><h2>${esc(g.n)}</h2><span class="muted" style="font-size:13px">${esc(g.s)}</span></div><div class="chgrid">${g.l.map(a => chCard(a, g.k)).join('')}</div></section>`).join('') : `<p class="note">No boats for that island in this group. Try “Any island”.</p>`}
    <p class="note">Private boats are priced for the whole boat. Sea and weather permitting; our Port Blair team confirms the slot with the boat owner.</p>
  </div></div>`}; };
document.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (!el) return; const d = el.dataset;
  if (d.a === 'chf') { S.chK = d.k; render(); } else if (d.a === 'chz') { S.chZ = d.k; render(); } });
/* home: a wide photo tile for boat charters, under the six category tiles */
(function () { const s0 = shortcuts; shortcuts = function () { return s0.apply(this, arguments) + `<button class="lx-chtile" data-a="go" data-v="charter"><span class="art">${(i => `<img alt="" src="${PH_BASE}f/${i}.webp">`)('i179')}</span><span class="lx-chtile-b"><em>${ic('ferry', 13, 2.2)}BOAT CHARTERS</em><b>Hire a whole boat</b><small>Private boats, speedboats, fishing and sunset cruises</small></span><span class="lx-chtile-go">${ic('arrow', 18, 2.2)}</span></button>`; }; })();


/* ---- bridge for React ---- */
export function __setRender(fn) { render = fn; }
export function __setToast(fn, fnUndo) { toast = fn; if (fnUndo) toastUndo = fnUndo; }
export function __resetIdeas() { IDEAS_SEEN = new Set(); }
export { D, ZN, ZC, ZHEX, HOT, ACT, SAIL, NAT, MARKUP, hash, inr, tm, hm, esc, pDate, iso, addD, DOW, MON, DOW_HI, fD, dowOf, durTxt, T, t, TODAY, SAMPLE0, S, SAVE_KEYS, save, regOwn, load, vendorFor, FAMICON, actPrice, hotelPrice, slotsFor, pax, kidAges, kidsOk, partyOf, ROUTE, RENT, VCLS, VSUB, season, SEASON_NAME, peakUp, vehFor, HUB, rkey, rkeys, findRoute, hotelKey, JKEY, JKEY_TO, stayOn, stayAt, baseKey, placeRoute, JETTY_RT, cabMeta, BOOKABLE, classFares, fareOf, minFare, roomOf, stayPrice, actUnit, info, seasonOk, availability, seats, seatsAct, itemEnd, deriveTrip, syncTrip, cabTimeFor, linkCart, dayIdx, nDays, flightIn, flightOut, expand, startZone, makePos, reach, SITEMIN, siteMin, cabServes, tau, abs, CHECKIN, CHECKOUT, GRACE, dayOf, clock, _lite, _nofix, run, run0, ferryPref, prefWhy, fixesFor, runLite, fitOf, RULES, ZID, mt, inList, DAYN, closedRule, isCarrierRule, refsOf, inRefs, PLAIN, carrierPairs, quickFix, EXCURSION, dataRules, productNotes, SITECAB, NO_CAB, siteKey, siteRoute, siteCabs, ICONS, UI, ic, TODS, SKYG, SEAG, GLOW, ACC, artDefs, f1, prng, smooth, aSky, aSea, aIsle, aFar, aPalm, aBush, aShore, aBirds, aFerry, aBoat, aGlow, SCENES, ZSCENE, sceneFor, art, MAPGEO, HERO_TODS, heroLayer, _heroHTML, heroArt, istNow, todNow, _heroT, heroStart, MAPV, PINS, _mapDrawn, islandMap, logoMark, qr, hardCount, applyFix, autoFix, quickAdd, trimStays, addItem, sampleTrip, subtotal, gstTotal, total, onReq, cur, go, tab, back, TABV, ORDER_Z, BEYOND_Z, CATS, HIDDEN, catOf, shown, TAGNAME, priceLine, unitOf, stars, paxTxt, fitTag, baseDate, zoneAt, defaultDayFor, dayPicker, primary, ctaBar, ctaBarBd, NS, zoneOpts, vSearch, offSeason, actCard, hotelFrom, hotelCard, cabCard, rentCard, aisleTabs, aboutTile, vStore, routeBody, jettyLegs, chainView, chainTotal, vRoute, layoutFor, seatState, autoSeats, vSeats, initCfg, firstFreeNight, defaultNights, vProduct, nightStay, vTrip, fixBtn, alertHTML, anchorRow, evRow, REC, WET, IDEAS_SEEN, gapPicks, gapRow, vCheckout, vPaid, vPasses, passCard, vPass, vProfile, vVendor, vScanner, PCATS, SZN, PIDX, priceIndex, applyPO, mgn, mpill, adminRows, vAdmin, poSet, poCSV, sheetWrap, datesSheet, agesHTML, helpSheet, breakdownSheet, fixMenuSheet, autoFixSheet, ferryAddedSheet, VIEWS, _toastT, toast, toastUndo, render, rerender, ABOUT, islandCard, homeZone, shortcuts, dateNudge, vHome, has, ADV, RANKED, rankOf, SIGNATURE, advActs, fromPrice, sigCard, vAdv, PKGS, PKG_SOURCES, pkgHotel, buildPkg, pkgSig, PKCACHE, pkgStart, pkgPreview, route, pkgCard, paxLabel, vPkgs, vPkg, loadPkg, pkgSheet, bookAll, editItem, dayAct, addFerry, removeItem, doFx, _qT, setHeroTod, heroTick, POP, popOf, POPWHY, GEO, GEOA, hav, estMin, travelMin, engHop, hopMin, hopMin0, inBreak, shortName, ideaFilter, BLOCKS, BLK, EVD, ctxOf, evFor, planBlock, cabFixable, addNeededCabs, addBlock, blockMeta, blockTile, blocksRail, blockSheet, autoPlan, daysBetween, clone, TOURPF, tourTotal, NORTH, tourList, GSTYLES, LEGT, LIKES, MINE, APPEAL, DECAY, optSegs, likeStyle, genSegs, genSpec, genNights, GENC, genOptions, itemsHL, dayLines, vGen, useGen, tripRoute, snapTrip, saveCurrent, stashCurrent, openTrip, saveGen, routeChips, runSheet, runText, tripNeeds, tripTier, addCabs, fillEmptyDays, tripAssist, tripTools, actExtras, ISLE_LINE, PHOTO_CAP, PHOTOS, PHOTO_CAPK, DOWN, sailsOn, dayList, nextSailDate, govLine, dssLink, DSS_GROUPS, vDss, PKG3, pkg3Back, REMOTE, bookStatus, BKL, bkTag, REMOTE_Z, zMin, zMax, nightPlan, fillNights, ROADS, roadPath, seatFor, legOptions, itemZone, dayWindow, routeMove, planRoute, completeTrip, reachInfo, zIn, reachCard, HKEYS, stayKeyOn, keepLinked, chainCabs, slotFit, slotNote, LOCALK, dayCabs, sightCabs, moveDay, vehClasses, priceWith, dayTools, ZSHORT, checkLead, stayAlts, swapDelta, sgn, stayCompare, paceCtl, shareText, compareTrips, FAMINFO, INTERNAL_NOTE, pubNote, WATERF, wxLine, famInfo, DOWS, weekGrid, glance, stepsFor, getThere, faqFor, actPage, GOODFOR, AF_TOD, BUDS, actPriceOf, actOk, actFilterBar, AREA, areaName, stayOk, stayFilterBar, MOVET, moveContent, vExp, gLink, gCount, gChip, reviewBlock, hotelRevBlock, nudgeClashes, boatOffer, seatsOfAct, addCarriers, airportEnds, swapBanner, PH_BASE, PHREG, PH_FOCUS, DEST, destKey, phHash, _zpool, NOT_SCENE, scene, zonePool, _townP, townPool, rot, phResolve, _phUsed, _phTick, _phReserve, phFrame, _phIO, phLoad, PHV, phOpen, phDraw, phStep, dsSync, extendBtn, extendTrip, durOf, courseFit, _PAIR, PAIRX, pairs, affinity, dayRefs, pairRail, _bulk, DRG, rowEnd, rowStart, dropTime, moveTo, drgEnd, drgMove, drgTick, MEALK, isMeal, mealSlot, addMeal, dayMeals, mealRow, mealsAll, slotCands, fitOn, swapsFor, moveSheet, dayLoad, loadBar, TC_ADV, tcCat, tcBig, tcMono, tcDur, tcShort, CHARTER_GROUPS, CH_BADGE, chList, chCap, chCard };
