import { Link } from "react-router-dom";
import { PageHero } from "@/components/domain/PageHero";

export default function NotFound() {
  return (
    <PageHero
      index="404"
      eyebrow="Pagina non trovata"
      title={["Qui non c'è", "nessuno."]}
      intro={
        <>
          La pagina che cerchi non esiste o è stata spostata. Torna alla <Link className="link link--always" to="/">home</Link> o guarda gli{" "}
          <Link className="link link--always" to="/#orari">orari dell'aula</Link>.
        </>
      }
    />
  );
}
