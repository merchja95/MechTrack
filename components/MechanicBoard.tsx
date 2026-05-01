'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  received:         { label: 'Recibido',              color: 'bg-gray-100 text-gray-600' },
  assigned:         { label: 'Asignado',              color: 'bg-purple-100 text-purple-700' },
  in_progress:      { label: 'En progreso',           color: 'bg-blue-100 text-blue-700' },
  waiting_part:     { label: 'Esperando repuesto',    color: 'bg-yellow-100 text-yellow-700' },
  pending_delivery: { label: 'Pendiente de entrega',  color: 'bg-orange-100 text-orange-700' },
  delivered:        { label: 'Entregado',             color: 'bg-green-100 text-green-700' },
}

const ACTIONS = [
  { next: 'in_progress',      label: '▶ Empecé a trabajar',       style: 'bg-blue-600 hover:bg-blue-700 text-white' },
  { next: 'waiting_part',     label: '⏸ En espera de repuesto',   style: 'bg-yellow-500 hover:bg-yellow-600 text-white' },
  { next: 'pending_delivery', label: '✓ Listo — pendiente entrega', style: 'bg-green-600 hover:bg-green-700 text-white' },
]

interface Vehicle {
  plate: string
  model: string
  owner_name: string
  owner_phone: string
}

interface Ticket {
  id: string
  status: string
  notes?: string
  vehicles: Vehicle | Vehicle[]
}

interface Props {
  tickets: Ticket[]
  mechanic: { name: string } | null
}

export default function MechanicBoard({ tickets: initial, mechanic }: Props) {
  const [tickets, setTickets] = useState<Ticket[]>(initial)
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // El ticket activo es el primero en in_progress, o si no hay, el primero assigned/received
  const activeTicket = tickets.find(t => t.status === 'in_progress' || t.status === 'waiting_part')
    ?? tickets[0]

  async function updateStatus(ticketId: string, newStatus: string, ownerPhone: string, plate: string) {
    setLoading(ticketId + newStatus)
    try {
      const res = await fetch('/api/tickets/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, status: newStatus, phone: ownerPhone, plate }),
      })

      if (!res.ok) throw new Error('Error')

      setTickets(prev =>
        newStatus === 'pending_delivery'
          ? prev.filter(t => t.id !== ticketId)
          : prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t)
      )
    } catch {
      alert('Error actualizando estado. Intenta de nuevo.')
    } finally {
      setLoading(null)
    }
  }

  if (tickets.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="flex items-center justify-between px-4 py-4 bg-white border-b border-gray-200">
          <div>
            <h1 className="text-lg font-bold text-gray-800">MechTrack</h1>
            <p className="text-xs text-gray-500">Hola, {mechanic?.name}</p>
          </div>
          <button onClick={handleSignOut} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2">
            Salir
          </button>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-5xl mb-4">🎉</p>
            <p className="text-xl font-semibold text-gray-700">Sin tickets pendientes</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between px-4 py-4 bg-white border-b border-gray-200 mb-6">
        <div>
          <h1 className="text-lg font-bold text-gray-800">MechTrack</h1>
          <p className="text-xs text-gray-500">Hola, {mechanic?.name} · {tickets.length} ticket(s)</p>
        </div>
        <button onClick={handleSignOut} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2">
          Salir
        </button>
      </header>

      <div className="space-y-4 max-w-lg mx-auto px-4">
        {tickets.map(ticket => {
          const statusCfg = STATUS_CONFIG[ticket.status]
          const v = Array.isArray(ticket.vehicles) ? ticket.vehicles[0] : ticket.vehicles
          const isActive = ticket.id === activeTicket?.id
          const isBlocked = !isActive

          return (
            <div
              key={ticket.id}
              className={`bg-white rounded-2xl shadow-sm border p-5 transition-all ${
                isBlocked ? 'border-gray-100 opacity-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl font-bold tracking-widest text-gray-800">{v?.plate}</span>
                <div className="flex items-center gap-2">
                  {isBlocked && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">🔒 En cola</span>
                  )}
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusCfg?.color}`}>
                    {statusCfg?.label}
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-1">{v?.model}</p>
              <p className="text-sm text-gray-500 mb-4">{v?.owner_name}</p>

              {ticket.notes && (
                <p className="text-sm bg-gray-50 rounded-lg p-3 text-gray-600 mb-4 italic">
                  📝 {ticket.notes}
                </p>
              )}

              {isActive && (
                <div className="grid gap-2">
                  {ACTIONS.map(({ next, label, style }) => (
                    <button
                      key={next}
                      disabled={ticket.status === next || loading !== null}
                      onClick={() => updateStatus(ticket.id, next, v?.owner_phone, v?.plate)}
                      className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${style} disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {loading === ticket.id + next ? 'Guardando...' : label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}