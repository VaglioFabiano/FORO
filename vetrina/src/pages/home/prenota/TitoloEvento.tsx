/**
 * Titolo di un evento su due livelli: "CineFORO · 15 ottobre" diventa
 * "CineFORO" + "15 ottobre" su righe proprie, così il punto mediano non resta mai
 * appeso a fine o inizio riga. Per i titoli senza " · " rende il testo così com'è.
 */
import type { ReactNode } from "react";
import "./titolo.css";

export function TitoloEvento({ titolo, after }: { titolo: string; after?: ReactNode }) {
  const i = titolo.indexOf(" · ");
  if (i < 0)
    return (
      <>
        {titolo}
        {after}
      </>
    );
  return (
    <>
      <span className="te-a">{titolo.slice(0, i)}</span>
      <span className="te-sep">{" · "}</span>
      <span className="te-b">
        {titolo.slice(i + 3)}
        {after}
      </span>
    </>
  );
}
