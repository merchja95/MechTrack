'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type DayData = { date: string; count: number }
type MechanicData = { name: string; count: number }

type Metrics = {
  ticketsByDay: DayData[]
  avgMinutes: number | null
  byMechanic: MechanicData[]
}

function formatMinutes(mins: number | null): string {
  if (mins === null) return '—'
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  if (h === 0) return `${m} min`
  return `${h}h ${m}m`
}

export default function MetricsClient({ companyId }: { companyId: string }) {
  const router = useRouter()
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/metrics?company_id=${companyId}`)
      .then(r => r.json())
      .then(data => {
        setMetrics(data)
        setLoading(false)
      })
  }, [companyId])

  const maxCount = metrics ? Math.max(...metrics.ticketsByDay.map(d => d.count), 1) : 1

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">MechTrack</h1>
          <p className="text-xs text-gray-500">Métricas</p>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2"
        >
          ← Volver al dashboard
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {loading ? (
          <div className="text-center py-20 text-gray-400">Cargando métricas...</div>
        ) : (
          <>
            {/* Tiempo promedio */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Tiempo promedio de servicio
              </h2>
              <p className="text-4xl font-bold text-gray-900">
                {formatMinutes(metrics?.avgMinutes ?? null)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Desde recepción hasta entrega al cliente</p>
            </div>

            {/* Tickets por día */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-6">
                Tickets ingresados — últimos 7 días
              </h2>
              <div className="flex items-end gap-3 h-40">
                {metrics?.ticketsByDay.map(d => (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-xs font-semibold text-gray-700">
                      {d.count > 0 ? d.count : ''}
                    </span>
                    <div
                      className="w-full rounded-t-md bg-blue-500 transition-all"
                      style={{ height: `${Math.max((d.count / maxCount) * 120, d.count > 0 ? 8 : 2)}px` }}
                    />
                    <span className="text-xs text-gray-400 text-center leading-tight">{d.date}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Por mecánico */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Tickets completados por mecánico
              </h2>
              {metrics?.byMechanic.length === 0 ? (
                <p className="text-gray-400 text-sm">Sin datos aún.</p>
              ) : (
                <div className="space-y-3">
                  {metrics?.byMechanic.map(m => (
                    <div key={m.name} className="flex items-center gap-4">
                      <span className="text-sm text-gray-700 w-32 truncate">{m.name}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-3">
                        <div
                          className="bg-blue-500 h-3 rounded-full transition-all"
                          style={{
                            width: `${(m.count / (metrics.byMechanic[0]?.count ?? 1)) * 100}%`
                          }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 w-6 text-right">
                        {m.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}