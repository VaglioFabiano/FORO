/**
 * 04 · Chi siamo — la storia come linea del tempo a serpentina e (id="volontariato")
 * la chiamata ai volontari. Le tappe arrivano da lib/storia, le frasi da data/testi/chisiamo.ts:
 * tutto è modificabile dalla dashboard.
 */
import { SectionHead } from "@/components/ui";
import { TESTI_CHISIAMO } from "@/data/testi/chisiamo";
import { useTesti } from "@/lib/contenuti";
import { Righe } from "./ChiSiamoRighe";
import { Storia } from "./ChiSiamoStoria";
import { Volontariato } from "./ChiSiamoVolontariato";
import "./chisiamo.css";

export default function ChiSiamo() {
  const t = useTesti(TESTI_CHISIAMO);
  return (
    <section id="chi-siamo" className="cs">
      <div className="cs-block cs-block--storia">
        <div className="container">
          <SectionHead index="04" eyebrow={t.ed("eyebrow")} title={t.ed("titolo", (s) => <Righe s={s} />)} intro={t.ed("intro")} />
          <Storia />
        </div>
      </div>
      <Volontariato />
    </section>
  );
}
