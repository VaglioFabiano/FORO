/**
 * Fatti dell'associazione e contenuti editoriali condivisi.
 * Fonti: sito live foroets.com (30.09.2026), codice del gestionale, statuto, Manuale di identità.
 * Tono: si dà del tu, l'associazione parla come "noi", forme neutre, niente emoji,
 * al massimo un punto esclamativo per pagina.
 */

export const ORG = {
  nome: "FORO",
  nomeEsteso: "Associazione culturale FORO ETS",
  payoff: "La piazza per pensare.",
  payoffAula: "Studiare insieme, anche in silenzio.",
  payoffTessera: "Il tuo posto a Piossasco.",
  dal: 2022,
  aula: {
    nome: "Aula studio di Piossasco",
    indirizzo: "Via Alfieri 4",
    citta: "Piossasco (TO)",
    cap: "10045",
    presso: "Al piano inferiore della biblioteca civica Nuto Revelli",
    accesso: "Entrata separata dalla biblioteca: il cancello automatico a livello terra su via Alfieri.",
    lat: 44.9876736673456,
    lng: 7.465713905723435,
  },
  sedeLegale: "Via Piave 1/2, Piossasco (TO)",
  email: "associazioneforopiossasco@gmail.com",
  sito: "www.foroets.com",
  social: {
    instagram: { handle: "@associazioneforo", url: "https://www.instagram.com/associazioneforo/" },
    facebook: { handle: "Associazione Foro", url: "https://www.facebook.com/associazioneforopiossasco" },
    telegram: { handle: "@aulastudioforo", url: "https://t.me/aulastudioforo", descr: "Canale ufficiale: orari e avvisi" },
  },
  patrocinio: "Comune di Piossasco",
} as const;

export const MAPS = {
  apri: `https://www.google.com/maps?q=${ORG.aula.lat},${ORG.aula.lng}`,
  indicazioni: `https://www.google.com/maps/dir/?api=1&destination=${ORG.aula.lat},${ORG.aula.lng}`,
};

/** Sito a pagina unica: ogni voce scorre a una sezione della home (id = ancora) */
export const NAV = [
  { id: "orari", label: "Orari" },
  { id: "aula", label: "L'aula" },
  { id: "eventi", label: "Eventi" },
  { id: "chi-siamo", label: "La storia" },
  { id: "social", label: "Social" },
  { id: "statuto", label: "Statuto" },
  { id: "segnalazioni", label: "Segnalazioni" },
  { id: "contatti", label: "Contatti" },
] as const;
export type SectionId = (typeof NAV)[number]["id"] | "volontariato" | "social" | "top";

/** Missione, visione, posizionamento (Manuale, cap. 02) */
export const PIATTAFORMA = {
  nome: "Nel foro romano la città si incontrava: si discuteva, si studiavano le leggi, si decideva insieme. FORO porta la stessa idea a Piossasco, in scala di paese.",
  nomeEsteso:
    "È un luogo pubblico dove studiare da soli o in gruppo, confrontarsi e far nascere iniziative per la comunità. Dal 2022 l'associazione gestisce l'aula studio comunale grazie ai bandi del Comune, e la tiene aperta con il lavoro dei volontari.",
  marchio:
    "Il marchio lo racconta già: quattro lettere disposte come la pianta di una piazza, una O aperta con un angolo che indica l'ingresso e una O piena che custodisce una colonna, il simbolo del bene pubblico.",
  missione: "Offrire a Piossasco uno spazio pubblico, gratuito e curato da volontari dove studiare, incontrarsi e far nascere cultura.",
  visione: "Un paese in cui chiunque voglia imparare trova un posto dove farlo e qualcuno con cui farlo.",
  posizionamento:
    "Per studenti e cittadini di Piossasco, FORO è l'associazione che apre l'aula studio e la riempie di idee, perché è gestita dalle stesse persone che la usano.",
};

/** Quattro lettere, quattro impegni */
export const VALORI = [
  {
    lettera: "F",
    nome: "Fare",
    testo: "L'aula è aperta perché qualcuno ha preso un turno. Mettiamo in evidenza il lavoro dei volontari e ringraziamo per nome.",
  },
  {
    lettera: "O",
    nome: "Ospitare",
    testo: "La O aperta è una porta. Chi entra per la prima volta deve capire subito dove sedersi, cosa si può fare e a chi chiedere.",
  },
  {
    lettera: "R",
    nome: "Rispettare",
    testo: "C'è chi studia in silenzio e chi ripete ad alta voce. Entrambi hanno il loro spazio, con regole chiare e uguali per tutti.",
  },
  {
    lettera: "O",
    nome: "Offrire",
    testo: "La colonna è il bene comune. L'aula è pubblica, l'ingresso è gratuito e i conti dell'associazione sono consultabili dalle persone socie.",
  },
] as const;

