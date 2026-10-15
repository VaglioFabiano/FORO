/**
 * Contenuti di servizi esterni (Google Maps, Instagram, Telegram): si caricano solo dopo «Accetta tutti».
 * Prima c'è solo un riquadro del sito, senza nessuna richiesta a Google, Meta o Telegram:
 * il pulsante vale come «Accetta tutti» del banner, il link apre il servizio fuori dal sito.
 */
import type { ReactNode } from "react";
import { Button, Icon, cx, type IconName } from "@/components/ui";
import { consensoStore } from "@/lib/api";
import { useStore } from "@/lib/store";

export const useConsensoEsterni = () => useStore(consensoStore, (c) => c?.stato === "accettato");

export const accettaTutti = () => consensoStore.set({ stato: "accettato", data: new Date().toISOString() });

export function ConsensoEsterno({
  servizio,
  cosa,
  icona,
  href,
  scuro,
  className,
  children,
}: {
  /** "Google Maps", "Instagram", "Telegram" */
  servizio: string;
  /** cosa si vedrà: "la mappa", "gli ultimi post"… */
  cosa: string;
  icona: IconName;
  /** il contenuto aperto direttamente sul servizio */
  href: string;
  /** su fondo Petrolio */
  scuro?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const ok = useConsensoEsterni();
  if (ok) return <>{children}</>;
  return (
    <div className={cx("esterno", scuro && "esterno--scuro", className)}>
      <Icon name={icona} size={26} />
      <p className="esterno__testo">
        Per vedere qui {cosa} di {servizio} serve il tuo consenso: {servizio} può usare cookie propri.
      </p>
      <div className="esterno__azioni">
        <Button size="sm" variant={scuro ? "carta" : "primary"} onClick={accettaTutti}>
          Accetta tutti
        </Button>
        <a className="esterno__link link" href={href} target="_blank" rel="noopener noreferrer">
          Apri su {servizio} <Icon name="arrow-up-right" size={14} />
        </a>
      </div>
    </div>
  );
}
