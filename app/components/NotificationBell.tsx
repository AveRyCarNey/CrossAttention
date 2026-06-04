'use client';

import { useEffect, useRef, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

// ─── Types ────────────────────────────────────────────────────
interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// ─── Bell SVG ────────────────────────────────────────────────
function BellIcon({ ringing }: { ringing: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        width: '22px',
        height: '22px',
        display: 'block',
        transform: ringing ? 'rotate(-15deg)' : 'none',
        transition: 'transform 0.15s ease',
      }}
      aria-hidden="true"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

// ─── NotificationBell ─────────────────────────────────────────
export default function NotificationBell() {
  // 1. Inicialización perezosa del cliente SSR (evita el error de múltiples instancias GoTrueClient)
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  const [hovered, setHovered] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // ── Setup: getUser → fetch inicial → suscripción Realtime ───
  useEffect(() => {
    let isMounted = true;
    // Guardamos la función de cleanup del canal para ejecutarla al desmontar
    let removeChannel: (() => void) | null = null;

    const setupNotifications = async () => {
      // Obtener el usuario autenticado (funciona para user, agent, admin, manager)
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !isMounted) return;

      setUserId(user.id);

      // ── Fetch inicial de notificaciones no leídas ──────────
      const { data } = await supabase
        .from('notifications')
        .select('id, title, message, is_read, created_at')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (isMounted) {
        setNotifications(data ?? []);
      }

      // ── Suscripción Realtime estricta para ESTE usuario ────
      // El filtro user_id=eq.{id} garantiza que solo recibimos
      // los INSERT de notificaciones destinadas a este usuario,
      // independientemente de su rol (user / agent / admin / manager).
      const channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (!isMounted) return;
            const incoming = payload.new as Notification;
            setNotifications((prev) => {
              // Evitar duplicados exactos por doble-fire de Realtime
              if (prev.some((n) => n.id === incoming.id)) return prev;
              return [incoming, ...prev];
            });
          }
        )
        .subscribe();

      removeChannel = () => supabase.removeChannel(channel);
    };

    setupNotifications();

    return () => {
      isMounted = false;
      removeChannel?.();
    };
  }, [supabase]);

  // ── Close panel on outside click ────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // ── Mark all as read ────────────────────────────────────────
  const markAllAsRead = async () => {
    if (notifications.length === 0 || !userId) return;
    setMarking(true);

    // Optimistic UI: limpiamos visualmente antes de la respuesta de la BD
    const ids = notifications.map((n) => n.id);
    setNotifications([]);

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', ids);

    setMarking(false);
    setOpen(false);
  };

  const unreadCount = notifications.length;

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      {/* ── Bell Button ─────────────────────────────────────── */}
      <button
        ref={buttonRef}
        id="notification-bell-btn"
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '44px',
          height: '44px',
          background: hovered ? '#0F172A' : '#FFEA6C',
          border: '3px solid #0F172A',
          boxShadow: hovered ? '2px 2px 0px 0px #0F172A' : '4px 4px 0px 0px #0F172A',
          borderRadius: '0.625rem',
          cursor: 'pointer',
          color: hovered ? '#FFEA6C' : '#0F172A',
          transform: hovered ? 'translate(2px, 2px)' : 'translate(0, 0)',
          transition: 'all 0.12s ease',
          flexShrink: 0,
        }}
      >
        <BellIcon ringing={unreadCount > 0} />

        {/* ── Unread badge ──────────────────────────────────── */}
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              background: '#ef4444',
              color: '#ffffff',
              border: '2px solid #0F172A',
              borderRadius: '99px',
              minWidth: '20px',
              height: '20px',
              padding: '0 5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 900,
              fontSize: '0.6rem',
              letterSpacing: '0.02em',
              lineHeight: 1,
              animation: 'pulse-badge 2s ease-in-out infinite',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown Panel ──────────────────────────────────── */}
      {open && (
        <div
          ref={panelRef}
          id="notification-panel"
          role="dialog"
          aria-label="Panel de notificaciones"
          style={{
            position: 'absolute',
            top: 'calc(100% + 12px)',
            right: 0,
            zIndex: 1000,
            width: '340px',
            background: '#FFA6FB',
            border: '4px solid #0F172A',
            boxShadow: '8px 8px 0px 0px #0F172A',
            borderRadius: '1rem',
            animation: 'fade-in-up 0.2s cubic-bezier(0.22, 1, 0.36, 1) both',
            overflow: 'hidden',
          }}
        >
          {/* Panel header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem 1.25rem 0.875rem',
              borderBottom: '3px solid #0F172A',
              background: '#0F172A',
            }}
          >
            <p
              style={{
                fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 900,
                fontSize: '0.75rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#FFEA6C',
                margin: 0,
              }}
            >
              NOTIFICACIONES
            </p>
            {unreadCount > 0 && (
              <span
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: '99px',
                  padding: '2px 8px',
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontWeight: 900,
                  fontSize: '0.65rem',
                }}
              >
                {unreadCount} sin leer
              </span>
            )}
          </div>

          {/* Notification list */}
          <div
            style={{
              maxHeight: '320px',
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
          >
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: '2rem 1.25rem',
                  textAlign: 'center',
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '0.9rem',
                  color: '#0F172A',
                  opacity: 0.6,
                  textTransform: 'uppercase',
                  fontWeight: 'bold',
                }}
              >
                SIN NOTIFICACIONES NUEVAS
              </div>
            ) : (
              notifications.map((n, idx) => (
                <div
                  key={n.id}
                  style={{
                    padding: '0.875rem 1.25rem',
                    borderBottom:
                      idx < notifications.length - 1 ? '2px solid rgba(15,23,42,0.15)' : 'none',
                    background: idx % 2 === 0 ? 'rgba(255,255,255,0.18)' : 'transparent',
                  }}
                >
                  <p
                    style={{
                      fontFamily: '"Space Grotesk", sans-serif',
                      fontWeight: 900,
                      fontSize: '0.75rem',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: '#0F172A',
                      margin: '0 0 0.25rem 0',
                    }}
                  >
                    {n.title}
                  </p>
                  <p
                    style={{
                      fontFamily: '"DM Sans", sans-serif',
                      fontSize: '0.8125rem',
                      lineHeight: 1.5,
                      color: '#1e293b',
                      margin: '0 0 0.375rem 0',
                    }}
                  >
                    {n.message}
                  </p>
                  <span
                    style={{
                      fontFamily: '"Space Grotesk", sans-serif',
                      fontSize: '0.625rem',
                      letterSpacing: '0.05em',
                      color: '#334155',
                      opacity: 0.7,
                    }}
                  >
                    {new Date(n.created_at).toLocaleDateString('es', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Footer — mark as read button */}
          {notifications.length > 0 && (
            <div
              style={{
                padding: '0.75rem 1.25rem',
                borderTop: '3px solid #0F172A',
                background: '#FFEA6C',
              }}
            >
              <button
                id="mark-all-read-btn"
                onClick={markAllAsRead}
                disabled={marking}
                style={{
                  width: '100%',
                  background: marking ? '#d1d5db' : '#0F172A',
                  color: marking ? '#9ca3af' : '#FFEA6C',
                  border: '3px solid #0F172A',
                  boxShadow: marking ? 'none' : '3px 3px 0px 0px #FF61F8',
                  borderRadius: '0.5rem',
                  padding: '0.625rem 1rem',
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontWeight: 900,
                  fontSize: '0.75rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: marking ? 'not-allowed' : 'pointer',
                  transition: 'all 0.12s ease',
                }}
              >
                {marking ? 'MARCANDO...' : 'MARCAR TODAS COMO LEÍDAS'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
