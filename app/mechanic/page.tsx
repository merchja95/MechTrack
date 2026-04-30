// app/mechanic/page.tsx
import { createClient } from '@supabase/supabase-js'
import MechanicBoard from '@/components/MechanicBoard'

export default async function MechanicPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: tickets } = await supabase
    .from('tickets')
    .select(`
      id, status, created_at, notes,
      vehicles ( plate, owner_name, owner_phone, model )
    `)
    .in('status', ['pending', 'in_progress', 'waiting_part'])
    .order('created_at', { ascending: true })

  return <MechanicBoard tickets={tickets ?? []} mechanic={{ name: 'Mecánico' }} />
}