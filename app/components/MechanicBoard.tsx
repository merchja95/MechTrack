'use client'
import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const STATUS_CONFIG = {
  pending:      { label: 'Sin iniciar',        color: 'bg-gray-100 text-gray-600' },
  in_progress:  { label: 'En progreso',         color: 'bg-blue-100 text-blue-700' },
  waiting_part: { label: 'Esperando repuesto',  color: 'bg-yellow-100 text-yellow-700' },
  done:         { label: 'Listo',               color: 'bg-green-100 text-green-700' },
}

const ACTIONS = [
  { next: 'in_progress',  label: '▶ Empecé a trabajar', style: 'bg-blue-600 hover:bg-blue-700 text-white' },
  { next: 'waiting_part', label: '⏸ En espera de repuesto', style: 'bg-yellow-500 hover:bg-yellow-600 text-white' },
  { next: 'done',         label: '✓ Listo', style: 'bg-green-600 hover:bg-green-700 text-white' },
]

export default function MechanicBoard({ tickets: initial, mechanic }: any) {
  const supabase = createClientComponentClient()
  const [tickets, setTickets] = useState(initial)
  const [loading, setLoading] = useState<string | null>(null)

  async function updateStatus(ticketId: string, newStatus: string, ownerPhone: string, plate: string) {
    setLoading(ticketId + newStatus)
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', ticketId)

      if (error) throw error

      // Notificar por WhatsApp
      await fetch('/api/whatsapp/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: ownerPhone, plate, status: newStatus }),
      })

      // Actualizar UI: si está "done", remover de la lista
      setTickets((prev: any[]) =>
        newStatus === 'done'
          ? prev.filter((t: any) => t.id !== ticketId)
          : prev.map((t: any) => t.id === ticketId ? { ...t, status: newStatus } : t)
      )
    } catch (err) {
      alert('Error actualizando estado. Intenta de nuevo.')
    } finally {
      setLoading(null)
    }
  }

  if (tickets.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-5xl mb-4">🎉</p>
          <p className="text-xl font-semibold text-gray-700">Sin tickets pendientes</p>
          <p className="text-gray-400 mt-1">Hola, {mechanic?.full_name}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Mis vehículos</h1>
        <p className="text-gray-500 text-sm">Hola, {mechanic?.full_name} · {tickets.length} ticket(s)</p>
      </header>

      <div className="space-y-4 max-w-lg mx-auto">
        {tickets.map((ticket: any) => {
          const statusCfg = STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG]
          const v = ticket.vehicles

          return (
            <div key={ticket.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              {/* Cabecera del ticket */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl font-bold tracking-widest text-gray-800">{v?.plate}</span>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusCfg.color}`}>
                  {statusCfg.label}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-1">{v?.model}</p>
              <p className="text-sm text-gray-500 mb-4">{v?.owner_name}</p>

              {ticket.notes && (
                <p className="text-sm bg-gray-50 rounded-lg p-3 text-gray-600 mb-4 italic">
                  📝 {ticket.notes}
                </p>
              )}

              {/* Botones de acción */}
              <div className="grid gap-2">
                {ACTIONS.map(({ next, label, style }) => (
                  <button
                    key={next}
                    disabled={ticket.status === next || loading !== null}
                    onClick={() => updateStatus(ticket.id, next, v?.owner_phone, v?.plate)}
                    className={`w-full py-3 rounded-xl font-semibold text-sm transition-all
                      ${style}
                      disabled:opacity-40 disabled:cursor-not-allowed
                      ${loading === ticket.id + next ? 'opacity-60' : ''}
                    `}
                  >
                    {loading === ticket.id + next ? 'Guardando...' : label}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}