import { NextRequest, NextResponse } from 'next/server'
import { sendWhatsApp } from '@/lib/whatsapp'

export async function POST(req: NextRequest) {
  try {
    const { phone, plate, status } = await req.json()

    if (!phone || !plate || !status) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    await sendWhatsApp(phone, plate, status)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[notify] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}