/** Due aule, due registri */
export const AULE = {
  foro: {
    id: "foro",
    nome: "Aula FORO",
    registro: "Registro silenzio",
    breve: "Aula silenziosa.",
    testo: "Qui si studia da soli. Telefono silenzioso, chiamate fuori dall'aula.",
    dettaglio:
      "Concentrazione e studio individuale. Tavoli lunghi, prese sotto ogni postazione, luce naturale di giorno e lampade la sera. Il silenzio è la regola, per rispetto di chi ha un esame domani.",
    regole: ["Silenzio", "Telefono in modalità silenziosa", "Chiamate fuori dall'aula", "Niente cibo"],
  },
  agora: {
    id: "agora",
    nome: "Aula AGORÀ",
    registro: "Registro voce",
    breve: "Aula ad alta voce.",
    testo: "Qui si ripete, si spiega, si lavora in gruppo. A voce bassa, per rispetto di chi è vicino.",
    dettaglio:
      "Per ripetere prima di un orale, preparare un progetto di gruppo o spiegare un esercizio a chi è rimasto indietro. Dalle 12:30 alle 14:30 diventa la sala del pranzo. La sera ospita gli eventi.",
    regole: ["Voce bassa", "Gruppi benvenuti", "Pranzo 12:30–14:30", "Eventi la sera"],
  },
} as const;

/** Cosa trovi in aula (dal manuale dei turni) */
export const SERVIZI = [
  { icon: "plug", titolo: "Prese a ogni tavolo", testo: "Ciabatte sotto i tavoli, per studiare tutto il giorno con il portatile." },
  { icon: "coffee", titolo: "Zona ristoro", testo: "Macchinetta del caffè, distributori e un microonde per scaldare il pranzo." },
  { icon: "seat", titolo: "Frigo in Aula AGORÀ", testo: "Per conservare il pranzo che ti porti da casa fino all'ora di mangiare." },
  { icon: "sun", titolo: "Spazio all'aperto", testo: "Per studiare fuori, sotto le pagode, mangiare e, solo lì, fumare." },
  { icon: "info", titolo: "Info Point", testo: "Un volontario o una volontaria di turno, sempre. Chiedi a chi c'è." },
  { icon: "heart", titolo: "Assorbenti gratuiti", testo: "Nell'armadio bianco vicino all'Info Point, senza bisogno di chiedere." },
  { icon: "book", titolo: "Coperte e tazze", testo: "Per le giornate lunghe d'inverno. Si prendono e si rimettono a posto." },
] as const;

/** Il regolamento in breve: sintesi fedele del testo ufficiale (vedi data/regolamento.ts) */
export const REGOLAMENTO = [
  "L'aula è del Comune di Piossasco ed è gestita insieme all'Associazione FORO: si usa prima di tutto per studiare.",
  "Al primo ingresso firmi l'autorizzazione al trattamento dei dati e prendi visione del regolamento e del piano di sicurezza, con il volontario o la volontaria di turno.",
  "L'aula è riservata allo studio silenzioso: il tono di voce resta basso.",
  "Puoi usare i tuoi dispositivi senza disturbare; nessun apparecchio resta in aula dopo la chiusura.",
  "È vietato fumare (anche sigarette elettroniche), consumare alcolici e portare animali, salvo quelli di assistenza.",
  "Gli spazi restano in ordine e si fa la raccolta differenziata; segnala subito eventuali danni.",
  "Dopo tre diffide senza esito chi non rispetta il regolamento viene allontanato dall'aula.",
] as const;

