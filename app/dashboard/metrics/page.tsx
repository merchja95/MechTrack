import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import MetricsClient from './MetricsClient'

export default async function MetricsPage() {
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('role, company_id, name')
    .eq('id', session.user.id)
    .single()

  if (!userData) redirect('/login')
  if (userData.role !== 'admin') redirect('/dashboard')

  return (
    <MetricsClient
      companyId={userData.company_id}
    />
  )
}