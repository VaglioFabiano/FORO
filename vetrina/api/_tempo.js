/** Ora italiana (Europe/Rome) e date "YYYY-MM-DD", senza dipendere dal fuso del server (BACKEND.md §9). */

const FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Rome",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  weekday: "short",
});
const WD = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

/** { iso: "2026-10-11", hour, minute, minutes, weekday (0 = lunedì) } */
export function roma(now = new Date()) {
  const p = Object.fromEntries(FMT.formatToParts(now).map((x) => [x.type, x.value]));
  const hour = Number(p.hour);
  const minute = Number(p.minute);
  return { iso: `${p.year}-${p.month}-${p.day}`, hour, minute, minutes: hour * 60 + minute, weekday: WD[p.weekday] };
}

const toDate = (iso) => new Date(`${iso}T12:00:00Z`);
export function addDays(iso, n) {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
/** 0 = lunedì … 6 = domenica */
export const weekdayOf = (iso) => (toDate(iso).getUTCDay() + 6) % 7;
export const mondayOf = (iso) => addDays(iso, -weekdayOf(iso));

/** nomi dei giorni come in giorni_settimana: minuscoli, NFC */
export const GIORNI = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"].map((g) => g.normalize("NFC"));
export const normalizzaGiorno = (g) => String(g ?? "").normalize("NFC").toLowerCase();

/** "Mercoledì 30/9", come nei messaggi del vecchio turni.js */
export function giornoEData(iso) {
  const g = GIORNI[weekdayOf(iso)];
  const d = toDate(iso);
  return `${g[0].toUpperCase()}${g.slice(1)} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}
/** "mercoledì 30/09/2026", come formatDate del vecchio cron (toLocaleDateString it-IT) */
export function dataLunga(iso) {
  const d = toDate(iso);
  return d.toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
}

export const toMin = (hhmm) => {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + (m || 0);
};
