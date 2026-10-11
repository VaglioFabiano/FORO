/**
 * Hero delle pagine interne, sullo schema del manuale:
 * "—— 03" · titolo grande in Jost Light con l'angolo · intro in Newsreader a destra.
 */
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Reveal, SplitReveal, cx } from "@/components/ui";
import { useHeaderTone } from "@/components/layout/tone";

export function PageHero({
  index,
  eyebrow,
  title,
  intro,
  aside,
  tone = "light",
  crumbs,
  className,
  children,
}: {
  index?: string;
  eyebrow?: string;
  /** righe del titolo: ognuna entra con la maschera */
  title: ReactNode[];
  intro?: ReactNode;
  aside?: ReactNode;
  tone?: "light" | "petrolio" | "notte";
  crumbs?: { to: string; label: string }[];
  className?: string;
  children?: ReactNode;
}) {
  useHeaderTone(tone === "light" ? "light" : "dark");
  const lines = title.map((l, i) =>
    i === title.length - 1 ? (
      <>
        {l}
        <span className={cx("corner-mark", tone !== "light" && "corner-mark--carta")} aria-hidden />
      </>
    ) : (
      l
    ),
  );
  return (
    <section className={cx("page-hero", tone === "petrolio" && "surface-petrolio", tone === "notte" && "surface-notte", className)}>
      <div className="container">
        {crumbs && (
          <nav className="page-hero__crumbs" aria-label="Percorso">
            {crumbs.map((c, i) => (
              <span key={c.to} style={{ display: "contents" }}>
                {i > 0 && <span aria-hidden>/</span>}
                <Link to={c.to}>{c.label}</Link>
              </span>
            ))}
          </nav>
        )}
        <div className="page-hero__grid">
          <div>
            {(index || eyebrow) && (
              <Reveal>
                <span className="eyebrow">
                  {index}
                  {index && eyebrow ? " · " : ""}
                  {eyebrow}
                </span>
              </Reveal>
            )}
            <SplitReveal lines={lines} className="t-hero page-hero__title" delay={0.1} />
          </div>
          {(intro || aside) && (
            <Reveal delay={0.35}>
              {intro && <div className="t-lead page-hero__intro t-pretty">{intro}</div>}
              {aside}
            </Reveal>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}
