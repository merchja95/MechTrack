import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsApp } from '@/lib/whatsapp'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { vehicle_id, notes, company_id } = body

    const { data: ticket, error } = await supabase
      .from('tickets')
      .insert({
        vehicle_id,
        company_id,
        notes,
        status: 'received',
        mechanic_id: null,
      })
      .select()
      .single()

    if (error) throw error

    // Registrar evento inicial
    await supabase
      .from('ticket_events')
      .insert({ ticket_id: ticket.id, status: 'received' })

    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('owner_phone, plate')
      .eq('id', vehicle_id)
      .single()

    if (vehicle?.owner_phone) {
      await sendWhatsApp(vehicle.owner_phone, vehicle.plate, 'received')
    }

    return NextResponse.json({ ticket })
  } catch (err) {
    console.error('[tickets] error:', err)
    return NextResponse.json({ error: 'Error creando ticket' }, { status: 500 })
  }
}