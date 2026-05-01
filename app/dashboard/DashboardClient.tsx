'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  received:         { label: 'Recibido',             color: 'bg-gray-100 text-gray-600' },
  assigned:         { label: 'Asignado',             color: 'bg-purple-100 text-purple-700' },
  in_progress:      { label: 'En proceso',           color: 'bg-blue-100 text-blue-700' },
  waiting_part:     { label: 'Esp. repuesto',        color: 'bg-yellow-100 text-yellow-700' },
  pending_delivery: { label: 'Pend. entrega',        color: 'bg-orange-100 text-orange-700' },
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
  ticket_events: { status: string; created_at: string }[] | null
}

function getElapsedMinutes(ticket: Ticket): number {
  const events = ticket.ticket_events ?? []
  const lastEvent = events
    .filter(e => e.status === ticket.status)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
  const since = lastEvent ? new Date(lastEvent.created_at) : new Date(ticket.created_at)
  return Math.floor((Date.now() - since.getTime()) / 60000)
}

function formatTime(mins: number): string {
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

interface Mechanic { id: string; name: string }

function NavBar({ userName, userRole, onSignOut, onNewVehicle, onMetrics, onSettings }: {
  userName: string
  userRole: string
  onSignOut: () => void
  onNewVehicle: () => void
  onMetrics: () => void
  onSettings: () => void
}) {
  const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{ background: '#0F172A' }} className="px-4 h-12 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ background: '#2563EB' }}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="4.5" height="4.5" rx="1" fill="white"/>
            <rect x="8.5" y="1" width="4.5" height="4.5" rx="1" fill="#93C5FD"/>
            <rect x="1" y="8.5" width="4.5" height="4.5" rx="1" fill="#93C5FD"/>
            <rect x="8.5" y="8.5" width="4.5" height="4.5" rx="1" fill="white"/>
          </svg>
        </div>
        <span className="text-white text-sm font-medium">MechTrack</span>
      </div>
      <div className="flex items-center gap-2">
        {userRole === 'admin' && (
          <>
            <button onClick={onNewVehicle} className="hidden sm:flex text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors" style={{ background: '#2563EB' }}>
              + Ingresar vehículo
            </button>
            <button onClick={onMetrics} className="hidden sm:flex text-slate-400 hover:text-white text-xs px-2 py-1.5 rounded-lg border border-slate-700 transition-colors">
              Métricas
            </button>
            <button onClick={onSettings} className="hidden sm:flex text-slate-400 hover:text-white text-xs px-2 py-1.5 rounded-lg border border-slate-700 transition-colors">
              Config
            </button>
          </>
        )}
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium" style={{ background: '#1E3A5F', color: '#60A5FA' }}>
          {initials}
        </div>
        <button onClick={onSignOut} className="text-slate-400 hover:text-white text-xs px-2 py-1.5 rounded-lg border border-slate-700 transition-colors">
          Salir
        </button>
      </div>
    </div>
  )
}

function StatCards({ workingTickets, pendingDelivery, todayDone, mechanics }: {
  workingTickets: Ticket[]
  pendingDelivery: Ticket[]
  todayDone: Ticket[]
  mechanics: Mechanic[]
}) {
  const activeCount = workingTickets.filter(t => t.status === 'in_progress').length
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      {[
        { label: 'Activos', value: workingTickets.length, sub: `${activeCount} en proceso`, color: '#2563EB' },
        { label: 'Pend. entrega', value: pendingDelivery.length, sub: 'Listos para entregar', color: '#F97316' },
        { label: 'Completados hoy', value: todayDone.length, sub: 'Entregados', color: '#16A34A' },
        { label: 'Mecánicos', value: mechanics.length, sub: 'Registrados', color: '#7C3AED' },
      ].map(s => (
        <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3.5">
          <p className="text-xs text-gray-400 mb-1">{s.label}</p>
          <p className="text-2xl font-medium text-gray-900 leading-none mb-1">{s.value}</p>
          <p className="text-xs" style={{ color: s.color }}>{s.sub}</p>
        </div>
      ))}
    </div>
  )
}

