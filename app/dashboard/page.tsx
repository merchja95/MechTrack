import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('company_id, name, role')
    .eq('id', session.user.id)
    .single()

  console.error('userData:', userData, 'error:', userError, 'uid:', session.user.id)

  if (!userData) redirect('/login')

  const { data: activeTickets } = await supabase
    .from('tickets')
    .select(`
      id, status, notes, estimated_at, completed_at, created_at, mechanic_id,
      vehicles ( plate, brand, model, owner_name, owner_phone ),
      users!mechanic_id ( name ),
      ticket_events ( status, created_at )
    `)
    .eq('company_id', userData.company_id)
    .in('status', ['received', 'assigned', 'in_progress', 'waiting_part', 'pending_delivery'])
    .order('created_at', { ascending: false })

  const { data: doneTickets } = await supabase
    .from('tickets')
    .select(`
      id, status, notes, estimated_at, completed_at, created_at, mechanic_id,
      vehicles ( plate, brand, model, owner_name, owner_phone ),
      users!mechanic_id ( name ),
      ticket_events ( status, created_at )
    `)
    .eq('company_id', userData.company_id)
    .eq('status', 'delivered')
    .order('completed_at', { ascending: false })

  const { data: mechanics } = await supabase
    .from('users')
    .select('id, name')
    .eq('company_id', userData.company_id)
    .eq('role', 'mechanic')

  return (
    <DashboardClient
      activeTickets={activeTickets ?? []}
      doneTickets={doneTickets ?? []}
      mechanics={mechanics ?? []}
      userName={userData.name}
      userRole={userData.role}
    />
  )
}