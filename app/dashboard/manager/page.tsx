'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';
import ManagerMetrics from '../../features/dashboard/components/ManagerMetrics';

// ─── Types ────────────────────────────────────────────────────
interface Ticket {
  id: string;
  title: string;
  status: string;
  priority: string;
  sender?: string;
  created_at: string;
}

// ─── Mock Fallback Tickets ────────────────────────────────────
const MOCK_HIGH_PRIORITY_TICKETS: Ticket[] = [
  { id: '1', sender: 'María García',    title: 'No puedo acceder a mi cuenta premium',    priority: 'alta',  status: 'abierto',     created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: '2', sender: 'Carlos Ruiz',     title: 'Error al procesar pago con tarjeta Visa',  priority: 'alta',  status: 'en progreso', created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: '4', sender: 'Luis Fernández',  title: 'La app se cierra inesperadamente en iOS',  priority: 'alta',  status: 'escalado',    created_at: new Date(Date.now() - 14400000).toISOString() },
  { id: '7', sender: 'Valentina Cruz',  title: 'Duplicación de cobros en mi historial',    priority: 'alta',  status: 'abierto',     created_at: new Date(Date.now() - 172800000).toISOString() },
];

// ─── Status Pill Styling ──────────────────────────────────────
const STATUS_CONFIG: Record<string, { ring: string; text: string; bg: string }> = {
  'abierto':     { ring: 'border-blue-400',   text: 'text-blue-700',   bg: 'bg-blue-50' },
  'en progreso': { ring: 'border-amber-400',  text: 'text-amber-700',  bg: 'bg-amber-50' },
  'escalado':    { ring: 'border-rose-400',   text: 'text-rose-700',   bg: 'bg-rose-50' },
  'resuelto':    { ring: 'border-emerald-400', text: 'text-emerald-700', bg: 'bg-emerald-50' },
};

