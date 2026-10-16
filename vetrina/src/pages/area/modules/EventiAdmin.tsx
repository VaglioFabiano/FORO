/**
 * Gestisci eventi (livello ≤ 2, api/eventi.js). Tutti gli eventi, anche quelli nascosti, con l'interruttore Online/Bozza,
 * l'evento in evidenza, le prenotazioni con il check-in alla porta e l'email ai partecipanti.
 * Le locandine si caricano su ImgBB dal browser, come in produzione: nel database resta solo l'URL.
 */
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Alert, Button, Checkbox, Icon, Modal, Segmented, SelectField, Skeleton, TextArea, TextField, cx } from "@/components/ui";
import { toast } from "@/components/ui/Toast";
import { EventArt } from "@/components/domain/EventArt";
import { INDIRIZZO_EVENTI, LUOGO } from "@/data/eventi";
import type { CategoriaCfg, Evento } from "@/data/types";
import { labelCategoria, salvaCategorie, slugCategoria, useCategorie } from "@/lib/categorie";
import { ApiError, conPrenotazione, impostaEvidenza, isPassato } from "@/lib/api";
import { chiama } from "@/lib/server";
import { createStore, useStore } from "@/lib/store";
import { addDays, dateParts, fmtLong, fmtShort, todayIso } from "@/lib/time";
import { arrivatiDi, caricaPartecipanti, fmtQuando, isoToLocale, salvaArrivati, type Partecipante } from "../data-gestione";
import { Stepper, Switch, SearchBox } from "../gestione-ui";
import { AreaHead, Empty, Panel, StatTile, puo, useLivello } from "../ui";
import "./eventi-admin.css";

/* ═════════════ dati del modulo (solo in memoria) ═════════════ */

/** tutti gli eventi, anche quelli nascosti (GET ?action=admin). Non è il bundle pubblico: quello ha solo gli eventi visibili */
const eventiAdmin = createStore<Evento[] | null>("eventi-admin", null, { persist: false });
/** prenotazioni per evento, caricate quando si apre il dettaglio o si scrive ai partecipanti */
const partecipantiStore = createStore<Record<number, Partecipante[]>>("partecipanti-admin", {}, { persist: false });

async function caricaEventiAdmin() {
  const { eventi } = await chiama<{ eventi: Evento[] }>("eventi", { query: { action: "admin" } });
  eventiAdmin.set(eventi);
}
async function caricaPartecipantiDi(id: number) {
  const lista = await caricaPartecipanti(id);
  partecipantiStore.set((m) => ({ ...m, [id]: lista }));
}
/** dopo ogni scrittura la homepage si ricarica saltando la cache */
function aggiornaHomepage() {
  void import("@/lib/homepage").then((m) => m.caricaHomepage(true)).catch(() => undefined);
}
/** inserisce o sostituisce un evento nell'elenco */
function metti(ev: Evento) {
  eventiAdmin.set((l) => (l?.some((x) => x.id === ev.id) ? l.map((x) => (x.id === ev.id ? ev : x)) : [...(l ?? []), ev]));
}
const testoErrore = (err: unknown) => (err instanceof Error && err.message ? err.message : "Qualcosa non ha funzionato. Riprova tra poco.");

/** i campi che PUT ?action=modifica riscrive tutti: si parte sempre dall'evento intero, così nulla si perde */
function corpoEvento(e: Evento) {
  return {
    id: e.id,
    titolo: e.titolo,
    sottotitolo: e.sottotitolo,
    categoria: e.categoria,
    rassegna: e.rassegna,
    registro: e.registro,
    data: e.data,
    ora: e.ora,
    oraFine: e.oraFine,
    luogo: e.luogo,
    indirizzo: e.indirizzo,
    aula: e.aula,
    etichetta: e.etichetta,
    immagine: e.immagine,
    descrizione: e.descrizione,
    indizi: e.indizi,
    info: e.info,
    prenotazione: conPrenotazione(e),
    postiMax: e.postiMax,
    soloTesserati: e.soloTesserati,
    patrocinio: e.patrocinio,
    composizione: e.composizione,
    foto: e.foto,
    linkEsterno: e.linkEsterno,
  };
}

/* ═════════════ locandine su ImgBB (come client/src/dashboard/GestisciEventi.tsx) ═════════════ */

const TIPI_IMMAGINE = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];

