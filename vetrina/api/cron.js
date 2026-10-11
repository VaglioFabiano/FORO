/**
 * /api/cron — chiamato dai 10 job di cron-job.org, invariati (BACKEND.md §10). GET o POST, senza segreti, come oggi.
 * Ogni chiamata si aggancia allo slot più vicino entro ±10 minuti (ora di Roma). Ogni compito si registra in
 * cron_esecuzioni nello stesso batch che scrive: una seconda chiamata dello stesso slot risponde "già eseguito".
 *
 *   08:00  promemoria turno (inizio prima delle 13:00)
 *   12:00  promemoria turno 13:00–15:59 · il sabato anche il report dei turni vuoti
 *   12:30  promemoria presenze 9-13
 *   15:00  promemoria turno 16:00–20:59
 *   15:30  promemoria presenze 13-16
 *   19:00  promemoria presenze 16-19
 *   20:30  promemoria turno dalle 21:00
 *   23:30  promemoria presenze 21-24 + anonimizzazione delle prenotazioni di eventi conclusi
 *   dom 23:59  cambio settimana (anche se la chiamata arriva alle 00:00 di lunedì)
 */
import { db, righe, json, BUMP_VERSIONE } from "./_db.js";
import { roma, addDays, weekdayOf, mondayOf, toMin, dataLunga, GIORNI } from "./_tempo.js";
import { inviaTelegram, pausa, CRON_CHAT_ID } from "./_telegram.js";

export const config = { maxDuration: 60 };

const LINK_DASHBOARD = "https://foroets.com/area/presenze";
const TOLLERANZA = 10; // minuti

/** fasce dei promemoria: per inizio del turno (minuti) */
const FASCE = {
  mattina: { da: 0, a: toMin("13:00"), presenze: "9-13" },
  pranzo: { da: toMin("13:00"), a: toMin("16:00"), presenze: "13-16" },
  pomeriggio: { da: toMin("16:00"), a: toMin("21:00"), presenze: "16-19" },
  sera: { da: toMin("21:00"), a: 24 * 60 + 1, presenze: "21-24" },
};

const SLOT = [
  { ora: "08:00", compiti: [["promemoria_turno", "mattina"]] },
  { ora: "12:00", compiti: [["promemoria_turno", "pranzo"], ["report_turni_vuoti", null, 5]] },
  { ora: "12:30", compiti: [["promemoria_presenze", "mattina"]] },
  { ora: "15:00", compiti: [["promemoria_turno", "pomeriggio"]] },
  { ora: "15:30", compiti: [["promemoria_presenze", "pranzo"]] },
  { ora: "19:00", compiti: [["promemoria_presenze", "pomeriggio"]] },
  { ora: "20:30", compiti: [["promemoria_turno", "sera"]] },
  { ora: "23:30", compiti: [["promemoria_presenze", "sera"], ["anonimizza_prenotazioni"]] },
  { ora: "23:59", compiti: [["cambio_settimana", null, 6]] },
];

/** lo slot più vicino entro ±10 minuti; per la domenica conta il giorno dello slot, non quello di arrivo */
export function trovaSlot(now = new Date()) {
  const r = roma(now);
  let best = null;
  for (const delta of [-1, 0, 1]) {
    const giorno = addDays(r.iso, delta);
    for (const s of SLOT) {
      const diff = Math.abs(delta * 1440 + toMin(s.ora) - r.minutes);
      if (diff <= TOLLERANZA && (!best || diff < best.diff)) best = { ...s, giorno, diff };
    }
  }
  if (!best) return null;
  // i compiti legati a un giorno della settimana (sabato = 5, domenica = 6)
  const wd = weekdayOf(best.giorno);
  return { ...best, compiti: best.compiti.filter(([, , soloGiorno]) => soloGiorno === undefined || soloGiorno === wd) };
}

/** registra il compito: false se lo slot era già stato eseguito */
async function blocca(chiave, altre = []) {
  try {
    await db.batch([{ sql: "INSERT INTO cron_esecuzioni (slot) VALUES (?)", args: [chiave] }, ...altre], "write");
    return true;
  } catch (e) {
    if (/UNIQUE constraint failed/i.test(String(e.message))) return false;
    throw e;
  }
}

