/**
 * Cosa si modifica dal pulsante "Modifica" di ogni sezione della homepage (e del piè di pagina),
 * come nel sito in produzione: testi della sezione più i link che la sezione mostra.
 * I contenuti che hanno già un modulo nell'area volontari (orari, eventi, tappe della storia)
 * restano lì: la finestra lo ricorda con un collegamento.
 */
import type { GruppoTesti } from "@/lib/contenuti";
import { TESTI_HERO } from "./hero";
import { TESTI_ORARI } from "./orari";
import { TESTI_AULA } from "./aula";
import { TESTI_EVENTI } from "./eventi";
import { TESTI_CHISIAMO } from "./chisiamo";
import { TESTI_SOCIAL } from "./social";
import { TESTI_STATUTO } from "./statuto";
import { TESTI_SEGNALAZIONI } from "./segnalazioni";
import { TESTI_CONTATTI } from "./contatti";
import { TESTI_FOOTER } from "./footer";

export interface SezioneModificabile {
  titolo: string;
  gruppi: GruppoTesti[];
  /** chiavi di TESTI_LINK (data/testi/link.ts) mostrate da questa sezione */
  link?: string[];
  /** dove si gestisce il resto del contenuto della sezione */
  altrove?: { testo: string; to: string; label: string };
}

export const SEZIONI_MODIFICABILI = {
  top: { titolo: "Apertura", gruppi: [TESTI_HERO] },
  orari: {
    titolo: "Orari",
    gruppi: [TESTI_ORARI],
    link: ["telegram"],
    altrove: { testo: "Gli orari di apertura si cambiano dall'area volontari.", to: "/area/orari", label: "Vai a Orari" },
  },
  aula: { titolo: "L'aula", gruppi: [TESTI_AULA], link: ["regolamento"] },
  eventi: {
    titolo: "Eventi",
    gruppi: [TESTI_EVENTI],
    link: ["telegram"],
    altrove: { testo: "Gli eventi si creano e si modificano dall'area volontari.", to: "/area/eventi", label: "Vai a Eventi" },
  },
  "chi-siamo": {
    titolo: "La storia",
    gruppi: [TESTI_CHISIAMO],
    altrove: { testo: "Le tappe della linea del tempo si modificano dall'area volontari.", to: "/area/storia", label: "Vai a La storia" },
  },
  social: { titolo: "Seguici sui social", gruppi: [TESTI_SOCIAL], link: ["instagram", "facebook", "facebook.nome", "telegram"] },
  statuto: { titolo: "Statuto", gruppi: [TESTI_STATUTO], link: ["statuto"] },
  segnalazioni: { titolo: "Segnalazioni", gruppi: [TESTI_SEGNALAZIONI] },
  contatti: {
    titolo: "Dove siamo",
    gruppi: [TESTI_CONTATTI],
    link: ["luogo.via", "luogo.cap", "luogo.citta", "luogo.presso", "luogo.accesso", "luogo.coordinate", "email"],
  },
  footer: { titolo: "Piè di pagina", gruppi: [TESTI_FOOTER], link: ["luogo.via", "luogo.citta", "email", "instagram", "facebook", "telegram"] },
} satisfies Record<string, SezioneModificabile>;

export type IdSezione = keyof typeof SEZIONI_MODIFICABILI;
