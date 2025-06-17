import axios from 'axios'
import dotenv from 'dotenv'
dotenv.config()

export async function sendTelegramMessage(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text,
    })
    console.log('✅ Messaggio Telegram inviato.')
  } catch (err) {
    console.error('❌ Errore invio Telegram:', err.message)
  }
}
