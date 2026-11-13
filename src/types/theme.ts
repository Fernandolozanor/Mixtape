export interface ThemeScheme {
  id: string;
  name: string;
  primary: string; // e.g. #1b62a3
  rgb: string; // e.g. "27, 98, 163"
  secondary: string;
  accent: string;
  gradient: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export const THEME_SCHEMES: ThemeScheme[] = [
  {
    id: 'retro-rock-80s',
    name: 'Pletina Rock 80s (Tape Deck)',
    primary: '#1d5494', // Azul tinta bolígrafo de la cinta
    rgb: '29, 84, 148',
    secondary: '#8a6b33', // Latón y cinta magnética vintage
    accent: '#f59e0b', // Ámbar de vúmetro analógico
    gradient: 'linear-gradient(135deg, #1d5494 0%, #1e2533 50%, #8a6b33 100%)',
    badgeBg: 'rgba(29, 84, 148, 0.3)',
    badgeText: '#fbbf24',
    badgeBorder: 'rgba(245, 158, 11, 0.35)',
  },
  {
    id: 'ocean-blue',
    name: 'Azul Zafiro (R27 G98 B163)',
    primary: '#1b62a3',
    rgb: '27, 98, 163',
    secondary: '#0284c7',
    accent: '#38bdf8',
    gradient: 'linear-gradient(135deg, #1b62a3 0%, #0284c7 50%, #38bdf8 100%)',
    badgeBg: 'rgba(27, 98, 163, 0.25)',
    badgeText: '#38bdf8',
    badgeBorder: 'rgba(56, 189, 248, 0.35)',
  },
  {
    id: 'apple-pink',
    name: 'Rosa Apple Clásico',
    primary: '#fa2d55',
    rgb: '250, 45, 85',
    secondary: '#d83b9e',
    accent: '#ff5e7e',
    gradient: 'linear-gradient(135deg, #fa2d55 0%, #d83b9e 50%, #c084fc 100%)',
    badgeBg: 'rgba(250, 45, 85, 0.2)',
    badgeText: '#fa2d55',
    badgeBorder: 'rgba(250, 45, 85, 0.35)',
  },
  {
    id: 'emerald-mint',
    name: 'Verde Esmeralda',
    primary: '#059669',
    rgb: '5, 150, 105',
    secondary: '#10b981',
    accent: '#34d399',
    gradient: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)',
    badgeBg: 'rgba(16, 185, 129, 0.2)',
    badgeText: '#34d399',
    badgeBorder: 'rgba(16, 185, 129, 0.35)',
  },
  {
    id: 'midnight-purple',
    name: 'Púrpura Medianoche',
    primary: '#7c3aed',
    rgb: '124, 58, 237',
    secondary: '#8b5cf6',
    accent: '#c084fc',
    gradient: 'linear-gradient(135deg, #6d28d9 0%, #8b5cf6 50%, #c084fc 100%)',
    badgeBg: 'rgba(124, 58, 237, 0.2)',
    badgeText: '#c084fc',
    badgeBorder: 'rgba(124, 58, 237, 0.35)',
  },
  {
    id: 'sunset-gold',
    name: 'Ámbar & Fuego',
    primary: '#ea580c',
    rgb: '234, 88, 12',
    secondary: '#f59e0b',
    accent: '#fbbf24',
    gradient: 'linear-gradient(135deg, #c2410c 0%, #ea580c 50%, #f59e0b 100%)',
    badgeBg: 'rgba(234, 88, 12, 0.2)',
    badgeText: '#fbbf24',
    badgeBorder: 'rgba(234, 88, 12, 0.35)',
  },
];
