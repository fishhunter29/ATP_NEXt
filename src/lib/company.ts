/* The company behind the site: legal identity, recognitions and contact. One place, used by the footer,
   the legal pages and the schema.org data. */
export const COMPANY = {
  name: 'Andaman Travel Planner Private Limited',
  cin: 'U52291AN2025PTC006133',
  gstin: '35ABCCA3774B1Z0',
  dpiit: 'DIPP222255',
  email: 'info@andamantravelplanner.com',
  whatsapp: '+91 99332 70842',
  street: 'Bargat Line, Chakargaon',
  locality: 'Sri Vijaya Puram (Port Blair)',
  region: 'Andaman & Nicobar Islands',
  postalCode: '744112',
  address: 'Bargat Line, Chakargaon, Sri Vijaya Puram (Port Blair), South Andaman, Andaman & Nicobar Islands – 744112',
} as const;

export const DPIIT_LINE = `DPIIT Recognised Startup · ${COMPANY.dpiit}`;

/* Recognitions and memberships, in the order they are shown. Files live in /public/img/logos. */
export const RECOGNITIONS: { file: string; name: string }[] = [
  { file: 'startupindia.png', name: 'Startup India' },
  { file: 'mot.svg', name: 'Ministry of Tourism, Government of India' },
  { file: 'incredible.svg', name: 'Incredible India' },
  { file: 'antourism.png', name: 'Andaman & Nicobar Tourism' },
  { file: 'taai.png', name: 'Travel Agents Association of India (TAAI)' },
  { file: 'iato.png', name: 'Indian Association of Tour Operators (IATO)' },
];
