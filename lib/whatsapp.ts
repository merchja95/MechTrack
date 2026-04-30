const WA_TOKEN    = process.env.WHATSAPP_TOKEN!
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_ID!
const BASE_URL    = `https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`

const STATUS_MESSAGES: Record<string, string> = {
  received:     '✅ Hemos recibido tu vehículo *{{plate}}* en el taller. Te avisamos cuando empecemos a trabajar.',
  in_progress:  '🔧 Ya estamos trabajando en tu vehículo *{{plate}}*. Te avisamos cuando esté listo.',
  waiting_part: '⏳ Tu vehículo *{{plate}}* está en espera de un repuesto. Te notificamos cuando llegue.',
  done:         '🎉 ¡Tu vehículo *{{plate}}* está listo! Puedes venir a recogerlo. Gracias por confiar en nosotros.',
}

export async function sendWhatsApp(phone: string, plate: string, event: string) {
  const template = STATUS_MESSAGES[event]
  if (!template) return

  const text = template.replace(/\{\{plate\}\}/g, plate.toUpperCase())

  const cleanPhone = phone.replace(/[\s\-\+]/g, '')
  const finalPhone = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`

  const body = {
    messaging_product: 'whatsapp',
    to: finalPhone,
    type: 'text',
    text: { body: text },
  }

  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WA_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json()
    console.error('[WhatsApp] Error:', err)
  }

  return res.json()
}