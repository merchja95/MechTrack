import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const STATUS_LABELS: Record<string, string> = {
  assigned:         '🔧 Tu vehículo fue asignado a un mecánico',
  in_progress:      '🔧 Tu vehículo está en proceso',
  waiting_part:     '⏳ Tu vehículo está esperando un repuesto',
  pending_delivery: '✅ Tu vehículo está listo para recoger',
  delivered:        '🎉 Tu vehículo fue entregado',
}

export async function sendStatusEmail({
  to,
  ownerName,
  plate,
  status,
}: {
  to: string
  ownerName: string
  plate: string
  status: string
}) {
  const subject = STATUS_LABELS[status]
  if (!subject || !to) return

  await resend.emails.send({
    from: 'MechTrack <onboarding@resend.dev>',
    to,
    subject,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #111;">MechTrack</h2>
        <p>Hola <strong>${ownerName}</strong>,</p>
        <p>Te informamos que el estado de tu vehículo <strong>${plate}</strong> ha cambiado:</p>
        <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="font-size: 18px; font-weight: bold; margin: 0;">${subject}</p>
        </div>
        <p style="color: #666; font-size: 13px;">Este es un mensaje automático de MechTrack.</p>
      </div>
    `,
  })
}