const filtroFascia = (f) => `CAST(substr(t.turno_inizio, 1, 2) AS INTEGER) * 60 + CAST(substr(t.turno_inizio, 4, 2) AS INTEGER) >= ${f.da}
  AND CAST(substr(t.turno_inizio, 1, 2) AS INTEGER) * 60 + CAST(substr(t.turno_inizio, 4, 2) AS INTEGER) < ${f.a}`;

async function inTurno(giorno, fascia, preferenza) {
  return righe(
    await db.execute({
      sql: `SELECT t.data, t.turno_inizio, t.turno_fine, t.note, u.name, u.surname, u.telegram_chat_id
            FROM turni t JOIN users u ON t.user_id = u.id
            WHERE t.data = ? AND ${filtroFascia(FASCE[fascia])} AND u.telegram_chat_id IS NOT NULL AND u.${preferenza} = 1
            ORDER BY t.turno_inizio`,
      args: [giorno],
    }),
  );
}

async function invia(lista) {
  let n = 0;
  for (const [chat, msg] of lista) {
    try {
      await inviaTelegram(chat, msg);
      n++;
    } catch (e) {
      console.error("Telegram:", e.message);
    }
    await pausa(500);
  }
  return n;
}

/* ───────── compiti (testi uguali a client/api/cron.js) ───────── */
async function promemoriaTurno(giorno, fascia) {
  const turni = await inTurno(giorno, fascia, "pref_promemoria");
  return invia(
    turni.map((t) => [
      t.telegram_chat_id,
      `🔔 <b>Promemoria Turno</b>

Ciao <b>${t.name} ${t.surname}</b>, ti ricordo il tuo turno di oggi orario <b>${t.turno_inizio}-${t.turno_fine}</b> in aula studio foro.

📅 Data: ${dataLunga(String(t.data))}
⏰ Orario: ${t.turno_inizio} - ${t.turno_fine}
${t.note ? `📝 Note: ${t.note}` : ""}

Buono Studio! 💪`,
    ]),
  );
}

async function promemoriaPresenze(giorno, fascia) {
  const sigla = FASCE[fascia].presenze;
  const utenti = await inTurno(giorno, fascia, "pref_presenze");
  if (!utenti.length) return 0;
  const p = righe(await db.execute({ sql: "SELECT numero_presenze FROM presenze WHERE data = ? AND fascia_oraria = ? LIMIT 1", args: [giorno, sigla] }))[0];
  const fatto = !!p;
  const visti = new Set();
  return invia(
    utenti
      .filter((u) => !visti.has(String(u.telegram_chat_id)) && visti.add(String(u.telegram_chat_id)))
      .map((u) => [
        u.telegram_chat_id,
        `${fatto ? "✅" : "⚠️"} <b>Promemoria Presenze</b>

Ciao <b>${u.name} ${u.surname}</b>,

📊 Fascia oraria: <b>${sigla}</b>
📅 Data: <b>${dataLunga(giorno)}</b>
${fatto ? `Presenze già inserite: <b>${p.numero_presenze}</b>` : "<b>Presenze non ancora inserite</b>"}

${fatto ? "✅ Le presenze sono già state registrate per questa fascia." : "⚠️ Ricordati di inserire le presenze per questa fascia oraria nel sistema."}

🔗 Accedi al sistema per gestire le presenze.

📋 Accedi alla sezione della dashboard: ${LINK_DASHBOARD}`,
      ]),
  );
}

const TEMPLATE = [
  { inizio: "09:00", fine: "13:00" },
  { inizio: "13:00", fine: "16:00" },
  { inizio: "16:00", fine: "19:30" },
  { inizio: "21:00", fine: "24:00" },
];
const NOMI = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

/** una fascia è coperta se i turni la riempiono senza buchi (come "Turni scoperti" nell'area) */
function coperta(turni, s, e) {
  let cur = s;
  for (const [a, b] of turni.map((t) => [Math.max(s, toMin(t.turno_inizio)), Math.min(e, toMin(t.turno_fine))]).filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0])) {
    if (a > cur) return false;
    cur = Math.max(cur, b);
  }
  return cur >= e;
}

