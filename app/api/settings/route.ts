import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET — leer alert_minutes
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const company_id = searchParams.get('company_id')

  const { data, error } = await supabase
    .from('company_settings')
    .select('alert_minutes')
    .eq('company_id', company_id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — upsert alert_minutes
export async function POST(request: Request) {
  const { company_id, alert_minutes } = await request.json()

  const { error } = await supabase
    .from('company_settings')
    .upsert({ company_id, alert_minutes }, { onConflict: 'company_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}