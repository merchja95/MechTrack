'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  received:     { label: 'Recibido',     color: 'bg-gray-100 text-gray-700' },
  in_progress:  { label: 'En proceso',   color: 'bg-blue-100 text-blue-700' },
  waiting_part: { label: 'Esperando',    color: 'bg-yellow-100 text-yellow-700' },
  done:         { label: 'Listo',        color: 'bg-green-100 text-green-700' },
}

interface Ticket {
  id: string
  status: string
  notes: string | null
  estimated_at: string | null
  created_at: string
  mechanic_id: string | null
  vehicles: { plate: string; brand: string; model: string; owner_name: string; owner_phone: string }[] | null
  users: { name: string }[] | null
}

interface Mechanic {
  id: string
  name: string
}

export default function DashboardClient({
  tickets,
  mechanics,
  userName,
  userRole,
}: {
  tickets: Ticket[]
  mechanics: Mechanic[]
  userName: string
  userRole: string
}) {
  const router = useRouter()
  const [assigningId, setAssigningId] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function assignMechanic(ticketId: string, mechanicId: string) {
    setAssigningId(ticketId)
    await supabase
      .from('tickets')
      .update({ mechanic_id: mechanicId || null })
      .eq('id', ticketId)
    router.refresh()
    setAssigningId(null)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">MechTrack</h1>
          <p className="text-xs text-gray-500">{userName} · {userRole}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/vehicles/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Ingresar vehículo
          </button>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2"
          >
            Salir
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Tickets activos
            <span className="ml-2 text-sm font-normal text-gray-400">({tickets.length})</span>
          </h2>
        </div>

        {tickets.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <p className="text-gray-400">No hay tickets activos.</p>
            <button
              onClick={() => router.push('/vehicles/new')}
              className="mt-4 text-blue-600 text-sm hover:underline"
            >
              Ingresar el primer vehículo →
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Placa', 'Vehículo', 'Dueño', 'Mecánico', 'Estado', 'Hora ingreso', 'Entrega est.'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tickets.map(ticket => {
                  const v = Array.isArray(ticket.vehicles) ? ticket.vehicles[0] : ticket.vehicles
                  const statusInfo = STATUS_LABELS[ticket.status] ?? { label: ticket.status, color: 'bg-gray-100 text-gray-600' }

                  return (
                    <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-gray-900">
                        {v?.plate ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {v ? `${v.brand} ${v.model}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900">{v?.owner_name ?? '—'}</div>
                        <div className="text-gray-400 text-xs">{v?.owner_phone}</div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={ticket.mechanic_id ?? ''}
                          onChange={e => assignMechanic(ticket.id, e.target.value)}
                          disabled={assigningId === ticket.id}
                          className="border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">Sin asignar</option>
                          {mechanics.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(ticket.created_at).toLocaleString('es-CO', {
                          month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {ticket.estimated_at
                          ? new Date(ticket.estimated_at).toLocaleString('es-CO', {
                              month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })
                          : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}