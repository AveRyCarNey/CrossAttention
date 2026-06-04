'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import TicketCard from './TicketCard';
import TicketFilters from './TicketFilters';

// ─── Types ────────────────────────────────────────────────────
export interface Ticket {
  id: string;
  title: string;
  status: string;
  priority: string;
  sender?: string;
  created_at?: string;
  assigned_to?: string | null;
  assigned_email?: string | null;
  assigned_name?: string | null;
}

interface TicketListProps {
  /** Tickets pre-fetched desde el Server Component (ya filtrados por rol) */
  initialTickets: Ticket[];
  /** Rol del usuario autenticado, ya validado en el servidor */
  userRole: 'agent' | 'user';
  /** UUID del usuario autenticado */
  currentUserId: string;
}

// ─── Loading State ────────────────────────────────────────────
function EmptyState({ filtered }: { filtered?: boolean }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-20 px-8 text-center
                 bg-white border-4 border-black rounded-none
                 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-fade-in"
    >
      <p
        className="text-xl font-black text-black uppercase tracking-tight mb-1"
        style={{ fontFamily: '"Space Grotesk", sans-serif' }}
      >
        {filtered ? 'SIN RESULTADOS' : 'BANDEJA VACÍA'}
      </p>
      <p className="text-sm text-cross-text-dim font-medium max-w-xs uppercase mt-2">
        {filtered
          ? 'NINGÚN TICKET COINCIDE CON LOS FILTROS SELECCIONADOS.'
          : 'NO HAY TICKETS REGISTRADOS EN ESTE MOMENTO. CUANDO LLEGUEN, APARECERÁN AQUÍ.'}
      </p>
    </div>
  );
}

// ─── Error State ──────────────────────────────────────────────
function ErrorState({ message }: { message?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 px-8 text-center
                 bg-red-500 border-4 border-black rounded-none
                 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-fade-in"
    >
      <p
        className="text-xl font-black text-white uppercase tracking-tight mb-1"
        style={{ fontFamily: '"Space Grotesk", sans-serif' }}
      >
        ⚠ ERROR DE CONEXIÓN
      </p>
      <p className="text-sm text-white font-bold max-w-sm uppercase mt-2 break-words">
        {message ?? 'NO SE PUDO CONECTAR A LA BASE DE DATOS.'}
      </p>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────
export default function TicketList({
  initialTickets,
  userRole,
  currentUserId,
}: TicketListProps) {
  const searchParams = useSearchParams();

  // Los tickets ya vienen pre-fetched y filtrados por el servidor
  const [tickets] = useState<Ticket[]>(initialTickets);

  // ── Leer filtros desde URL (filtrado client-side adicional) ────
  const filterPriority   = searchParams.get('priority')   ?? '';
  const filterStatus     = searchParams.get('status')     ?? '';
  const filterAssignment = searchParams.get('assignment') ?? '';
  const filterDateFrom   = searchParams.get('dateFrom')   ?? '';

  // ── Aplicar filtros client-side ───────────────────────────────
  const filteredTickets = tickets.filter((t) => {
    const pKey = (t.priority ?? '').toLowerCase();
    const sKey = (t.status ?? '').toLowerCase();

    // Prioridad
    if (filterPriority && pKey !== filterPriority.toLowerCase()) return false;

    // Estado
    if (filterStatus && sKey !== filterStatus.toLowerCase()) return false;

    // Asignación (solo relevante para agentes)
    if (filterAssignment === 'mine' && t.assigned_to !== currentUserId) return false;
    if (filterAssignment === 'unassigned' && t.assigned_to) return false;

    // Fecha desde
    if (filterDateFrom && t.created_at) {
      const ticketDate = new Date(t.created_at);
      const fromDate   = new Date(filterDateFrom);
      if (ticketDate < fromDate) return false;
    }

    return true;
  });

  const isFiltered = !!(filterPriority || filterStatus || filterAssignment || filterDateFrom);

  return (
    <div className="space-y-6">
      {userRole === 'user' ? (
        <h2
          className="text-2xl font-black text-cross-text uppercase tracking-tight mb-4"
          style={{ fontFamily: '"Space Grotesk", sans-serif' }}
        >
          MIS TICKETS REPORTADOS
        </h2>
      ) : (
        <>
          {/* ── Contadores ─────────────────────────────────────── */}
          <div className="flex flex-wrap gap-3 mb-4">
            {/* Pill 1: Total */}
            <div className="inline-flex items-center gap-2 bg-white border-4 border-black px-4 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-xs font-black uppercase tracking-wider text-cross-text-dim" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>TOTAL:</span>
              <span className="text-sm font-black text-black">{tickets.length}</span>
            </div>
            {/* Pill 2: Alta Prioridad */}
            <div className="inline-flex items-center gap-2 bg-cross-accent border-4 border-black px-4 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-xs font-black uppercase tracking-wider text-black" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>ALTA PRIORIDAD:</span>
              <span className="text-sm font-black text-black">{tickets.filter(t => t.priority?.toLowerCase() === 'alta').length}</span>
            </div>
            {/* Pill 3: Sin Asignar */}
            <div className="inline-flex items-center gap-2 bg-amber-400 border-4 border-black px-4 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-xs font-black uppercase tracking-wider text-black" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>SIN ASIGNAR:</span>
              <span className="text-sm font-black text-black">{tickets.filter(t => !t.assigned_to).length}</span>
            </div>
            {/* Pill 4: Filtrados (solo si hay filtros activos) */}
            {isFiltered && (
              <div className="inline-flex items-center gap-2 bg-purple-400 border-4 border-black px-4 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <span className="text-xs font-black uppercase tracking-wider text-black" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>FILTRADOS:</span>
                <span className="text-sm font-black text-black">{filteredTickets.length}</span>
              </div>
            )}
          </div>

          {/* ── Barra de Filtros ──────────────────────────────── */}
          <TicketFilters />
        </>
      )}

      {filteredTickets.length === 0 ? (
        <EmptyState filtered={isFiltered} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                currentUserId={currentUserId}
                userRole={userRole}
              />
            ))}
          </div>

          {/* Footer strip */}
          <div
            className="flex items-center justify-between px-5 py-3
                       bg-white border-4 border-black
                       shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                       text-[11px] font-black text-cross-text-dim uppercase tracking-wider"
            style={{ fontFamily: '"Space Grotesk", sans-serif' }}
            aria-live="polite"
          >
            <span>
              {isFiltered
                ? `${filteredTickets.length} DE ${tickets.length} TICKETS`
                : `${tickets.length} TICKET${tickets.length !== 1 ? 'S' : ''} EN BANDEJA`}
            </span>
            <span>{tickets.filter(t => t.assigned_to).length} ASIGNADO{tickets.filter(t => t.assigned_to).length !== 1 ? 'S' : ''}</span>
          </div>
        </>
      )}
    </div>
  );
}