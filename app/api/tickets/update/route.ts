import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsApp } from '@/lib/whatsapp'
import { revalidatePath } from 'next/cache'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { ticketId, status, phone, plate } = body

    const updateData: Record<string, string | null> = { status }

    if (status === 'assigned') {
      updateData.assigned_at = new Date().toISOString()
    }

    if (status === 'pending_delivery') {
      updateData.completed_at = new Date().toISOString()
    }

    if (status === 'delivered') {
      updateData.completed_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('tickets')
      .update(updateData)
      .eq('id', ticketId)

    if (error) throw error

    // Registrar evento
    await supabase
      .from('ticket_events')
      .insert({ ticket_id: ticketId, status })

    if (phone) {
      await sendWhatsApp(phone, plate, status)
    }

    revalidatePath('/mechanic')
    revalidatePath('/dashboard')

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[update] error:', err)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}