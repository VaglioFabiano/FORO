/**
 * 05 · Seguici sui social.
 * Contenuti VERI: il profilo Instagram (embed ufficiale del profilo, sempre aggiornato)
 * e gli ultimi messaggi del canale Telegram (widget ufficiale). Si caricano solo con il consenso ai cookie.
 */
import { useEffect, useRef, useState } from "react";
import { Icon, Reveal, SectionHead } from "@/components/ui";
import { LogoSymbol } from "@/brand/Logo";
import { TESTI_SOCIAL } from "@/data/testi/social";
import { useTesti } from "@/lib/contenuti";
import { ultimiTelegram } from "@/lib/api";
import "./social.css";
import { useLink } from "@/lib/link";
import { ConsensoEsterno } from "@/components/domain/ConsensoEsterno";

const ext = { target: "_blank", rel: "noopener noreferrer" } as const;
const TG_QUANTI = 3;
const TG_AGGIORNA_MS = 5 * 60_000;

function InstagramProfilo() {
  const t = useTesti(TESTI_SOCIAL);
  const { instagram, igUser, igHandle } = useLink();
  return (
    <article className="so-card so-ig">
      <header className="so-ig__head surface-petrolio">
        <div className="so-ig__id">
          <span className="so-ig__avatar">
            <LogoSymbol color="var(--foro-petrolio)" size={30} title="" />
          </span>
          <div className="so-ig__who">
            <span className="t-label so-ig__k">
              <Icon name="instagram" size={16} /> {t.ed("ig.etichetta")}
            </span>
            <strong>{igHandle}</strong>
          </div>
        </div>
        <h3 className="so-ig__titolo">{t.ed("ig.titolo")}</h3>
        <p className="so-ig__testo">{t.ed("ig.testo")}</p>
        <a className="btn btn--carta so-ig__cta" href={instagram} {...ext}>
          {t.ed("ig.cta")} <Icon name="arrow-up-right" size={16} />
        </a>
      </header>
      <div className="so-ig__embed">
        <ConsensoEsterno servizio="Instagram" cosa="gli ultimi post" icona="instagram" href={instagram}>
          <iframe
            title={`Gli ultimi post di ${igHandle} su Instagram`}
            src={`https://www.instagram.com/${igUser}/embed/`}
            loading="lazy"
            scrolling="no"
          />
        </ConsensoEsterno>
      </div>
    </article>
  );
}

/** widget ufficiale di Telegram per un messaggio del canale */
function TelegramPost({ canale, id }: { canale: string; id: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    box.replaceChildren();
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://telegram.org/js/telegram-widget.js?22";
    s.setAttribute("data-telegram-post", `${canale}/${id}`);
    s.setAttribute("data-width", "100%");
    s.setAttribute("data-userpic", "false");
    s.setAttribute("data-color", "0C495B");
    box.appendChild(s);
    return () => {
      box.replaceChildren();
    };
  }, [canale, id]);
  return <div ref={ref} className="so-tg__post" />;
}

/**
 * Ultimi messaggi del canale, ricontrollati ogni 5 minuti mentre la pagina è aperta.
 * null finché non arriva la prima risposta; se il canale non risponde, i numeri di riserva del CMS.
 */
function useUltimiMessaggi(canale: string, riserva: string[]) {
  const [ids, setIds] = useState<string[] | null>(null);
  useEffect(() => {
    let vivo = true;
    const leggi = () =>
      ultimiTelegram(TG_QUANTI, canale)
        .then((p) => vivo && setIds(p.map(String)))
        .catch(() => vivo && setIds((x) => x ?? []));
    leggi();
    const timer = setInterval(() => document.visibilityState === "visible" && leggi(), TG_AGGIORNA_MS);
    return () => {
      vivo = false;
      clearInterval(timer);
    };
  }, [canale]);
  return ids === null ? [] : ids.length ? ids : riserva;
}

function TelegramCanale() {
  const t = useTesti(TESTI_SOCIAL);
  const { telegram, tgCanale, tgHandle } = useLink();
  const riserva = t("tg.post")
    .split(/[,\s]+/)
    .map((x) => x.trim())
    .filter((x) => /^\d+$/.test(x))
    .slice(0, TG_QUANTI);
  const ids = useUltimiMessaggi(tgCanale, riserva);
  return (
    <article className="so-card so-tg surface-petrolio">
      <header className="so-tg__head">
        <span className="t-label so-tg__k">
          <Icon name="telegram" size={16} /> {t.ed("tg.etichetta")} · {tgHandle}
        </span>
        <h3 className="so-tg__titolo">{t.ed("tg.titolo")}</h3>
        <p className="so-tg__testo">{t.ed("tg.testo")}</p>
      </header>
      <ConsensoEsterno servizio="Telegram" cosa="gli ultimi messaggi" icona="telegram" href={telegram} scuro className="so-tg__esterno">
        <div className="so-tg__feed" data-lenis-prevent>
          {ids.map((id) => (
            <TelegramPost key={`${tgCanale}/${id}`} canale={tgCanale} id={id} />
          ))}
        </div>
      </ConsensoEsterno>
      <a className="btn btn--carta so-tg__cta" href={telegram} {...ext}>
        {t.ed("tg.cta")} <Icon name="arrow-up-right" size={16} />
      </a>
    </article>
  );
}

function FacebookPagina() {
  const t = useTesti(TESTI_SOCIAL);
  const { facebook, facebookNome } = useLink();
  return (
    <a className="so-card so-fb" href={facebook} {...ext}>
      <span className="so-fb__icona disc" aria-hidden>
        <Icon name="facebook" size={22} />
      </span>
      <span className="so-fb__corpo">
        <span className="t-label so-fb__k">{t.ed("fb.etichetta")}</span>
        <strong>{facebookNome}</strong>
        <span className="so-fb__testo">{t.ed("fb.testo")}</span>
      </span>
      <span className="so-fb__cta">
        {t.ed("fb.cta")} <Icon name="arrow-up-right" size={16} />
      </span>
    </a>
  );
}

export default function Social() {
  const t = useTesti(TESTI_SOCIAL);
  return (
    <section id="social" className="section so-section" aria-labelledby="social-title">
      <div className="container">
        <SectionHead index="05" eyebrow={t.ed("eyebrow")} title={<span id="social-title">{t.ed("titolo")}</span>} intro={t.ed("intro")} />
        <div className="so-grid">
          <Reveal className="so-grid__ig">
            <InstagramProfilo />
          </Reveal>
          <div className="so-grid__side">
            <Reveal delay={0.08}>
              <TelegramCanale />
            </Reveal>
            <Reveal delay={0.14}>
              <FacebookPagina />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
