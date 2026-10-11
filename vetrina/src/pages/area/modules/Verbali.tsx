/**
 * Archivio verbali: i file restano nella cartella Google Drive dell'associazione, come nel gestionale attuale.
 * Qui si naviga tra le cartelle (Drive API con chiave pubblica) e si aprono i documenti nell'anteprima di Google.
 * Direttivo e organizzatori (livello ≤ 2) creano un nuovo verbale dal modello, tramite lo script Google già in uso:
 * la chiamata passa dal server (api/documenti.js), così il segreto dello script non arriva nel browser.
 */
import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Icon, Modal, cx } from "@/components/ui";
import { toast } from "@/components/ui/Toast";
import { chiama } from "@/lib/server";
import { AreaHead, Empty, Panel, puo, useLivello } from "../ui";
import { RigheCaricamento } from "../utenti-ui";
import "./verbali.css";

const API_KEY = import.meta.env.VITE_GOOGLE_CLOUD as string | undefined;
const ROOT_LINK = (import.meta.env.VITE_GOOGLE_DRIVE_VERBALI as string | undefined) ?? "";
const ROOT_ID = ROOT_LINK.match(/\/folders\/([a-zA-Z0-9_-]+)/)?.[1] ?? null;

const CARTELLA = "application/vnd.google-apps.folder";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
}
type Passo = { id: string; nome: string };

const TIPO_FILE: Record<string, string> = {
  [CARTELLA]: "Cartella",
  "application/vnd.google-apps.document": "Documento Google",
  "application/vnd.google-apps.spreadsheet": "Foglio Google",
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Documento Word",
  "application/msword": "Documento Word",
};

const MODELLI: { type: "direttivo" | "assemblea"; subtype?: "ordinaria" | "straordinaria"; nome: string; descr: string }[] = [
  { type: "direttivo", nome: "Direttivo", descr: "Verbale standard del consiglio direttivo" },
  { type: "assemblea", subtype: "ordinaria", nome: "Assemblea ordinaria", descr: "Assemblea delle persone socie, ordinaria" },
  { type: "assemblea", subtype: "straordinaria", nome: "Assemblea straordinaria", descr: "Assemblea delle persone socie, straordinaria" },
];

