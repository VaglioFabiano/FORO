import type { GruppoTesti } from "@/lib/contenuti";

/** Testi modificabili della sezione "Apertura" (#top). Elenca qui OGNI frase visibile della sezione. */
export const TESTI_HERO: GruppoTesti = {
  id: "hero",
  sezione: "Apertura",
  ancora: "top",
  voci: [
    { key: "eyebrow", label: "Occhiello sopra il titolo", default: "Associazione culturale · Piossasco (TO)" },
    {
      key: "titolo",
      label: "Titolo",
      default: "Associazione\nFORO",
      multiline: true,
      hint: "Va a capo dove c'è l'invio. L'angolo si aggiunge da solo alla fine.",
    },
    {
      key: "lead",
      label: "Testo sotto il titolo (va a capo dove c'è l'invio)",
      default:
        "Siamo un'associazione composta da volontariə che gestisce l'Aula Studio di Piossasco.\nVieni a trovarci! Potrai trovare spazio per lo studio individuale e di gruppo, ma anche un ambiente accogliente dove creare, se vorrai, nuovi legami.",
      multiline: true,
      hint: "Una o due frasi, al massimo 160 caratteri.",
    },
    { key: "cta.orari", label: "Pulsante verso gli orari", default: "Orari di oggi" },
    { key: "cta.eventi", label: "Pulsante verso gli eventi", default: "Tutti gli eventi" },

    { key: "evento.label", label: "Prossimo evento · etichetta", default: "Prossimo evento" },
    { key: "evento.cta", label: "Prossimo evento · pulsante", default: "Prenota il posto" },
    {
      key: "evento.ctaDettagli",
      label: "Prossimo evento · pulsante se non serve prenotare o è pieno",
      default: "Vedi i dettagli",
    },
    { key: "evento.quando", label: "Prossimo evento · voce data", default: "Quando" },
    { key: "evento.dove", label: "Prossimo evento · voce luogo", default: "Dove" },
    { key: "evento.posti", label: "Prossimo evento · voce posti", default: "Posti liberi" },
    { key: "evento.esaurito", label: "Prossimo evento · posti finiti", default: "Posti esauriti" },
    { key: "evento.libero", label: "Prossimo evento · senza limite di posti", default: "Ingresso libero" },
    { key: "evento.aperto", label: "Prossimo evento · senza prenotazione", default: "Senza prenotazione" },
    { key: "evento.tessera", label: "Prossimo evento · nota tessera", default: "Con tessera FORO" },
    {
      key: "vuoto.label",
      label: "Nessun evento in programma · etichetta",
      default: "Prossimi eventi",
    },
    {
      key: "vuoto.titolo",
      label: "Nessun evento in programma · titolo",
      default: "Stiamo preparando il nuovo calendario.",
    },
    { key: "vuoto.cta", label: "Nessun evento in programma · link", default: "Archivio e rassegne" },
    {
      key: "senza.titolo",
      label: "Eventi in programma ma nessuno in evidenza · titolo",
      default: "Guarda il programma: proiezioni, incontri e laboratori.",
      hint: "Compare quando in Gestisci eventi nessun evento è «1° · homepage».",
    },
    { key: "senza.cta", label: "Eventi in programma ma nessuno in evidenza · link", default: "Tutte le date" },
    {
      key: "foto.alt",
      label: "Foto (senza eventi) · descrizione per chi non vede",
      default: "Il gruppo di volontari e volontarie di FORO, di sera, sotto un albero illuminato",
    },
    { key: "foto.didascalia", label: "Foto (senza eventi) · didascalia", default: "Chi tiene aperta l'aula" },

    { key: "stato.label", label: "Stato dell'aula · etichetta", default: "Aula studio · adesso" },
    { key: "stato.aperta", label: "Stato dell'aula · aperta", default: "Aperta" },
    { key: "stato.chiusa", label: "Stato dell'aula · chiusa", default: "Chiusa" },
    {
      key: "stato.chiude",
      label: "Stato dell'aula · chiusura",
      default: "chiude alle {ora}",
      hint: "{ora} diventa l'orario di chiusura.",
    },
    {
      key: "stato.riapre",
      label: "Stato dell'aula · riapertura",
      default: "riapre {quando}",
      hint: "{quando} diventa, per esempio, \"domani alle 09:00\".",
    },
    {
      key: "stato.tra",
      label: "Stato dell'aula · conto alla rovescia",
      default: "tra {tempo}",
      hint: "{tempo} diventa, per esempio, \"2 h 10 min\".",
    },
    { key: "stato.aggiornamento", label: "Stato dell'aula · orari mancanti", default: "orari in aggiornamento" },
    { key: "stato.oggi", label: "Stato dell'aula · oggi", default: "oggi" },
    { key: "stato.chiusoOggi", label: "Stato dell'aula · chiuso tutto il giorno", default: "chiuso" },
    { key: "stato.link", label: "Stato dell'aula · link agli orari", default: "Tutti gli orari" },

    { key: "fatti.aria", label: "Fascia in basso · nome per chi non vede", default: "In breve" },
    { key: "fatti.ingresso", label: "Fascia in basso · ingresso", default: "Ingresso libero e gratuito" },
    { key: "fatti.foro", label: "Fascia in basso · Aula FORO", default: "Aula FORO, silenziosa" },
    { key: "fatti.agora", label: "Fascia in basso · Aula AGORÀ", default: "Aula AGORÀ, ad alta voce" },
    { key: "scorri", label: "Invito a scorrere", default: "Scorri" },
    { key: "scorri.title", label: "Invito a scorrere · suggerimento", default: "Scorri agli orari" },
  ],
};
