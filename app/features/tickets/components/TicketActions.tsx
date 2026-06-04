'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { revalidateDashboard } from '../actions';

// ─── Types ────────────────────────────────────────────────────
interface TicketActionsProps {
  ticketId: string;
  status: string;
  userRole: string;
  /** UUID del usuario que creó el ticket — se usa para insertar la notificación */
  ticketOwnerId?: string;
  /** Título del ticket — se usa para el mensaje de la notificación */
  ticketTitle?: string;
}

// ─── Status transition map ────────────────────────────────────
// Each entry = { label, nextStatus, colors }
const STATUS_ACTIONS = [
  {
    id: 'en_progreso',
    label: 'EN PROGRESO',
    nextStatus: 'en progreso',
    // Amber/yellow Neo-Brutalist button
    bg: '#FFEA6C',
    border: '#0F172A',
    text: '#0F172A',
    shadow: '4px 4px 0px 0px #0F172A',
    hoverBg: '#f5df5f',
    // Only show when NOT already "en progreso"
    hideWhenStatus: 'en progreso',
  },
  {
    id: 'resuelto',
    label: 'CERRAR TICKET',
    nextStatus: 'resuelto',
    // Strong pink / rose Neo-Brutalist button
    bg: '#FE81D4',
    border: '#0F172A',
    text: '#0F172A',
    shadow: '4px 4px 0px 0px #0F172A',
    hoverBg: '#fd5fc8',
    hideWhenStatus: 'resuelto',
  },
];

// ─── Single Action Button ─────────────────────────────────────
function ActionButton({
  label,
  bg,
  border,
  text,
  shadow,
  hoverBg,
  disabled,
  onClick,
}: {
  label: string;
  bg: string;
  border: string;
  text: string;
  shadow: string;
  hoverBg: string;
  disabled: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: disabled ? '#d1d5db' : hovered ? hoverBg : bg,
        border: `3px solid ${disabled ? '#9ca3af' : border}`,
        color: disabled ? '#9ca3af' : text,
        boxShadow: disabled ? 'none' : hovered ? '2px 2px 0px 0px #0F172A' : shadow,
        transform: hovered && !disabled ? 'translate(2px, 2px)' : 'translate(0, 0)',
        fontFamily: '"Space Grotesk", sans-serif',
        fontWeight: 900,
        fontSize: '0.8125rem',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        padding: '0.625rem 1.25rem',
        borderRadius: '0.5rem',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.12s ease',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}

// ─── TicketActions ────────────────────────────────────────────
export default function TicketActions({
  ticketId,
  status,
  userRole,
  ticketOwnerId,
  ticketTitle,
}: TicketActionsProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (userRole === 'user') {
    return (
      <section
        aria-label="Estado del ticket"
        style={{
          borderTop: '3px solid #0F172A',
          marginTop: '2rem',
          paddingTop: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.625rem',
            background: '#FFFBEB', // Crema
            border: '3px solid #0F172A', // Borde oscuro
            boxShadow: '4px 4px 0px 0px #0F172A',
            borderRadius: '0.625rem',
            padding: '0.75rem 1.25rem',
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 700,
            fontSize: '0.8125rem',
            letterSpacing: '0.04em',
            color: '#0F172A',
          }}
        >
          El estado de tu ticket está siendo gestionado por un agente.
        </div>
      </section>
    );
  }

  const currentStatus = status.toLowerCase().trim();
  const isAlreadyResolved = currentStatus === 'resuelto';

  const handleUpdateStatus = async (nextStatus: string) => {
    setIsUpdating(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // ── Consulta previa para obtener el user_id (creador/dueño del ticket) ──
    const { data: ticketData, error: fetchError } = await supabase
      .from('tickets')
      .select('user_id')
      .eq('id', ticketId)
      .single();

    if (fetchError || !ticketData) {
      setErrorMsg(`Error al obtener los datos del ticket: ${fetchError?.message || 'No encontrado'}`);
      setIsUpdating(false);
      return;
    }

    const ownerId = ticketData.user_id;

    // Actualizar el estado del ticket
    const { error } = await supabase
      .from('tickets')
      .update({ status: nextStatus })
      .eq('id', ticketId);

    if (error) {
      setErrorMsg(`Error al actualizar: ${error.message}`);
      setIsUpdating(false);
      return;
    }

    // ── Insertar notificación al dueño del ticket ──────────────
    if (ownerId) {
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: ownerId,
        ticket_id: ticketId,
        title: 'Actualización de Estado',
        message: `El estado de tu ticket ha cambiado a ${nextStatus}.`,
        is_read: false,
      });

      if (notifError) {
        console.error('Error al insertar notificación:', notifError);
      }
    }

    // Revalidar el dashboard para refrescar los datos y campanita inmediatamente
    try {
      await revalidateDashboard();
    } catch (revalError) {
      console.error('Error al revalidar el dashboard:', revalError);
    }

    setSuccessMsg(`ESTADO ACTUALIZADO A "${nextStatus.toUpperCase()}"`);

    // Brief pause so user sees the success message, then navigate
    setTimeout(() => {
      router.refresh();
      router.push('/dashboard');
    }, 800);
  };

  // Filter actions: hide the button for the current status
  const availableActions = STATUS_ACTIONS.filter(
    (a) => a.hideWhenStatus !== currentStatus
  );

  return (
    <section
      aria-label="Acciones del ticket"
      style={{
        borderTop: '3px solid #0F172A',
        marginTop: '2rem',
        paddingTop: '1.5rem',
      }}
    >
      {/* Section label */}
      <p
        style={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontWeight: 900,
          fontSize: '0.6875rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: '#334155',
          marginBottom: '1rem',
        }}
      >
        Cambiar Estado
      </p>

      {/* Feedback messages */}
      {errorMsg && (
        <div
          role="alert"
          style={{
            background: '#fecaca',
            border: '3px solid #0F172A',
            boxShadow: '3px 3px 0px 0px #0F172A',
            borderRadius: '0.5rem',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 700,
            fontSize: '0.8125rem',
            color: '#0F172A',
          }}
        >
          ERROR: {errorMsg}
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          style={{
            background: '#bbf7d0',
            border: '3px solid #0F172A',
            boxShadow: '3px 3px 0px 0px #0F172A',
            borderRadius: '0.5rem',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 700,
            fontSize: '0.8125rem',
            color: '#0F172A',
          }}
        >
          {successMsg} — REDIRIGIENDO...
        </div>
      )}

      {/* Resolved badge */}
      {isAlreadyResolved ? (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#bbf7d0',
            border: '3px solid #0F172A',
            boxShadow: '4px 4px 0px 0px #0F172A',
            borderRadius: '0.5rem',
            padding: '0.625rem 1.25rem',
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 900,
            fontSize: '0.8125rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#0F172A',
          }}
        >
          TICKET CERRADO
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          {availableActions.map((action) => (
            <ActionButton
              key={action.id}
              label={isUpdating ? 'PROCESANDO...' : action.label}
              bg={action.bg}
              border={action.border}
              text={action.text}
              shadow={action.shadow}
              hoverBg={action.hoverBg}
              disabled={isUpdating}
              onClick={() => handleUpdateStatus(action.nextStatus)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