function TicketCard({ ticket, showAssign, showDeliver, mechanics, assigningId, deliveringId, onAssign, onDeliver }: {
  ticket: Ticket
  showAssign: boolean
  showDeliver: boolean
  mechanics: Mechanic[]
  assigningId: string | null
  deliveringId: string | null
  onAssign: (ticketId: string, mechanicId: string) => void
  onDeliver: (ticket: Ticket) => void
}) {
  const v = Array.isArray(ticket.vehicles) ? ticket.vehicles[0] : ticket.vehicles
  const u = Array.isArray(ticket.users) ? ticket.users[0] : ticket.users
  const statusInfo = STATUS_LABELS[ticket.status] ?? { label: ticket.status, color: 'bg-gray-100 text-gray-600' }
  const mins = ticket.status !== 'delivered' ? getElapsedMinutes(ticket) : null
  const isAlert = mins !== null && mins >= 0

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="font-mono text-base font-semibold text-gray-900">{v?.plate ?? '—'}</span>
          <p className="text-sm text-gray-500 mt-0.5">{v ? `${v.brand ?? ''} ${v.model}`.trim() : '—'}</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
        <span>{v?.owner_name ?? '—'} · {v?.owner_phone ?? ''}</span>
        {mins !== null && (
          <span className={`font-medium ${isAlert && mins >= 30 ? 'text-red-500' : 'text-gray-400'}`}>
            {formatTime(mins)}{isAlert && mins >= 30 ? ' ⚠️' : ''}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        {showAssign ? (
          <select
            value={ticket.mechanic_id ?? ''}
            onChange={e => onAssign(ticket.id, e.target.value)}
            disabled={assigningId === ticket.id || ticket.status === 'in_progress' || ticket.status === 'waiting_part'}
            className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">Sin asignar</option>
            {mechanics.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        ) : (
          <span className="text-xs text-gray-400">{u?.name ?? '—'}</span>
        )}
        {showDeliver && (
          <button
            onClick={() => onDeliver(ticket)}
            disabled={deliveringId === ticket.id}
            className="text-white text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50 flex-shrink-0"
            style={{ background: '#16A34A' }}
          >
            {deliveringId === ticket.id ? 'Guardando...' : '✓ Entregar'}
          </button>
        )}
      </div>
    </div>
  )
}

function TicketTable({ tickets, showAssign, showDeliver, mechanics, assigningId, deliveringId, alertMinutes, onAssign, onDeliver }: {
  tickets: Ticket[]
  showAssign: boolean
  showDeliver: boolean
  mechanics: Mechanic[]
  assigningId: string | null
  deliveringId: string | null
  alertMinutes: number
  onAssign: (ticketId: string, mechanicId: string) => void
  onDeliver: (ticket: Ticket) => void
}) {
  if (tickets.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
        <p className="text-gray-400 text-sm">No hay tickets.</p>
      </div>
    )
  }

  return (
    <>
      {/* Mobile: tarjetas */}
      <div className="sm:hidden space-y-3">
        {tickets.map(ticket => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            showAssign={showAssign}
            showDeliver={showDeliver}
            mechanics={mechanics}
            assigningId={assigningId}
            deliveringId={deliveringId}
            onAssign={onAssign}
            onDeliver={onDeliver}
          />
        ))}
      </div>

      {/* Desktop: tabla */}
      <div className="hidden sm:block bg-white border border-gray-100 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead style={{ background: '#F8FAFC' }} className="border-b border-gray-100">
            <tr>
              {['Placa', 'Vehículo', 'Dueño', 'Mecánico', 'Estado', 'Ingreso', 'Entrega est.', 'Completado', 'Tiempo', ...(showDeliver ? ['Acción'] : [])].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {tickets.map(ticket => {
              const v = Array.isArray(ticket.vehicles) ? ticket.vehicles[0] : ticket.vehicles
              const u = Array.isArray(ticket.users) ? ticket.users[0] : ticket.users
              const statusInfo = STATUS_LABELS[ticket.status] ?? { label: ticket.status, color: 'bg-gray-100 text-gray-600' }
              const mins = ticket.status !== 'delivered' ? getElapsedMinutes(ticket) : null
              const isAlert = mins !== null && mins >= alertMinutes

              function formatDate(dateStr: string | null) {
                if (!dateStr) return '—'
                return new Date(dateStr).toLocaleString('es-CO', {
                  timeZone: 'America/Bogota', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })
              }

              return (
                <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-gray-900 text-sm">{v?.plate ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-sm">{v ? `${v.brand ?? ''} ${v.model}`.trim() : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-800">{v?.owner_name ?? '—'}</div>
                    <div className="text-xs text-gray-400">{v?.owner_phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    {showAssign ? (
                      <select
                        value={ticket.mechanic_id ?? ''}
                        onChange={e => onAssign(ticket.id, e.target.value)}
                        disabled={assigningId === ticket.id || ticket.status === 'in_progress' || ticket.status === 'waiting_part'}
                        className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                      >
                        <option value="">Sin asignar</option>
                        {mechanics.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    ) : (
                      <span className="text-xs text-gray-500">{u?.name ?? '—'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{formatDate(ticket.created_at)}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{formatDate(ticket.estimated_at)}</td>
                  <td className="px-4 py-3 text-xs">
                    {ticket.completed_at
                      ? <span className="text-green-600 font-medium">{formatDate(ticket.completed_at)}</span>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {mins !== null ? (
                      <span className={`font-medium ${isAlert ? 'text-red-500' : 'text-gray-400'}`}>
                        {formatTime(mins)}{isAlert ? ' ⚠️' : ''}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  {showDeliver && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onDeliver(ticket)}
                        disabled={deliveringId === ticket.id}
                        className="text-white text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
                        style={{ background: '#16A34A' }}
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
    </>
  )
}

export default function DashboardClient({
  activeTickets,
  doneTickets,
  mechanics,
  userName,
  userRole,
  alertMinutes,
}: {
  activeTickets: Ticket[]
  doneTickets: Ticket[]
  mechanics: Mechanic[]
  userName: string
  userRole: string
  alertMinutes: number
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

  const tabs = [
    { key: 'activos', label: 'Activos', count: workingTickets.length },
    { key: 'entrega', label: 'Entrega', count: pendingDelivery.length },
    ...(userRole === 'admin' ? [
      { key: 'hoy', label: 'Hoy', count: todayDone.length },
      { key: 'historial', label: 'Historial', count: doneTickets.length },
    ] : []),
  ] as { key: 'activos' | 'entrega' | 'hoy' | 'historial', label: string, count: number }[]

  const tableProps = { mechanics, assigningId, deliveringId, alertMinutes, onAssign: assignMechanic, onDeliver: markDelivered }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F8FAFC' }}>
      <NavBar
        userName={userName}
        userRole={userRole}
        onSignOut={handleSignOut}
        onNewVehicle={() => router.push('/vehicles/new')}
        onMetrics={() => router.push('/dashboard/metrics')}
        onSettings={() => router.push('/dashboard/settings')}
      />

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 pt-5 pb-8">

        {/* Stats — solo admin */}
        {userRole === 'admin' && (
          <StatCards
            workingTickets={workingTickets}
            pendingDelivery={pendingDelivery}
            todayDone={todayDone}
            mechanics={mechanics}
          />
        )}

        {/* Botón móvil ingresar vehículo */}
        {userRole === 'admin' && (
          <button
            onClick={() => router.push('/vehicles/new')}
            className="sm:hidden w-full text-white text-sm font-medium py-3 rounded-xl mb-4 transition-colors"
            style={{ background: '#2563EB' }}
          >
            + Ingresar vehículo
          </button>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl w-full sm:w-fit mb-5" style={{ background: '#E2E8F0' }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`min-w-[18px] h-[18px] rounded-full text-xs flex items-center justify-center px-1 ${
                  tab === t.key ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Contenido */}
        {tab === 'activos' && (
          workingTickets.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
              <p className="text-gray-400 text-sm mb-3">No hay tickets activos.</p>
              <button onClick={() => router.push('/vehicles/new')} className="text-blue-600 text-sm hover:underline">
                Ingresar el primer vehículo →
              </button>
            </div>
          ) : (
            <TicketTable tickets={workingTickets} showAssign={true} showDeliver={false} {...tableProps} />
          )
        )}
        {tab === 'entrega' && <TicketTable tickets={pendingDelivery} showAssign={false} showDeliver={true} {...tableProps} />}
        {tab === 'hoy' && <TicketTable tickets={todayDone} showAssign={false} showDeliver={false} {...tableProps} />}
        {tab === 'historial' && <TicketTable tickets={doneTickets} showAssign={false} showDeliver={false} {...tableProps} />}

        {/* Nav móvil admin */}
        {userRole === 'admin' && (
          <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex">
            <button onClick={() => router.push('/dashboard/metrics')} className="flex-1 py-3 text-xs text-gray-500 hover:text-gray-900 flex flex-col items-center gap-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              Métricas
            </button>
            <button onClick={() => router.push('/dashboard/settings')} className="flex-1 py-3 text-xs text-gray-500 hover:text-gray-900 flex flex-col items-center gap-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              Config
            </button>
          </div>
        )}
      </div>
    </div>
  )
}