/**
 * Gestione Tesserati: chi è tesserato per partecipare al CineFORO (api/user.js?entity=tesserato, livello ≤ 2).
 * Stesse funzioni del gestionale attuale: ricerca, ordinamento, nuovo tesserato, modifica,
 * eliminazione ed elenco in PDF con scelta delle colonne. Nome e cognome obbligatori, email e telefono facoltativi.
 * L'elenco resta solo in memoria: nomi, email e telefoni non si salvano nel browser.
 */
import { useEffect, useMemo, useState } from "react";
import { Button, Checkbox, Icon, Modal, SelectField, TextField } from "@/components/ui";
import { toast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api";
import { fmtNumeric, todayIso } from "@/lib/time";
import { AreaHead, Empty, Panel, puo, useLivello } from "../ui";
import { caricaTesserati, eliminaTesserato, salvaTesserato, type TesseratoCine } from "../data-gestione";
import { RigheCaricamento, Search } from "../utenti-ui";
import "../utenti-ui.css";
import "./tesserati.css";

const messaggio = (err: unknown) => (err instanceof Error ? err.message : "Qualcosa non ha funzionato. Riprova tra poco.");

type Ordine = "id" | "nome" | "cognome" | "email";
const ORDINI: { value: Ordine; label: string }[] = [
  { value: "id", label: "ID" },
  { value: "nome", label: "Nome" },
  { value: "cognome", label: "Cognome" },
  { value: "email", label: "Email" },
];

type Colonna = "id" | "nome" | "cognome" | "email" | "numero_di_telefono" | "data_iscrizione";
const COLONNE: { id: Colonna; label: string; val: (t: TesseratoCine) => string }[] = [
  { id: "id", label: "ID", val: (t) => String(t.id) },
  { id: "nome", label: "Nome", val: (t) => t.nome },
  { id: "cognome", label: "Cognome", val: (t) => t.cognome },
  { id: "email", label: "Email", val: (t) => t.email || "-" },
  { id: "numero_di_telefono", label: "Telefono", val: (t) => t.numero_di_telefono || "-" },
  { id: "data_iscrizione", label: "Data iscrizione", val: (t) => fmtNumeric(t.data_iscrizione) },
];

export default function Tesserati() {
  const livello = useLivello();
  /** null finché l'elenco non arriva dal server */
  const [lista, setLista] = useState<TesseratoCine[] | null>(null);
  const [errore, setErrore] = useState(false);
  const tesserati = useMemo(() => lista ?? [], [lista]);
  const abilitato = puo(livello, 2);
  const [q, setQ] = useState("");
  const [ordine, setOrdine] = useState<Ordine>("id");
  const [aggiorno, setAggiorno] = useState(false);
  const [modifica, setModifica] = useState<TesseratoCine | "nuovo" | null>(null);
  const [elimina, setElimina] = useState<TesseratoCine | null>(null);
  const [pdf, setPdf] = useState(false);

  const visibili = useMemo(() => {
    const t = q.trim().toLowerCase();
    return tesserati
      .filter(
        (x) =>
          !t ||
          x.nome.toLowerCase().includes(t) ||
          x.cognome.toLowerCase().includes(t) ||
          (x.email ?? "").toLowerCase().includes(t) ||
          (x.numero_di_telefono ?? "").toLowerCase().includes(t),
      )
      .sort((a, b) => (ordine === "id" ? a.id - b.id : (a[ordine] ?? "").toLowerCase().localeCompare((b[ordine] ?? "").toLowerCase(), "it")));
  }, [tesserati, q, ordine]);

  const carica = async (avvisa = false) => {
    setAggiorno(true);
    setErrore(false);
    try {
      setLista(await caricaTesserati());
      if (avvisa) toast("Elenco dei tesserati aggiornato.", "ok");
    } catch (err) {
      setErrore(true);
      toast(messaggio(err), "errore");
    } finally {
      setAggiorno(false);
    }
  };
  useEffect(() => {
    if (abilitato) void carica();
  }, [abilitato]);

  if (!abilitato) {
    return (
      <div className="tes">
        <AreaHead eyebrow="Associazione" title="Tesserati" />
        <Panel>
          <Empty icon="lock" title="Questa parte è riservata">
            La gestiscono il direttivo e gli organizzatori. Se ti serve accedere, chiedi a un membro del direttivo.
          </Empty>
        </Panel>
      </div>
    );
  }

  return (
    <div className="tes">
      <AreaHead
        eyebrow="Associazione"
        title="Tesserati"
        descr="Chi è tesserato per partecipare al CineFORO. Aggiungi, modifica o rimuovi i tesserati."
        actions={
          <>
            <Button variant="outline" icon="refresh" loading={aggiorno} onClick={() => void carica(true)}>
              Aggiorna
            </Button>
            <Button variant="outline" icon="download" onClick={() => setPdf(true)} disabled={!lista}>
              Scarica lista
            </Button>
            <Button icon="plus" onClick={() => setModifica("nuovo")} disabled={!lista}>
              Nuovo tesserato
            </Button>
          </>
        }
      />

      <Panel pad={false} className="tes-list">
        <div className="tes-tools">
          <Search value={q} onChange={setQ} placeholder="Cerca per nome, cognome, email o telefono" label="Cerca tra i tesserati" />
          <SelectField className="tes-ord" label="Ordina per" value={ordine} onChange={(e) => setOrdine(e.target.value as Ordine)} options={ORDINI} />
        </div>
        {lista && (
          <p className="tes-count t-mono" role="status">
            Trovati {visibili.length} tesserati su {tesserati.length}
          </p>
        )}

        {!lista ? (
          errore && !aggiorno ? (
            <Empty icon="alert" title="Non riusciamo a caricare i tesserati">
              <button type="button" className="link" onClick={() => void carica()}>
                Riprova
              </button>
            </Empty>
          ) : (
            <RigheCaricamento n={6} />
          )
        ) : visibili.length === 0 ? (
          <Empty icon="search" title="Nessun tesserato corrisponde ai criteri di ricerca">
            Prova a cercare con meno lettere.
          </Empty>
        ) : (
          <div className="table-scroll">
            <table className="data-table tes-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Cognome</th>
                  <th>Email</th>
                  <th>Telefono</th>
                  <th>Data iscrizione</th>
                  <th className="tes-th-act">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {visibili.map((t) => (
                  <tr key={t.id}>
                    <td className="num tes-id">{t.id}</td>
                    <td className="tes-nome">{t.nome}</td>
                    <td className="tes-nome">{t.cognome}</td>
                    <td>{t.email || "–"}</td>
                    <td className="num">{t.numero_di_telefono || "–"}</td>
                    <td className="num">{fmtNumeric(t.data_iscrizione)}</td>
                    <td>
                      <div className="tes-act">
                        <button type="button" className="tes-ib" title="Modifica" aria-label={`Modifica ${t.nome} ${t.cognome}`} onClick={() => setModifica(t)}>
                          <Icon name="edit" size={17} />
                        </button>
                        <button type="button" className="tes-ib tes-ib--del" title="Elimina" aria-label={`Elimina ${t.nome} ${t.cognome}`} onClick={() => setElimina(t)}>
                          <Icon name="trash" size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <ModificaModal
        valore={modifica}
        onClose={() => setModifica(null)}
        tesserati={tesserati}
        onSalvato={(t) => setLista((l) => (l ? (l.some((x) => x.id === t.id) ? l.map((x) => (x.id === t.id ? t : x)) : [...l, t]) : l))}
      />
      <EliminaModal t={elimina} onClose={() => setElimina(null)} onEliminato={(id) => setLista((l) => (l ? l.filter((x) => x.id !== id) : l))} />
      <PdfModal open={pdf} onClose={() => setPdf(false)} righe={visibili} />
    </div>
  );
}

/* ───────── Nuovo / modifica tesserato ───────── */
type Bozza = { nome: string; cognome: string; email: string; numero_di_telefono: string };

function ModificaModal({
  valore,
  onClose,
  tesserati,
  onSalvato,
}: {
  valore: TesseratoCine | "nuovo" | null;
  onClose: () => void;
  tesserati: TesseratoCine[];
  onSalvato: (t: TesseratoCine) => void;
}) {
  const [ultimo, setUltimo] = useState(valore);
  const [f, setF] = useState<Bozza>({ nome: "", cognome: "", email: "", numero_di_telefono: "" });
  const [err, setErr] = useState<Partial<Record<keyof Bozza, string>>>({});
  const [busy, setBusy] = useState(false);
  // a ogni apertura il modulo riparte dai dati della riga scelta (o vuoto)
  if (valore && valore !== ultimo) {
    setUltimo(valore);
    setF(valore === "nuovo" ? { nome: "", cognome: "", email: "", numero_di_telefono: "" } : { nome: valore.nome, cognome: valore.cognome, email: valore.email ?? "", numero_di_telefono: valore.numero_di_telefono ?? "" });
    setErr({});
  }
  const cur = valore ?? ultimo;
  const nuovo = cur === "nuovo";
  const set = (k: keyof Bozza, v: string) => setF((x) => ({ ...x, [k]: v }));

  const salva = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: typeof err = {};
    if (!f.nome.trim()) er.nome = "Il nome è obbligatorio.";
    if (!f.cognome.trim()) er.cognome = "Il cognome è obbligatorio.";
    const email = f.email.trim();
    if (email && !/\S+@\S+\.\S+/.test(email)) er.email = "Email non valida.";
    else if (email && tesserati.some((t) => t.email?.toLowerCase() === email.toLowerCase() && (nuovo || t.id !== (cur as TesseratoCine).id))) er.email = "Email già registrata.";
    setErr(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    const dati = { nome: f.nome.trim(), cognome: f.cognome.trim(), email: email || undefined, numero_di_telefono: f.numero_di_telefono.trim() || undefined };
    try {
      const t = await salvaTesserato(nuovo ? dati : { ...dati, id: (cur as TesseratoCine).id });
      onSalvato(t);
      onClose();
      toast(`${t.nome} ${t.cognome}: tesserato ${nuovo ? "creato" : "aggiornato"} con successo.`, "ok", nuovo ? "Tesserato creato" : "Tesserato aggiornato");
    } catch (error) {
      if (error instanceof ApiError && error.field && error.field in f) setErr({ [error.field]: error.message });
      else toast(messaggio(error), "errore");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={!!valore} onClose={onClose} title={nuovo ? "Nuovo tesserato" : "Modifica tesserato"} width={600}>
      <form className="tes-form" onSubmit={salva} noValidate>
        <div className="tes-form__grid">
          <TextField label="Nome" value={f.nome} onChange={(e) => set("nome", e.target.value)} error={err.nome} autoComplete="off" required />
          <TextField label="Cognome" value={f.cognome} onChange={(e) => set("cognome", e.target.value)} error={err.cognome} autoComplete="off" required />
          <TextField label="Email" type="email" optional value={f.email} onChange={(e) => set("email", e.target.value)} error={err.email} autoComplete="off" />
          <TextField label="Telefono" type="tel" optional value={f.numero_di_telefono} onChange={(e) => set("numero_di_telefono", e.target.value)} autoComplete="off" />
        </div>
        <div className="tes-form__act">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annulla
          </Button>
          <Button type="submit" loading={busy}>
            Salva
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ───────── Elimina ───────── */
function EliminaModal({ t, onClose, onEliminato }: { t: TesseratoCine | null; onClose: () => void; onEliminato: (id: number) => void }) {
  const [ultimo, setUltimo] = useState(t);
  const [busy, setBusy] = useState(false);
  if (t && t !== ultimo) setUltimo(t);
  const cur = t ?? ultimo;
  const conferma = async () => {
    if (!cur) return;
    setBusy(true);
    try {
      await eliminaTesserato(cur.id);
      onEliminato(cur.id);
      onClose();
      toast(`${cur.nome} ${cur.cognome} non è più tra i tesserati.`, "ok", "Tesserato eliminato");
    } catch (error) {
      // già eliminato da qualcun altro: si toglie comunque dall'elenco
      if (error instanceof ApiError && error.status === 404) onEliminato(cur.id);
      toast(messaggio(error), "errore");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={!!t} onClose={onClose} title="Elimina tesserato" width={480}>
      <p className="tes-form__lead">
        Sei sicuro di voler eliminare il tesserato <strong>{cur ? `${cur.nome} ${cur.cognome}` : ""}</strong>? L'operazione non si può annullare.
      </p>
      <div className="tes-form__act">
        <Button variant="ghost" onClick={onClose}>
          Annulla
        </Button>
        <Button icon="trash" className="tes-del-btn" loading={busy} onClick={conferma}>
          Elimina
        </Button>
      </div>
    </Modal>
  );
}

/* ───────── Scarica lista (PDF) ───────── */
function PdfModal({ open, onClose, righe }: { open: boolean; onClose: () => void; righe: TesseratoCine[] }) {
  const [sel, setSel] = useState<Colonna[]>(COLONNE.map((c) => c.id));
  const [busy, setBusy] = useState(false);
  const cols = COLONNE.filter((c) => sel.includes(c.id));
  const toggle = (id: Colonna) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const scarica = async () => {
    setBusy(true);
    try {
      const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(12, 73, 91);
      doc.text("Lista tesserati", 14, 17);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(85, 101, 108);
      doc.text(`Associazione FORO ETS  ·  ${righe.length} tesserati  ·  ${fmtNumeric(todayIso())}`.replace(/·/g, "-"), 14, 23);
      autoTable(doc, {
        head: [cols.map((c) => c.label)],
        body: righe.map((t) => cols.map((c) => c.val(t))),
        startY: 28,
        styles: { fontSize: 9, textColor: [15, 31, 37], lineColor: [221, 213, 199], lineWidth: 0.1 },
        headStyles: { fillColor: [12, 73, 91], textColor: [251, 231, 204] },
        alternateRowStyles: { fillColor: [246, 240, 230] },
      });
      doc.save("lista_tesserati.pdf");
      onClose();
      toast(`Lista di ${righe.length} tesserati pronta: la trovi tra i file scaricati.`, "ok", "PDF scaricato");
    } catch {
      toast("Non siamo riusciti a creare il PDF. Riprova tra un attimo.", "errore");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Scarica lista tesserati" width={460}>
      <p className="tes-form__lead">Seleziona i dati da includere nel file PDF:</p>
      <div className="tes-pdf__cols">
        {COLONNE.map((c) => (
          <Checkbox key={c.id} label={c.label} checked={sel.includes(c.id)} onChange={() => toggle(c.id)} />
        ))}
      </div>
      <div className="tes-form__act">
        <Button variant="ghost" onClick={onClose}>
          Annulla
        </Button>
        <Button icon="download" onClick={() => void scarica()} loading={busy} disabled={cols.length === 0}>
          Scarica PDF
        </Button>
      </div>
    </Modal>
  );
}
