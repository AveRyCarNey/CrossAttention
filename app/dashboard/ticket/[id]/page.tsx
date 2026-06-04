'use client';

export const dynamic = 'force-dynamic';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import TicketActionButtons from '@/app/components/TicketActionButtons';
import TicketActions from '@/app/features/tickets/components/TicketActions';
import TicketComments from '@/app/features/tickets/components/TicketComments';
import Loader from '@/app/components/Loader';

// ─── Types ────────────────────────────────────────────────────
interface Ticket {
  id: string;
  title: string;
  status: string;
  priority: string;
  sender?: string;
  description?: string;
  created_at?: string;
  sentiment?: string;
  // owner
  user_id?: string;
  // agent assignment
  assigned_to?: string | null;
  assigned_email?: string | null;
  assigned_name?: string | null;
  // AI / observability fields
  ai_summary?: string | null;
  ai_suggested_response?: string | null;
  ai_next_action?: string | null;
  ai_model?: string | null;
  ai_latency?: number | null;
  ai_prompt?: string | null;
  ai_raw_result?: string | null;
  risk_level?: string | null;
}

// ─── Priority badge config ────────────────────────────────────
const PRIORITY_STYLE: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  alta:  { bg: '#FE81D4', border: '#0F172A', text: '#0F172A', dot: '#dc2626' },
  media: { bg: '#FFEA6C', border: '#0F172A', text: '#0F172A', dot: '#b45309' },
  baja:  { bg: '#bbf7d0', border: '#0F172A', text: '#0F172A', dot: '#065f46' },
};

// ─── Status badge config ──────────────────────────────────────
const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  'abierto':     { bg: '#bfdbfe', text: '#1e3a5f' },
  'en progreso': { bg: '#fef08a', text: '#713f12' },
  'escalado':    { bg: '#fecaca', text: '#7f1d1d' },
  'resuelto':    { bg: '#bbf7d0', text: '#064e3b' },
};

// ─── Not Found UI ─────────────────────────────────────────────
function TicketNotFound() {
  return (
    <div
      className="min-h-screen bg-cross-bg flex items-center justify-center px-6"
      style={{ background: '#FFEA6C' }}
    >
      <div
        style={{
          background: '#FFA6FB',
          border: '4px solid #0F172A',
          boxShadow: '8px 8px 0px 0px #0F172A',
          borderRadius: '1rem',
          padding: '3rem 2.5rem',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            background: '#0F172A',
            color: '#FFEA6C',
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 900,
            fontSize: '1rem',
            letterSpacing: '0.1em',
            padding: '0.5rem 1rem',
            border: '3px solid #0F172A',
            borderRadius: '0.5rem',
            marginBottom: '1.5rem',
            textTransform: 'uppercase',
          }}
        >
          ERROR 404
        </div>
        <h1
          style={{
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 900,
            fontSize: '2rem',
            textTransform: 'uppercase',
            color: '#0F172A',
            marginBottom: '0.75rem',
            letterSpacing: '-0.02em',
          }}
        >
          Ticket no encontrado
        </h1>
        <p
          style={{
            fontFamily: '"DM Sans", sans-serif',
            color: '#334155',
            fontSize: '1rem',
            marginBottom: '2rem',
            lineHeight: 1.6,
          }}
        >
          El ticket que buscas no existe o fue eliminado.
        </p>
        <Link
          href="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#FFEA6C',
            border: '3px solid #0F172A',
            boxShadow: '4px 4px 0px 0px #0F172A',
            borderRadius: '0.5rem',
            padding: '0.75rem 1.5rem',
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 900,
            fontSize: '0.875rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#0F172A',
            textDecoration: 'none',
            transition: 'all 0.12s ease',
          }}
        >
          VOLVER A BANDEJA
        </Link>
      </div>
    </div>
  );
}

// ─── Loading UI ───────────────────────────────────────────────
function LoadingDetail() {
  return <Loader />;
}

