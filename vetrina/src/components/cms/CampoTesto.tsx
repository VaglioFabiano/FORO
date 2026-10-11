import { TextArea, TextField } from "@/components/ui";
import type { VoceTesto } from "@/lib/contenuti";
import { erroreCampo } from "./bozza";

/** un testo o un link modificabile, con l'originale sempre a portata di mano */
export function CampoTesto({ voce, valore, onChange }: { voce: VoceTesto; valore: string; onChange: (v: string) => void }) {
  const mod = valore !== voce.default;
  const props = {
    label: voce.label,
    value: valore,
    hint: voce.hint,
    error: erroreCampo(voce, valore),
    onChange: (e: { target: { value: string } }) => onChange(e.target.value),
  };
  return (
    <div className="cms-campo">
      {mod && (
        <div className="cms-campo__top">
          <span className="tag cms-tag">Modificato</span>
          <button type="button" className="cms-reset" onClick={() => onChange(voce.default)}>
            Ripristina l'originale
          </button>
        </div>
      )}
      {voce.multiline || voce.default.includes("\n") ? (
        <TextArea {...props} rows={Math.min(8, Math.max(3, valore.split("\n").length + 1))} />
      ) : (
        <TextField
          {...props}
          type={voce.tipo === "url" ? "url" : voce.tipo === "email" ? "email" : "text"}
          inputMode={voce.tipo === "url" ? "url" : voce.tipo === "email" ? "email" : undefined}
          spellCheck={voce.tipo === "url" || voce.tipo === "email" ? false : undefined}
          className={voce.tipo && voce.tipo !== "testo" ? "cms-campo--mono" : undefined}
        />
      )}
    </div>
  );
}
