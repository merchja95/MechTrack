import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { ticketId, mechanicId } = body

    if (mechanicId) {
      await supabase
        .from('tickets')
        .update({ mechanic_id: mechanicId, status: 'assigned', assigned_at: new Date().toISOString() })
        .eq('id', ticketId)

      await supabase
        .from('ticket_events')
        .insert({ ticket_id: ticketId, status: 'assigned' })
    } else {
      await supabase
        .from('tickets')
        .update({ mechanic_id: null, status: 'received', assigned_at: null })
        .eq('id', ticketId)

      await supabase
        .from('ticket_events')
        .insert({ ticket_id: ticketId, status: 'received' })
    }

    revalidatePath('/dashboard')

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[assign] error:', err)
    return NextResponse.json({ error: 'Error asignando mecánico' }, { status: 500 })
  }
}