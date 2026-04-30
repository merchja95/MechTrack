import { createClient } from '@supabase/supabase-js'
import MechanicBoard from '@/components/MechanicBoard'

export const dynamic = 'force-dynamic'

export default async function MechanicPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: tickets, error } = await supabase
    .from('tickets')
    .select(`
      id, status, created_at, notes, mechanic_id,
      vehicles ( plate, owner_name, owner_phone, model )
    `)
    .in('status', ['received', 'in_progress', 'waiting_part', 'pending'])
    .order('created_at', { ascending: true })

  console.log('tickets:', tickets, 'error:', error)

  return <MechanicBoard tickets={tickets ?? []} mechanic={{ name: 'Mecánico' }} />
}