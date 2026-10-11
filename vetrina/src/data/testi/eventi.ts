import type { GruppoTesti } from "@/lib/contenuti";

/**
 * Testi modificabili della sezione "Eventi" (#eventi) e del pannello di dettaglio e
 * prenotazione (/eventi/:slug). Le parole tra graffe ({n}, {nome}…) vengono sostituite
 * dal sito con il dato vero: lasciale dove sono.
 */
export const TESTI_EVENTI: GruppoTesti = {
  id: "eventi",
  sezione: "Eventi",
  ancora: "eventi",
  voci: [
    /* ───────── sezione ───────── */
    { key: "eyebrow", label: "Occhiello della sezione", default: "Eventi" },
    { key: "titolo", label: "Titolo della sezione", default: "In programma", hint: "Breve: due o tre parole." },
    { key: "filtro.tutti", label: "Filtro: voce per tutte le categorie", default: "Tutti" },
    { key: "filtro.vuoto.titolo", label: "Filtro senza date: titolo", default: "Per ora non ci sono date in questa categoria." },
    {
      key: "filtro.vuoto.testo",
      label: "Filtro senza date: testo",
      default: "Le nuove date escono prima sul nostro canale Telegram. Intanto guarda il resto del programma.",
      multiline: true,
    },
    { key: "filtro.vuoto.cta", label: "Filtro senza date: pulsante", default: "Vedi tutti gli eventi" },

    /* in evidenza */
    { key: "feat.prossimo", label: "Evento in evidenza: segnale", default: "Il prossimo", hint: "Seguito da «tra 2 settimane», «domani»…" },
    { key: "feat.quando", label: "Etichetta «Quando»", default: "Quando" },
    { key: "feat.orario", label: "Etichetta «Orario»", default: "Orario" },
    { key: "feat.dove", label: "Etichetta «Dove»", default: "Dove" },
    { key: "feat.soci", label: "Nota: evento per le persone socie", default: "per le persone socie" },
    { key: "feat.cta", label: "Evento in evidenza: pulsante principale", default: "Prenota il posto" },
    { key: "feat.ctaAperto", label: "Evento senza prenotazione: pulsante principale", default: "Vedi i dettagli" },
    { key: "aperto.etichetta", label: "Evento senza prenotazione: etichetta", default: "Senza prenotazione" },
    { key: "aperto.testo", label: "Evento senza prenotazione: nota", default: "vieni direttamente" },
    { key: "feat.calendario", label: "Pulsante calendario", default: "Aggiungi al calendario" },
    { key: "indicazioni", label: "Link alle indicazioni stradali", default: "Indicazioni" },

    /* date successive */
    { key: "agenda.titolo", label: "Titolo dell'elenco delle date", default: "Le date successive" },
    { key: "agenda.tutte", label: "Titolo dell'elenco quando nessun evento è in evidenza", default: "Tutte le date" },
    { key: "agenda.mostra", label: "Pulsante: mostra tutte le date", default: "Mostra tutte le date ({n})", hint: "{n} = numero totale delle date" },
    { key: "agenda.meno", label: "Pulsante: mostra meno date", default: "Mostra meno" },

    /* calendario vuoto */
    { key: "vuoto.titolo", label: "Nessun evento: titolo", default: "Stiamo preparando il prossimo calendario." },
    { key: "vuoto.testo", label: "Nessun evento: testo (seguito dal canale Telegram)", default: "Le nuove date escono prima sul canale Telegram" },

    /* archivio */
    { key: "arch.eyebrow", label: "Archivio: occhiello", default: "Archivio" },
    {
      key: "arch.intro",
      label: "Archivio: introduzione",
      default: "{n} serate già passate, divise per rassegna. Rivedi indizi, date e foto.",
      hint: "{n} = numero degli eventi passati",
    },
    { key: "arch.mostra", label: "Archivio: pulsante per aprirlo", default: "Mostra l'archivio" },
    { key: "arch.nascondi", label: "Archivio: pulsante per chiuderlo", default: "Nascondi l'archivio" },

    /* ───────── pannello dell'evento ───────── */
    { key: "pd.concluso", label: "Dettaglio: segno «Concluso»", default: "Concluso" },
    { key: "pd.quando", label: "Dettaglio: etichetta «Quando»", default: "Quando" },
    { key: "pd.orario", label: "Dettaglio: etichetta «Orario»", default: "Orario" },
    { key: "pd.dove", label: "Dettaglio: etichetta «Dove»", default: "Dove" },
    { key: "pd.ingresso", label: "Dettaglio: etichetta «Ingresso»", default: "Ingresso" },
    { key: "pd.passato", label: "Dettaglio: evento già passato", default: "evento concluso" },
    { key: "pd.durata", label: "Dettaglio: durata", default: "circa {durata}" },
    { key: "pd.ingresso.soci", label: "Ingresso riservato", default: "Per le persone socie" },
    { key: "pd.ingresso.aperto", label: "Ingresso libero", default: "Aperto a tutti" },
    { key: "pd.posti", label: "Posti con prenotazione", default: "{n} posti, con prenotazione" },
    { key: "pd.senzaLimite", label: "Posti senza limite", default: "senza limite di posti" },
    { key: "pd.senzaPrenotazione", label: "Dettaglio: evento senza prenotazione", default: "senza prenotazione" },
    { key: "pd.aperto.titolo", label: "Dettaglio: titolo per gli eventi senza prenotazione", default: "Non serve prenotarsi" },
    {
      key: "pd.aperto.testo",
      label: "Dettaglio: testo per gli eventi senza prenotazione",
      default: "È un evento aperto: vieni direttamente all'orario indicato, ti aspettiamo.",
      multiline: true,
    },
    { key: "pd.aperto.calendario", label: "Dettaglio: aggiungi al calendario", default: "Aggiungi al calendario" },
    {
      key: "pd.nota.soci",
      label: "Nota per gli eventi riservati",
      default: "Riservato alle persone socie: la tessera è gratuita e si fa all'ingresso.",
      multiline: true,
    },
    { key: "pd.nota.link", label: "Nota: link al tesseramento", default: "Come funziona il tesseramento" },
    { key: "pd.partecipato", label: "Evento passato: partecipanti", default: "{n} persone hanno partecipato" },
    { key: "pd.copia", label: "Pulsante: copia il link", default: "Copia il link" },
    { key: "pd.copiato", label: "Pulsante: link copiato", default: "Link copiato" },
    { key: "pd.link", label: "Pulsante: link esterno dell'evento", default: "Per approfondire" },
    { key: "pd.indizi.titolo", label: "CineFORO: titolo degli indizi", default: "Indizi sul film" },
    { key: "pd.indizi.hint", label: "CineFORO: nota sugli indizi", default: "il titolo lo scopri in sala" },
    { key: "pd.patrocinio", label: "Etichetta «Patrocinio»", default: "Patrocinio" },
    { key: "pd.404.label", label: "Evento inesistente: occhiello", default: "Evento non trovato" },
    { key: "pd.404.titolo", label: "Evento inesistente: titolo", default: "Non troviamo questo evento" },
    {
      key: "pd.404.testo",
      label: "Evento inesistente: testo",
      default:
        "Il link potrebbe essere incompleto, oppure l'evento è stato tolto dal calendario. Gli appuntamenti in programma sono tutti nella sezione Eventi.",
      multiline: true,
    },
    { key: "pd.404.cta", label: "Evento inesistente: pulsante", default: "Vedi gli eventi in programma" },
    { key: "pd.chiudi", label: "Pulsante «Chiudi»", default: "Chiudi" },

    /* ───────── prenotazione ───────── */
    { key: "form.eyebrow", label: "Prenotazione: occhiello", default: "Prenotazione" },
    { key: "form.titolo", label: "Prenotazione: titolo", default: "Prenota il posto" },
    {
      key: "form.lead",
      label: "Prenotazione: introduzione",
      default: "Ci servono un nome e un'email, niente altro. Se cambi idea puoi annullare in qualsiasi momento.",
      multiline: true,
    },
    { key: "form.email.hint", label: "Prenotazione: nota sotto l'email", default: "La usiamo solo per questa prenotazione." },
    {
      key: "form.note.placeholder",
      label: "Prenotazione: esempio nel campo note",
      default: "Per esempio: arrivo un po' in ritardo, mi serve un posto accessibile",
    },
    { key: "form.privacy.prima", label: "Consenso privacy: prima del link", default: "Ho letto l'" },
    { key: "form.privacy.link", label: "Consenso privacy: link", default: "informativa sulla privacy" },
    {
      key: "form.privacy.dopo",
      label: "Consenso privacy: dopo il link",
      default: "e accetto che i miei dati siano usati per gestire la prenotazione.",
    },
    { key: "form.invio", label: "Pulsante di invio (un posto)", default: "Prenota il posto" },
    { key: "form.invio.piu", label: "Pulsante di invio (più posti)", default: "Prenota {n} posti" },
    { key: "form.invio.attesa", label: "Pulsante durante l'invio", default: "Stiamo prenotando" },
    { key: "form.nota", label: "Nota sotto il pulsante", default: "Conferma immediata · annulli quando vuoi" },

    { key: "ok.titolo", label: "Conferma: titolo", default: "Prenotazione confermata" },
    {
      key: "ok.lead",
      label: "Conferma: testo",
      default: "Grazie {nome}. Ti aspettiamo: il posto è tuo fino all'inizio dell'evento.",
      hint: "{nome} = nome di chi prenota",
    },
    { key: "ok.biglietto", label: "Biglietto: intestazione", default: "Prenotazione" },
    { key: "ok.codice", label: "Biglietto: etichetta del codice", default: "Codice prenotazione" },
    { key: "ok.ingresso", label: "Biglietto: nota", default: "Mostra questo codice all'ingresso." },
    { key: "ok.altra", label: "Conferma: prenota per un'altra persona", default: "Prenota per un'altra persona" },
    { key: "ok.annulla", label: "Conferma: annulla la prenotazione", default: "Annulla la prenotazione" },
    { key: "ok.mail", label: "Conferma: annullare via email (prima dell'indirizzo)", default: "Puoi annullare anche scrivendo a" },

    { key: "full.tag", label: "Al completo: segno", default: "Al completo" },
    { key: "full.titolo", label: "Al completo: titolo", default: "Evento al completo" },
    {
      key: "full.lead",
      label: "Al completo: testo",
      default: "Tutti i posti sono stati prenotati e non è più possibile prenotarsi. Se qualcuno annulla, il posto torna disponibile qui.",
      multiline: true,
    },

    { key: "past.tag", label: "Evento concluso: segno", default: "Archivio" },
    { key: "past.titolo", label: "Evento concluso: titolo", default: "Evento concluso" },
    {
      key: "past.lead",
      label: "Evento concluso: testo",
      default: "Questo appuntamento è già passato e le prenotazioni sono chiuse. Grazie a chi c'era.",
      multiline: true,
    },
    { key: "past.cta", label: "Evento concluso: pulsante", default: "Vedi gli eventi in programma" },
  ],
};