// ─── Avatar Initials Helper ───────────────────────────────────
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');

  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  return (
    <div
      className="flex-shrink-0 w-8 h-8 rounded-full border-2 border-[#0F172A]
                 flex items-center justify-center text-[10px] font-black text-[#0F172A]
                 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]"
      style={{
        background: `hsl(${hue}, 70%, 80%)`,
        fontFamily: '"Space Grotesk", sans-serif',
      }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

// ─── Relative time helper ─────────────────────────────────────
function relativeTime(isoDate?: string): string {
  if (!isoDate) return '';
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const mins   = Math.floor(diffMs / 60000);
  if (mins < 1)    return 'ahora';
  if (mins < 60)   return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24)  return `${hours}h`;
  const days  = Math.floor(hours / 24);
  return `${days}d`;
}

export default function ManagerDashboardPage() {
  const router = useRouter();

  // Authentication & authorization states
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [isLoadingCheck, setIsLoadingCheck] = useState<boolean>(true);

  // Tickets states
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState<boolean>(true);
  const [isRealData, setIsRealData] = useState<boolean>(true);

  // ─── 1. Role verification ───────────────────────────────────
  useEffect(() => {
    async function verifyManagerAccess() {
      try {
        setIsLoadingCheck(true);

        // Fetch current session
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          console.warn('Unauthorized: No active user session.');
          router.push('/dashboard');
          return;
        }

        // Fetch user's profile role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError || !profile || (profile.role !== 'manager' && profile.role !== 'admin')) {
          console.warn('Unauthorized: User role is not manager or admin.');
          router.push('/dashboard');
          return;
        }

        // User is authorized
        setCurrentUserRole(profile.role);
        setIsLoadingCheck(false);

        // Fetch tickets
        await fetchHighPriorityTickets();
      } catch (error) {
        console.error('Permission validation crashed:', error);
        router.push('/dashboard');
      }
    }

    verifyManagerAccess();
  }, [router]);

  // ─── 2. Fetch Tickets ────────────────────────────────────────
  async function fetchHighPriorityTickets() {
    try {
      setIsLoadingTickets(true);
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('priority', 'alta')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error || !data || data.length === 0) {
        console.warn('No high-priority tickets or database error, using mocks.');
        setTickets(MOCK_HIGH_PRIORITY_TICKETS);
        setIsRealData(false);
      } else {
        setTickets(data as Ticket[]);
        setIsRealData(true);
      }
    } catch (err) {
      console.error('Error fetching tickets, falling back:', err);
      setTickets(MOCK_HIGH_PRIORITY_TICKETS);
      setIsRealData(false);
    } finally {
      setIsLoadingTickets(false);
    }
  }

  // ─── Loading Screen (Full Page) ──────────────────────────────
  if (isLoadingCheck) {
    return (
      <div className="min-h-screen bg-cross-bg flex flex-col items-center justify-center p-6 select-none">
        <div className="bg-white border-[3px] border-[#0F172A] p-8 rounded-2xl shadow-[6px_6px_0px_0px_#0F172A] text-center max-w-sm animate-pulse">
          <span className="text-5xl mb-4 block animate-bounce" aria-hidden="true">🔑</span>
          <p className="text-xl font-black text-[#0F172A] uppercase tracking-tight" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
            Verificando credenciales
          </p>
          <p className="text-xs text-cross-text-dim mt-2 font-medium">
            Confirmando nivel de acceso de manager...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cross-bg px-6 py-8 md:px-12 md:py-12 selection:bg-cross-accent selection:text-white">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* ─── HEADER BUTTONS & NAVIGATION ─────────────────────────── */}
        <div className="flex justify-between items-center animate-slide-header">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 border-[3px] border-[#0F172A] px-4 py-2 rounded-xl bg-white font-black text-xs uppercase tracking-wider text-[#0F172A] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_#0F172A] active:translate-y-0 active:shadow-none"
            style={{ fontFamily: '"Space Grotesk", sans-serif' }}
          >
            VOLVER A BANDEJA
          </Link>
          
          <span className="inline-flex items-center gap-2 px-3 py-1 border-[3px] border-[#0F172A] rounded-full text-xs font-black uppercase tracking-wider bg-white select-none shadow-[2px_2px_0px_0px_#0F172A]">
            <span className="block w-2.5 h-2.5 rounded-full bg-cross-accent animate-pulse" />
            Nivel: {currentUserRole}
          </span>
        </div>

        {/* ─── NEO-BRUTALIST TITLE CARD ────────────────────────────── */}
        <header
          className="bg-[#FF61F8] border-[4px] border-[#0F172A] p-6 md:p-8 rounded-2xl relative select-none animate-fade-in-up"
          style={{ boxShadow: '8px 8px 0px 0px #0F172A' }}
        >
          <h1
            className="text-4xl md:text-6xl font-black text-[#0F172A] uppercase tracking-tighter leading-none"
            style={{ fontFamily: '"Space Grotesk", sans-serif' }}
          >
            Panel de Rendimiento <br className="hidden sm:inline" />
            <span className="bg-[#FFEA6C] px-3 py-1 border-[3px] border-[#0F172A] inline-block mt-3 transform -rotate-1 shadow-[4px_4px_0px_0px_#0F172A] text-2xl md:text-4xl font-black tracking-normal">
              (Manager)
            </span>
          </h1>
          <p
            className="text-sm md:text-base font-bold text-[#0F172A]/85 mt-5 max-w-2xl leading-relaxed"
            style={{ fontFamily: '"DM Sans", sans-serif' }}
          >
            Monitorea en tiempo real las métricas clave de resolución de incidencias, detecta cuellos de botella y supervisa los 5 tickets de prioridad alta más recientes para garantizar la máxima calidad de servicio.
          </p>

          <span
            className="absolute top-4 right-4 w-3.5 h-3.5 rounded-full border-[3px] border-[#0F172A] bg-[#FFEA6C]"
            aria-hidden="true"
          />
        </header>

        {/* ─── METRICS COMPONENT ────────────────────────────────────── */}
        <section className="bg-white/40 border-[3px] border-[#0F172A] p-6 rounded-2xl shadow-[6px_6px_0px_0px_#0F172A]">
          <ManagerMetrics userRole={currentUserRole || 'manager'} />
        </section>

        {/* ─── HIGH PRIORITY TICKETS TABLE ──────────────────────────── */}
        <section className="space-y-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          
          <div className="flex items-center gap-3">
            <span
              className="block w-1.5 h-6 rounded-full bg-[#FF61F8] border-2 border-[#0F172A]"
              aria-hidden="true"
            />
            <h2
              className="text-sm font-black uppercase tracking-[0.2em] text-[#334155]"
              style={{ fontFamily: '"Space Grotesk", sans-serif' }}
            >
              Incidencias Críticas Recientes
            </h2>
            
            {!isRealData && (
              <span className="ml-auto text-[9px] font-black uppercase border-2 border-[#0F172A] bg-[#FDE68A] px-2 py-0.5 rounded-md shadow-[1px_1px_0px_0px_#0F172A] select-none">
                Mocks
              </span>
            )}
          </div>

          <div
            className="w-full bg-white border-[3px] border-[#0F172A] rounded-2xl overflow-hidden shadow-[6px_6px_0px_0px_#0F172A]"
            role="table"
            aria-label="Tickets de Alta Prioridad"
          >
            {/* Table Header */}
            <div
              className="bg-[#0F172A] text-white px-5 py-3 grid grid-cols-12 gap-x-4 text-[10px] font-black uppercase tracking-[0.18em] select-none"
              style={{ fontFamily: '"Space Grotesk", sans-serif' }}
            >
              <div className="col-span-1 text-center hidden sm:block">#</div>
              <div className="col-span-8 sm:col-span-5">Remitente / Título</div>
              <div className="col-span-4 sm:col-span-3 text-center">Estado</div>
              <div className="col-span-3 text-right hidden sm:block">Fecha / Hora</div>
            </div>

            {/* Table Rows / Content */}
            <div className="divide-y-[3px] divide-[#0F172A] bg-cross-card/10">
              {isLoadingTickets ? (
                // Shimmer state
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="px-5 py-4 grid grid-cols-12 gap-x-4 items-center animate-pulse">
                    <div className="col-span-1 hidden sm:block h-4 bg-slate-200 rounded w-1/3 mx-auto" />
                    <div className="col-span-8 sm:col-span-5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
                      <div className="space-y-2 w-full">
                        <div className="h-3 bg-slate-200 rounded w-1/3" />
                        <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                      </div>
                    </div>
                    <div className="col-span-4 sm:col-span-3 h-6 bg-slate-200 rounded-full w-24 mx-auto" />
                    <div className="col-span-3 h-3.5 bg-slate-200 rounded w-16 ml-auto hidden sm:block" />
                  </div>
                ))
              ) : tickets.length === 0 ? (
                // Empty state
                <div className="px-5 py-12 text-center select-none bg-white">
                  <p className="font-black text-[#0F172A] uppercase text-sm" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                    NO HAY TICKETS CRÍTICOS
                  </p>
                  <p className="text-xs text-cross-text-dim mt-2 font-medium uppercase">
                    Ningún ticket de prioridad alta está pendiente.
                  </p>
                </div>
              ) : (
                // Tickets listing
                tickets.map((ticket, index) => {
                  const sKey = ticket.status?.toLowerCase() || 'abierto';
                  const statusConf = STATUS_CONFIG[sKey] || { ring: 'border-slate-400', text: 'text-slate-700', bg: 'bg-slate-50' };

                  return (
                    <Link
                      key={ticket.id}
                      href={`/dashboard/ticket/${ticket.id}`}
                      className="grid grid-cols-12 items-center gap-x-4 px-5 py-4 cursor-pointer transition-colors duration-150 hover:bg-[#FF61F8]/10 group outline-none focus:bg-[#FF61F8]/15"
                      role="row"
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      {/* # Index */}
                      <div className="col-span-1 hidden sm:flex items-center justify-center select-none" aria-hidden="true">
                        <span className="text-[11px] font-black text-cross-text-dim tabular-nums" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                          {String(index + 1).padStart(2, '0')}
                        </span>
                      </div>

                      {/* Sender + Title */}
                      <div className="col-span-8 sm:col-span-5 flex items-center gap-3 min-w-0">
                        <Avatar name={ticket.sender || 'Usuario Anónimo'} />
                        <div className="flex flex-col min-w-0">
                          <span
                            className="text-[13px] font-black text-[#0F172A] uppercase truncate leading-tight tracking-tight"
                            style={{ fontFamily: '"Space Grotesk", sans-serif' }}
                          >
                            {ticket.sender || 'Usuario Anónimo'}
                          </span>
                          <span className="text-sm text-cross-text-dim truncate font-medium leading-snug group-hover:text-[#0F172A] transition-colors duration-150">
                            {ticket.title}
                          </span>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="col-span-4 sm:col-span-3 flex justify-center">
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border-2 border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] ${statusConf.bg} ${statusConf.text}`}
                          style={{ fontFamily: '"Space Grotesk", sans-serif' }}
                        >
                          {ticket.status}
                        </span>
                      </div>

                      {/* Date */}
                      <div className="col-span-3 text-right hidden sm:block shrink-0 select-none">
                        <span className="text-[11px] text-cross-text-dim font-black tabular-nums mr-2" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                          {relativeTime(ticket.created_at)}
                        </span>
                        <span className="text-[10px] text-cross-text-dim/60 font-medium">
                          ({new Date(ticket.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })})
                        </span>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>

            {/* Table Footer strip */}
            <div
              className="bg-[#0F172A]/5 border-t-[3px] border-[#0F172A] px-5 py-3 text-[11px] font-black uppercase tracking-wider text-cross-text-dim flex justify-between select-none"
              style={{ fontFamily: '"Space Grotesk", sans-serif' }}
            >
              <span>Mostrando los 5 más recientes</span>
              <span className="text-[#0F172A]">PRIORIDAD ALTA</span>
            </div>
          </div>

        </section>

      </div>
    </div>
  );
}
