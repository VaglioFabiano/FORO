/**
 * Marchio FORO — geometria estratta in vettoriale dal Manuale di identità (pag. 1).
 * La colonna dentro la O piena è SEMPRE ritagliata (mask): prende il colore dello
 * sfondo, come prescrive il manuale ("colonna dello stesso colore dello sfondo").
 * Non deformare, non ruotare, non ricolorare fuori palette.
 */
import { useId, type CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";

export const MARK_VIEWBOX = { w: 276.7, h: 334.73 };

const F_PATH =
  "M0.79 7.89L93.55 7.89L93.55 34.74L27.63 34.74L27.63 69.87L86.05 69.87L86.05 96.71L27.63 96.71L27.63 159.07L0.79 159.07Z";
const ANGLE_PATH = "M241.57 0L276.7 0L276.7 43.02L267.62 43.02L267.62 9.08L241.57 9.08Z";
const R_PATH =
  "M0 174.86L47.76 174.86C74.6 174.86 90.39 198.15 90.39 226.18C90.39 250.65 77.37 269.99 58.81 274.33L98.68 333.54L71.84 333.54L24.87 263.68L24.87 251.44L47.76 251.44C61.58 251.44 69.08 239.6 69.08 226.18C69.08 212.36 61.58 200.52 47.76 200.52L21.32 200.52L21.32 333.54L0 333.54Z";
const O_RING = { cx: 193.81, cy: 83.29, r: 76.98, inner: 49.74 };
const O_DISC = { cx: 192.23, cy: 256.97, r: 77.77 };
const O_RING_PATH = ringPath(O_RING.cx, O_RING.cy, O_RING.r, O_RING.inner);

function ringPath(cx: number, cy: number, r: number, ri: number) {
  const c = (rad: number) =>
    `M${cx - rad} ${cy}a${rad} ${rad} 0 1 0 ${rad * 2} 0a${rad} ${rad} 0 1 0 ${-rad * 2} 0Z`;
  return c(r) + c(ri);
}

/** La colonna, in nero dentro la maschera = ritaglio */
function Column() {
  return (
    <g fill="#000">
      <rect x="163.81" y="223.41" width="54.47" height="4.74" />
      <rect x="168.15" y="230.52" width="47.37" height="5.13" />
      <rect x="172.1" y="237.62" width="39.08" height="3.55" />
      <path d="M166.97 243.15L215.91 243.15L212.36 247.89L170.92 247.89Z" />
      <rect x="170.92" y="247.89" width="6.32" height="43.81" />
      <rect x="181.97" y="250.65" width="7.5" height="41.05" />
      <rect x="194.2" y="250.65" width="6.71" height="41.05" />
      <rect x="206.05" y="247.89" width="6.32" height="43.81" />
    </g>
  );
}

type MarkProps = {
  /** colore delle lettere: var(--foro-carta) su Petrolio, var(--foro-petrolio) su chiaro */
  color?: string;
  className?: string;
  style?: CSSProperties;
  /** altezza in px o qualsiasi unità CSS; la larghezza segue le proporzioni */
  height?: number | string;
  title?: string;
  /** animazione di composizione dei quattro moduli (hero) */
  animate?: boolean;
  /** ritardo dell'animazione, in secondi */
  delay?: number;
};

export function LogoMark({
  color = "var(--foro-petrolio)",
  className,
  style,
  height = 48,
  title = "FORO",
  animate = false,
  delay = 0,
}: MarkProps) {
  const id = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const anim = animate && !reduce;
  const part = (i: number, from: { x?: number; y?: number; scale?: number }) =>
    anim
      ? {
          initial: { opacity: 0, ...from },
          animate: { opacity: 1, x: 0, y: 0, scale: 1 },
          transition: { duration: 1.1, delay: delay + i * 0.12, ease: [0.22, 1, 0.36, 1] as const },
        }
      : {};
  return (
    <svg
      viewBox={`0 0 ${MARK_VIEWBOX.w} ${MARK_VIEWBOX.h}`}
      className={className}
      style={{ height, width: "auto", overflow: "visible", ...style }}
      role="img"
      aria-label={title}
      fill={color}
    >
      <defs>
        <mask id={`col-${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width={MARK_VIEWBOX.w} height={MARK_VIEWBOX.h}>
          <rect x="0" y="0" width={MARK_VIEWBOX.w} height={MARK_VIEWBOX.h} fill="#fff" />
          <Column />
        </mask>
      </defs>
      <motion.path d={F_PATH} {...part(0, { y: -18 })} />
      <motion.path d={O_RING_PATH} fillRule="evenodd" {...part(1, { x: 18 })} style={{ transformOrigin: `${O_RING.cx}px ${O_RING.cy}px` }} />
      <motion.path d={ANGLE_PATH} {...part(4, { x: 10, y: -10 })} />
      <motion.path d={R_PATH} {...part(2, { x: -18 })} />
      <motion.circle
        cx={O_DISC.cx}
        cy={O_DISC.cy}
        r={O_DISC.r}
        mask={`url(#col-${id})`}
        {...part(3, { scale: 0.86 })}
        style={{ transformOrigin: `${O_DISC.cx}px ${O_DISC.cy}px` }}
      />
    </svg>
  );
}

/** Il simbolo: la O piena con la colonna. Favicon, avatar, timbri (min 16 px). */
export function LogoSymbol({
  color = "var(--foro-petrolio)",
  size = 32,
  className,
  style,
  title = "FORO",
}: {
  color?: string;
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  title?: string;
}) {
  const id = useId().replace(/:/g, "");
  const x = O_DISC.cx - O_DISC.r;
  const y = O_DISC.cy - O_DISC.r;
  const d = O_DISC.r * 2;
  return (
    <svg viewBox={`${x} ${y} ${d} ${d}`} width={size} height={size} className={className} style={style} role="img" aria-label={title}>
      <defs>
        <mask id={`sym-${id}`} maskUnits="userSpaceOnUse" x={x} y={y} width={d} height={d}>
          <rect x={x} y={y} width={d} height={d} fill="#fff" />
          <Column />
        </mask>
      </defs>
      <circle cx={O_DISC.cx} cy={O_DISC.cy} r={O_DISC.r} fill={color} mask={`url(#sym-${id})`} />
    </svg>
  );
}

/** L'angolo: la squadra della O. Unico elemento usabile da solo come segno grafico. */
export function Corner({
  color = "var(--foro-lanterna)",
  size = 24,
  className,
  style,
}: {
  color?: string;
  size?: number | string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg viewBox="241.57 0 35.13 43.02" className={className} style={{ height: size, width: "auto", ...style }} aria-hidden="true">
      <path d={ANGLE_PATH} fill={color} />
    </svg>
  );
}

/** E · Sigillo: marchio dentro il cerchio. Avatar, spilla, adesivo. */
export function LogoSigillo({
  size = 64,
  ground = "var(--foro-petrolio)",
  color = "var(--foro-carta)",
  className,
}: {
  size?: number;
  ground?: string;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: ground,
        display: "inline-grid",
        placeItems: "center",
        flex: "none",
      }}
    >
      <LogoMark color={color} height={size * 0.5} />
    </span>
  );
}

/** F · Orizzontale: marchio con descrittore. Intestazioni, header del sito. */
export function LogoOrizzontale({
  color = "var(--foro-petrolio)",
  accent = "var(--foro-laguna)",
  height = 44,
  className,
  compact = false,
}: {
  color?: string;
  accent?: string;
  height?: number;
  className?: string;
  /** nasconde il descrittore sotto i 480 px */
  compact?: boolean;
}) {
  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: height * 0.36, color }}
    >
      <LogoMark color={color} height={height} />
      <span
        className={compact ? "logo-descr logo-descr--compact" : "logo-descr"}
        style={{
          display: "grid",
          gap: 1,
          paddingLeft: height * 0.36,
          borderLeft: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
          lineHeight: 1.1,
        }}
      >
        <span style={{ fontFamily: "var(--foro-font-display)", fontWeight: 600, fontSize: height * 0.24, letterSpacing: "0.16em" }}>
          ASSOCIAZIONE
        </span>
        <span style={{ fontFamily: "var(--foro-font-display)", fontWeight: 400, fontSize: height * 0.24, letterSpacing: "0.16em", color: accent }}>
          CULTURALE
        </span>
        <span style={{ fontFamily: "var(--foro-font-mono)", fontSize: height * 0.19, opacity: 0.8, marginTop: 2 }}>
          Piossasco · dal 2022
        </span>
      </span>
    </span>
  );
}