// ─── Ticket Detail Page (Client Component) ───────────────────
export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // ── Resumen de Ticket (IA) ───────────────────────────────────
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [ticketSummary, setTicketSummary] = useState<{ mainProblem: string; recommendedAction: string } | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        // ── Rol del usuario autenticado ──────────────────────
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) console.error('🔴 ERROR DE AUTH:', authError.message);

        if (user && isMounted) {
          setCurrentUserId(user.id);
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          if (profileError) console.error('🔴 ERROR AL LEER PERFIL:', profileError.message);
          if (isMounted) {
            setUserRole(profile?.role ?? 'user');
          }
        }

        // ── Ticket con JOIN al perfil del agente asignado ────
        // Solo pedimos id y email — full_name no existe en la tabla profiles
        const { data, error } = await supabase
          .from('tickets')
          .select('*, assigned_to:profiles!assigned_to(id, email)')
          .eq('id', id)
          .single();

        if (error || !data) {
          console.error('🔴 ERROR EN QUERY CON JOIN:', error?.message, '— intentando fallback sin join...');
          // Fallback: query plana sin join
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('tickets')
            .select('*')
            .eq('id', id)
            .single();

          if (fallbackError || !fallbackData) {
            console.error('🔴 ERROR FATAL EN FALLBACK:', fallbackError?.message);
            if (isMounted) {
              setNotFound(true);
            }
          } else {
            if (isMounted) {
              setTicket({
                ...fallbackData,
                assigned_email: null,
                assigned_name: null,
              });
            }
          }
        } else {
          // Con el alias assigned_to:profiles(...), Supabase sobreescribe el campo
          // assigned_to con el objeto del perfil. Extraemos el UUID y el email.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const profile = (data as any).assigned_to as { id?: string; email?: string } | null;
          if (isMounted) {
            setTicket({
              ...data,
              assigned_to: profile?.id ?? data.assigned_to ?? null,
              assigned_email: profile?.email ?? null,
              assigned_name: null,
            });
          }
        }
      } catch (err) {
        console.error('🔴 FATAL ERROR AL CARGAR TICKET:', err);
        if (isMounted) {
          setNotFound(true);
        }
      } finally {
        // CRÍTICO: siempre liberar el loading state
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (id) fetchData();

    return () => {
      isMounted = false;
    };
  }, [id, supabase]);

  if (isLoading) return <LoadingDetail />;
  if (notFound || !ticket) return <TicketNotFound />;

  const pKey = (ticket.priority ?? 'baja').toLowerCase();
  const sKey = (ticket.status ?? 'abierto').toLowerCase();
  const prioStyle   = PRIORITY_STYLE[pKey] ?? PRIORITY_STYLE['baja'];
  const statusStyle = STATUS_STYLE[sKey]   ?? { bg: '#e2e8f0', text: '#0F172A' };

  // RBAC: solo agentes pueden tomar/escalar. Admin y manager solo observan.
  const isAgent = userRole === 'agent';
  const isAgentOrAdmin = userRole === 'agent' || userRole === 'admin';
  const isUnassigned = !ticket.assigned_to;
  const isAssignedToMe = ticket.assigned_to === currentUserId;
  const isResolved = sKey === 'resuelto';

  // Lógica de control para el Chat
  const isAssigned = !!ticket.assigned_to;
  const isEscalated = ticket.status?.toLowerCase() === 'escalado';
  const isResolvedOrClosed = ticket.status?.toUpperCase() === 'RESUELTO' || ticket.status?.toUpperCase() === 'CERRADO';
  const canChat = isAssigned && !isResolvedOrClosed && !isEscalated;
  const showChatColumn = isAssignedToMe || userRole === 'user' || userRole === 'admin' || userRole === 'manager';

  // Nombre/email del agente asignado para mostrar — nunca UUID crudo
  const assignedLabel = ticket.assigned_name
    ?? ticket.assigned_email
    ?? (ticket.assigned_to ? `AGENTE-${ticket.assigned_to.slice(0, 8).toUpperCase()}` : null);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FFEA6C',
        padding: '2.5rem 1.5rem',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

        {/* ── Back link ─────────────────────────────────────── */}
        <Link 
          href="/dashboard" 
          className="font-bold mb-4 inline-block hover:underline"
        >
           BANDEJA DE ENTRADA
        </Link>

        {/* ── DOBLE COLUMNA: Ticket Info | Chat ─────────────── */}
        <div className={showChatColumn ? "flex flex-col lg:flex-row gap-8 w-full" : "w-full max-w-3xl mx-auto flex flex-col gap-8"}>

          {/* ════════════════════════════════════════════════════
              COLUMNA IZQUIERDA — Información del Ticket
          ════════════════════════════════════════════════════ */}
          <article
            className={showChatColumn ? "w-full lg:w-1/2" : "w-full"}
            style={{
              background: '#FFA6FB',
              border: '4px solid #0F172A',
              boxShadow: '8px 8px 0px 0px #0F172A',
              borderRadius: '1rem',
              padding: '2rem 2rem 2.5rem',
              animation: 'fade-in-up 0.45s cubic-bezier(0.22,1,0.36,1) both',
            }}
          >
            {/* ── Eyebrow: Ticket ID ───────────────────────── */}
            <p
              style={{
                fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 700,
                fontSize: '0.6875rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: '#334155',
                marginBottom: '0.75rem',
              }}
            >
              Ticket #{id.slice(0, 8).toUpperCase()}
            </p>

            {/* ── Title ─────────────────────────────────────── */}
            <h1
              style={{
                fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 900,
                fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                textTransform: 'uppercase',
                color: '#0F172A',
                marginBottom: '1.5rem',
              }}
            >
              {ticket.title}
            </h1>

            {/* ── Meta row: Sender + Priority + Status ──────── */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1.5rem',
                paddingBottom: '1.25rem',
                borderBottom: '3px solid #0F172A',
              }}
            >
              {/* Sender */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: '#FFEA6C',
                  border: '2px solid #0F172A',
                  boxShadow: '2px 2px 0px 0px #0F172A',
                  borderRadius: '99px',
                  padding: '0.375rem 0.875rem',
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  color: '#0F172A',
                  letterSpacing: '0.04em',
                }}
              >
                <span style={{ opacity: 0.6, fontSize: '9px', fontWeight: 900 }} className="uppercase">REMITENTE:</span>
                {ticket.sender ?? 'Remitente desconocido'}
              </div>

              {/* Priority badge */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  background: prioStyle.bg,
                  border: `2px solid ${prioStyle.border}`,
                  boxShadow: '2px 2px 0px 0px #0F172A',
                  borderRadius: '99px',
                  padding: '0.375rem 0.875rem',
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontWeight: 900,
                  fontSize: '0.6875rem',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: prioStyle.text,
                }}
                aria-label={`Prioridad: ${ticket.priority}`}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: prioStyle.dot,
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                />
                {ticket.priority ?? 'Sin prioridad'}
              </div>

              {/* Status badge */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: statusStyle.bg,
                  border: '2px solid #0F172A',
                  boxShadow: '2px 2px 0px 0px #0F172A',
                  borderRadius: '99px',
                  padding: '0.375rem 0.875rem',
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontWeight: 700,
                  fontSize: '0.6875rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: statusStyle.text,
                }}
                aria-label={`Estado: ${ticket.status}`}
              >
                {ticket.status}
              </div>

              {/* Creation date */}
              {ticket.created_at && (
                <span
                  style={{
                    marginLeft: 'auto',
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    color: '#334155',
                    opacity: 0.75,
                  }}
                >
                  {new Date(ticket.created_at).toLocaleDateString('es', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>

            {/* ── AGENTE ASIGNADO — Bloque Neo-Brutalista ──────── */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: assignedLabel ? '#bbf7d0' : '#fecaca',
                border: '3px solid #0F172A',
                boxShadow: '4px 4px 0px 0px #0F172A',
                borderRadius: '0.5rem',
                padding: '0.75rem 1.25rem',
                marginBottom: '1.5rem',
                fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 900,
                fontSize: '0.8125rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#0F172A',
              }}
            >
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: assignedLabel ? '#065f46' : '#dc2626',
                  flexShrink: 0,
                  border: '2px solid #0F172A',
                }}
                aria-hidden="true"
              />
              AGENTE ASIGNADO: {assignedLabel ?? 'SIN ASIGNAR'}
            </div>

            {/* ── BOTONES TOMAR / ESCALAR (MOVIDOS ABAJO) ── */}

            {/* ── BOTÓN RESUMIR TICKET (solo agentes) ───────── */}
            {isAgent && (
              <div style={{ marginBottom: '1.5rem' }}>
                <button
                  id="summarize-ticket-button"
                  type="button"
                  disabled={isSummarizing}
                  onClick={async () => {
                    setIsSummarizing(true);
                    setSummaryError(null);
                    setTicketSummary(null);
                    try {
                      const res = await fetch('/api/summarize-ticket', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          title: ticket!.title,
                          description: ticket!.description ?? '',
                          sentiment: ticket!.sentiment ?? undefined,
                        }),
                      });
                      const data = await res.json();
                      if (data?.mainProblem && data?.recommendedAction) {
                        setTicketSummary({ mainProblem: data.mainProblem, recommendedAction: data.recommendedAction });
                      } else {
                        throw new Error(data?.error || 'Error al generar el resumen.');
                      }
                    } catch (err: unknown) {
                      setSummaryError(err instanceof Error ? err.message : 'Error desconocido.');
                    } finally {
                      setIsSummarizing(false);
                    }
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: isSummarizing ? '#e2e8f0' : '#c4b5fd',
                    border: '4px solid #0F172A',
                    boxShadow: isSummarizing ? 'none' : '4px 4px 0px 0px #0F172A',
                    borderRadius: '0.5rem',
                    padding: '0.75rem 1.25rem',
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontWeight: 900,
                    fontSize: '0.8125rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#0F172A',
                    cursor: isSummarizing ? 'not-allowed' : 'pointer',
                    transition: 'all 0.12s ease',
                    opacity: isSummarizing ? 0.6 : 1,
                  }}
                >
                  {isSummarizing ? (
                    <>
                      <span
                        style={{
                          width: '14px',
                          height: '14px',
                          border: '2.5px solid #0F172A',
                          borderTopColor: 'transparent',
                          borderRadius: '50%',
                          display: 'inline-block',
                          animation: 'spin 0.7s linear infinite',
                        }}
                        aria-hidden="true"
                      />
                      ANALIZANDO...
                    </>
                  ) : (
                    <>RESUMIR TICKET</>
                  )}
                </button>

                {/* ── Panel de Resumen IA ───────────────────── */}
                {ticketSummary && (
                  <div
                    style={{
                      marginTop: '0.875rem',
                      background: '#f0fdf4',
                      border: '3px solid #0F172A',
                      boxShadow: '4px 4px 0px 0px #0F172A',
                      borderRadius: '0.75rem',
                      padding: '1.25rem 1.5rem',
                      animation: 'fade-in-up 0.35s cubic-bezier(0.22,1,0.36,1) both',
                    }}
                  >
                    {/* Encabezado */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '1rem',
                        paddingBottom: '0.75rem',
                        borderBottom: '2px solid #0F172A',
                      }}
                    >
                      <span
                        style={{
                          background: '#c4b5fd',
                          border: '2px solid #0F172A',
                          borderRadius: '0.375rem',
                          padding: '0.2rem 0.625rem',
                          fontFamily: '"Space Grotesk", sans-serif',
                          fontWeight: 900,
                          fontSize: '0.625rem',
                          letterSpacing: '0.18em',
                          textTransform: 'uppercase',
                          color: '#0F172A',
                        }}
                      >
                        RESUMEN IA
                      </span>
                      <button
                        type="button"
                        aria-label="Cerrar resumen"
                        onClick={() => setTicketSummary(null)}
                        style={{
                          marginLeft: 'auto',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: '"Space Grotesk", sans-serif',
                          fontWeight: 900,
                          fontSize: '0.75rem',
                          color: '#64748b',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          padding: '0.2rem 0.4rem',
                        }}
                      >
                        CERRAR
                      </button>
                    </div>

                    {/* Problema Principal */}
                    <div style={{ marginBottom: '0.875rem' }}>
                      <p
                        style={{
                          fontFamily: '"Space Grotesk", sans-serif',
                          fontWeight: 900,
                          fontSize: '0.625rem',
                          letterSpacing: '0.2em',
                          textTransform: 'uppercase',
                          color: '#334155',
                          marginBottom: '0.375rem',
                        }}
                      >
                        PROBLEMA PRINCIPAL
                      </p>
                      <p
                        style={{
                          fontFamily: '"DM Sans", sans-serif',
                          fontSize: '0.9375rem',
                          lineHeight: 1.65,
                          color: '#0F172A',
                        }}
                      >
                        {ticketSummary.mainProblem}
                      </p>
                    </div>

                    {/* Acción Recomendada */}
                    <div
                      style={{
                        background: '#FFEA6C',
                        border: '2px solid #0F172A',
                        boxShadow: '3px 3px 0px 0px #0F172A',
                        borderRadius: '0.5rem',
                        padding: '0.75rem 1rem',
                      }}
                    >
                      <p
                        style={{
                          fontFamily: '"Space Grotesk", sans-serif',
                          fontWeight: 900,
                          fontSize: '0.625rem',
                          letterSpacing: '0.2em',
                          textTransform: 'uppercase',
                          color: '#334155',
                          marginBottom: '0.375rem',
                        }}
                      >
                        ACCIÓN RECOMENDADA
                      </p>
                      <p
                        style={{
                          fontFamily: '"DM Sans", sans-serif',
                          fontWeight: 700,
                          fontSize: '0.9375rem',
                          lineHeight: 1.55,
                          color: '#0F172A',
                        }}
                      >
                        {ticketSummary.recommendedAction}
                      </p>
                    </div>
                  </div>
                )}

                {/* Error */}
                {summaryError && (
                  <div
                    role="alert"
                    style={{
                      marginTop: '0.75rem',
                      background: '#fecaca',
                      border: '3px solid #0F172A',
                      boxShadow: '3px 3px 0px 0px #0F172A',
                      borderRadius: '0.5rem',
                      padding: '0.625rem 1rem',
                      fontFamily: '"Space Grotesk", sans-serif',
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                      color: '#0F172A',
                    }}
                  >
                    ERROR: {summaryError}
                  </div>
                )}
              </div>
            )}

            {/* ── Description ───────────────────────────────── */}
            <div style={{ marginBottom: '1.5rem' }}>
              <p
                style={{
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontWeight: 900,
                  fontSize: '0.6875rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: '#334155',
                  marginBottom: '0.75rem',
                }}
              >
                Descripcion
              </p>
              <div
                style={{
                  background: '#FFEA6C',
                  border: '3px solid #0F172A',
                  boxShadow: '4px 4px 0px 0px #0F172A',
                  borderRadius: '0.75rem',
                  padding: '1.25rem 1.5rem',
                  minHeight: '120px',
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '1rem',
                  lineHeight: 1.75,
                  color: '#0F172A',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {ticket.description ? (
                  ticket.description
                ) : (
                  <span style={{ opacity: 0.4, fontStyle: 'italic' }}>
                    Sin descripcion adicional.
                  </span>
                )}
              </div>
            </div>


            {/* ── Ticket Actions (estado: EN PROGRESO / CERRAR) ───────── */}
            <TicketActions
              ticketId={ticket.id}
              status={ticket.status}
              userRole={userRole}
              ticketOwnerId={ticket.user_id}
              ticketTitle={ticket.title}
            />

            {/* ── BOTONES TOMAR / ESCALAR (INYECTADOS AQUÍ) ── */}
            {isAgentOrAdmin && !isResolved && (
              <TicketActionButtons
                ticketId={ticket.id}
                status={ticket.status}
                assignedTo={ticket.assigned_to ?? null}
                currentUserId={currentUserId}
              />
            )}

            {/* ── Observability footer ──────────────────────────── */}
            {(ticket.ai_model || ticket.ai_latency != null) && (
              <p
                style={{
                  marginTop: '2rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid rgba(15,23,42,0.12)',
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '0.6875rem',
                  color: '#64748b',
                  letterSpacing: '0.03em',
                }}
              >
                [IA:{' '}
                <span style={{ fontWeight: 700 }}>{ticket.ai_model ?? 'N/A'}</span>
                {' | '}Latencia:{' '}
                <span style={{ fontWeight: 700 }}>{ticket.ai_latency != null ? `${ticket.ai_latency}ms` : 'N/A'}</span>
                ]
              </p>
            )}
          </article>

          {/* ════════════════════════════════════════════════════
              COLUMNA DERECHA — Chat del Ticket (solo si asignado al usuario)
          ════════════════════════════════════════════════════ */}
          {showChatColumn && (
            <aside
              className="w-full lg:w-1/2"
              style={{
                background: '#fff',
                border: '4px solid #0F172A',
                boxShadow: '8px 8px 0px 0px #0F172A',
                borderRadius: '1rem',
                padding: '2rem',
                animation: 'fade-in-up 0.5s 0.1s cubic-bezier(0.22,1,0.36,1) both',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* ── TicketComments o Fallback Neo-Brutalista ── */}
              {canChat ? (
                <TicketComments
                  ticketId={ticket.id}
                  currentUser={currentUserId}
                  assignedTo={ticket.assigned_to ?? null}
                  ticketOwnerId={ticket.user_id ?? null}
                  isAgent={userRole === 'agent' || userRole === 'admin'}
                />
              ) : (
                <div className="bg-gray-200 border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-center my-auto">
                  {isEscalated && (
                    <>
                      <div className="text-4xl mb-3">⚠️</div>
                      <h3 className="font-black text-xl uppercase mb-2">Ticket Escalado</h3>
                      <p className="font-medium">Este ticket ha sido escalado a soporte prioritario. El historial de chat de esta sesión ha quedado cerrado. Un nuevo agente retomará el caso.</p>
                    </>
                  )}
                  {!isAssigned && !isResolvedOrClosed && !isEscalated && (
                    <>
                      <h3 className="font-black text-xl uppercase mb-2"> Esperando Agente</h3>
                      <p className="font-medium">El chat se habilitará en cuanto un agente de soporte tome tu caso.</p>
                    </>
                  )}
                  {isResolvedOrClosed && (
                    <>
                      <h3 className="font-black text-xl uppercase mb-2"> Ticket Cerrado</h3>
                      <p className="font-medium">Este ticket ha sido resuelto. El chat de esta incidencia está inactivo.</p>
                    </>
                  )}
                </div>
              )}
            </aside>
          )}

        </div>{/* end doble columna */}
      </div>
    </div>
  );
}
