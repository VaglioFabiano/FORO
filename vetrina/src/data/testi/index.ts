/** Catalogo di tutti i testi modificabili, nell'ordine della home */
import type { GruppoTesti } from "@/lib/contenuti";
import { TESTI_HERO } from "./hero";
import { TESTI_ORARI } from "./orari";
import { TESTI_EVENTI } from "./eventi";
import { TESTI_AULA } from "./aula";
import { TESTI_CHISIAMO } from "./chisiamo";
import { TESTI_SOCIAL } from "./social";
import { TESTI_STATUTO } from "./statuto";
import { TESTI_SEGNALAZIONI } from "./segnalazioni";
import { TESTI_CONTATTI } from "./contatti";
import { TESTI_FOOTER } from "./footer";
import { TESTI_LINK } from "./link";

export const CATALOGO_TESTI: GruppoTesti[] = [
  TESTI_HERO,
  TESTI_ORARI,
  TESTI_AULA,
  TESTI_EVENTI,
  TESTI_CHISIAMO,
  TESTI_SOCIAL,
  TESTI_STATUTO,
  TESTI_SEGNALAZIONI,
  TESTI_CONTATTI,
  TESTI_FOOTER,
  TESTI_LINK,
];
