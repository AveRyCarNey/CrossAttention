'use client';

import ManagerCommandCenter from '../features/dashboard/components/ManagerCommandCenter';
import TicketList from '../features/tickets/components/TicketList';
import type { Ticket } from '../features/tickets/components/TicketList';

interface DashboardShellProps {
  /** Rol ya validado en el Server Component padre */
  role: 'manager' | 'agent' | 'user';
  /** Tickets pre-fetched por el servidor (vacío para manager) */
  tickets: Ticket[];
  /** UUID del usuario autenticado */
  userId: string;
}

/**
 * Shell de presentación puro — NO hace fetch propio.
 * Recibe datos ya resueltos desde el Server Component (page.tsx)
 * y bifurca la vista según el rol.
 */
export default function DashboardShell({ role, tickets, userId }: DashboardShellProps) {
  // ════════════════════════════════════════════════════════════════
  // RAMA MANAGER — Centro de Mando exclusivo
  // ════════════════════════════════════════════════════════════════
  if (role === 'manager') {
    return (
      <div className="min-h-screen bg-cross-bg px-6 py-8 md:px-12 md:py-12 selection:bg-cross-accent selection:text-white">
        <div className="max-w-6xl mx-auto">
          <ManagerCommandCenter />
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // RAMA AGENT / USER — Bandeja de entrada
  // ════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-cross-bg px-6 py-8 md:px-12 md:py-12 selection:bg-cross-accent selection:text-white">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* ── HEADER ──────────────────────────────────────────────── */}
        <header className="animate-slide-header">
          {role === 'user' ? (
            /* ENCABEZADO DE USUARIO */
            <div className="mb-8">
              <h1
                className="text-5xl font-black uppercase tracking-tighter mb-2 mt-4 text-cross-text"
                style={{ fontFamily: '"Space Grotesk", sans-serif' }}
              >
                Mis Tickets
              </h1>
              <p
                className="font-medium text-lg text-gray-800"
                style={{ fontFamily: '"DM Sans", sans-serif' }}
              >
                Aquí puedes revisar el estado de tus solicitudes de soporte enviadas.
              </p>
            </div>
          ) : (
            <>
              {/* Eyebrow label */}
              <div className="inline-flex items-center gap-2 mb-4">
                <span
                  className="block w-2.5 h-2.5 rounded-full bg-cross-accent"
                  style={{ boxShadow: '0 0 0 3px #FF61F820, 0 0 0 6px #FF61F810' }}
                  aria-hidden="true"
                />
                <span
                  className="text-xs font-bold tracking-[0.2em] uppercase text-cross-text-dim"
                  style={{ fontFamily: '"Space Grotesk", sans-serif' }}
                >
                  Panel de Agente
                </span>
              </div>

              {/* Título */}
              <h1
                className="text-5xl md:text-7xl font-black text-cross-text uppercase leading-none tracking-tighter mb-3"
                style={{ fontFamily: '"Space Grotesk", sans-serif' }}
              >
                Bandeja de Entrada
              </h1>

              <p
                className="text-cross-text-dim text-base md:text-lg max-w-xl leading-relaxed font-medium mt-4"
                style={{ fontFamily: '"DM Sans", sans-serif' }}
              >
                Gestiona y resuelve todos los tickets del sistema en tiempo real.
              </p>
            </>
          )}
        </header>

        {/* ── TICKET LIST ─────────────────────────────────────────── */}
        <main>
          <TicketList
            initialTickets={tickets}
            userRole={role}
            currentUserId={userId}
          />
        </main>

      </div>
    </div>
  );
}
