/**
 * Mappa dell'aula: Google Maps, sempre caricata (nessun clic richiesto).
 */
import { LogoSymbol } from "@/brand/Logo";
import { Icon, cx } from "@/components/ui";
import { useLink } from "@/lib/link";

export function MapBlock({ className, height = 440 }: { className?: string; height?: number }) {
  // indirizzo e coordinate si cambiano dalla homepage (Dove siamo)
  const { luogo } = useLink();
  return (
    <div className={cx("map-block", className)} style={{ minHeight: height }}>
      <iframe title="Mappa dell'aula studio FORO su Google Maps" src={luogo.mappa} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      <div className="map-block__overlay">
        <div className="map-block__addr" style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <LogoSymbol size={36} />
          <div>
            <strong>
              {luogo.via}, {luogo.citta}
            </strong>
            <span>{luogo.presso}</span>
          </div>
        </div>
        <div className="map-block__actions">
          <a className="btn btn--sm" href={luogo.indicazioni} target="_blank" rel="noreferrer">
            <Icon name="arrow-up-right" size={16} /> Indicazioni
          </a>
        </div>
      </div>
    </div>
  );
}
