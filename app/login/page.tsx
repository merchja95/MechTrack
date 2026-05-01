'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Correo o contraseña incorrectos')
      setLoading(false)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profiles } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .limit(1)

        const profile = profiles?.[0]

        if (profile?.role === 'mechanic') {
          window.location.href = '/mechanic'
        } else {
          window.location.href = '/dashboard'
        }
      } else {
        router.push('/dashboard')
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F8FAFC' }}>
      {/* Header */}
      <div style={{ background: '#0F172A' }} className="px-6 py-3 flex items-center gap-3">
        <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: '#2563EB' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="4.5" height="4.5" rx="1" fill="white"/>
            <rect x="8.5" y="1" width="4.5" height="4.5" rx="1" fill="#93C5FD"/>
            <rect x="1" y="8.5" width="4.5" height="4.5" rx="1" fill="#93C5FD"/>
            <rect x="8.5" y="8.5" width="4.5" height="4.5" rx="1" fill="white"/>
          </svg>
        </div>
        <span className="text-white font-medium text-sm">MechTrack</span>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#2563EB' }}>
                <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
                  <rect x="1" y="1" width="4.5" height="4.5" rx="1" fill="white"/>
                  <rect x="8.5" y="1" width="4.5" height="4.5" rx="1" fill="#93C5FD"/>
                  <rect x="1" y="8.5" width="4.5" height="4.5" rx="1" fill="#93C5FD"/>
                  <rect x="8.5" y="8.5" width="4.5" height="4.5" rx="1" fill="white"/>
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900 text-base leading-tight">MechTrack</p>
                <p className="text-xs text-gray-400 leading-tight">Gestión de talleres</p>
              </div>
            </div>

            <p className="text-lg font-medium text-gray-900 mb-1">Bienvenido</p>
            <p className="text-sm text-gray-400 mb-6">Ingresa a tu cuenta para continuar</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@taller.com"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-xs px-3 py-2.5 rounded-xl">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition-colors"
                style={{ background: loading ? '#93C5FD' : '#2563EB' }}
              >
                {loading ? 'Entrando...' : 'Ingresar'}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            MechTrack — Plataforma para talleres vehiculares
          </p>
        </div>
      </div>
    </div>
  )
}