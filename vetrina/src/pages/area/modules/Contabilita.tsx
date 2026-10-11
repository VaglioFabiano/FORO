/**
 * Contabilità e bilancio: come nel gestionale attuale si mostra solo il documento di riepilogo
 * finanziario, nell'anteprima di Google, con il pulsante per aprirlo in Fogli Google.
 */
import { Icon } from "@/components/ui";
import { AreaHead, Panel } from "../ui";
import "./contabilita.css";

const SHEET_ID = "1XbRRUG91LW3e_U___IPn090DNRAbGNTs";
const EMBED_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/preview`;
const EXTERNAL_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?usp=sharing`;

export default function Contabilita() {
  return (
    <div className="ct">
      <AreaHead
        eyebrow="Associazione"
        title="Contabilità e bilancio"
        descr="Il documento di riepilogo finanziario dell'associazione, direttamente da Google."
        actions={
          <a className="btn btn--outline" href={EXTERNAL_URL} target="_blank" rel="noreferrer">
            <Icon name="external" size={18} />
            Apri in Fogli Google
          </a>
        }
      />
      <Panel pad={false} className="ct-doc">
        <iframe className="ct-frame" src={EMBED_URL} title="Documento di riepilogo finanziario" allow="autoplay" />
      </Panel>
    </div>
  );
}
