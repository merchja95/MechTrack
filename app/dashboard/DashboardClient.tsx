'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  received:         { label: 'Recibido',             color: 'bg-gray-100 text-gray-700' },
  assigned:         { label: 'Asignado',             color: 'bg-purple-100 text-purple-700' },
  in_progress:      { label: 'En proceso',           color: 'bg-blue-100 text-blue-700' },
  waiting_part:     { label: 'Esperando repuesto',   color: 'bg-yellow-100 text-yellow-700' },
  pending_delivery: { label: 'Pendiente de entrega', color: 'bg-orange-100 text-orange-700' },
  delivered:        { label: 'Entregado',            color: 'bg-green-100 text-green-700' },
}

interface Ticket {
  id: string
  status: string
  notes: string | null
  estimated_at: string | null
  completed_at: string | null
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
  activeTickets,
  doneTickets,
  mechanics,
  userName,
  userRole,
}: {
  activeTickets: Ticket[]
  doneTickets: Ticket[]
  mechanics: Mechanic[]
  userName: string
  userRole: string
}) {
  const router = useRouter()
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [deliveringId, setDeliveringId] = useState<string | null>(null)
  const [tab, setTab] = useState<'activos' | 'entrega' | 'hoy' | 'historial'>('activos')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const today = new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })
  const todayDone = doneTickets.filter(t => {
    const ticketDate = new Date(t.completed_at ?? t.created_at).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })
    return ticketDate === today
  })

  const pendingDelivery = activeTickets.filter(t => t.status === 'pending_delivery')
  const workingTickets = activeTickets.filter(t => t.status !== 'pending_delivery')

  async function assignMechanic(ticketId: string, mechanicId: string) {
    setAssigningId(ticketId)
    await fetch('/api/tickets/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId, mechanicId }),
    })
    router.refresh()
    setAssigningId(null)
  }

  async function markDelivered(ticket: Ticket) {
    setDeliveringId(ticket.id)
    const v = Array.isArray(ticket.vehicles) ? ticket.vehicles[0] : ticket.vehicles
    await fetch('/api/tickets/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticketId: ticket.id,
        status: 'delivered',
        phone: v?.owner_phone ?? '',
        plate: v?.plate ?? '',
      }),
    })
    router.refresh()
    setDeliveringId(null)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  function TicketTable({ tickets, showAssign, showDeliver }: {
    tickets: Ticket[]
    showAssign: boolean
    showDeliver: boolean
  }) {
    if (tickets.length === 0) {
      return (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-400">No hay tickets.</p>
        </div>
      )
    }

    return (
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Placa', 'Vehículo', 'Dueño', 'Mecánico', 'Estado', 'Ingreso', 'Entrega est.', 'Completado', ...(showDeliver ? ['Acción'] : [])].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tickets.map(ticket => {
              const v = Array.isArray(ticket.vehicles) ? ticket.vehicles[0] : ticket.vehicles
              const u = Array.isArray(ticket.users) ? ticket.users[0] : ticket.users
              const statusInfo = STATUS_LABELS[ticket.status] ?? { label: ticket.status, color: 'bg-gray-100 text-gray-600' }

              return (
                <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-gray-900">{v?.plate ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{v ? `${v.brand ?? ''} ${v.model}`.trim() : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="text-gray-900">{v?.owner_name ?? '—'}</div>
                    <div className="text-gray-400 text-xs">{v?.owner_phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    {showAssign ? (
                      <select
                        value={ticket.mechanic_id ?? ''}
                        onChange={e => assignMechanic(ticket.id, e.target.value)}
                        disabled={assigningId === ticket.id || ticket.status === 'in_progress' || ticket.status === 'waiting_part'}
                        className="border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                      >
                        <option value="">Sin asignar</option>
                        {mechanics.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-gray-700 text-xs">{u?.name ?? '—'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(ticket.created_at)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(ticket.estimated_at)}</td>
                  <td className="px-4 py-3 text-xs">
                    {ticket.completed_at
                      ? <span className="text-green-600 font-medium">{formatDate(ticket.completed_at)}</span>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  {showDeliver && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => markDelivered(ticket)}
                        disabled={deliveringId === ticket.id}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
                      >
                        {deliveringId === ticket.id ? 'Guardando...' : '✓ Entregar'}
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  const tabs = [
    { key: 'activos', label: `Activos (${workingTickets.length})` },
    { key: 'entrega', label: `Pendientes entrega (${pendingDelivery.length})` },
    ...(userRole === 'admin' ? [
      { key: 'hoy', label: `Completados hoy (${todayDone.length})` },
      { key: 'historial', label: `Historial (${doneTickets.length})` },
    ] : []),
  ] as { key: 'activos' | 'entrega' | 'hoy' | 'historial', label: string }[]

  return (
    <div className="min-h-screen bg-gray-50">
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

      <div className="max-w-6xl mx-auto px-6 pt-6">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'activos' && (
          workingTickets.length === 0 ? (
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
            <TicketTable tickets={workingTickets} showAssign={true} showDeliver={false} />
          )
        )}

        {tab === 'entrega' && <TicketTable tickets={pendingDelivery} showAssign={false} showDeliver={true} />}
        {tab === 'hoy' && <TicketTable tickets={todayDone} showAssign={false} showDeliver={false} />}
        {tab === 'historial' && <TicketTable tickets={doneTickets} showAssign={false} showDeliver={false} />}
      </div>
    </div>
  )
}