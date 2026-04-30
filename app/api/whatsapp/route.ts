import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsApp } from '@/lib/whatsapp'

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN!

// Supabase con service role (sin RLS, para leer desde webhook)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const STATUS_LABELS: Record<string, string> = {
  pending:      'En espera de asignación',
  in_progress:  'En reparación',
  waiting_part: 'Esperando repuesto',
  done:         'Listo para recoger',
}

// GET — verificación del webhook por Meta
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// POST — mensajes entrantes
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const entry = body?.entry?.[0]?.changes?.[0]?.value
    const message = entry?.messages?.[0]

    if (!message || message.type !== 'text') {
      return NextResponse.json({ ok: true }) // Ignorar no-texto
    }

    const fromPhone  = message.from
    const text       = message.text.body.trim().toUpperCase()

    // Detectar si el texto parece una placa (ej: ABC123, ABC-123, ABC 123)
    const plateRegex = /^[A-Z]{3}[-\s]?\d{3}$/
    if (!plateRegex.test(text)) {
      await sendWhatsApp(fromPhone, '', 'unknown')
      return NextResponse.json({ ok: true })
    }

    const cleanPlate = text.replace(/[-\s]/g, '')

    // Buscar ticket activo para esa placa
    const { data: ticket } = await supabase
      .from('tickets')
      .select('status, vehicles(plate, model)')
      .eq('vehicles.plate', cleanPlate)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!ticket) {
      const notFound = `No encontramos un vehículo con placa *${cleanPlate}* en nuestro taller actualmente.`
      await fetch(`https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: fromPhone,
          type: 'text',
          text: { body: notFound },
        }),
      })
      return NextResponse.json({ ok: true })
    }

    const statusLabel = STATUS_LABELS[ticket.status] ?? ticket.status
    const replyText = `🔍 Estado del vehículo *${cleanPlate}*:\n\n*${statusLabel}*\n\nSi tienes preguntas, contáctanos directamente.`

    await fetch(`https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: fromPhone,
        type: 'text',
        text: { body: replyText },
      }),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[webhook] error:', err)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}