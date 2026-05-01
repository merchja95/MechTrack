import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
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

  const { data: settings } = await supabase
    .from('company_settings')
    .select('alert_minutes')
    .eq('company_id', userData.company_id)
    .single()

  const { data: users } = await supabase
    .from('users')
    .select('id, name, email, role, created_at')
    .eq('company_id', userData.company_id)
    .order('created_at', { ascending: true })

  return (
    <SettingsClient
      companyId={userData.company_id}
      alertMinutes={settings?.alert_minutes ?? 30}
      users={users ?? []}
      currentUserId={session.user.id}
    />
  )
}