/** ridimensiona a 800 px al massimo e ricomprime in JPEG, nel browser */
function comprimi(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Non siamo riusciti a leggere il file. Riprova con un altro."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Non siamo riusciti a leggere l'immagine. Riprova con un altro file."));
      img.onload = () => {
        const max = 800;
        let { width, height } = img;
        if (width > height) {
          if (width > max) {
            height *= max / width;
            width = max;
          }
        } else if (height > max) {
          width *= max / height;
          height = max;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Non siamo riusciti a preparare l'immagine."));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}


/* ═════════════ modulo ═════════════ */

type Filtro = "tutti" | "programma" | "bozze" | "passati";
type Evidenza = "0" | "1" | "2";
const EVIDENZA_FATTO: Record<Evidenza, string> = {
  "1": "È l'evento in evidenza in homepage e il primo nella Panoramica dell'area.",
  "2": "È il secondo evento nella Panoramica dell'area.",
  "0": "Non è più in evidenza. Se nessun evento è «1° · homepage», in homepage non ne compare nessuno in evidenza.",
};
const COMPOSIZIONI: { value: Evento["composizione"]; label: string }[] = [
  { value: "post", label: "Post · due moduli Petrolio" },
  { value: "locandina", label: "Locandina · verticale" },
  { value: "pieno", label: "Pieno · colore intero" },
  { value: "ufficiale", label: "Ufficiale · comunicazione" },
];
/** "sab 11.10 · 20:30–22:30" (l'ora può mancare negli eventi vecchi) */
const quandoBreve = (e: Evento) => [fmtShort(e.data), e.ora ? `${e.ora}${e.oraFine ? `–${e.oraFine}` : ""}` : ""].filter(Boolean).join(" · ");

export default function EventiAdmin() {
  const eventi = useStore(eventiAdmin);
  const [errore, setErrore] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("tutti");
  const [aperto, setAperto] = useState<number | null>(null);
  const [form, setForm] = useState<{ evento: Evento | null } | null>(null);
  const [scrivi, setScrivi] = useState<Evento | null>(null);
  const [elimina, setElimina] = useState<Evento | null>(null);

  const carica = () =>
    caricaEventiAdmin().catch((x) => {
      // con un elenco già in memoria si avvisa e basta
      if (eventiAdmin.get()) toast(testoErrore(x), "errore");
      else setErrore(testoErrore(x));
    });
  useEffect(() => {
    void carica();
  }, []);

  const livello = useLivello();
  const oggi = todayIso();
  const ordinati = useMemo(() => {
    const l = eventi ?? [];
    const futuri = l.filter((e) => e.data >= oggi).sort((a, b) => (a.data + a.ora).localeCompare(b.data + b.ora));
    const passati = l.filter((e) => e.data < oggi).sort((a, b) => b.data.localeCompare(a.data));
    return [...futuri, ...passati];
  }, [eventi, oggi]);

  const conteggi = {
    tutti: ordinati.length,
    programma: ordinati.filter((e) => e.data >= oggi).length,
    bozze: ordinati.filter((e) => !e.visibile).length,
    passati: ordinati.filter((e) => e.data < oggi).length,
  };
  const lista = ordinati.filter((e) =>
    filtro === "tutti" ? true : filtro === "programma" ? e.data >= oggi : filtro === "bozze" ? !e.visibile : e.data < oggi,
  );

  const evidenzia = async (e: Evento, v: Evidenza) => {
    const n = v === "0" ? null : (Number(v) as 1 | 2);
    const prima = n ? ordinati.find((x) => x.evidenza === n && x.id !== e.id) : undefined;
    try {
      const applica = await impostaEvidenza(e.id, n);
      eventiAdmin.set((l) => (l ? applica(l) : l));
      aggiornaHomepage();
      toast(prima ? `${EVIDENZA_FATTO[v]} Prende il posto di «${prima.titolo}».` : EVIDENZA_FATTO[v], "ok", e.titolo);
    } catch (x) {
      toast(testoErrore(x), "errore", e.titolo);
    }
  };

  const imposta = async (e: Evento, visibile: boolean) => {
    // si sposta subito l'interruttore; se il server dice di no, torna com'era
    metti({ ...e, visibile });
    try {
      const r = await chiama<{ evento: Evento }>("eventi", { method: "PUT", query: { action: "visibile" }, body: { id: e.id, visibile } });
      metti(r.evento);
      aggiornaHomepage();
      toast(visibile ? "L'evento è online sul sito." : "L'evento è tornato in bozza e non si vede più sul sito.", "ok", e.titolo);
    } catch (x) {
      metti(e);
      toast(testoErrore(x), "errore", e.titolo);
    }
  };

  return (
    <div className="eva">
      <AreaHead
        eyebrow="Gestione"
        title="Gestisci eventi"
        descr="Pubblica gli eventi sul sito, segui le prenotazioni e registra chi arriva alla porta."
        actions={
          <Button icon="plus" onClick={() => setForm({ evento: null })} disabled={!eventi}>
            Nuovo evento
          </Button>
        }
      />

      <div className="eva-bar">
        <Segmented<Filtro>
          value={filtro}
          onChange={setFiltro}
          options={[
            { value: "tutti", label: `Tutti · ${conteggi.tutti}` },
            { value: "programma", label: `In programma · ${conteggi.programma}` },
            { value: "bozze", label: `Bozze · ${conteggi.bozze}` },
            { value: "passati", label: `Passati · ${conteggi.passati}` },
          ]}
        />
      </div>

      {puo(livello, 2) && eventi && <CategorieEventi eventi={eventi} />}

      <Panel pad={false}>
        {!eventi ? (
          errore ? (
            <Empty icon="alert" title="Non riusciamo a caricare gli eventi">
              {errore}{" "}
              <button
                type="button"
                className="link link--always"
                onClick={() => {
                  setErrore(null);
                  void carica();
                }}
              >
                Riprova
              </button>
            </Empty>
          ) : (
            <div className="eva-detail" aria-busy="true" aria-label="Caricamento degli eventi">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} h={92} />
              ))}
            </div>
          )
        ) : lista.length === 0 ? (
          <Empty icon="eventi" title="Nessun evento in questo elenco">
            Cambia filtro oppure crea un nuovo evento: parte come bozza e lo pubblichi quando è pronto.
          </Empty>
        ) : (
          <ul className="eva-list">
            {lista.map((e) => (
              <Riga
                key={e.id}
                e={e}
                aperto={aperto === e.id}
                onToggle={() => setAperto(aperto === e.id ? null : e.id)}
                onOnline={(v) => void imposta(e, v)}
                onEvidenza={(v) => void evidenzia(e, v)}
                onScrivi={() => setScrivi(e)}
                onModifica={() => setForm({ evento: e })}
                onElimina={() => setElimina(e)}
              />
            ))}
          </ul>
        )}
      </Panel>

      <FormEvento key={form?.evento?.id ?? "nuovo"} aperto={!!form} evento={form?.evento ?? null} onClose={() => setForm(null)} />
      <ScriviPartecipanti evento={scrivi} onClose={() => setScrivi(null)} />
      <Elimina evento={elimina} onClose={() => setElimina(null)} onFatto={() => setAperto(null)} />
    </div>
  );
}

/* ───────── riga evento + dettaglio ───────── */

