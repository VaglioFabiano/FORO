/**
 * Link correnti del sito (social, documenti, email), modificabili dalla homepage.
 * Da ogni link si ricavano i valori che servono alle sezioni: il nome del profilo Instagram,
 * il canale Telegram, il file dello statuto da scaricare, il documento del regolamento da leggere.
 */
import { TESTI_LINK } from "@/data/testi/link";
import { testoCorrente, useTesti } from "./contenuti";

const DEF = (k: string) => TESTI_LINK.voci.find((v) => v.key === k)!.default;
const primo = (re: RegExp, s: string) => re.exec(s)?.[1];

function ricava(t: (k: string) => string) {
  const instagram = t("instagram");
  const telegram = t("telegram");
  const statuto = t("statuto");
  const regolamento = t("regolamento");
  const igUser = primo(/instagram\.com\/([\w.]+)/i, instagram) ?? primo(/instagram\.com\/([\w.]+)/i, DEF("instagram"))!;
  const tgCanale = primo(/t\.me\/(?:s\/)?(\w{4,})/i, telegram) ?? primo(/t\.me\/(\w+)/i, DEF("telegram"))!;
  const statutoId = primo(/\/d\/([\w-]{10,})/, statuto) ?? primo(/[?&]id=([\w-]{10,})/, statuto);
  const regolamentoId = primo(/\/document\/d\/([\w-]{10,})/, regolamento);
  const coord = (s: string) => /^\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*$/.exec(s);
  const c = coord(t("luogo.coordinate")) ?? coord(DEF("luogo.coordinate"))!;
  const [lat, lng] = [Number(c[1]), Number(c[2])];
  return {
    instagram,
    igUser,
    igHandle: `@${igUser}`,
    facebook: t("facebook"),
    facebookNome: t("facebook.nome"),
    telegram,
    tgCanale,
    tgHandle: `@${tgCanale}`,
    email: t("email"),
    statutoVedi: statuto,
    statutoScarica: statutoId ? `https://drive.google.com/uc?export=download&id=${statutoId}` : statuto,
    regolamento,
    regolamentoId: regolamentoId ?? primo(/\/document\/d\/([\w-]+)/, DEF("regolamento"))!,
    luogo: {
      via: t("luogo.via"),
      cap: t("luogo.cap"),
      citta: t("luogo.citta"),
      presso: t("luogo.presso"),
      accesso: t("luogo.accesso"),
      coordinate: t("luogo.coordinate"),
      lat,
      lng,
      apri: `https://www.google.com/maps?q=${lat},${lng}`,
      indicazioni: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      mappa: `https://www.google.com/maps?q=${lat},${lng}&z=17&hl=it&output=embed`,
    },
  };
}

export type LinkSito = ReturnType<typeof ricava>;

/** const l = useLink(); l.instagram, l.tgHandle, l.email… si aggiorna appena qualcuno salva */
export function useLink(): LinkSito {
  return ricava(useTesti(TESTI_LINK));
}

/** stessi valori, fuori da un componente */
export function linkCorrenti(): LinkSito {
  return ricava((k) => testoCorrente(TESTI_LINK, k));
}
