'use client';

import Link from 'next/link';
import TicketActionButtons from '@/app/components/TicketActionButtons';
import type { Ticket } from './TicketList';

// ─── Types ────────────────────────────────────────────────────
interface TicketCardProps {
  ticket: Ticket;
  currentUserId: string | null;
  userRole: string;
}

// ─── Priority config ──────────────────────────────────────────
const PRIORITY_CONFIG: Record<string, { label: string; bg: string; dot: string; pulse: boolean }> = {
  alta: {
    label: 'ALTA',
    bg: 'bg-cross-accent',
    dot: 'bg-red-500',
    pulse: true,
  },
  media: {
    label: 'MEDIA',
    bg: 'bg-amber-400',
    dot: 'bg-amber-700',
    pulse: false,
  },
  baja: {
    label: 'BAJA',
    bg: 'bg-emerald-400',
    dot: 'bg-emerald-700',
    pulse: false,
  },
};

// ─── Status config ────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { bg: string; text: string }> = {
  'abierto':     { bg: 'bg-blue-200',    text: 'text-blue-900' },
  'en progreso': { bg: 'bg-amber-200',   text: 'text-amber-900' },
  'escalado':    { bg: 'bg-rose-200',    text: 'text-rose-900' },
  'resuelto':    { bg: 'bg-emerald-200', text: 'text-emerald-900' },
};

// ─── Relative time helper ─────────────────────────────────────
function relativeTime(isoDate?: string): string {
  if (!isoDate) return '';
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1)    return 'AHORA';
  if (mins < 60)   return `${mins}M`;
  const hours = Math.floor(mins / 60);
  if (hours < 24)  return `${hours}H`;
  const days = Math.floor(hours / 24);
  return `${days}D`;
}

// ─── TicketCard ───────────────────────────────────────────────
export default function TicketCard({ ticket, currentUserId, userRole }: TicketCardProps) {
  const pKey = (ticket.priority ?? 'baja').toLowerCase();
  const sKey = (ticket.status ?? 'abierto').toLowerCase();
  const prioConfig = PRIORITY_CONFIG[pKey] ?? PRIORITY_CONFIG['baja'];
  const statusConfig = STATUS_CONFIG[sKey] ?? { bg: 'bg-gray-200', text: 'text-gray-800' };

  // Visibilidad de botones — evaluada en el padre, no en TicketActionButtons
  const isAgentOrAdmin = userRole === 'agent' || userRole === 'admin';
  const isAssignedToMe = !!currentUserId && ticket.assigned_to === currentUserId;

  // Determinar el nombre/email del agente asignado
  const assignedLabel = ticket.assigned_name
    ?? ticket.assigned_email
    ?? (ticket.assigned_to ? ticket.assigned_to.slice(0, 8).toUpperCase() : null);

  return (
    <div
      className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]
                 p-5 flex flex-col gap-4 transition-transform
                 hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]"
      style={{ fontFamily: '"Space Grotesk", sans-serif' }}
    >
      {/* ── CABECERA: ID + PRIORIDAD ────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-[10px] font-black text-cross-text-dim uppercase tracking-[0.18em]"
        >
          #{ticket.id.slice(0, 8).toUpperCase()}
        </span>

        <span
          className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider
                     px-2.5 py-1 border-2 border-black
                     ${prioConfig.bg} text-black
                     shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                     ${prioConfig.pulse ? 'priority-alta' : ''}`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${prioConfig.dot}`}
            aria-hidden="true"
          />
          {prioConfig.label}
        </span>
      </div>

      {/* ── CUERPO: TITULO + REMITENTE ──────────────────────── */}
      <Link
        href={`/dashboard/ticket/${ticket.id}`}
        style={{ textDecoration: 'none', color: 'inherit' }}
      >
        <div className="flex flex-col gap-1 cursor-pointer">
          <h3
            className="font-black text-xl text-black uppercase leading-tight tracking-tight line-clamp-2"
            title={ticket.title}
          >
            {ticket.title}
          </h3>
          <span
            className="text-xs font-bold text-cross-text-dim uppercase tracking-wider"
          >
            REMITENTE: {ticket.sender ?? 'DESCONOCIDO'}
          </span>
        </div>
      </Link>

      {/* ── TIEMPO ──────────────────────────────────────────── */}
      {ticket.created_at && (
        <span
          className="text-[10px] font-bold text-cross-text-dim uppercase tracking-wider"
          title={new Date(ticket.created_at).toLocaleString('es')}
        >
          HACE {relativeTime(ticket.created_at)}
        </span>
      )}

      {/* ── PIE: ESTADO + ASIGNACION ────────────────────────── */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t-2 border-black/20">
        <span
          className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1
                     border-2 border-black ${statusConfig.bg} ${statusConfig.text}`}
        >
          {ticket.status}
        </span>

        <span
          className="text-[10px] font-bold text-cross-text-dim uppercase tracking-wide truncate max-w-[50%] text-right"
          title={assignedLabel ?? 'SIN ASIGNAR'}
        >
          {assignedLabel ? `AGENTE: ${assignedLabel}` : 'SIN ASIGNAR'}
        </span>
      </div>

      {/* ── BOTONES DE ACCION (Client Component separado) ───── */}
      {isAgentOrAdmin && sKey !== 'resuelto' && (
        <TicketActionButtons
          ticketId={ticket.id}
          status={ticket.status}
          assignedTo={ticket.assigned_to ?? null}
          currentUserId={currentUserId ?? undefined}
        />
      )}
    </div>
  );
}