async function reportTurniVuoti(giorno) {
  const r = roma();
  const lun = addDays(mondayOf(giorno), 7); // la prossima settimana
  const date = Array.from({ length: 7 }, (_, i) => addDays(lun, i));
  const turni = righe(await db.execute({ sql: "SELECT data, turno_inizio, turno_fine FROM turni WHERE data >= ? AND data <= ?", args: [date[0], date[6]] }));
  const teorici = [];
  const vuoti = [];
  const straordinari = [];
  date.forEach((d, di) => {
    const delGiorno = turni.filter((t) => String(t.data) === d);
    TEMPLATE.forEach((o, ti) => {
      const s = toMin(o.inizio);
      const e = toMin(o.fine);
      const chiuso = di >= 5 || ti === 3;
      const x = { giorno: NOMI[di], ti, ...o };
      if (chiuso) {
        if (delGiorno.some((t) => toMin(t.turno_inizio) < e && toMin(t.turno_fine) > s)) straordinari.push(x);
      } else {
        teorici.push(x);
        if (!coperta(delGiorno, s, e)) vuoti.push(x);
      }
    });
  });
  const dest = righe(
    await db.execute(`SELECT u.telegram_chat_id FROM users u JOIN notifiche n ON u.id = n.user_id
                      WHERE n.tipo_notifica = 'gestione_turni' AND u.telegram_chat_id IS NOT NULL GROUP BY u.telegram_chat_id`),
  );
  if (!dest.length) return 0;
  const perGiorno = (lista, punto) =>
    NOMI.filter((g) => lista.some((x) => x.giorno === g))
      .map((g) => `📅 <b>${g}:</b>\n${lista.filter((x) => x.giorno === g).sort((a, b) => a.ti - b.ti).map((x) => `   ${punto} ${x.inizio} - ${x.fine}\n`).join("")}\n`)
      .join("");
  let msg = `📋 <b>Report Settimanale Turni Vuoti</b>

📅 Settimana: ${dataLunga(date[0])} - ${dataLunga(date[6])}
⏰ Generato: ${r.hour}:${String(r.minute).padStart(2, "0")} (orario italiano)

📊 <b>Riepilogo:</b>
🔸 Turni totali teorici: <b>${teorici.length}</b>
✅ Turni già occupati: <b>${teorici.length - vuoti.length}</b>
❌ Turni vuoti: <b>${vuoti.length}</b>`;
  if (straordinari.length) msg += `\n⭐ Turni straordinari: <b>${straordinari.length}</b>`;
  msg += "\n\n";
  msg += vuoti.length ? `⚠️ <b>Turni vuoti da coprire:</b>\n\n${perGiorno(vuoti, "•")}` : "🎉 <b>Ottimo!</b> Tutti i turni teorici della prossima settimana sono occupati!";
  if (straordinari.length) msg += `\n⭐ <b>Turni Straordinari Attivi:</b>\n<i>(Turni in slot che normalmente sarebbero chiusi)</i>\n\n${perGiorno(straordinari, "⭐")}`;
  return invia(dest.map((d) => [d.telegram_chat_id, msg]));
}

async function sviluppatori(msg) {
  const dest = righe(
    await db.execute(`SELECT u.telegram_chat_id FROM users u JOIN notifiche n ON u.id = n.user_id
                      WHERE n.tipo_notifica = 'sviluppatori' AND u.telegram_chat_id IS NOT NULL GROUP BY u.telegram_chat_id`),
  );
  if (!dest.length) return invia([[CRON_CHAT_ID, msg]]);
  return invia(dest.map((d) => [d.telegram_chat_id, msg]));
}

