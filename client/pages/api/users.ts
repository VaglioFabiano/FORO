// client/db/api/users.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getAllUsers } from '../../db/index';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const users = await getAllUsers();
      res.status(200).json({
        success: true,
        data: users,
        count: users.length
      });
    } catch (error) {
      console.error('Errore API users:', error);
      res.status(500).json({
        success: false,
        message: 'Errore nel recupero degli utenti',
        error: error instanceof Error ? error.message : 'Errore sconosciuto'
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({
      success: false,
      message: `Metodo ${req.method} non consentito`
    });
  }
}