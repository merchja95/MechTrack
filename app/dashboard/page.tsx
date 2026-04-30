import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('company_id, name, role')
    .eq('id', user.id)
    .single()

  if (!userData) redirect('/login')

  // Tickets activos con datos de vehículo y mecánico
  const { data: tickets } = await supabase
    .from('tickets')
    .select(`
      id,
      status,
      notes,
      estimated_at,
      created_at,
      mechanic_id,
      vehicles (
        plate,
        brand,
        model,
        owner_name,
        owner_phone
      ),
      users!mechanic_id (
        name
      )
    `)
    .eq('company_id', userData.company_id)
    .neq('status', 'closed')
    .order('created_at', { ascending: false })

  // Mecánicos disponibles para asignar
  const { data: mechanics } = await supabase
    .from('users')
    .select('id, name')
    .eq('company_id', userData.company_id)
    .eq('role', 'mechanic')

  return (
    <DashboardClient
      tickets={tickets ?? []}
      mechanics={mechanics ?? []}
      userName={userData.name}
      userRole={userData.role}
    />
  )
}