import express from 'express'
import cron from 'node-cron'
import dotenv from 'dotenv'
import { pool } from './db.js'
import { sendTelegramMessage } from './notifier.js'

dotenv.config()

const app = express()
app.use(express.json())

const scheduledJobs = new Map()

app.post('/api/book-shift', async (req, res) => {
  const { phone, shiftStart } = req.body
  const userId = 1 // utente fittizio per ora

  try {
    const result = await pool.query(
      'INSERT INTO shifts (user_id, phone, shift_start) VALUES ($1, $2, $3) RETURNING id',
      [userId, phone, shiftStart]
    )

    const shiftId = result.rows[0].id
    const notifyTime = new Date(new Date(shiftStart).getTime() - 30 * 60000)

    const job = cron.schedule(getCronTime(notifyTime), () => {
      sendTelegramMessage(`📢 Promemoria: turno alle ${shiftStart} per ${phone}`)
      job.stop()
    })

    scheduledJobs.set(shiftId, job)
    res.json({ ok: true, shiftId })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Errore durante la prenotazione turno' })
  }
})

function getCronTime(date) {
  const min = date.getMinutes()
  const hour = date.getHours()
  const day = date.getDate()
  const month = date.getMonth() + 1
  return `${min} ${hour} ${day} ${month} *`
}

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`✅ Server attivo su http://localhost:${PORT}`)
})
