import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET — listar usuarios de la empresa
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const company_id = searchParams.get('company_id')

  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role, created_at')
    .eq('company_id', company_id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — crear usuario
export async function POST(request: Request) {
  const { company_id, name, email, password, role } = await request.json()

  // 1. Crear en Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  // 2. Insertar en tabla users con mismo UUID
  const { error: dbError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      company_id,
      name,
      email,
      role
    })

  if (dbError) {
    // Rollback: eliminar de Auth si falla la BD
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// DELETE — eliminar usuario
export async function DELETE(request: Request) {
  const { user_id } = await request.json()

  // 1. Eliminar de tabla users
  const { error: dbError } = await supabase
    .from('users')
    .delete()
    .eq('id', user_id)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  // 2. Eliminar de Supabase Auth
  const { error: authError } = await supabase.auth.admin.deleteUser(user_id)

  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}