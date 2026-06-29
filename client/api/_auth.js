import crypto from 'crypto';

const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-in-production-env';

function getDayNumber() {
  return Math.floor(Date.now() / 86400000);
}

export function generateToken(userId) {
  const day = getDayNumber();
  return crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(`${userId}:${day}`)
    .digest('hex');
}

export function verifyToken(userId, token) {
  if (!userId || !token) return false;
  const day = getDayNumber();
  // Accetta anche il token del giorno precedente (edge case mezzanotte)
  for (const d of [day, day - 1]) {
    const expected = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(`${userId}:${d}`)
      .digest('hex');
    // Confronto a tempo costante; timingSafeEqual richiede buffer di pari lunghezza,
    // quindi controlliamo prima la lunghezza per evitare eccezioni.
    if (
      token.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Verifica l'header Authorization: Bearer userId:token
 * Ritorna userId (string) se valido, altrimenti invia 401 e ritorna null.
 */
export function requireAuth(req, res) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Autenticazione richiesta' });
    return null;
  }
  const payload = auth.slice(7); // rimuovi "Bearer "
  const colonIdx = payload.indexOf(':');
  if (colonIdx === -1) {
    res.status(401).json({ success: false, error: 'Formato token non valido' });
    return null;
  }
  const userId = payload.slice(0, colonIdx);
  const token = payload.slice(colonIdx + 1);
  if (!verifyToken(userId, token)) {
    res.status(401).json({ success: false, error: 'Sessione non valida o scaduta' });
    return null;
  }
  return userId;
}

export const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://foroets.com';
