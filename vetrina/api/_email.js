/** Email Gmail ai prenotati, come client/api/eventi.js (stesso mittente, stesse variabili). */
import nodemailer from "nodemailer";
import { Errore } from "./_db.js";

let transporter = null;

export function emailConfigurata() {
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

/** senza le variabili Gmail si dà errore (BACKEND.md §11), prima di scrivere qualsiasi cosa */
export function richiediEmail() {
  if (!emailConfigurata()) throw new Errore(500, "L'invio delle email non è configurato sul server (GMAIL_USER, GMAIL_APP_PASSWORD).");
}

export async function inviaEmail(to, subject, html, text) {
  richiediEmail();
  transporter ??= nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  await transporter.sendMail({
    from: `Associazione Foro <${process.env.GMAIL_USER}>`,
    to,
    replyTo: process.env.GMAIL_USER,
    subject,
    text,
    html,
  });
}

/** testo dell'utente dentro l'HTML della email: disinnescato */
export const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
