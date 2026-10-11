/**
 * Testi del sito: come nel sito in produzione si modificano direttamente sulla homepage
 * (pulsante «Modifica» di ogni sezione). Questa voce del menu porta lì.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/Toast";

let avvisatoIl = 0;

export default function TestiSito() {
  const navigate = useNavigate();
  useEffect(() => {
    // in sviluppo React esegue l'effetto due volte: un solo avviso
    if (Date.now() - avvisatoIl > 1500) {
      avvisatoIl = Date.now();
      toast("Premi «Modifica» su una sezione e clicca le scritte per cambiarle.", "info", "Testi del sito");
    }
    navigate("/", { replace: true });
  }, [navigate]);
  return null;
}
