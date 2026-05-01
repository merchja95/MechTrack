'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type User = {
  id: string
  name: string
  email: string
  role: string
  created_at: string
}

type Props = {
  companyId: string
  alertMinutes: number
  users: User[]
  currentUserId: string
}

export default function SettingsClient({ companyId, alertMinutes, users, currentUserId }: Props) {
  const router = useRouter()

  // Configuración
  const [alert, setAlert] = useState(alertMinutes)
  const [savingAlert, setSavingAlert] = useState(false)
  const [alertMsg, setAlertMsg] = useState('')

  // Nuevo usuario
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('mechanic')
  const [creatingUser, setCreatingUser] = useState(false)
  const [userMsg, setUserMsg] = useState('')

  // Eliminar
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function saveAlert() {
    setSavingAlert(true)
    setAlertMsg('')
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: companyId, alert_minutes: alert })
    })
    setSavingAlert(false)
    if (res.ok) {
      setAlertMsg('✅ Guardado')
      router.refresh()
    } else {
      setAlertMsg('❌ Error al guardar')
    }
  }

  async function createUser() {
    if (!name || !email || !password) {
      setUserMsg('❌ Completa todos los campos')
      return
    }
    setCreatingUser(true)
    setUserMsg('')
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: companyId, name, email, password, role })
    })
    setCreatingUser(false)
    if (res.ok) {
      setUserMsg('✅ Usuario creado')
      setName(''); setEmail(''); setPassword(''); setRole('mechanic')
      setShowForm(false)
      router.refresh()
    } else {
      const data = await res.json()
      setUserMsg(`❌ ${data.error}`)
    }
  }

  async function deleteUser(userId: string) {
    if (!confirm('¿Eliminar este usuario? Esta acción no se puede deshacer.')) return
    setDeletingId(userId)
    const res = await fetch('/api/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    })
    setDeletingId(null)
    if (res.ok) {
      router.refresh()
    } else {
        window.alert('Error al eliminar usuario')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">⚙️ Configuración</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Volver al dashboard
          </button>
        </div>

        {/* Sección: Alertas */}
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">⏱ Tiempo de alerta</h2>
          <p className="text-sm text-gray-500">
            Minutos antes de mostrar la alerta ⚠️ en el dashboard para un ticket sin movimiento.
          </p>
          <div className="flex items-center gap-4">
            <input
              type="number"
              min={1}
              max={480}
              value={alert}
              onChange={(e) => setAlert(Number(e.target.value))}
              className="w-24 border rounded-lg px-3 py-2 text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-500 text-sm">minutos</span>
            <button
              onClick={saveAlert}
              disabled={savingAlert}
              className="ml-auto bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {savingAlert ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
          {alertMsg && <p className="text-sm">{alertMsg}</p>}
        </div>

        {/* Sección: Usuarios */}
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">👥 Usuarios</h2>
            <button
              onClick={() => { setShowForm(!showForm); setUserMsg('') }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
            >
              {showForm ? 'Cancelar' : '+ Nuevo usuario'}
            </button>
          </div>

          {/* Formulario nuevo usuario */}
          {showForm && (
            <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700">Nuevo usuario</h3>
              <input
                placeholder="Nombre completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <input
                placeholder="Correo electrónico"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <input
                placeholder="Contraseña"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="mechanic">Mecánico</option>
                <option value="admin">Admin</option>
              </select>
              <button
                onClick={createUser}
                disabled={creatingUser}
                className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {creatingUser ? 'Creando...' : 'Crear usuario'}
              </button>
              {userMsg && <p className="text-sm">{userMsg}</p>}
            </div>
          )}

          {/* Tabla usuarios */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 font-medium">Nombre</th>
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Rol</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => (
                  <tr key={u.id} className="py-2">
                    <td className="py-3 font-medium text-gray-800">{u.name}</td>
                    <td className="py-3 text-gray-500">{u.email}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        u.role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {u.role === 'admin' ? 'Admin' : 'Mecánico'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {u.id !== currentUserId && (
                        <button
                          onClick={() => deleteUser(u.id)}
                          disabled={deletingId === u.id}
                          className="text-red-500 hover:text-red-700 text-xs disabled:opacity-50"
                        >
                          {deletingId === u.id ? 'Eliminando...' : 'Eliminar'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}