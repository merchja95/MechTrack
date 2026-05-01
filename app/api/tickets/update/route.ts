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

    const { error } = await supabase
      .from('tickets')
      .update({ status })
      .eq('id', ticketId)

    if (error) throw error

    if (phone) {
      await sendWhatsApp(phone, plate, status)
    }

    revalidatePath('/mechanic')

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[update] error:', err)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}