export default function Verbali() {
  const livello = useLivello();
  const puoCreare = puo(livello, 2);
  const [percorso, setPercorso] = useState<Passo[]>(ROOT_ID ? [{ id: ROOT_ID, nome: "Verbali" }] : []);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [anteprima, setAnteprima] = useState<DriveFile | null>(null);
  const [scegli, setScegli] = useState(false);
  const [creo, setCreo] = useState(false);
  const [creato, setCreato] = useState<string | null>(null);

  const corrente = percorso[percorso.length - 1];

  const carica = useCallback(async () => {
    if (!corrente || !API_KEY) return;
    setLoading(true);
    setErrore(null);
    try {
      const q = `'${corrente.id}' in parents and trashed=false`;
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&key=${API_KEY}&fields=files(id,name,mimeType,webViewLink)&orderBy=folder,name`;
      const data = await (await fetch(url)).json();
      if (data.error) throw new Error(data.error.message);
      setFiles(data.files || []);
    } catch (err) {
      console.error("Errore Drive:", err);
      setErrore("Impossibile caricare i file.");
    } finally {
      setLoading(false);
    }
  }, [corrente]);

  useEffect(() => {
    void carica();
  }, [carica]);

  if (!API_KEY || !ROOT_ID) {
    return (
      <>
        <AreaHead eyebrow="Associazione" title="Archivio verbali" />
        <Panel>
          <Empty icon="alert" title="Configurazione mancante">
            Controlla VITE_GOOGLE_CLOUD e VITE_GOOGLE_DRIVE_VERBALI.
          </Empty>
        </Panel>
      </>
    );
  }

  const apri = (f: DriveFile) => {
    if (f.mimeType === CARTELLA) setPercorso((p) => [...p, { id: f.id, nome: f.name }]);
    else setAnteprima(f);
  };

  const crea = async (m: (typeof MODELLI)[number]) => {
    setScegli(false);
    setCreo(true);
    setCreato(null);
    try {
      const { url } = await chiama<{ url: string }>("documenti", {
        method: "POST",
        query: { action: "verbale" },
        body: { type: m.type, subtype: m.subtype || "ordinaria", folderId: corrente.id },
      });
      // se il browser blocca la nuova scheda, il link resta in pagina
      if (!window.open(url, "_blank")) setCreato(url);
      toast(`${m.nome}: il documento è pronto in Google Docs.`, "ok", "Verbale creato");
      setTimeout(() => void carica(), 2500);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Non siamo riusciti a creare il verbale. Riprova tra un attimo.", "errore");
    } finally {
      setCreo(false);
    }
  };

  return (
    <div className="vb">
      <AreaHead
        eyebrow="Associazione"
        title="Archivio verbali"
        descr="I verbali delle assemblee e del direttivo, dalla cartella Google Drive dell'associazione. Si aprono nell'anteprima di Google."
        actions={
          <>
            <a className="btn btn--outline" href={`https://drive.google.com/drive/folders/${corrente.id}`} target="_blank" rel="noreferrer">
              <Icon name="external" size={18} />
              Apri in Drive
            </a>
            {puoCreare && (
              <Button icon="plus" loading={creo} onClick={() => setScegli(true)}>
                {creo ? "Creo il documento…" : "Nuovo verbale"}
              </Button>
            )}
          </>
        }
      />

      {creato && (
        <Alert tone="ok" className="vb-creato">
          Il nuovo verbale è pronto.{" "}
          <a href={creato} target="_blank" rel="noreferrer">
            Apri il documento
          </a>
        </Alert>
      )}

      <Panel pad={false}>
        <div className="vb-nav">
          <button type="button" className="vb-back" onClick={() => setPercorso((p) => p.slice(0, -1))} disabled={percorso.length < 2} aria-label="Cartella precedente">
            <Icon name="chevron-left" size={20} />
          </button>
          <nav className="vb-crumbs" aria-label="Percorso">
            {percorso.map((p, i) => {
              const ultimo = i === percorso.length - 1;
              return (
                <span key={p.id} className="vb-crumb">
                  {i > 0 && <Icon name="chevron-right" size={14} className="vb-crumb__sep" />}
                  {ultimo ? (
                    <span aria-current="page">{p.nome}</span>
                  ) : (
                    <button type="button" onClick={() => setPercorso((x) => x.slice(0, i + 1))}>
                      {p.nome}
                    </button>
                  )}
                </span>
              );
            })}
          </nav>
          <button type="button" className="vb-back" onClick={() => void carica()} aria-label="Ricarica" title="Ricarica">
            <Icon name="refresh" size={18} />
          </button>
        </div>

        {loading ? (
          <RigheCaricamento n={5} h={46} />
        ) : errore ? (
          <Empty icon="alert" title={errore}>
            <button type="button" className="link" onClick={() => void carica()}>
              Riprova
            </button>
          </Empty>
        ) : files.length === 0 ? (
          <Empty icon="folder" title="Nessun documento" />
        ) : (
          <ul className="vb-list">
            {files.map((f) => {
              const cartella = f.mimeType === CARTELLA;
              return (
                <li key={f.id}>
                  <button type="button" className={cx("vb-item", cartella && "is-folder")} onClick={() => apri(f)}>
                    <span className="vb-item__icon">
                      <Icon name={cartella ? "folder" : "document"} size={22} />
                    </span>
                    <span className="vb-item__main">
                      <span className="vb-item__name">{f.name}</span>
                      <span className="vb-item__type">{TIPO_FILE[f.mimeType] ?? "File"}</span>
                    </span>
                    <Icon name={cartella ? "chevron-right" : "eye"} size={18} className="vb-item__go" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {!puoCreare && <p className="vb-nota t-muted">Modalità sola lettura: i nuovi verbali li creano il direttivo e gli organizzatori.</p>}

      <Modal open={scegli} onClose={() => setScegli(false)} title="Nuovo verbale" width={520}>
        <p className="vb-lead">
          Il documento nasce dal modello nella cartella <strong>{corrente.nome}</strong> e si apre in Google Docs.
        </p>
        <div className="vb-models">
          {MODELLI.map((m) => (
            <button key={m.nome} type="button" className="vb-model" onClick={() => void crea(m)}>
              <Icon name="document" size={24} />
              <span>
                <strong>{m.nome}</strong>
                <small>{m.descr}</small>
              </span>
              <Icon name="arrow-right" size={18} className="vb-model__go" />
            </button>
          ))}
        </div>
      </Modal>

      <Modal open={!!anteprima} onClose={() => setAnteprima(null)} title={anteprima?.name} width={1100}>
        {anteprima && (
          <div className="vb-preview">
            <div className="vb-preview__bar">
              <a className="btn btn--outline btn--sm" href={anteprima.webViewLink} target="_blank" rel="noreferrer">
                <Icon name="external" size={16} />
                Apri su Drive
              </a>
            </div>
            <iframe className="vb-preview__frame" src={`https://drive.google.com/file/d/${anteprima.id}/preview`} title={`Anteprima di ${anteprima.name}`} allow="autoplay" />
          </div>
        )}
      </Modal>
    </div>
  );
}