/** un solo batch: niente turni cancellati, niente presenze spostate (§10) */
async function cambioSettimana(domenica) {
  const nuovoLunedi = addDays(domenica, 1);
  const chiave = `cambio_settimana@${nuovoLunedi}`;
  const giaFatto = righe(await db.execute({ sql: "SELECT 1 AS x FROM cron_esecuzioni WHERE slot = ?", args: [chiave] })).length > 0;
  if (giaFatto) return { gia: true };
  const sbagliati = righe(await db.execute("SELECT DISTINCT giorno FROM fasce_orarie_prossima WHERE giorno IS NULL OR giorno NOT IN (SELECT giorno FROM giorni_settimana)"));
  if (sbagliati.length) {
    await sviluppatori(`❌ Errore Cambio Settimana:\nGiorni non validi in fasce_orarie_prossima: ${sbagliati.map((x) => x.giorno).join(", ")}. Settimana NON ruotata.`);
    return { errore: true };
  }
  const standard = GIORNI.slice(0, 5).map((g) => `('${g}','09:00','19:30','')`).join(", ");
  const ok = await blocca(chiave, [
    { sql: "DELETE FROM fasce_orarie", args: [] },
    { sql: "INSERT INTO fasce_orarie (giorno, ora_inizio, ora_fine, note) SELECT giorno, ora_inizio, ora_fine, note FROM fasce_orarie_prossima", args: [] },
    { sql: "DELETE FROM fasce_orarie_prossima", args: [] },
    { sql: `INSERT INTO fasce_orarie_prossima (giorno, ora_inizio, ora_fine, note) VALUES ${standard}`, args: [] },
    { sql: BUMP_VERSIONE, args: [] },
  ]).catch(async (e) => {
    await sviluppatori(`❌ Errore Cambio Settimana:\n${e.message}`);
    throw e;
  });
  if (!ok) return { gia: true };
  const n = righe(await db.execute("SELECT COUNT(*) AS n FROM fasce_orarie"))[0]?.n ?? 0;
  await sviluppatori(`🔄 <b>Cambio Settimana Completato</b>

📊 <b>Esito:</b>
✅ Fasce ruotate: ${n} fasce nella settimana del ${dataLunga(nuovoLunedi)}
✅ Prossima settimana impostata sull'orario standard (lun–ven 09:00–19:30)`);
  return { ok: true };
}

export async function esegui(compito, fascia, giorno, ora) {
  if (compito === "cambio_settimana") return cambioSettimana(giorno);
  const chiave = `${compito}${fascia ? `_${fascia}` : ""}@${giorno}`;
  if (compito === "anonimizza_prenotazioni") {
    // nomi ed email via, numeri e posti restano (decisione 2026-10-11)
    const ok = await blocca(chiave, [
      {
        sql: `UPDATE prenotazioni_eventi SET nome = '', cognome = '', email = '', note = NULL, token = NULL
              WHERE email <> '' AND evento_id IN (SELECT id FROM eventi WHERE substr(data_evento, 1, 10) < ?)`,
        args: [giorno],
      },
    ]);
    return ok ? { ok: true } : { gia: true };
  }
  if (!(await blocca(chiave))) return { gia: true };
  if (compito === "promemoria_turno") return { inviati: await promemoriaTurno(giorno, fascia) };
  if (compito === "promemoria_presenze") return { inviati: await promemoriaPresenze(giorno, fascia) };
  if (compito === "report_turni_vuoti") return { inviati: await reportTurniVuoti(giorno) };
  return { ignoto: true, ora };
}

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) return json(res, 405, { error: "Method not allowed. Use GET or POST." });
  const r = roma();
  const italianTime = `${r.hour}:${String(r.minute).padStart(2, "0")}`;
  if (!db) return json(res, 500, { error: "Database non configurato", italianTime });
  const slot = trovaSlot();
  // fuori orario: nessun messaggio (oggi partiva un messaggio di prova all'admin)
  if (!slot) return json(res, 200, { message: "Nessun compito in questo orario", italianTime, executed: false });
  const esiti = {};
  try {
    for (const [compito, fascia] of slot.compiti) esiti[compito + (fascia ? `_${fascia}` : "")] = await esegui(compito, fascia, slot.giorno, slot.ora);
  } catch (e) {
    console.error("cron:", e);
    return json(res, 500, { error: "Errore interno del server", details: e.message, italianTime, slot: `${slot.giorno} ${slot.ora}`, esiti });
  }
  const tutti = Object.values(esiti);
  return json(res, 200, {
    message: tutti.length && tutti.every((x) => x.gia) ? "Già eseguito" : "Cron job completato con successo",
    slot: `${slot.giorno} ${slot.ora}`,
    italianTime,
    esiti,
    executed: true,
  });
}
