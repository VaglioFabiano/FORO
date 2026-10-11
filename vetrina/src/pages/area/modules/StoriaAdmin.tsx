/**
 * La storia: le tappe della linea del tempo di "Chi siamo" (livello ≤ 2).
 * Modifica, aggiungi, elimina e riordina: ogni volta si salva l'elenco completo (api/homepage.js?action=storia).
 */
import { useState } from "react";
import { Alert, Button, Icon, Modal, TextArea, TextField, cx } from "@/components/ui";
import { toast } from "@/components/ui/Toast";
import type { TappaStoria } from "@/data/types";
import { nuovaTappa, salvaStoria, useStoria } from "@/lib/storia";
import { AreaHead, Empty, Panel } from "../ui";
import "./storia-admin.css";

/** salva l'elenco completo; in caso di errore lo dice e restituisce false */
async function salva(tappe: TappaStoria[]) {
  try {
    await salvaStoria(tappe);
    return true;
  } catch (x) {
    toast(x instanceof Error && x.message ? x.message : "Non siamo riusciti a salvare. Riprova tra poco.", "errore");
    return false;
  }
}

export default function StoriaAdmin() {
  const tappe = useStoria();
  const [form, setForm] = useState<{ tappa: TappaStoria; nuova: boolean } | null>(null);
  const [elimina, setElimina] = useState<TappaStoria | null>(null);
  const [busy, setBusy] = useState(false);

  const sposta = async (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= tappe.length) return;
    const n = [...tappe];
    [n[i], n[j]] = [n[j], n[i]];
    setBusy(true);
    await salva(n);
    setBusy(false);
  };
  const conferma = async () => {
    if (!elimina) return;
    setBusy(true);
    const ok = await salva(tappe.filter((x) => x.id !== elimina.id));
    setBusy(false);
    if (!ok) return;
    toast("Tappa eliminata.", "ok", elimina.titolo);
    setElimina(null);
  };

  return (
    <div className="sto">
      <AreaHead
        eyebrow="Gestione"
        title="La storia"
        descr="Le tappe che compaiono nella linea del tempo di Chi siamo. Cambiale, aggiungine di nuove e mettile nell'ordine in cui vuoi raccontarle."
        actions={
          <Button icon="plus" onClick={() => setForm({ tappa: nuovaTappa(), nuova: true })}>
            Aggiungi una tappa
          </Button>
        }
      />

      <div className="sto-grid">
        <Panel title={`Le tappe · ${tappe.length}`} pad={false}>
          {tappe.length === 0 ? (
            <Empty icon="clock" title="Non ci sono tappe">
              Aggiungi la prima: un anno, un titolo e due righe che raccontano cosa è successo.
            </Empty>
          ) : (
            <ol className="sto-list">
              {tappe.map((t, i) => (
                <li key={t.id} className="sto-row">
                  <span className="disc sto-row__n t-mono">{i + 1}</span>
                  <div className="sto-row__text">
                    <span className="t-label sto-row__anno">{t.anno || "Senza anno"}</span>
                    <strong>{t.titolo || "Senza titolo"}</strong>
                    <span className="sto-row__testo">{t.testo}</span>
                  </div>
                  <div className="sto-row__tools">
                    <Button size="sm" variant="ghost" icon="arrow-down" aria-label="Sposta su" disabled={busy || i === 0} onClick={() => void sposta(i, -1)} className="sto-up" />
                    <Button size="sm" variant="ghost" icon="arrow-down" aria-label="Sposta giù" disabled={busy || i === tappe.length - 1} onClick={() => void sposta(i, 1)} />
                    <Button size="sm" variant="ghost" icon="edit" onClick={() => setForm({ tappa: t, nuova: false })}>
                      Modifica
                    </Button>
                    <Button size="sm" variant="ghost" icon="trash" className="sto-del" onClick={() => setElimina(t)}>
                      Elimina
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <aside className="sto-prev" aria-label="Anteprima della linea del tempo">
          <span className="t-label t-muted">Anteprima</span>
          <ol className="sto-snake">
            {tappe.map((t, i) => (
              <li key={t.id} className={cx("sto-snake__item", i % 2 === 1 && "is-right")}>
                <span className="sto-snake__dot" aria-hidden />
                <span className="t-mono sto-snake__anno">{t.anno}</span>
                <strong>{t.titolo}</strong>
              </li>
            ))}
          </ol>
        </aside>
      </div>

      <FormTappa key={form?.tappa.id ?? "x"} aperto={!!form} tappa={form?.tappa ?? null} nuova={!!form?.nuova} tappe={tappe} onClose={() => setForm(null)} />

      <Modal open={!!elimina} onClose={busy ? () => {} : () => setElimina(null)} title="Eliminare la tappa?" width={480}>
        {elimina && (
          <div className="sto-conf">
            <p>
              Stai per togliere <strong>{elimina.titolo || "questa tappa"}</strong> dalla linea del tempo. Sul sito sparisce subito.
            </p>
            <div className="sto-foot">
              <Button variant="ghost" onClick={() => setElimina(null)} disabled={busy}>
                Annulla
              </Button>
              <Button icon="trash" className="sto-del-btn" loading={busy} onClick={() => void conferma()}>
                Elimina la tappa
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function FormTappa({
  aperto,
  tappa,
  nuova,
  tappe,
  onClose,
}: {
  aperto: boolean;
  tappa: TappaStoria | null;
  nuova: boolean;
  tappe: TappaStoria[];
  onClose: () => void;
}) {
  const [v, setV] = useState({
    anno: tappa?.anno ?? "",
    titolo: tappa?.titolo ?? "",
    testo: tappa?.testo ?? "",
    approfondimento: tappa?.approfondimento ?? "",
  });
  const [err, setErr] = useState<Record<string, string>>({});
  const [salvo, setSalvo] = useState(false);
  const set = (k: keyof typeof v, val: string) => {
    setV((p) => ({ ...p, [k]: val }));
    if (err[k]) setErr((x) => ({ ...x, [k]: "" }));
  };
  const conferma = async () => {
    const e: Record<string, string> = {};
    if (!v.anno.trim()) e.anno = "Scrivi l'anno o il periodo, per esempio 2025 o Estate 2025.";
    if (!v.titolo.trim()) e.titolo = "Dai un titolo breve alla tappa.";
    if (!v.testo.trim()) e.testo = "Racconta la tappa in una o due frasi.";
    setErr(e);
    if (Object.keys(e).length || !tappa) return;
    const nuovo: TappaStoria = {
      ...tappa,
      anno: v.anno.trim(),
      titolo: v.titolo.trim(),
      testo: v.testo.trim(),
      approfondimento: v.approfondimento.trim() || undefined,
    };
    setSalvo(true);
    const ok = await salva(nuova ? [...tappe, nuovo] : tappe.map((x) => (x.id === tappa.id ? nuovo : x)));
    setSalvo(false);
    if (!ok) return;
    toast(nuova ? "Tappa aggiunta in fondo alla linea del tempo." : "Modifiche salvate.", "ok", nuovo.titolo);
    onClose();
  };
  return (
    <Modal open={aperto} onClose={salvo ? () => {} : onClose} title={nuova ? "Nuova tappa" : "Modifica la tappa"} width={640}>
      <div className="sto-form">
        <div className="sto-form__2">
          <TextField label="Anno o periodo" value={v.anno} error={err.anno} onChange={(e) => set("anno", e.target.value)} placeholder="Es. 2025" />
          <TextField label="Titolo" value={v.titolo} error={err.titolo} onChange={(e) => set("titolo", e.target.value)} placeholder="Es. Nasce il CineFORO" />
        </div>
        <TextArea label="Testo" rows={3} value={v.testo} error={err.testo} onChange={(e) => set("testo", e.target.value)} hint="Una o due frasi: è quello che si legge sulla linea del tempo." />
        <TextArea label="Approfondimento" optional rows={5} value={v.approfondimento} onChange={(e) => set("approfondimento", e.target.value)} hint="Compare quando chi legge sceglie Approfondisci." />
        {nuova && (
          <Alert tone="info">
            <Icon name="info" size={16} /> La nuova tappa va in fondo: puoi spostarla dall'elenco.
          </Alert>
        )}
      </div>
      <div className="sto-foot">
        <Button variant="ghost" onClick={onClose} disabled={salvo}>
          Annulla
        </Button>
        <Button icon="check" loading={salvo} onClick={() => void conferma()}>
          {nuova ? "Aggiungi la tappa" : "Salva le modifiche"}
        </Button>
      </div>
    </Modal>
  );
}
