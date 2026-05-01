'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function NewVehiclePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    plate: '',
    brand: '',
    model: '',
    year: '',
    color: '',
    owner_name: '',
    owner_phone: '',
    owner_email: '',
  })
  const [notes, setNotes] = useState('')
  const [estimatedAt, setEstimatedAt] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [plateChecking, setPlateChecking] = useState(false)
  const [error, setError] = useState('')

  async function handlePlateBlur() {
    if (!form.plate || form.plate.length < 4) return
    setPlateChecking(true)
    const { data } = await supabase
      .from('vehicles')
      .select('brand, model, year, color, owner_name, owner_phone, owner_email')
      .eq('plate', form.plate.toUpperCase())
      .maybeSingle()

    if (data) {
      setForm(prev => ({ ...prev, ...data }))
    }
    setPlateChecking(false)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setPhotos(Array.from(e.target.files))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (photos.length === 0) {
      setError('Debes subir al menos 1 foto de ingreso.')
      return
    }

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No hay sesión activa')

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!userData) throw new Error('Usuario no encontrado en la BD')
      const company_id = userData.company_id

      const { data: vehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .upsert(
          {
            company_id,
            plate: form.plate.toUpperCase(),
            brand: form.brand,
            model: form.model,
            year: parseInt(form.year),
            color: form.color,
            owner_name: form.owner_name,
            owner_phone: form.owner_phone,
            owner_email: form.owner_email || null,
          },
          { onConflict: 'plate' }
        )
        .select()
        .single()

      if (vehicleError) throw vehicleError

      const photoUrls: string[] = []
      for (const photo of photos) {
        const ext = photo.name.split('.').pop()
        const fileName = `${company_id}/${vehicle.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('vehicle-photos')
          .upload(fileName, photo)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('vehicle-photos')
          .getPublicUrl(fileName)

        photoUrls.push(urlData.publicUrl)
      }

      const { error: ticketError } = await supabase
        .from('tickets')
        .insert({
          company_id,
          vehicle_id: vehicle.id,
          status: 'received',
          notes,
          estimated_at: estimatedAt ? new Date(estimatedAt).toISOString() : null,
        })

      if (ticketError) throw ticketError

      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Ingresar vehículo</h1>
          <p className="text-gray-500 text-sm mt-1">Completa los datos y sube al menos 1 foto</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">

          {/* Placa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Placa *
            </label>
            <input
              name="plate"
              value={form.plate}
              onChange={handleChange}
              onBlur={handlePlateBlur}
              placeholder="ABC123"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {plateChecking && (
              <p className="text-xs text-blue-500 mt-1">Buscando placa...</p>
            )}
          </div>

          {/* Marca / Modelo / Año / Color */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { name: 'brand', label: 'Marca', placeholder: 'Toyota' },
              { name: 'model', label: 'Modelo', placeholder: 'Corolla' },
              { name: 'year', label: 'Año', placeholder: '2020', type: 'number' },
              { name: 'color', label: 'Color', placeholder: 'Blanco' },
            ].map(field => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label} *
                </label>
                <input
                  name={field.name}
                  value={form[field.name as keyof typeof form]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  type={field.type || 'text'}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>

          {/* Dueño */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del dueño *
              </label>
              <input
                name="owner_name"
                value={form.owner_name}
                onChange={handleChange}
                placeholder="Juan Pérez"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono *
              </label>
              <input
                name="owner_phone"
                value={form.owner_phone}
                onChange={handleChange}
                placeholder="3012850364"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Email dueño */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico del dueño <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              name="owner_email"
              type="email"
              value={form.owner_email}
              onChange={handleChange}
              placeholder="juan@correo.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Si se ingresa, el dueño recibirá notificaciones por email en cada cambio de estado.</p>
          </div>

          {/* Ticket */}
          <div className="border-t border-gray-100 pt-4 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Ticket de servicio
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas / diagnóstico inicial
              </label>
              <input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ej: Cambio de aceite + revisión de frenos"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hora estimada de entrega
              </label>
              <input
                type="datetime-local"
                value={estimatedAt}
                onChange={e => setEstimatedAt(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Fotos */}
          <div className="border-t border-gray-100 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fotos de ingreso * (mínimo 1)
            </label>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {photos.length === 0 ? (
                <div>
                  <p className="text-gray-400 text-sm">Toca para seleccionar fotos</p>
                  <p className="text-gray-300 text-xs mt-1">JPG, PNG — múltiples permitidas</p>
                </div>
              ) : (
                <p className="text-blue-600 text-sm font-medium">
                  {photos.length} foto{photos.length > 1 ? 's' : ''} seleccionada{photos.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-3 rounded-lg transition-colors"
          >
            {loading ? 'Guardando...' : 'Ingresar vehículo'}
          </button>
        </form>
      </div>
    </div>
  )
}