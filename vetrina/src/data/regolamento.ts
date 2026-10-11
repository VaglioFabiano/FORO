/**
 * Regolamento dell'aula studio: testo ufficiale fornito dall'associazione
 * (Google Doc "Regolamento dell'aula studio"). Riportato fedelmente, compresa la
 * numerazione originale degli articoli.
 */
export const REGOLAMENTO_TITOLO = "Regolamento dell’aula studio";

export interface ArticoloRegolamento {
  numero: string;
  titolo: string;
  /** paragrafi; quelli che iniziano con "1." "2." sono voci di elenco */
  righe: string[];
}

export const REGOLAMENTO_COMPLETO: ArticoloRegolamento[] = [
  {
    "numero": "Premessa",
    "titolo": "",
    "righe": [
      "L’aula studio istituita presso la Sala consiliare/polivalente sita nel Centro Multimediale comunale è uno spazio di proprietà del Comune di Piossasco gestito in collaborazione con l’Associazione FORO e con gli utenti, fruibile per lo svolgimento delle attività sottoindicate nel rispetto del presente regolamento:",
      "1. studio (uso prioritario);",
      "2. svolgimento di eventi culturali (in accordo con l’amministrazione comunale e nel rispetto dell’apposito regolamento per l’utilizzo delle sale comunali, di cui alla delibera n. 68 del 28.2.2011)."
    ]
  },
  {
    "numero": "Art. 1",
    "titolo": "Istituzione e sede",
    "righe": [
      "L’aula studio è istituita presso la Sala consiliare/polivalente sita nel Centro Multimediale comunale in Via Vittorio Alfieri n. 4; essa si compone di:",
      "1. sala studio, con disponibilità di prese elettriche per il collegamento dei dispositivi informatici personali;",
      "2. punto ristoro dotato di distributori automatici di alimenti e bevande e di microonde.",
      "3. spazio esterno utilizzabile per lo studio, il consumo di pasti e come area fumatori.",
      "L’aula studio dispone di un’entrata distinta da quella della Biblioteca civica “Nuto Revelli”, presente nel medesimo edificio, che corrisponde al cancello automatico a livello terra su Via Alfieri.",
      "Chi usufruisce dell’aula studio può utilizzare i servizi igienici adiacenti alla sala studio avendo cura di usufruirne in modo corretto."
    ]
  },
  {
    "numero": "Art. 2",
    "titolo": "Scopi e finalità",
    "righe": [
      "L’aula studio ispirandosi al principio di sussidiarietà orizzontale, che incentiva nell’espletamento di scopi di interesse pubblico, l’utilizzo di cittadini e forme associative, svolge la funzione di promuovere ed incentivare il diritto allo studio, all’informazione e in generale la socializzazione.",
      "Essa nasce, altresì, dall’esigenza degli studenti del Comune di avere un luogo chiuso, riscaldato e sufficientemente autonomo rispetto agli orari di apertura ordinariamente previsti nella Biblioteca civica."
    ]
  },
  {
    "numero": "Art. 3",
    "titolo": "Criteri di accesso",
    "righe": [
      "La frequenza degli studenti sarà garantita indipendentemente da opinione, fede o appartenenza politica, nel pieno rispetto dei principi democratici sanciti nella Costituzione Italiana.",
      "L’accesso all’aula studio è permesso previa prenotazione di un posto a sedere nella stessa, secondo le modalità che verranno rese note dall’Associazione FORO.",
      "Al primo ingresso gli utenti dovranno obbligatoriamente sottoscrivere l’Autorizzazione al trattamento dei dati personali raccolti in sede di prenotazione posto (nome, cognome ed e-mail dell’utente) e prendere visione sia di tale regolamento, sia del piano di sicurezza ed emergenza. Sarà responsabilità dei volontari dell’Associazione FORO provvedere alla somministrazione di tali documenti."
    ]
  },
  {
    "numero": "Art. 5",
    "titolo": "Orari di apertura",
    "righe": [
      "Gli orari di fruizione dell’aula studio varieranno in base alle necessità dell’utenza, tuttavia sarà sempre garantita l’apertura della sala per un minimo complessivo di quaranta ore settimanali.",
      "Gli orari dell’aula studio saranno anche influenzati dalla disponibilità della sala e varieranno, di conseguenza, in base a quelli del Consiglio comunale e delle Commissioni consiliari.",
      "Il gestore si premurerà di rendere nota all’utenza qualsiasi variazione d’orario tramite tutti i mezzi disponibili."
    ]
  },
  {
    "numero": "Art. 6",
    "titolo": "Utilizzo di dispositivi informatici personali",
    "righe": [
      "Gli utenti possono utilizzare nell’aula studio dispositivi informatici personali alle seguenti condizioni:",
      "1. l’uso di questi strumenti non deve disturbare l’attività di altre persone;",
      "2. il gestore è sollevato da qualunque responsabilità conseguente all’utilizzo delle citate attrezzature;",
      "3. il gestore è sollevato da qualunque tipo di sorveglianza nei confronti di tali dispositivi;",
      "4. nessun apparecchio degli utenti può rimanere all’interno dell’aula dopo la chiusura."
    ]
  },
  {
    "numero": "Art. 7",
    "titolo": "Regole",
    "righe": [
      "Nell’utilizzo dell’aula studio devono essere osservate le seguenti disposizioni:",
      "1. uso corretto delle attrezzature e conservazione dell’ordine esistente, senza apportare modifiche agli impianti fissi o mobili, né introducendone altri senza il preventivo consenso del gestore del servizio;",
      "2. lo spazio dell’aula studio è riservato allo studio silenzioso, si deve pertanto mantenere il tono di voce a un livello consono a tale fine;",
      "3. è vietato introdurre animali all’interno dell’aula studio (fatta eccezione per animali di assistenza fisica o emotiva);",
      "4. segnalazione immediata al gestore di eventuali danni riscontrati;",
      "5. è assolutamente vietato fumare (legge n. 584 del 1975), compresi sigarette elettroniche e dispositivi a tabacco riscaldato non bruciato, consumare alcolici o sostanze stupefacenti, o introdurre materiale dannoso o pericoloso per le persone (Legge 626/1994);",
      "6. durante la loro presenza, i fruitori sono individualmente responsabili del corretto utilizzo degli spazi e delle dotazioni e dell’adeguatezza del loro comportamento; come garanzia di responsabilità ogni utente è tenuto a registrare la propria presenza, indicando l’orario d’ingresso e di uscita attraverso l’apposito mezzo di prenotazione;",
      "7. all’interno dell’aula studio sono vietate attività a scopo di lucro;",
      "8. ciascun fruitore ha l’obbligo di comunicare tempestivamente qualsiasi violazione del presente regolamento, fornendo tutti gli elementi a sua conoscenza.",
      "Le regole in vigore all’interno dell’aula studio potrebbero essere soggette a variazioni in conformità con l’andamento dell’emergenza sanitaria in corso."
    ]
  },
  {
    "numero": "Art. 8",
    "titolo": "Responsabilità",
    "righe": [
      "La responsabilità per atti di vandalismo e di bullismo, per l’infrazione delle regole del presente regolamento o delle leggi della Repubblica Italiana è personale.",
      "Il gestore  informa che è attiva una assicurazione per la responsabilità civile contro i danni causati in occasione della conduzione del locale."
    ]
  },
  {
    "numero": "Art. 9",
    "titolo": "Pulizia",
    "righe": [
      "Gli spazi devono essere mantenuti in uno stato decoroso.",
      "La conduzione in autogestione attua e promuove la tutela dell’ambiente attraverso la raccolta differenziata, servendosi dei contenitori adibiti a tale uso, che fanno parte integrante degli arredi in dotazione all’aula studio.",
      "La pulizia generale dell’aula studio verrà operata tutti i Lunedì, Giovedì e Venerdì della settimana, da parte di una ditta specializzata, in un orario precedente all’apertura dell’aula all’utenza."
    ]
  },
  {
    "numero": "Art. 10",
    "titolo": "Compiti dei volontari",
    "righe": [
      "I cittadini che danno la loro disponibilità a svolgere il servizio di volontari all’interno dell’aula studio hanno il compito di:",
      "1. occuparsi dell’apertura e della chiusura corretta dello spazio dell’aula studio negli orari previsti;",
      "2. aprire e chiudere le porte, nonché verificare il funzionamento dell’illuminazione e del riscaldamento;",
      "3. pulizia giornaliera e riordino dell’aula prima della chiusura;",
      "4. verificare che gli utenti applichino responsabilmente i criteri sopra descritti;",
      "5. rapportarsi con l’amministrazione comunale e con l’ufficio che coordina la gestione degli spazi;",
      "6. somministrare agli utenti i documenti esposti nell’Art. 3 al momento del primo ingresso;",
      "7. verificare e validare le prenotazioni dei posti a sedere."
    ]
  },
  {
    "numero": "Art. 10",
    "titolo": "Sanzioni",
    "righe": [
      "In caso di violazione del presente regolamento i trasgressori saranno diffidati e dovranno cessare il comportamento vietato. Dopo tre diffide senza esito i trasgressori verranno allontanati dall’aula studio ed esclusi dal servizio."
    ]
  }
];
