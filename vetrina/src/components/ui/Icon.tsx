/**
 * Iconografia FORO: icone a tratto, spessore 1,6 su 24 (Manuale, cap. 06).
 * Niente emoji nei materiali ufficiali: usare sempre queste.
 */
import type { CSSProperties } from "react";

const P: Record<string, React.ReactNode> = {
  // set del manuale
  aula: (
    <>
      <rect x="3.5" y="5" width="7.5" height="14" />
      <rect x="13" y="5" width="7.5" height="14" />
    </>
  ),
  orari: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  agora: <path d="M4 11v2M8 8v8M12 4.5v15M16 8v8M20 11v2" />,
  foro: <path d="M4 12h16" />,
  eventi: (
    <>
      <rect x="3.5" y="5.5" width="17" height="14.5" />
      <path d="M3.5 10h17M8 3.5v4M16 3.5v4" />
    </>
  ),
  soci: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
      <circle cx="16.6" cy="9.2" r="2.6" />
      <path d="M15.8 14.6c2.4-.2 4.2 1.4 4.7 4.2" />
    </>
  ),
  sede: (
    <>
      <path d="M4 20V9.5L12 4l8 5.5V20z" />
      <path d="M9.5 20v-5a2.5 2.5 0 0 1 5 0v5" />
    </>
  ),
  angolo: <path d="M9 5h10v10" strokeLinecap="square" strokeLinejoin="miter" />,
  // interfaccia
  "arrow-right": <path d="M4.5 12h15M13.5 6l6 6-6 6" />,
  "arrow-left": <path d="M19.5 12h-15M10.5 6l-6 6 6 6" />,
  "arrow-up-right": <path d="M7 17 17 7M8.5 7H17v8.5" />,
  "arrow-down": <path d="M12 4.5v15M6 13.5l6 6 6-6" />,
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  "chevron-right": <path d="m9 6 6 6-6 6" />,
  "chevron-left": <path d="m15 6-6 6 6 6" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  menu: <path d="M4 8h16M4 16h16" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.6v.1" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4 21 19.5H3z" />
      <path d="M12 10v4.5M12 17v.1" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" />
      <path d="m4 6.5 8 6 8-6" />
    </>
  ),
  phone: <path d="M5 4.5h3.5l1.5 4-2 1.5a10 10 0 0 0 6 6l1.5-2 4 1.5V19a1.5 1.5 0 0 1-1.5 1.5A15.5 15.5 0 0 1 3.5 6 1.5 1.5 0 0 1 5 4.5z" />,
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.5 20c.8-3.8 3.7-6 7.5-6s6.7 2.2 7.5 6" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 8.5-8.5M16 7l2.5 2.5M14 9l2 2" />
    </>
  ),
  logout: <path d="M14 4.5H5v15h9M10 12h10M16.5 8.5 20 12l-3.5 3.5" />,
  document: (
    <>
      <path d="M6 3.5h8.5L18.5 7.5v13H6z" />
      <path d="M14 3.5V8h4.5M9 12h6M9 15.5h6" />
    </>
  ),
  folder: <path d="M3.5 6.5h6l2 2.5h9v10.5h-17z" />,
  flag: <path d="M5.5 21V4M5.5 4.5h11l-2 4 2 4h-11" />,
  download: <path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14" />,
  external: <path d="M13.5 4.5h6v6M19.5 4.5 11 13M17.5 14v5.5h-13v-13H10" />,
  seat: (
    <>
      <path d="M7 12V5.5h10V12" />
      <path d="M5 12h14v3.5H5zM7 15.5V20M17 15.5V20" />
    </>
  ),
  ticket: (
    <>
      <path d="M3.5 7.5h17V10a2 2 0 0 0 0 4v2.5h-17V14a2 2 0 0 0 0-4z" />
      <path d="M14.5 7.5v9" strokeDasharray="1.6 2" />
    </>
  ),
  wifi: (
    <>
      <path d="M3.5 9.5a12 12 0 0 1 17 0M6.5 12.8a7.5 7.5 0 0 1 11 0M9.5 16a3 3 0 0 1 5 0" />
      <path d="M12 19.2v.1" />
    </>
  ),
  plug: <path d="M9 3.5V8M15 3.5V8M6.5 8h11v3a5.5 5.5 0 0 1-11 0zM12 16.5v4" />,
  book: (
    <>
      <path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5z" />
      <path d="M12 6.5v13" />
    </>
  ),
  coffee: (
    <>
      <path d="M4.5 9h12v5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z" />
      <path d="M16.5 10.5h1.5a2.5 2.5 0 0 1 0 5h-1.8M8 3.5v2.5M11.5 3.5v2.5" />
    </>
  ),
  access: (
    <>
      <circle cx="12" cy="4.8" r="1.6" />
      <path d="M5 8.5h14M12 8.5v5M12 13.5l-3.5 7M12 13.5l3.5 7" />
    </>
  ),
  heart: <path d="M12 19.5s-7.5-4.4-7.5-10a4.2 4.2 0 0 1 7.5-2.6 4.2 4.2 0 0 1 7.5 2.6c0 5.6-7.5 10-7.5 10z" />,
  hand: <path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V11m0-5.5v-1a1.5 1.5 0 0 1 3 0V11m0-4.5a1.5 1.5 0 0 1 3 0V14a6.5 6.5 0 0 1-6.5 6.5c-2.5 0-3.8-1-5.3-3L3.4 14a1.6 1.6 0 0 1 2.5-2L8 14" />,
  euro: <path d="M17.5 6.5a6.5 6.5 0 1 0 0 11M4.5 10.5h9M4.5 13.5h9" />,
  chart: <path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6" />,
  bell: (
    <>
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </>
  ),
  send: <path d="M20.5 3.5 3.5 10.5l7 3 3 7zM10.5 13.5l10-10" />,
  edit: <path d="M4.5 19.5h4l10-10-4-4-10 10zM13 7l4 4" />,
  trash: <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" />,
  filter: <path d="M4 5.5h16l-6 7.5v6l-4 1.5V13z" />,
  grid: (
    <>
      <rect x="4" y="4" width="7" height="7" />
      <rect x="13" y="4" width="7" height="7" />
      <rect x="4" y="13" width="7" height="7" />
      <rect x="13" y="13" width="7" height="7" />
    </>
  ),
  list: <path d="M8.5 6.5h11M8.5 12h11M8.5 17.5h11M4.5 6.5h.1M4.5 12h.1M4.5 17.5h.1" />,
  calendar: (
    <>
      <rect x="3.5" y="5.5" width="17" height="14.5" />
      <path d="M3.5 10h17M8 3.5v4M16 3.5v4M7.5 13.5h2M11 13.5h2M14.5 13.5h2M7.5 16.5h2M11 16.5h2" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="3.8" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
    </>
  ),
  moon: <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" />,
  instagram: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4.5" />
      <circle cx="12" cy="12" r="3.6" />
      <path d="M16.8 7.2v.1" />
    </>
  ),
  facebook: <path d="M14.5 20.5v-7h2.5l.5-3h-3V8.8c0-.9.4-1.5 1.6-1.5h1.5V4.6a17 17 0 0 0-2.3-.1c-2.4 0-3.9 1.4-3.9 4v2h-2.6v3h2.6v7" />,
  telegram: <path d="M20.5 4.5 3.5 11l6 2 2 6 3-4 4.5 3.5zM9.5 13l8-6.5" />,
  whatsapp: (
    <>
      <path d="M4.5 19.5l1.2-3.8A8 8 0 1 1 8.5 18.6z" />
      <path d="M9 9c0 3 2.5 5.8 6 6.2l1-1.6-2-1-1 .9c-1-.4-2-1.4-2.4-2.4l.9-1-1-2z" />
    </>
  ),
  play: <path d="M8 5.5v13l10.5-6.5z" />,
  pause: <path d="M8.5 5.5v13M15.5 5.5v13" />,
  sparkle: <path d="M12 4v4M12 16v4M4 12h4M16 12h4" />,
  quote: <path d="M5 17.5c0-4 1.5-7 5-9M13.5 17.5c0-4 1.5-7 5-9M5 17.5h4.5v-4H5zM13.5 17.5H18v-4h-4.5z" />,
  map: <path d="M3.5 6.5 9 4.5l6 2 5.5-2v13L15 19.5l-6-2-5.5 2zM9 4.5v13M15 6.5v13" />,
  bike: (
    <>
      <circle cx="6" cy="16" r="3.5" />
      <circle cx="18" cy="16" r="3.5" />
      <path d="M6 16l4-7.5h5L18 16M10 8.5 12.5 16h-2M13.5 5.5h2l-.5 3" />
    </>
  ),
  bus: (
    <>
      <rect x="5" y="3.5" width="14" height="14" rx="1" />
      <path d="M5 11.5h14M8 17.5V20M16 17.5V20M8.5 14.5h.1M15.5 14.5h.1" />
    </>
  ),
  car: (
    <>
      <path d="M4.5 16.5v-4l2-5.5h11l2 5.5v4z" />
      <path d="M4.5 12.5h15M6.5 16.5V19M17.5 16.5V19" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" />
      <path d="M15.5 8.5v-4h-11v11h4" />
    </>
  ),
  refresh: <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  "eye-off": <path d="M4 4l16 16M10 5.7a8 8 0 0 1 2-.2c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.5M6.6 6.6C4 8.3 2.5 12 2.5 12S6 18.5 12 18.5c1.8 0 3.3-.6 4.6-1.4M9.9 9.9a3 3 0 0 0 4.2 4.2" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6" />
    </>
  ),
  home: <path d="M4 11 12 4l8 7M6 9.5V20h12V9.5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  shield: <path d="M12 3.5 19 6v6c0 4.5-3 7.5-7 8.5-4-1-7-4-7-8.5V6z" />,
  cookie: (
    <>
      <path d="M20.5 12.5A8.5 8.5 0 1 1 11.5 3.5a3 3 0 0 0 4 3.5 3 3 0 0 0 5 5.5z" />
      <path d="M8.5 10h.1M9.5 15h.1M14 14h.1" />
    </>
  ),
};

export type IconName = keyof typeof P | (string & {});

export function Icon({
  name,
  size = 20,
  stroke = 1.6,
  className,
  style,
  title,
}: {
  name: IconName;
  size?: number | string;
  stroke?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
}) {
  const body = P[name as string];
  if (!body && import.meta.env.DEV) console.warn(`[Icon] icona sconosciuta: ${name}`);
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flex: "none", ...style }}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title}
    >
      {body}
    </svg>
  );
}

export const ICON_NAMES = Object.keys(P);
