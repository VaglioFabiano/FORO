/**
 * Home — sito a pagina unica. Ordine: Orari · L'aula · Eventi · La storia · Social · Statuto · Segnalazioni · Dove siamo. Ogni sezione ha un id usato dal menu (vedi NAV in data/org.ts).
 * /eventi/:slug mostra la home con il drawer di prenotazione aperto (link condivisibili).
 */
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Hero from "./sections/Hero";
import Orari from "./sections/Orari";
import Eventi from "./sections/Eventi";
import Aula from "./sections/Aula";
import ChiSiamo from "./sections/ChiSiamo";
import Social from "./sections/Social";
import Statuto from "./sections/Statuto";
import Segnalazioni from "./sections/Segnalazioni";
import Contatti from "./sections/Contatti";
import PrenotaDrawer from "./prenota/PrenotaDrawer";
import { BarraModifica, Modificabile } from "@/components/cms/Modificabile";
import "./home.css";

/** ogni sezione ha il suo pulsante "Modifica" (visibile solo a chi può modificare il sito) */
export default function HomePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  // tornando dall'area volontari la scheda riprende il titolo del sito
  useEffect(() => {
    document.title = "FORO · Aula studio di Piossasco · Associazione culturale";
  }, []);
  return (
    <>
      <Modificabile sezione="top">
        <Hero />
      </Modificabile>
      <Modificabile sezione="orari">
        <Orari />
      </Modificabile>
      <Modificabile sezione="aula">
        <Aula />
      </Modificabile>
      <Modificabile sezione="eventi">
        <Eventi />
      </Modificabile>
      <Modificabile sezione="chi-siamo">
        <ChiSiamo />
      </Modificabile>
      <Modificabile sezione="social">
        <Social />
      </Modificabile>
      <Modificabile sezione="statuto">
        <Statuto />
      </Modificabile>
      <Modificabile sezione="segnalazioni">
        <Segnalazioni />
      </Modificabile>
      <Modificabile sezione="contatti">
        <Contatti />
      </Modificabile>
      <BarraModifica />
      {slug && <PrenotaDrawer slug={slug} onClose={() => navigate("/", { preventScrollReset: true })} />}
    </>
  );
}
