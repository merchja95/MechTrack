import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { sendWhatsApp } from '@/lib/whatsapp'

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies })
    const body = await req.json()

    const { vehicle_id, mechanic_id, notes } = body

    // Crear el ticket
    const { data: ticket, error } = await supabase
      .from('tickets')
      .insert({ vehicle_id, mechanic_id, notes, status: 'pending' })
      .select()
      .single()

    if (error) throw error

    // Notificar por WhatsApp
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