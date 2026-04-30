// app/mechanic/page.tsx
import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import MechanicBoard from '@/components/MechanicBoard'
import { cookies } from 'next/headers'

export default async function MechanicPage() {
  const cookieStore = cookies()
  const allCookies = cookieStore.getAll()
  
  // Buscar el access token en las cookies de Supabase
  const tokenCookie = allCookies.find(c => 
    c.name.includes('auth-token') || 
    c.name.includes('access-token') ||
    c.name.startsWith('sb-')
  )

  if (!tokenCookie) redirect('/login')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Decodificar el JWT para obtener el user_id
  let userId: string | null = null
  try {
    const token = tokenCookie.value
    const payload = JSON.parse(atob(token.split('.')[1]))
    userId = payload.sub
  } catch {
    redirect('/login')
  }

  if (!userId) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('id, name, role')
    .eq('id', userId)
    .single()

  if (profile?.role !== 'mechanic') redirect('/dashboard')

  const { data: tickets } = await supabase
    .from('tickets')
    .select(`
      id, status, created_at, notes,
      vehicles ( plate, owner_name, owner_phone, model )
    `)
    .eq('mechanic_id', userId)
    .in('status', ['pending', 'in_progress', 'waiting_part'])
    .order('created_at', { ascending: true })

  return <MechanicBoard tickets={tickets ?? []} mechanic={profile} />
}