function Riga({
  e,
  aperto,
  onToggle,
  onOnline,
  onEvidenza,
  onScrivi,
  onModifica,
  onElimina,
}: {
  e: Evento;
  aperto: boolean;
  onToggle: () => void;
  onOnline: (v: boolean) => void;
  onEvidenza: (v: Evidenza) => void;
  onScrivi: () => void;
  onModifica: () => void;
  onElimina: () => void;
}) {
  const passato = isPassato(e);
  return (
    <li className={cx("eva-row", aperto && "is-open", !e.visibile && "is-bozza", passato && "is-passato")}>
      <div className="eva-row__main">
        <button type="button" className="eva-row__open" aria-expanded={aperto} onClick={onToggle}>
          <span className="eva-date" aria-hidden>
            <b>{dateParts(e.data).day}</b>
            <small>{dateParts(e.data).month}</small>
          </span>
          <span className="eva-row__text">
            <span className="t-label eva-row__cat">
              {e.etichetta ?? labelCategoria(e.categoria)}
              {e.evidenza && !passato && e.visibile && <span className="tag tag--solid-lanterna eva-row__evid">In evidenza · {e.evidenza}°</span>}
            </span>
            <strong className="eva-row__title">{e.titolo}</strong>
            <span className="eva-row__meta t-mono">{quandoBreve(e)}</span>
            <span className="eva-row__luogo">
              <Icon name="pin" size={14} /> {e.luogo}
              {e.indirizzo ? ` · ${e.indirizzo}` : ""}
            </span>
          </span>
          <span className="eva-row__count">
            {conPrenotazione(e) ? (
              <>
                <b className="t-mono">{e.prenotati}</b> prenotati
              </>
            ) : (
              "Senza prenotazione"
            )}
          </span>
          <Icon name="chevron-down" size={20} className="eva-row__chev" />
        </button>
        <div className="eva-row__tools">
          <Switch checked={e.visibile} onChange={onOnline} ariaLabel={`${e.titolo}: pubblicato sul sito`} />
          <div className="eva-row__btns">
            <Button size="sm" variant="outline" icon="mail" onClick={onScrivi} disabled={e.prenotati === 0} title={e.prenotati === 0 ? "Nessuna prenotazione per questo evento" : undefined}>
              Scrivi ai partecipanti
            </Button>
            <Button size="sm" variant="ghost" icon="edit" onClick={onModifica}>
              Modifica
            </Button>
            <Button size="sm" variant="ghost" icon="trash" onClick={onElimina} className="eva-del">
              Elimina
            </Button>
          </div>
        </div>
        {/* in evidenza: 1° = homepage e primo nella Panoramica, 2° = secondo nella Panoramica; solo eventi online e in programma */}
        {e.visibile && !passato && (
          <div className="eva-evid">
            <span className="t-label">In evidenza</span>
            <Segmented<Evidenza>
              size="sm"
              value={String(e.evidenza ?? 0) as Evidenza}
              onChange={onEvidenza}
              options={[
                { value: "0", label: "No" },
                { value: "1", label: "1° · homepage" },
                { value: "2", label: "2° · solo area" },
              ]}
            />
          </div>
        )}
      </div>
      <AnimatePresence initial={false}>
        {aperto && (
          <motion.div
            className="eva-detail-wrap"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <Dettaglio e={e} />
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function Dettaglio({ e }: { e: Evento }) {
  // un evento aperto senza prenotazioni registrate non ha nulla da mostrare; se ne ha (prenotazione tolta dopo), si vedono
  if (!conPrenotazione(e) && e.prenotati === 0) {
    return (
      <div className="eva-detail">
        <Empty icon="soci" title="Evento senza prenotazione">
          È un evento aperto: sul sito compare con «Senza prenotazione» e non raccoglie nomi. Per chiedere la prenotazione, modificalo e spunta «Serve la
          prenotazione».
        </Empty>
      </div>
    );
  }
  return <DettaglioPrenotati e={e} />;
}

/** i dati delle persone si cancellano dopo l'evento (BACKEND.md §10): restano posti e arrivi */
const anonima = (p: Partecipante) => !p.nome && !p.cognome && !p.email;

function DettaglioPrenotati({ e }: { e: Evento }) {
  const parte = useStore(partecipantiStore, (m) => m[e.id]);
  const [errore, setErrore] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [daEliminare, setDaEliminare] = useState<Partecipante | null>(null);
  const [busy, setBusy] = useState(false);

  // a ogni apertura si ricaricano le prenotazioni: alla porta servono quelle di adesso
  const carica = () =>
    caricaPartecipantiDi(e.id).catch((x) => {
      if (partecipantiStore.get()[e.id]) toast(testoErrore(x), "errore", e.titolo);
      else setErrore(testoErrore(x));
    });
  useEffect(() => {
    void carica();
  }, [e.id]);

  const filtrati = useMemo(() => {
    const l = parte ?? [];
    const t = q.trim().toLowerCase();
    if (!t) return l;
    return l.filter((p) => `${p.nome} ${p.cognome} ${p.email} ${p.codice}`.toLowerCase().includes(t));
  }, [parte, q]);

  if (!parte) {
    return (
      <div className="eva-detail">
        {errore ? (
          <Alert tone="errore">
            {errore}{" "}
            <button
              type="button"
              className="link link--always"
              onClick={() => {
                setErrore(null);
                void carica();
              }}
            >
              Riprova
            </button>
          </Alert>
        ) : (
          <div className="eva-stats" aria-busy="true" aria-label="Caricamento delle prenotazioni">
            <Skeleton h={88} />
            <Skeleton h={88} />
            <Skeleton h={88} />
          </div>
        )}
      </div>
    );
  }

  const prenotati = parte.reduce((s, p) => s + p.biglietti, 0);
  const arrivati = parte.reduce((s, p) => s + arrivatiDi(p), 0);

  const segnaArrivi = async (p: Partecipante, v: number) => {
    const aggiorna = (n: number) =>
      partecipantiStore.set((m) => ({ ...m, [e.id]: (m[e.id] ?? []).map((x) => (x.id === p.id ? { ...x, arrivati: n } : x)) }));
    aggiorna(v);
    try {
      await salvaArrivati(p.id, v);
    } catch (x) {
      aggiorna(p.arrivati);
      toast(testoErrore(x), "errore", "Arrivo non registrato");
    }
  };

  const eliminaPrenotazione = async () => {
    const p = daEliminare;
    if (!p) return;
    setBusy(true);
    try {
      await chiama("eventi", { method: "DELETE", query: { action: "prenotazione" }, body: { id: p.id } });
      partecipantiStore.set((m) => ({ ...m, [e.id]: (m[e.id] ?? []).filter((x) => x.id !== p.id) }));
      eventiAdmin.set((l) => l?.map((x) => (x.id === e.id ? { ...x, prenotati: Math.max(0, x.prenotati - p.biglietti) } : x)) ?? l);
      aggiornaHomepage();
      toast(`${p.biglietti === 1 ? "Il posto è" : `I ${p.biglietti} posti sono`} di nuovo disponibili.`, "ok", "Prenotazione eliminata");
      setDaEliminare(null);
    } catch (x) {
      toast(testoErrore(x), "errore");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="eva-detail">
      <div className="eva-stats">
        <StatTile label="Prenotati" value={prenotati} hint={`${parte.length} ${parte.length === 1 ? "prenotazione" : "prenotazioni"}`} icon="ticket" />
        <StatTile label="Arrivati" value={arrivati} hint={prenotati ? `${Math.round((arrivati / prenotati) * 100)}% dei prenotati` : "nessuno ancora"} icon="check" tone="ok" />
        <StatTile
          label="Max"
          value={e.postiMax ? e.postiMax : "Libero"}
          hint={e.postiMax ? `${Math.max(0, e.postiMax - prenotati)} posti liberi` : "senza limite di posti"}
          icon="seat"
          tone={e.postiMax && prenotati >= e.postiMax ? "avviso" : "default"}
        />
      </div>

      <div className="eva-search">
        <SearchBox value={q} onChange={setQ} placeholder="Cerca per nome, email o codice" label="Cerca un partecipante" />
        <span className="t-mono eva-search__n">
          {filtrati.length} / {parte.length}
        </span>
      </div>

      {parte.length === 0 ? (
        <Empty icon="ticket" title="Nessuna prenotazione">
          Quando qualcuno prenota dal sito, lo trovi qui con il suo codice.
        </Empty>
      ) : filtrati.length === 0 ? (
        <Empty icon="search" title="Nessuna prenotazione trovata">
          Prova con il cognome o con l'indirizzo email.
        </Empty>
      ) : (
        <ul className="eva-people">
          {filtrati.map((p) => (
            <li key={p.id} className="eva-person">
              <div className="eva-person__who">
                <strong>{anonima(p) ? "Dati rimossi dopo l'evento" : `${p.cognome} ${p.nome}`}</strong>
                <span className="eva-person__sub t-mono">{[p.email, p.codice].filter(Boolean).join(" · ")}</span>
                {p.note && (
                  <span className="eva-person__note">
                    <Icon name="info" size={14} /> {p.note}
                  </span>
                )}
              </div>
              <div className="eva-person__when t-mono">
                {p.biglietti} {p.biglietti === 1 ? "posto" : "posti"}
                {p.creataIl && <small>{fmtQuando(isoToLocale(p.creataIl))}</small>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Stepper label={`Arrivi di ${anonima(p) ? p.codice : `${p.nome} ${p.cognome}`}`} value={arrivatiDi(p)} max={p.biglietti} onChange={(v) => void segnaArrivi(p, v)} />
                <Button size="sm" variant="ghost" icon="trash" className="eva-del" aria-label={`Elimina la prenotazione ${p.codice}`} onClick={() => setDaEliminare(p)} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={!!daEliminare} onClose={busy ? () => {} : () => setDaEliminare(null)} title="Eliminare la prenotazione?" width={480}>
        {daEliminare && (
          <div className="eva-mail">
            <p>
              Stai per eliminare la prenotazione <span className="t-mono">{daEliminare.codice}</span>
              {anonima(daEliminare) ? "" : ` di ${daEliminare.nome} ${daEliminare.cognome}`} ({daEliminare.biglietti}{" "}
              {daEliminare.biglietti === 1 ? "posto" : "posti"}). I posti tornano liberi e non si può annullare.
            </p>
            <div className="eva-form__foot">
              <Button variant="ghost" onClick={() => setDaEliminare(null)} disabled={busy}>
                Annulla
              </Button>
              <Button icon="trash" loading={busy} onClick={eliminaPrenotazione} className="eva-del-btn">
                Elimina prenotazione
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ───────── nuovo evento / modifica ───────── */

function FormEvento({ aperto, evento, onClose }: { aperto: boolean; evento: Evento | null; onClose: () => void }) {
  const nuovo = !evento;
  const categorie = useCategorie();
  const [v, setV] = useState({
    titolo: evento?.titolo ?? "",
    sottotitolo: evento?.sottotitolo ?? "",
    categoria: evento?.categoria ?? categorie[0]?.id ?? "eventi",
    etichetta: evento?.etichetta ?? "",
    luogo: evento?.luogo ?? LUOGO,
    indirizzo: evento?.indirizzo ?? INDIRIZZO_EVENTI,
    /** URL già salvato (ImgBB o vecchio); "" = nessuna locandina */
    immagine: evento?.immagine ?? "",
    data: evento?.data ?? addDays(todayIso(), 14),
    ora: evento?.ora ?? "20:30",
    oraFine: evento?.oraFine ?? (evento ? "" : "22:30"),
    prenotazione: evento ? conPrenotazione(evento) : (categorie[0]?.id ?? "eventi") !== "assemblee",
    postiMax: String(evento?.postiMax ?? 40),
    composizione: (evento?.composizione ?? "post") as Evento["composizione"],
    soloTesserati: evento?.soloTesserati ?? false,
    descrizione: evento?.descrizione ?? "",
    linkEsterno: evento?.linkEsterno ?? "",
  });
  /** locandina nuova scelta dal computer: si carica su ImgBB al salvataggio, come in produzione */
  const [file, setFile] = useState<{ file: File; url: string } | null>(null);
  const [err, setErr] = useState<Record<string, string>>({});
  const [salvo, setSalvo] = useState(false);
  // finché non la si tocca, la prenotazione segue la categoria (assemblee: senza)
  const [prenToccata, setPrenToccata] = useState(!nuovo);
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => {
    setV((p) => ({ ...p, [k]: val }));
    if (err[k]) setErr((x) => ({ ...x, [k]: "" }));
  };
  const scegliFile = (f: File | null) =>
    setFile((prima) => {
      if (prima) URL.revokeObjectURL(prima.url);
      return f ? { file: f, url: URL.createObjectURL(f) } : null;
    });

  const anteprima: Evento = {
    id: evento?.id ?? 0,
    slug: evento?.slug ?? "anteprima",
    titolo: v.titolo.trim() || "Titolo dell'evento",
    sottotitolo: v.sottotitolo.trim() || "Una riga che dice di cosa si tratta.",
    categoria: v.categoria,
    etichetta: v.etichetta.trim() || undefined,
    immagine: file?.url || v.immagine || undefined,
    registro: evento?.registro ?? (v.categoria === "assemblee" ? "silenzio" : "voce"),
    data: v.data || todayIso(),
    ora: v.ora,
    oraFine: v.oraFine || undefined,
    luogo: v.luogo.trim() || LUOGO,
    indirizzo: v.indirizzo.trim(),
    descrizione: v.descrizione,
    prenotazione: v.prenotazione,
    postiMax: v.prenotazione ? Number(v.postiMax) || 0 : 0,
    prenotati: evento?.prenotati ?? 0,
    soloTesserati: v.soloTesserati,
    visibile: false,
    composizione: v.composizione,
    linkEsterno: v.linkEsterno.trim() || undefined,
  };

  const salva = async () => {
    const e: Record<string, string> = {};
    if (!v.titolo.trim()) e.titolo = "Scrivi un titolo: è la prima cosa che si legge sul sito.";
    if (!v.data) e.data = "Scegli la data dell'evento.";
    if (!v.ora) e.ora = "Indica l'ora di inizio.";
    if (!v.luogo.trim()) e.luogo = "Indica dove si svolge l'evento.";
    if (!v.indirizzo.trim()) e.indirizzo = "Scrivi l'indirizzo, così chi viene sa dove andare.";
    if (v.oraFine && v.ora && v.oraFine <= v.ora) e.oraFine = "La fine deve essere dopo l'inizio.";
    if (v.prenotazione && v.postiMax && (!/^\d+$/.test(v.postiMax) || Number(v.postiMax) > 500)) e.postiMax = "Inserisci un numero tra 0 e 500. Con 0 i posti non hanno limite.";
    if (/\s/.test(v.linkEsterno.trim())) e.linkEsterno = "Un link non contiene spazi: incollalo dalla barra dell'indirizzo.";
    setErr(e);
    if (Object.keys(e).length) return;
    setSalvo(true);
    try {
      // la locandina nuova viaggia come data URL insieme all'evento e si salva in Turso
      const immagine = file ? await comprimi(file.file) : v.immagine;
      const campi = {
        titolo: v.titolo.trim(),
        sottotitolo: v.sottotitolo.trim() || undefined,
        categoria: v.categoria,
        etichetta: v.etichetta.trim() || undefined,
        luogo: v.luogo.trim(),
        indirizzo: v.indirizzo.trim(),
        immagine,
        data: v.data,
        ora: v.ora,
        oraFine: v.oraFine || undefined,
        prenotazione: v.prenotazione,
        postiMax: v.prenotazione ? Number(v.postiMax) || 0 : 0,
        composizione: v.composizione,
        soloTesserati: v.soloTesserati,
        descrizione: v.descrizione.trim(),
        linkEsterno: v.linkEsterno.trim(),
      };
      if (nuovo) {
        const r = await chiama<{ evento: Evento }>("eventi", {
          method: "POST",
          query: { action: "crea" },
          body: { ...campi, registro: anteprima.registro, visibile: false },
        });
        metti(r.evento);
        toast("Salvato come bozza. Quando è pronto, accendi l'interruttore per pubblicarlo.", "ok", r.evento.titolo);
      } else {
        // si parte dall'evento intero (rassegna, indizi, info, foto… non sono nel modulo e non vanno persi)
        const r = await chiama<{ evento: Evento }>("eventi", { method: "PUT", query: { action: "modifica" }, body: { ...corpoEvento(evento), ...campi } });
        metti(r.evento);
        toast("Modifiche salvate.", "ok", r.evento.titolo);
      }
      aggiornaHomepage();
      scegliFile(null);
      onClose();
    } catch (x) {
      if (x instanceof ApiError && x.field) setErr({ [x.field]: x.message });
      else toast(testoErrore(x), "errore", v.titolo.trim());
    } finally {
      setSalvo(false);
    }
  };

  return (
    <Modal open={aperto} onClose={salvo ? () => {} : onClose} title={nuovo ? "Nuovo evento" : "Modifica evento"} width={920}>
      <div className="eva-form">
        <div className="eva-form__fields">
          <TextField label="Titolo" value={v.titolo} error={err.titolo} onChange={(x) => set("titolo", x.target.value)} placeholder="Es. Serata giochi da tavolo" />
          <TextArea
            label="Testo introduttivo"
            value={v.sottotitolo}
            onChange={(x) => set("sottotitolo", x.target.value)}
            placeholder="Due righe per invogliare a venire: cosa succede, per chi è, perché vale la pena."
            hint="È il testo che si legge sul sito accanto al titolo dell'evento, in evidenza e nelle card."
            rows={3}
            style={{ minHeight: 96 }}
          />
          <div className="eva-form__grid">
            <SelectField
              label="Categoria"
              value={v.categoria}
              onChange={(x) => {
                set("categoria", x.target.value);
                if (!prenToccata) set("prenotazione", x.target.value !== "assemblee");
              }}
              options={categorie.some((c) => c.id === v.categoria) ? categorie.map((c) => ({ value: c.id, label: c.label })) : [{ value: v.categoria, label: labelCategoria(v.categoria) }, ...categorie.map((c) => ({ value: c.id, label: c.label }))]}
            />
            <TextField label="Occhiello" optional value={v.etichetta} onChange={(x) => set("etichetta", x.target.value)} placeholder="Es. Incontro pubblico" hint="Compare sopra il titolo. Se vuoto, usiamo la categoria." />
          </div>
          <div className="eva-form__grid">
            <TextField label="Luogo" value={v.luogo} error={err.luogo} onChange={(x) => set("luogo", x.target.value)} placeholder="Es. Cortile della biblioteca" />
            <TextField label="Indirizzo" value={v.indirizzo} error={err.indirizzo} onChange={(x) => set("indirizzo", x.target.value)} placeholder="Via, numero, comune" />
          </div>
          <Locandina
            immagine={file?.url || v.immagine}
            nuova={!!file}
            disabled={salvo}
            onScegli={(f) => scegliFile(f)}
            onRimuovi={() => {
              scegliFile(null);
              set("immagine", "");
            }}
          />
          <div className="eva-form__grid">
            <SelectField
              label="Grafica, se non c'è la locandina"
              value={v.composizione}
              onChange={(x) => set("composizione", x.target.value as Evento["composizione"])}
              options={COMPOSIZIONI}
            />
          </div>
          <div className="eva-form__grid eva-form__grid--3">
            <TextField label="Data" type="date" value={v.data} error={err.data} onChange={(x) => set("data", x.target.value)} />
            <TextField label="Inizio" type="time" value={v.ora} error={err.ora} onChange={(x) => set("ora", x.target.value)} />
            <TextField label="Fine" type="time" optional value={v.oraFine} error={err.oraFine} onChange={(x) => set("oraFine", x.target.value)} />
          </div>
          <div className="eva-pren">
            <Checkbox
              label="Serve la prenotazione"
              checked={v.prenotazione}
              onChange={(x) => {
                setPrenToccata(true);
                set("prenotazione", x.target.checked);
              }}
            />
            {v.prenotazione ? (
              <TextField
                label="Posti disponibili"
                inputMode="numeric"
                value={v.postiMax}
                error={err.postiMax}
                hint="Con 0 i posti non hanno limite."
                onChange={(x) => set("postiMax", x.target.value)}
              />
            ) : (
              <p className="eva-pren__nota">
                <Icon name="info" size={16} /> Evento aperto: compare sul sito con «Senza prenotazione», senza modulo e senza numero di posti. Va bene per
                assemblee e incontri a ingresso libero.
              </p>
            )}
          </div>
          <TextArea label="Descrizione" optional rows={4} value={v.descrizione} onChange={(x) => set("descrizione", x.target.value)} placeholder="Cosa succede, per chi è, cosa portare." />
          <TextField
            label="Link esterno"
            optional
            type="url"
            inputMode="url"
            value={v.linkEsterno}
            error={err.linkEsterno}
            onChange={(x) => set("linkEsterno", x.target.value)}
            placeholder="https://"
            hint="Una pagina per saperne di più: compare nella scheda dell'evento come «Per approfondire»."
          />
          <Checkbox label="Riservato alle persone socie con tessera" checked={v.soloTesserati} onChange={(x) => set("soloTesserati", x.target.checked)} />
        </div>

        <aside className="eva-form__preview" aria-label="Anteprima della locandina">
          <span className="t-label t-muted">Anteprima sul sito</span>
          <EventArt evento={anteprima} ratio="4 / 5" className="eva-form__art" />
          <p className="eva-form__cap t-mono">{fmtLong(anteprima.data)}</p>
          {nuovo && (
            <p className="eva-form__bozza">
              <Icon name="eye-off" size={16} /> Parte come bozza: non si vede sul sito finché non la pubblichi.
            </p>
          )}
        </aside>
      </div>
      <div className="eva-form__foot">
        <Button variant="ghost" onClick={onClose} disabled={salvo}>
          Annulla
        </Button>
        <Button icon="check" loading={salvo} onClick={salva}>
          {nuovo ? "Salva come bozza" : "Salva le modifiche"}
        </Button>
      </div>
    </Modal>
  );
}

/* ───────── scrivi ai partecipanti ───────── */

function ScriviPartecipanti({ evento, onClose }: { evento: Evento | null; onClose: () => void }) {
  return (
    <Modal open={!!evento} onClose={onClose} title="Scrivi ai partecipanti" width={620}>
      {evento && <ScriviForm key={evento.id} evento={evento} onClose={onClose} />}
    </Modal>
  );
}
const SEGNAPOSTO = "[Scrivi qui il messaggio]";
function ScriviForm({ evento, onClose }: { evento: Evento; onClose: () => void }) {
  const parte = useStore(partecipantiStore, (m) => m[evento.id]);
  useEffect(() => {
    if (!partecipantiStore.get()[evento.id]) caricaPartecipantiDi(evento.id).catch(() => undefined);
  }, [evento.id]);
  // il server scrive una volta a ogni indirizzo (le prenotazioni anonimizzate non hanno più l'email)
  const n = parte ? new Set(parte.map((p) => p.email.trim().toLowerCase()).filter(Boolean)).size : null;
  const quando = `${fmtLong(evento.data)}${evento.ora ? `, ore ${evento.ora}` : ""}`;
  const [oggetto, setOggetto] = useState(`${evento.titolo}: ${quando}`);
  const [msg, setMsg] = useState(
    `Ciao,\nti scriviamo per l'evento "${evento.titolo}" di ${fmtLong(evento.data)}${evento.ora ? `, alle ${evento.ora}` : ""}, in ${evento.luogo}.\n\n${SEGNAPOSTO}\n\nA presto,\nFORO`,
  );
  const [invio, setInvio] = useState(false);
  const [err, setErr] = useState<{ o?: string; m?: string }>({});
  const invia = async () => {
    const e: typeof err = {};
    if (!oggetto.trim()) e.o = "Scrivi un oggetto.";
    if (msg.trim().length < 10) e.m = "Il messaggio è troppo corto.";
    else if (msg.includes(SEGNAPOSTO)) e.m = `Sostituisci ${SEGNAPOSTO} con il tuo testo.`;
    setErr(e);
    if (e.o || e.m) return;
    setInvio(true);
    try {
      const r = await chiama<{ inviate: number; totali: number }>("eventi", {
        method: "POST",
        query: { action: "scrivi" },
        body: { id: evento.id, oggetto: oggetto.trim(), messaggio: msg.trim() },
      });
      if (r.inviate === r.totali) toast(`Inviate ${r.inviate} email.`, "ok", evento.titolo);
      else toast(`Inviate ${r.inviate} email su ${r.totali}: le altre non sono partite.`, "avviso", evento.titolo);
      onClose();
    } catch (x) {
      if (x instanceof ApiError && x.field === "oggetto") setErr({ o: x.message });
      else if (x instanceof ApiError && x.field === "messaggio") setErr({ m: x.message });
      else toast(testoErrore(x), "errore", evento.titolo);
    } finally {
      setInvio(false);
    }
  };
  return (
    <div className="eva-mail">
      <Alert tone={n === 0 ? "avviso" : "info"}>
        {n === null
          ? "Stiamo contando gli indirizzi delle prenotazioni…"
          : n === 0
            ? "Nessuna prenotazione di questo evento ha un indirizzo email a cui scrivere."
            : `L'email parte dalla casella dell'associazione verso ${n} ${n === 1 ? "indirizzo" : "indirizzi"}: chi ha prenotato più volte con la stessa email la riceve una volta sola.`}
      </Alert>
      <TextField label="Oggetto" value={oggetto} error={err.o} onChange={(x) => (setOggetto(x.target.value), setErr((p) => ({ ...p, o: "" })))} />
      <TextArea label="Messaggio" rows={9} value={msg} error={err.m} onChange={(x) => (setMsg(x.target.value), setErr((p) => ({ ...p, m: "" })))} />
      <div className="eva-form__foot">
        <Button variant="ghost" onClick={onClose} disabled={invio}>
          Annulla
        </Button>
        <Button icon="send" loading={invio} onClick={invia} disabled={n === 0}>
          {n ? `Invia a ${n} ${n === 1 ? "persona" : "persone"}` : "Invia"}
        </Button>
      </div>
    </div>
  );
}

/* ───────── elimina ───────── */

function Elimina({ evento, onClose, onFatto }: { evento: Evento | null; onClose: () => void; onFatto: () => void }) {
  const [busy, setBusy] = useState(false);
  const conferma = async () => {
    if (!evento) return;
    setBusy(true);
    try {
      await chiama("eventi", { method: "DELETE", query: { action: "elimina" }, body: { id: evento.id } });
      eventiAdmin.set((l) => l?.filter((x) => x.id !== evento.id) ?? l);
      partecipantiStore.set((m) => {
        const n = { ...m };
        delete n[evento.id];
        return n;
      });
      aggiornaHomepage();
      toast("Evento eliminato, con le sue prenotazioni.", "ok", evento.titolo);
      onFatto();
      onClose();
    } catch (x) {
      toast(testoErrore(x), "errore", evento.titolo);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={!!evento} onClose={busy ? () => {} : onClose} title="Eliminare l'evento?" width={480}>
      {evento && (
        <div className="eva-mail">
          <p>
            Stai per eliminare <strong>{evento.titolo}</strong> ({fmtShort(evento.data)}). Sparisce dal sito e{" "}
            {evento.prenotati > 0 ? (
              <>
                vengono cancellate anche <strong>tutte le sue prenotazioni</strong> ({evento.prenotati} {evento.prenotati === 1 ? "posto" : "posti"})
              </>
            ) : (
              "vengono cancellate anche le sue prenotazioni"
            )}
            . Non si può annullare.
          </p>
          <div className="eva-form__foot">
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Annulla
            </Button>
            <Button icon="trash" loading={busy} onClick={conferma} className="eva-del-btn">
              Elimina evento
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ───────── locandina: si sceglie qui, si carica su ImgBB al salvataggio ───────── */

function Locandina({
  immagine,
  nuova,
  disabled,
  onScegli,
  onRimuovi,
}: {
  immagine: string;
  nuova: boolean;
  disabled?: boolean;
  onScegli: (f: File) => void;
  onRimuovi: () => void;
}) {
  const [errore, setErrore] = useState("");
  const scegli = (f?: File) => {
    if (!f) return;
    if (!TIPI_IMMAGINE.includes(f.type)) return setErrore("Il file non è un'immagine adatta. Scegli un JPG, un PNG, un GIF o un WebP.");
    if (f.size > 10 * 1024 * 1024) return setErrore("L'immagine pesa più di 10 MB. Scegline una più leggera.");
    setErrore("");
    onScegli(f);
  };
  return (
    <div className="eva-poster">
      <span className="t-label">Locandina</span>
      <div className="eva-poster__row">
        {immagine ? <img className="eva-poster__thumb" src={immagine} alt="Anteprima della locandina" /> : <span className="eva-poster__none">Nessuna immagine</span>}
        <div className="eva-poster__btns">
          <label className="btn btn--outline btn--sm eva-poster__pick" aria-disabled={disabled}>
            <Icon name="plus" size={16} />
            {immagine ? "Cambia immagine" : "Carica un'immagine"}
            <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden disabled={disabled} onChange={(e) => (scegli(e.target.files?.[0]), (e.target.value = ""))} />
          </label>
          {immagine && (
            <Button size="sm" variant="ghost" icon="trash" onClick={onRimuovi} disabled={disabled}>
              Rimuovi
            </Button>
          )}
        </div>
      </div>
      <p className="eva-poster__hint">
        {nuova
          ? "L'immagine si carica quando salvi: la ridimensioniamo e la salviamo sul sito."
          : "Se non carichi una locandina, usiamo la grafica a moduli."}
      </p>
      {errore && <p className="eva-poster__err">{errore}</p>}
    </div>
  );
}

/* ───────── categorie degli eventi ───────── */

function CategorieEventi({ eventi }: { eventi: Evento[] }) {
  const categorie = useCategorie();
  const [aperto, setAperto] = useState(false);
  const [nuova, setNuova] = useState("");
  const [err, setErr] = useState("");
  const [rimuovi, setRimuovi] = useState<string | null>(null);
  const [dest, setDest] = useState("");
  const [busy, setBusy] = useState(false);
  const usate = (id: string) => eventi.filter((e) => e.categoria === id).length;

  /** salva l'elenco completo; false se il server ha detto di no */
  const salva = async (lista: CategoriaCfg[]) => {
    setBusy(true);
    try {
      await salvaCategorie(lista);
      return true;
    } catch (x) {
      toast(testoErrore(x), "errore");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const rinomina = async (id: string, label: string) => {
    const ok = await salva(categorie.map((x) => (x.id === id ? { ...x, label } : x)));
    if (ok) toast("Nome della categoria salvato.", "ok", label);
    return ok;
  };
  const sposta = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= categorie.length) return;
    const n = [...categorie];
    [n[i], n[j]] = [n[j], n[i]];
    void salva(n);
  };
  const aggiungi = async () => {
    const label = nuova.trim();
    if (!label) return setErr("Scrivi il nome della categoria.");
    if (categorie.some((c) => c.label.toLowerCase() === label.toLowerCase())) return setErr("Esiste già una categoria con questo nome.");
    let id = slugCategoria(label).slice(0, 38);
    while (categorie.some((c) => c.id === id)) id += "-2";
    if (await salva([...categorie, { id, label }])) {
      setNuova("");
      setErr("");
      toast("Categoria aggiunta alla barra dei filtri.", "ok", label);
    }
  };
  const richiediElimina = (id: string) => {
    if (id === "assemblee") return toast("La categoria Assemblee non si può eliminare: la usano la Panoramica e il modulo degli eventi.", "avviso");
    if (categorie.length <= 1) return toast("Deve restare almeno una categoria.", "avviso");
    setDest(categorie.find((c) => c.id !== id)?.id ?? "");
    setRimuovi(id);
  };
  const elimina = async () => {
    if (!rimuovi) return;
    const label = labelCategoria(rimuovi);
    setBusy(true);
    try {
      // prima si spostano gli eventi (anche quelli nascosti), poi si toglie la categoria
      for (const e of eventi.filter((x) => x.categoria === rimuovi)) {
        try {
          const r = await chiama<{ evento: Evento }>("eventi", { method: "PUT", query: { action: "modifica" }, body: { ...corpoEvento(e), categoria: dest } });
          metti(r.evento);
        } catch (x) {
          throw new Error(`Non siamo riusciti a spostare «${e.titolo}»: ${testoErrore(x)}`);
        }
      }
      await salvaCategorie(categorie.filter((x) => x.id !== rimuovi));
      aggiornaHomepage();
      toast("Categoria eliminata.", "ok", label);
      setRimuovi(null);
    } catch (x) {
      toast(testoErrore(x), "errore", label);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel
      title="Categorie degli eventi"
      className="eva-cat"
      actions={
        <Button size="sm" variant="outline" onClick={() => setAperto(!aperto)} aria-expanded={aperto}>
          {aperto ? "Chiudi" : "Modifica la barra"}
        </Button>
      }
    >
      <p className="eva-cat__descr">
        La barra dei filtri sopra gli eventi, sul sito. Tutti c'è sempre; le altre voci le decidi tu.
      </p>
      <div className="eva-cat__preview" aria-label="Anteprima della barra">
        <span className="eva-cat__chip is-on">Tutti</span>
        {categorie.map((c) => (
          <span key={c.id} className="eva-cat__chip">
            {c.label}
          </span>
        ))}
      </div>
      {aperto && (
        <div className="eva-cat__edit">
          <ul className="eva-cat__list">
            {categorie.map((c, i) => (
              <li key={c.id} className="eva-cat__row">
                <NomeCategoria key={`${c.id}:${c.label}`} c={c} onSalva={(label) => rinomina(c.id, label)} />
                <span className="t-mono eva-cat__n">{usate(c.id)} {usate(c.id) === 1 ? "evento" : "eventi"}</span>
                <Button size="sm" variant="ghost" icon="arrow-down" aria-label="Sposta su" disabled={busy || i === 0} onClick={() => sposta(i, -1)} className="eva-up" />
                <Button size="sm" variant="ghost" icon="arrow-down" aria-label="Sposta giù" disabled={busy || i === categorie.length - 1} onClick={() => sposta(i, 1)} />
                <Button
                  size="sm"
                  variant="ghost"
                  icon="trash"
                  aria-label={c.id === "assemblee" ? "Assemblee non si può eliminare" : `Elimina ${c.label}`}
                  title={c.id === "assemblee" ? "La usano la Panoramica e il modulo degli eventi: non si può eliminare." : undefined}
                  className="eva-del"
                  disabled={busy || c.id === "assemblee"}
                  onClick={() => richiediElimina(c.id)}
                />
              </li>
            ))}
          </ul>
          <div className="eva-cat__add">
            <TextField
              label="Nuova categoria"
              value={nuova}
              error={err}
              onChange={(e) => (setNuova(e.target.value), setErr(""))}
              placeholder="Es. Serate musicali"
              onKeyDown={(e) => e.key === "Enter" && !busy && void aggiungi()}
            />
            <Button icon="plus" onClick={() => void aggiungi()} loading={busy && !rimuovi}>
              Aggiungi
            </Button>
          </div>
        </div>
      )}

      <Modal open={!!rimuovi} onClose={busy ? () => {} : () => setRimuovi(null)} title="Eliminare la categoria?" width={480}>
        {rimuovi && (
          <div className="eva-mail">
            <p>
              Stai per eliminare <strong>{labelCategoria(rimuovi)}</strong> dalla barra dei filtri.
              {usate(rimuovi) > 0 ? ` ${usate(rimuovi)} ${usate(rimuovi) === 1 ? "evento la usa" : "eventi la usano"}: scegli dove spostarli.` : ""}
            </p>
            {usate(rimuovi) > 0 && (
              <SelectField label="Sposta gli eventi in" value={dest} onChange={(e) => setDest(e.target.value)} options={categorie.filter((c) => c.id !== rimuovi).map((c) => ({ value: c.id, label: c.label }))} />
            )}
            <div className="eva-form__foot">
              <Button variant="ghost" onClick={() => setRimuovi(null)} disabled={busy}>
                Annulla
              </Button>
              <Button icon="trash" onClick={() => void elimina()} loading={busy} className="eva-del-btn">
                Elimina categoria
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Panel>
  );
}

/** nome modificabile: si salva quando si esce dal campo (o con Invio), non a ogni lettera */
function NomeCategoria({ c, onSalva }: { c: CategoriaCfg; onSalva: (label: string) => Promise<boolean> }) {
  const [v, setV] = useState(c.label);
  return (
    <input
      className="input eva-cat__input"
      aria-label={`Nome della categoria ${c.label}`}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      onBlur={async () => {
        const t = v.trim();
        if (!t || t === c.label) return setV(c.label);
        if (!(await onSalva(t))) setV(c.label);
      }}
    />
  );
}
