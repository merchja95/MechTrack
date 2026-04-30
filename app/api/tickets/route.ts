// Después de insertar el ticket exitosamente:
import { sendWhatsApp } from '@/lib/whatsapp'

// Obtener el teléfono del dueño
const { data: vehicle } = await supabase
  .from('vehicles')
  .select('owner_phone, plate')
  .eq('id', ticketData.vehicle_id)
  .single()

if (vehicle?.owner_phone) {
  await sendWhatsApp(vehicle.owner_phone, vehicle.plate, 'received')
}