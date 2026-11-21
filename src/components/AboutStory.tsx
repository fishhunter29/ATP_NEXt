'use client';
/* About us: the story of the three friends who started ATP, in English and Hindi. Both languages are in the HTML
   (so search engines read both); the switch only chooses which one is shown. */
import { useState } from 'react';
import { COMPANY, DPIIT_LINE } from '@/lib/company';
import { waLink } from '@/lib/whatsapp';

type Lang = 'en' | 'hi';

const STORY: Record<Lang, { eyebrow: string; title: string; lead: string; body: string[]; sign: string; promisesH: string; promises: [string, string][]; cta: string; ctaSub: string }> = {
  en: {
    eyebrow: 'About us',
    title: 'Three friends, one set of islands',
    lead: 'Andaman Travel Planner began the way most good things here begin: on a jetty, waiting for a boat.',
    body: [
      'We are three friends, and the Andaman Islands are our home. The timetable of the sea runs through our days: the first ferry at six, the last boat gone by afternoon, the ship that sails only when the weather allows. For us these islands are not a postcard. They are the road to work, the Sunday market, the shore in the evening.',
      'Year after year we watched visitors arrive with a ticket for a ferry that had already left, a hotel booked on the wrong island, a cab waiting at the wrong jetty. No one had been careless. It is simply that here, everything depends on everything else. The ferry decides when you can check in. The tide decides when you can paddle into the mangroves. The moon decides whether the sea will glow tonight. And a Monday decides whether the museum is open at all.',
      'So one evening the three of us sat down and asked a simple question. What if a trip were planned the way these islands actually work? Not a list of separate bookings, but one living plan, in which every ferry, every stay, every cab and every dive is checked against all the others before anyone pays a rupee.',
      'That question is Andaman Travel Planner. We went to the hotels ourselves and agreed fair local prices, with no middleman from the mainland in between. We sat with ferry operators, boatmen and drivers, and wrote down what only people who live here know: that a cab should leave your hotel and loop back to it, that Ross Island shuts on Wednesdays, that the Baratang convoy leaves before dawn. Then we built all of it into one engine.',
      'Today the company is a DPIIT-recognised startup, registered in Sri Vijaya Puram. But the promise is the one we first made to each other. When you send us your plan, a person who lives here checks it and replies within thirty minutes. If something will not work, we tell you plainly, and we fix it.',
      'We are still those three friends on the jetty. The only difference is that now, when the boat comes in, we make sure you are on it.',
    ],
    sign: 'The ATP team, Sri Vijaya Puram',
    promisesH: 'What we promise you',
    promises: [
      ['Confirmed in 30 minutes', 'Every stay, ferry, cab and activity, checked with the partner.'],
      ['Local prices', 'We deal with every hotel, boat and driver ourselves. No mainland middleman.'],
      ['No sales calls', 'You choose the trip. We confirm it, nothing more.'],
      ['With you all the way', 'Before, during and after the trip, we are one message away.'],
    ],
    cta: 'Talk to us on WhatsApp',
    ctaSub: 'Every day, 8 am to 9 pm',
  },
  hi: {
    eyebrow: 'हमारे बारे में',
    title: 'तीन दोस्त, एक द्वीप-समूह',
    lead: 'अंडमान ट्रैवल प्लानर की शुरुआत वैसे ही हुई, जैसे यहाँ की ज़्यादातर अच्छी चीज़ें होती हैं — एक जेटी पर, नाव का इंतज़ार करते हुए।',
    body: [
      'हम तीन दोस्त हैं, और अंडमान हमारा घर है। समंदर की समय-सारणी हमारे दिनों में घुली हुई है — सुबह छह बजे की पहली फ़ेरी, दोपहर ढलते ही आख़िरी नाव का चले जाना, और वह जहाज़ जो तभी चलता है जब मौसम इजाज़त दे। हमारे लिए ये द्वीप कोई पोस्टकार्ड नहीं, रोज़ की राह हैं — दफ़्तर का रास्ता, इतवार का बाज़ार, शाम का किनारा।',
      'साल-दर-साल हमने सैलानियों को आते देखा — किसी के हाथ में उस फ़ेरी का टिकट जो कब की जा चुकी थी, किसी का होटल ग़लत द्वीप पर, किसी की गाड़ी ग़लत जेटी पर खड़ी। लापरवाही किसी की नहीं थी; बस यहाँ हर चीज़ हर दूसरी चीज़ से बँधी है। फ़ेरी तय करती है कि आप कब चेक-इन करेंगे। ज्वार तय करता है कि कयाक मैंग्रोव में कब उतरेगी। चाँद तय करता है कि आज रात समंदर चमकेगा या नहीं। और सोमवार तय करता है कि संग्रहालय खुला भी है या नहीं।',
      'तो एक शाम हम तीनों बैठे और ख़ुद से एक सीधा-सा सवाल पूछा — क्यों न सफ़र की योजना वैसे ही बने, जैसे ये द्वीप सचमुच चलते हैं? अलग-अलग बुकिंग की कोई सूची नहीं, बल्कि एक जीती-जागती योजना, जिसमें हर फ़ेरी, हर ठहराव, हर गाड़ी और हर गोता बाक़ी सब के साथ परखा जाए — इससे पहले कि कोई एक रुपया भी दे।',
      'वही सवाल आज अंडमान ट्रैवल प्लानर है। हम ख़ुद होटलों तक गए और सीधे, स्थानीय दाम तय किए — बीच में मुख्यभूमि का कोई बिचौलिया नहीं। हम फ़ेरी संचालकों, नाविकों और ड्राइवरों के साथ बैठे, और वह सब लिख लिया जो सिर्फ़ यहाँ रहने वाले जानते हैं — कि गाड़ी आपके होटल से निकले और घूमकर वहीं लौटे, कि रॉस द्वीप बुधवार को बंद रहता है, कि बाराटांग का काफ़िला भोर से पहले निकल पड़ता है। फिर यह सारी समझ हमने एक इंजन में पिरो दी।',
      'आज हमारी कंपनी श्री विजयपुरम में पंजीकृत, DPIIT से मान्यता-प्राप्त स्टार्टअप है। पर वादा वही है जो सबसे पहले हमने एक-दूसरे से किया था — जब आप अपनी योजना हमें भेजेंगे, तो यहीं रहने वाला कोई इंसान उसे जाँचेगा और तीस मिनट के भीतर जवाब देगा। कुछ ठीक न बैठे, तो हम साफ़-साफ़ बताएँगे, और उसे ठीक करेंगे।',
      'हम आज भी वही तीन दोस्त हैं, उसी जेटी पर। फ़र्क़ बस इतना है कि अब जब नाव किनारे लगती है, तो हम यह पक्का करते हैं कि आप उसमें सवार हों।',
    ],
    sign: 'टीम ATP, श्री विजयपुरम',
    promisesH: 'हमारा वादा',
    promises: [
      ['30 मिनट में पक्का', 'हर ठहराव, फ़ेरी, गाड़ी और गतिविधि — साझेदार से जाँचकर।'],
      ['स्थानीय दाम', 'हर होटल, नाव और ड्राइवर से हम ख़ुद बात करते हैं। मुख्यभूमि का कोई बिचौलिया नहीं।'],
      ['कोई सेल्स कॉल नहीं', 'यात्रा आप चुनते हैं। हम बस उसे पक्का करते हैं।'],
      ['पूरे सफ़र में साथ', 'यात्रा से पहले, दौरान और बाद में — हम बस एक संदेश की दूरी पर हैं।'],
    ],
    cta: 'व्हाट्सऐप पर बात करें',
    ctaSub: 'हर दिन, सुबह 8 से रात 9 बजे तक',
  },
};

