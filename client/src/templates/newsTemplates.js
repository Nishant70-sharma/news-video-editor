export const NEWS_TEMPLATES = [
  {
    id: 'breaking-news',
    label: 'Breaking News',
    description: 'High-urgency red banner, fast ticker.',
    headline: {
      bgColor: '#c1121f',
      opacity: 0.9,
      fontFamily: 'display',
      fontSize: 42,
      padding: 18,
      borderRadius: 8,
      widthPct: 1,
      heightPct: 0.16,
      position: 'lower-third',
      animation: 'fade'
    },
    ticker: { bgColor: '#0b0e14', textColor: '#ffffff', fontSize: 26, speedPxPerSec: 160, direction: 'ltr', animation: 'fade' },
    logo: { position: 'top-right', widthPct: 0.1, opacity: 1, marginPx: 24 }
  },
  {
    id: 'general-news',
    label: 'General News',
    description: 'Balanced navy banner, steady ticker.',
    headline: {
      bgColor: '#1e3a8a',
      opacity: 0.88,
      fontFamily: 'displayAlt',
      fontSize: 38,
      padding: 16,
      borderRadius: 6,
      widthPct: 1,
      heightPct: 0.16,
      position: 'lower-third',
      animation: 'fade'
    },
    ticker: { bgColor: '#111827', textColor: '#e5e7eb', fontSize: 24, speedPxPerSec: 120, direction: 'ltr', animation: 'fade' },
    logo: { position: 'top-left', widthPct: 0.1, opacity: 1, marginPx: 24 }
  },
  {
    id: 'business-news',
    label: 'Business News',
    description: 'Understated charcoal + gold accent banner.',
    headline: {
      bgColor: '#1f2937',
      opacity: 0.9,
      fontFamily: 'displayAlt',
      fontSize: 36,
      padding: 16,
      borderRadius: 4,
      widthPct: 1,
      heightPct: 0.16,
      position: 'lower-third',
      animation: 'fade'
    },
    ticker: { bgColor: '#0f172a', textColor: '#d4af37', fontSize: 24, speedPxPerSec: 110, direction: 'rtl', animation: 'fade' },
    logo: { position: 'top-right', widthPct: 0.09, opacity: 0.95, marginPx: 20 }
  },
  {
    id: 'live-update',
    label: 'Live Update',
    description: 'Bold orange banner, urgent fast ticker — for developing stories.',
    headline: {
      bgColor: '#c2410c',
      opacity: 0.92,
      fontFamily: 'display',
      fontSize: 40,
      padding: 18,
      borderRadius: 6,
      widthPct: 1,
      heightPct: 0.16,
      position: 'lower-third',
      animation: 'slide-up'
    },
    ticker: { bgColor: '#7c2d12', textColor: '#ffffff', fontSize: 26, speedPxPerSec: 180, direction: 'ltr', animation: 'fade' },
    logo: { position: 'top-right', widthPct: 0.1, opacity: 1, marginPx: 24 }
  },
  {
    id: 'political-news',
    label: 'Political News',
    description: 'Deep indigo banner with a steady, formal ticker.',
    headline: {
      bgColor: '#312e81',
      opacity: 0.9,
      fontFamily: 'displayAlt',
      fontSize: 38,
      padding: 18,
      borderRadius: 4,
      widthPct: 1,
      heightPct: 0.17,
      position: 'lower-third',
      animation: 'fade'
    },
    ticker: { bgColor: '#1e1b4b', textColor: '#e0e7ff', fontSize: 24, speedPxPerSec: 100, direction: 'ltr', animation: 'fade' },
    logo: { position: 'top-left', widthPct: 0.1, opacity: 1, marginPx: 24 }
  },
  {
    id: 'sports-news',
    label: 'Sports News',
    description: 'High-energy green/black banner, quick ticker.',
    headline: {
      bgColor: '#15803d',
      opacity: 0.92,
      fontFamily: 'display',
      fontSize: 42,
      padding: 16,
      borderRadius: 10,
      widthPct: 1,
      heightPct: 0.16,
      position: 'lower-third',
      animation: 'slide-left'
    },
    ticker: { bgColor: '#052e16', textColor: '#bbf7d0', fontSize: 26, speedPxPerSec: 170, direction: 'ltr', animation: 'fade' },
    logo: { position: 'top-right', widthPct: 0.1, opacity: 1, marginPx: 24 }
  },
  {
    id: 'technology-news',
    label: 'Technology News',
    description: 'Sleek cyan/black banner with a clean, modern ticker.',
    headline: {
      bgColor: '#0e7490',
      opacity: 0.9,
      fontFamily: 'displayAlt',
      fontSize: 38,
      padding: 16,
      borderRadius: 8,
      widthPct: 1,
      heightPct: 0.16,
      position: 'lower-third',
      animation: 'fade'
    },
    ticker: { bgColor: '#083344', textColor: '#a5f3fc', fontSize: 24, speedPxPerSec: 130, direction: 'rtl', animation: 'fade' },
    logo: { position: 'top-left', widthPct: 0.09, opacity: 1, marginPx: 24 }
  }
];

export function getTemplate(id) {
  return NEWS_TEMPLATES.find((t) => t.id === id) || NEWS_TEMPLATES[0];
}
