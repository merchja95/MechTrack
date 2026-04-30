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
    const { vehicle_id, mechanic_id, notes } = body

    const { data: ticket, error } = await supabase
      .from('tickets')
      .insert({ vehicle_id, mechanic_id, notes, status: 'pending' })
      .select()
      .single()

    if (error) throw error

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