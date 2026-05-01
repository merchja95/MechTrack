'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  received:         { label: 'Recibido',             color: 'bg-gray-100 text-gray-600' },
  assigned:         { label: 'Asignado',             color: 'bg-purple-100 text-purple-700' },
  in_progress:      { label: 'En proceso',           color: 'bg-blue-100 text-blue-700' },
  waiting_part:     { label: 'Esp. repuesto',        color: 'bg-yellow-100 text-yellow-700' },
  pending_delivery: { label: 'Pendiente entrega',    color: 'bg-orange-100 text-orange-700' },
  delivered:        { label: 'Entregado',            color: 'bg-green-100 text-green-700' },
}

const ACTIONS = [
  { next: 'in_progress',      label: 'Empecé a trabajar',        primary: true  },
  { next: 'waiting_part',     label: 'En espera de repuesto',    primary: false },
  { next: 'pending_delivery', label: 'Listo — pendiente entrega', success: true  },
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

function NavBar({ name, onSignOut }: { name: string; onSignOut: () => void }) {
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
        <div>
          <span className="text-white text-sm font-medium">MechTrack</span>
          <span className="text-slate-400 text-xs ml-2">{name}</span>
        </div>
      </div>
      <button onClick={onSignOut} className="text-slate-400 hover:text-white text-xs px-3 py-1.5 rounded-lg border border-slate-700 transition-colors">
        Salir
      </button>
    </div>
  )
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

  const activeTicket = tickets.find(t => t.status === 'in_progress' || t.status === 'waiting_part') ?? tickets[0]

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
      window.alert('Error actualizando estado. Intenta de nuevo.')
    } finally {
      setLoading(null)
    }
  }

  if (tickets.length === 0) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#F8FAFC' }}>
        <NavBar name={mechanic?.name ?? ''} onSignOut={handleSignOut} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#DBEAFE' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-900 mb-1">Sin tickets pendientes</p>
            <p className="text-sm text-gray-400">No tienes vehículos asignados por ahora</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F8FAFC' }}>
      <NavBar name={mechanic?.name ?? ''} onSignOut={handleSignOut} />

      <div className="flex-1 px-4 py-5 max-w-lg mx-auto w-full space-y-3">

        {/* Ticket activo */}
        {activeTicket && (() => {
          const v = Array.isArray(activeTicket.vehicles) ? activeTicket.vehicles[0] : activeTicket.vehicles
          const statusCfg = STATUS_CONFIG[activeTicket.status]
          return (
            <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#BFDBFE' }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#2563EB' }}>Ticket activo</span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusCfg?.color}`}>
                  {statusCfg?.label}
                </span>
              </div>

              <p className="font-mono text-2xl font-semibold text-gray-900 mb-1">{v?.plate}</p>
              <p className="text-sm text-gray-500 mb-1">{v?.model}</p>
              <p className="text-sm text-gray-400 mb-4">{v?.owner_name}</p>

              {activeTicket.notes && (
                <div className="rounded-xl px-3 py-2.5 mb-4 text-sm text-gray-600" style={{ background: '#F8FAFC', border: '0.5px solid #E2E8F0' }}>
                  {activeTicket.notes}
                </div>
              )}

              <div className="space-y-2">
                {ACTIONS.map(({ next, label, primary, success }) => {
                  const isActive = activeTicket.status === next
                  const isLoading = loading === activeTicket.id + next
                  let btnStyle = 'border border-gray-200 text-gray-500 bg-white'
                  if (primary) btnStyle = 'text-white'
                  if (success) btnStyle = 'text-white'
                  return (
                    <button
                      key={next}
                      disabled={isActive || loading !== null}
                      onClick={() => updateStatus(activeTicket.id, next, v?.owner_phone, v?.plate)}
                      className={`w-full py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${btnStyle}`}
                      style={
                        isActive ? { background: '#F1F5F9', color: '#94A3B8' } :
                        primary ? { background: '#2563EB' } :
                        success ? { background: '#16A34A' } : {}
                      }
                    >
                      {isLoading ? 'Guardando...' : label}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* Cola */}
        {tickets.filter(t => t.id !== activeTicket?.id).length > 0 && (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 px-1 pt-2">En cola</p>
            {tickets.filter(t => t.id !== activeTicket?.id).map(ticket => {
              const v = Array.isArray(ticket.vehicles) ? ticket.vehicles[0] : ticket.vehicles
              return (
                <div key={ticket.id} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 opacity-50 flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm font-semibold text-gray-700">{v?.plate}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{v?.model} · {v?.owner_name}</p>
                  </div>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">🔒 En cola</span>
                </div>
              )
            })}
          </>
        )}

      </div>
    </div>
  )
}