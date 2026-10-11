/** Bot UFORObot: stesse chiamate di oggi (sendMessage con parse_mode HTML). */
const TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
export const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

/** chat admin dei turni straordinari, scritta nel codice come in client/api/turni.js:22 */
export const ADMIN_CHAT_ID = "6008973822";
export const CANALE_ORARI = "@aulastudioforo";
/** avvisi tecnici del cron */
export const CRON_CHAT_ID = process.env.CRON_ADMIN_CHAT_ID || "1129901266";

/** invia e lancia un errore se Telegram rifiuta */
export async function inviaTelegram(chatId, testo, { html = true } = {}) {
  if (!TOKEN) throw new Error("TELEGRAM_BOT_TOKEN mancante");
  const r = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: testo, ...(html ? { parse_mode: "HTML" } : {}) }),
  });
  const data = await r.json();
  if (!data.ok) throw new Error(data.description || "Errore nell'invio del messaggio");
  return data.result;
}

/** come sopra, ma non interrompe l'operazione principale se Telegram non risponde */
export async function provaTelegram(chatId, testo, opts) {
  if (!chatId) return false;
  try {
    await inviaTelegram(chatId, testo, opts);
    return true;
  } catch (e) {
    console.error("Telegram:", e.message);
    return false;
  }
}

export const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
