import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const company_id = searchParams.get('company_id')

  // 1. Tickets por día — últimos 7 días
  const { data: ticketsByDay } = await supabase
    .from('tickets')
    .select('created_at')
    .eq('company_id', company_id)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  // 2. Tiempo promedio de servicio
  const { data: avgData } = await supabase.rpc('get_avg_service_time', { p_company_id: company_id })

  // 3. Tickets por mecánico
  const { data: byMechanic } = await supabase
    .from('tickets')
    .select('mechanic_id, users!mechanic_id(name)')
    .eq('company_id', company_id)
    .eq('status', 'delivered')
    .not('mechanic_id', 'is', null)

  // Agrupar tickets por día
  const days: Record<string, number> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toLocaleDateString('es-CO', { timeZone: 'America/Bogota', month: 'short', day: 'numeric' })
    days[key] = 0
  }
  ticketsByDay?.forEach(t => {
    const key = new Date(t.created_at).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', month: 'short', day: 'numeric' })
    if (key in days) days[key]++
  })

  // Agrupar por mecánico
  const mechanicMap: Record<string, { name: string; count: number }> = {}
  byMechanic?.forEach((t: any) => {
    const id = t.mechanic_id
    const name = Array.isArray(t.users) ? t.users[0]?.name : t.users?.name
    if (!mechanicMap[id]) mechanicMap[id] = { name: name ?? 'Desconocido', count: 0 }
    mechanicMap[id].count++
  })

  return NextResponse.json({
    ticketsByDay: Object.entries(days).map(([date, count]) => ({ date, count })),
    avgMinutes: avgData?.[0]?.avg_minutes ?? null,
    byMechanic: Object.values(mechanicMap).sort((a, b) => b.count - a.count),
  })
}