export default function AboutStory() {
  const [lang, setLang] = useState<Lang>('en');
  return (
    <div className="atp-about">
      <section className="atp-hhero is-page">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/f/i153.webp" alt="A ferry at the jetty" width={1280} height={853} fetchPriority="high" decoding="async" />
        <div className="atp-hhero-b"><span className="atp-eyebrow">{STORY[lang].eyebrow}</span><h1 lang={lang === 'hi' ? 'hi' : 'en'}>{STORY[lang].title}</h1></div>
      </section>
      <div className="atp-about-in">
        <div className="atp-langsw" role="group" aria-label="Language">
          <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>English</button>
          <button type="button" aria-pressed={lang === 'hi'} onClick={() => setLang('hi')} lang="hi">हिन्दी</button>
        </div>
        {(['en', 'hi'] as Lang[]).map((k) => {
          const s = STORY[k];
          return (
            <article key={k} lang={k === 'hi' ? 'hi' : 'en'} hidden={lang !== k} className={`atp-story is-${k}`}>
              <p className="atp-story-lead">{s.lead}</p>
              {s.body.map((p, i) => <p key={i}>{p}</p>)}
              <p className="atp-story-sign">— {s.sign}</p>
              <h2>{s.promisesH}</h2>
              <ul className="atp-story-prom">{s.promises.map(([b, t]) => <li key={b}><b>{b}</b><span>{t}</span></li>)}</ul>
              <a className="atp-btn is-action atp-story-cta" href={waLink(k === 'hi' ? 'नमस्ते, मैं अंडमान यात्रा की योजना बनाना चाहता/चाहती हूँ।' : 'Hi, I’d like help planning an Andaman trip.')} target="_blank" rel="noopener noreferrer"><span><b>{s.cta}</b><small>{s.ctaSub}</small></span></a>
            </article>
          );
        })}
        <address className="atp-story-co">
          <b>{COMPANY.name}</b>
          <span>{DPIIT_LINE}</span>
          <span>{COMPANY.address}</span>
          <span><a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></span>
        </address>
      </div>
    </div>
  );
}
