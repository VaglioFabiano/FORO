import type { GruppoTesti, VoceTesto } from "@/lib/contenuti";

const v = (key: string, label: string, def: string, multiline = false, hint?: string): VoceTesto => ({
  key,
  label,
  default: def,
  ...(multiline ? { multiline } : {}),
  ...(hint ? { hint } : {}),
});

/** Testi modificabili della sezione "Segnalazioni" (#segnalazioni). Elenca qui OGNI frase visibile della sezione. */
export const TESTI_SEGNALAZIONI: GruppoTesti = {
  id: "segnalazioni",
  sezione: "Segnalazioni",
  ancora: "segnalazioni",
  voci: [
    v("eyebrow", "Occhiello", "Segnalazioni"),
    v("titolo", "Titolo", "L'aula la miglioriamo insieme."),
    v(
      "intro",
      "Introduzione",
      "Hai trovato un problema in aula o hai un'idea per migliorarla? Scrivici qui: se vuoi, senza lasciare il tuo nome.",
      true,
    ),

    v("punto.1.titolo", "Punto 1 · titolo", "Anonima, se vuoi"),
    v(
      "punto.1.testo",
      "Punto 1 · testo",
      "Non salviamo il tuo nome né il tuo indirizzo, a meno che tu non scelga di lasciarli per una risposta.",
      true,
    ),
    v("punto.2.titolo", "Punto 2 · titolo", "Arriva al direttivo"),
    v("punto.2.testo", "Punto 2 · testo", "Ogni segnalazione arriva alle persone che gestiscono l'aula.", true),
    v("punto.3.titolo", "Punto 3 · titolo", "Se è urgente"),
    v("punto.3.testo", "Punto 3 · testo", "Per un guasto che blocca l'aula, avvisa subito il volontario o la volontaria di turno.", true),

    /* form */
    v("campo.categoria", "Campo · Di che cosa si tratta", "Di che cosa si tratta"),
    v("categoria.guasto", "Categoria · Guasto", "Guasto"),
    v("categoria.pulizia", "Categoria · Pulizia", "Pulizia"),
    v("categoria.regolamento", "Categoria · Regolamento", "Regolamento"),
    v("categoria.proposta", "Categoria · Proposta", "Proposta"),
    v("categoria.generico", "Categoria · Generico", "Generico"),
    v("categoria.altro", "Categoria · Altro", "Altro"),
    v("campo.dove", "Campo · Dove", "Dove"),
    v("campo.dove.placeholder", "Campo · Dove · testo iniziale", "Scegli il luogo"),
    v("dove.foro", "Luogo · Aula FORO", "Aula FORO, silenziosa"),
    v("dove.agora", "Luogo · Aula AGORÀ", "Aula AGORÀ, ad alta voce"),
    v("dove.ristoro", "Luogo · Zona ristoro", "Zona ristoro"),
    v("dove.esterno", "Luogo · Esterno", "Esterno e pagode"),
    v("dove.generico", "Luogo · Generico", "Generico"),
    v("dove.altro", "Luogo · Altro", "Altro"),
    v("campo.messaggio", "Campo · Messaggio", "Messaggio"),
    v(
      "campo.messaggio.placeholder",
      "Campo · Messaggio · esempio",
      "Per esempio: la presa vicino alla finestra dell'Aula FORO non funziona da lunedì.",
      true,
    ),
    v("campo.messaggio.aiuto", "Campo · Messaggio · suggerimento", "Cosa, dove, da quando. Niente dati di altre persone."),
    v("anonima.titolo", "Anonima · interruttore", "Resta anonima"),
    v("anonima.si", "Anonima · attiva", "Non ci lasci nessun contatto."),
    v("anonima.no", "Anonima · disattivata", "Lasciaci un contatto se vuoi una risposta."),
    v("campo.nome", "Campo · Nome", "Nome"),
    v("campo.email", "Campo · Email", "Email"),
    v("campo.email.aiuto", "Campo · Email · suggerimento", "La usiamo solo per risponderti su questa segnalazione."),
    v("btn.invia", "Pulsante · Invia", "Invia la segnalazione"),
    v("btn.invio", "Pulsante · Invio in corso", "Invio in corso"),
    v("privacy.prima", "Nota privacy · prima del link", "Leggi come trattiamo i dati nell'"),
    v("privacy.link", "Nota privacy · testo del link", "informativa privacy"),

    /* esito */
    v("ok.kicker", "Conferma · occhiello", "Segnalazione ricevuta"),
    v("ok.titolo", "Conferma · titolo", "Grazie, l'abbiamo ricevuta."),
    v(
      "ok.testo",
      "Conferma · testo",
      "Ce ne prendiamo carico. Grazie: ogni segnalazione è preziosa per migliorare l'aula.",
      true,
    ),
    v("ok.altra", "Conferma · pulsante Invia un'altra", "Invia un'altra segnalazione"),
  ],
};
