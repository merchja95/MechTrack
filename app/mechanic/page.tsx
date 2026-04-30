// app/mechanic/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import MechanicBoard from '@/components/MechanicBoard'

export default async function MechanicPage() {
  const supabase = createServerComponentClient({ cookies })

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', session.user.id)
    .single()

  if (profile?.role !== 'mechanic') redirect('/dashboard')

  const { data: tickets } = await supabase
    .from('tickets')
    .select(`
      id, status, created_at, notes,
      vehicles ( plate, owner_name, owner_phone, model )
    `)
    .eq('mechanic_id', session.user.id)
    .in('status', ['pending', 'in_progress', 'waiting_part'])
    .order('created_at', { ascending: true })

  return <MechanicBoard tickets={tickets ?? []} mechanic={profile} />
}