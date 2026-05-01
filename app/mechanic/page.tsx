import { createClient } from '@/lib/supabase-server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import MechanicBoard from '@/components/MechanicBoard'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function MechanicPage() {
  // 1. Obtener usuario logueado desde la sesión
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // 2. Obtener nombre del mecánico desde tabla users
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: userData } = await serviceClient
    .from('users')
    .select('name')
    .eq('id', user.id)
    .single()

  // 3. Traer solo los tickets asignados a este mecánico
  const { data: tickets, error } = await serviceClient
    .from('tickets')
    .select(`
      id, status, created_at, notes, mechanic_id,
      vehicles ( plate, owner_name, owner_phone, model )
    `)
    .eq('mechanic_id', user.id)
    .in('status', ['received', 'in_progress', 'waiting_part'])
    .order('created_at', { ascending: true })

  console.log('tickets:', tickets, 'error:', error)

  return <MechanicBoard tickets={tickets ?? []} mechanic={{ name: userData?.name ?? 'Mecánico' }} />
}