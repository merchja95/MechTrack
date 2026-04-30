// app/mechanic/page.tsx
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import MechanicBoard from '@/components/MechanicBoard'

export default async function MechanicPage() {
  const cookieStore = cookies()
  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Leer sesión desde cookie
  const allCookies = cookieStore.getAll()
  const authCookie = allCookies.find(c => c.name.includes('auth-token'))
  if (!authCookie) redirect('/login')

  const { data: { user } } = await supabaseAuth.auth.getUser(authCookie.value)
  if (!user) redirect('/login')

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'mechanic') redirect('/dashboard')

  const { data: tickets } = await supabaseAdmin
    .from('tickets')
    .select(`
      id, status, created_at, notes,
      vehicles ( plate, owner_name, owner_phone, model )
    `)
    .eq('mechanic_id', user.id)
    .in('status', ['pending', 'in_progress', 'waiting_part'])
    .order('created_at', { ascending: true })

  return <MechanicBoard tickets={tickets ?? []} mechanic={profile} />
}