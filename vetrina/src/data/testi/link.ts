import type { GruppoTesti } from "@/lib/contenuti";
import { ORG } from "@/data/org";

/**
 * Link dei social e dei documenti mostrati sul sito, più l'email dell'associazione.
 * Come nel sito in produzione si cambiano dal pulsante "Modifica" delle sezioni che li usano
 * (Social, Statuto, L'aula, Dove siamo, piè di pagina). Il sito li legge con useLink() in lib/link.ts.
 */
export const TESTI_LINK: GruppoTesti = {
  id: "link",
  sezione: "Link e contatti",
  ancora: "social",
  voci: [
    {
      key: "instagram",
      label: "Instagram · profilo",
      default: ORG.social.instagram.url,
      tipo: "url",
      obbligatorio: true,
      hint: "Il link del profilo, per esempio https://www.instagram.com/associazioneforo/. Il riquadro con gli ultimi post mostra lo stesso profilo.",
    },
    {
      key: "facebook",
      label: "Facebook · pagina",
      default: ORG.social.facebook.url,
      tipo: "url",
      obbligatorio: true,
      hint: "Il link della pagina Facebook dell'associazione.",
    },
    {
      key: "facebook.nome",
      label: "Facebook · nome della pagina",
      default: ORG.social.facebook.handle,
      hint: "Il nome che compare accanto all'icona di Facebook.",
    },
    {
      key: "telegram",
      label: "Telegram · canale",
      default: ORG.social.telegram.url,
      tipo: "url",
      obbligatorio: true,
      hint: "Per esempio https://t.me/aulastudioforo. Il sito mostra da solo gli ultimi messaggi di questo canale.",
    },
    {
      key: "email",
      label: "Email dell'associazione",
      default: ORG.email,
      tipo: "email",
      obbligatorio: true,
      hint: "Compare nel piè di pagina, nel menu, nella privacy e nei messaggi di aiuto.",
    },
    {
      key: "statuto",
      label: "Statuto · file su Google Drive",
      default: "https://drive.google.com/file/d/19RWrdBR22kAbuwPdPwVjxxLjuTfzixaL/view",
      tipo: "url",
      obbligatorio: true,
      hint: "Il link di condivisione del PDF su Drive (deve essere visibile a chiunque abbia il link). Il pulsante per scaricarlo si ricava da qui.",
    },
    {
      key: "regolamento",
      label: "Regolamento · Google Doc",
      default: "https://docs.google.com/document/d/1Boo9AYK0TlAT-NWCpl6I7IEK_9_1Tdy5/edit",
      tipo: "url",
      obbligatorio: true,
      hint: "Il link del documento Google: il sito ne legge il testo e lo mostra nella sezione L'aula.",
    },

    /* dove si trova l'aula: compare in Dove siamo, sulla mappa, nel piè di pagina, nel menu e in apertura */
    { key: "luogo.via", label: "Indirizzo · via e numero", default: ORG.aula.indirizzo, obbligatorio: true },
    { key: "luogo.cap", label: "Indirizzo · CAP", default: ORG.aula.cap },
    { key: "luogo.citta", label: "Indirizzo · città", default: ORG.aula.citta, obbligatorio: true },
    { key: "luogo.presso", label: "Dove si trova", default: ORG.aula.presso, multiline: true },
    { key: "luogo.accesso", label: "Come si entra", default: ORG.aula.accesso, multiline: true },
    {
      key: "luogo.coordinate",
      label: "Coordinate sulla mappa",
      default: `${ORG.aula.lat.toFixed(5)}, ${ORG.aula.lng.toFixed(5)}`,
      tipo: "coordinate",
      obbligatorio: true,
      hint: "Latitudine e longitudine, separate da una virgola. Spostano la mappa e i pulsanti per le indicazioni.",
    },
  ],
};