export const FAQ = [
  {
    q: "Come si accede la prima volta?",
    a: "Vieni negli orari di apertura e chiedi a chi è di turno all'Info Point: registri la tua presenza, firmi l'autorizzazione al trattamento dei dati e prendi visione del regolamento. Poi scegli il tuo posto.",
  },
  { q: "Quanto costa?", a: "Niente. L'aula è pubblica e l'ingresso è gratuito, anche per chi non ha la tessera." },
  {
    q: "Serve la tessera per studiare?",
    a: "No. La tessera serve per partecipare alla vita dell'associazione, votare in assemblea ed entrare ad alcuni eventi come il CineFORO. È gratuita e si fa in cinque minuti.",
  },
  { q: "Posso studiare in gruppo?", a: "Sì, in Aula AGORÀ, a voce bassa. L'Aula FORO resta silenziosa per chi studia da solo." },
  { q: "Si può mangiare?", a: "Sì, nella zona ristoro (con microonde e distributori), all'aperto e in Aula AGORÀ dalle 12:30 alle 14:30. In Aula AGORÀ c'è anche un frigo per conservare il pranzo." },
  {
    q: "Chi apre l'aula?",
    a: "Volontari e volontarie che prendono un turno, di solito di tre o quattro ore. Senza di loro l'aula resterebbe chiusa. Se vuoi dare una mano, scrivici.",
  },
  {
    q: "Come so se oggi l'aula è aperta?",
    a: "Guarda gli orari su questo sito, aggiornati ogni settimana, oppure il canale Telegram @aulastudioforo, dove pubblichiamo aperture straordinarie e chiusure.",
  },
] as const;

/** Numeri veri, ricavati dai dati */
export const NUMERI = [
  { valore: 2022, label: "L'anno in cui abbiamo aperto l'aula", format: "anno" },
  { valore: 52, label: "Ore di apertura in una settimana standard", suffix: " h" },
  { valore: 0, label: "Euro per entrare. L'aula è pubblica", prefix: "", suffix: " €" },
  { valore: 10, label: "Proiezioni tra CineFORO e Cinestate nel 2026" },
] as const;

/** Il direttivo (dal manuale interno dei turni) */
export const DIRETTIVO = [
  "Francesco Ruocco",
  "Michela Goss",
  "Fabiano Vaglio",
  "Alessia D'Agostini",
  "Federico Moscato",
  "Francesco Rosso",
  "Irene D'Agostini",
  "Virginia Brocchini",
] as const;

export const STORIA = [
  {
    anno: "2022",
    titolo: "L'aula riapre",
    testo: "Un gruppo di studenti e studentesse di Piossasco vince il bando del Comune e prende in gestione l'aula studio di via Alfieri. I primi turni si organizzano su un foglio condiviso.",
  },
  {
    anno: "2024",
    titolo: "Turni, presenze, bot",
    testo: "Nasce il gestionale dei volontari: turni su quattro settimane, conteggio delle presenze e UFORObot, il bot Telegram che ricorda a chi apre l'aula quando tocca a lui.",
  },
  {
    anno: "2026",
    titolo: "Il CineFORO",
    testo: "In primavera parte la rassegna CineFORO, in estate il Cinestate all'aperto. Il titolo del film non si dice mai: si danno indizi, e dopo la proiezione se ne parla insieme.",
  },
  {
    anno: "Oggi",
    titolo: "Una nuova identità",
    testo: "Un manuale di identità visiva e verbale per far riconoscere FORO ovunque: sul cartello dell'aula, nel post di un evento e nella notifica di un turno.",
  },
] as const;

/** Come diventare persona socia */
export const TESSERAMENTO = {
  passi: [
    { n: "01", titolo: "Compila la richiesta", testo: "Online qui sotto oppure in aula, all'Info Point. Servono nome, contatti e data di nascita." },
    { n: "02", titolo: "Ricevi il numero di tessera", testo: "Ti assegniamo subito un numero provvisorio. Il consiglio direttivo conferma l'ammissione, come prevede lo statuto." },
    { n: "03", titolo: "Ritira la tessera in aula", testo: "Alla prima visita o al primo evento. Vale fino al 31 dicembre dell'anno in corso." },
  ],
  vantaggi: [
    "Voti in assemblea ed eleggi il direttivo",
    "Entri agli eventi riservati, come il CineFORO",
    "Puoi prendere turni e aprire l'aula",
    "Consulti bilanci e verbali dell'associazione",
  ],
} as const;

export const VOLONTARIATO_CTA = {
  titolo: "C'è sempre bisogno di una mano.",
  testo:
    "Per tenere aperta l'aula studio ed estendere gli orari servono persone che prendano un turno. Vieni in aula e chiedi a un volontario o a una volontaria, oppure all'Info Point.",
};
