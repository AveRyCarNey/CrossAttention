'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import type { AuthChangeEvent } from '@supabase/supabase-js';
import NotificationBell from './NotificationBell';
import LogoutButton from './LogoutButton';



/**
 * Navbar global con RBAC ultra-minimalista.
 * Renderiza condicionalmente la zona de botones según el rol exacto:
 *  - admin   → Badge "CONTROL DE USUARIOS" (solo lectura, ya está en su panel)
 *  - manager → Badge "MÉTRICAS GLOBALES"
 *  - agent   → Badge "BANDEJA DE ENTRADA"
 *  - user    → Badge "MIS TICKETS" + botón "NUEVO TICKET"
 */
export default function Navbar() {
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );

  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setUserEmail(user.email ?? null);
          setUserName(user.user_metadata?.name || user.user_metadata?.display_name || null);
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          if (profile?.role) {
            setUserRole(profile.role.toLowerCase().trim());
          }
        }
      } catch (error) {
        console.error('Error fetching user role in Navbar:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRole();

    // Sincronizar con cambios de sesión en tiempo real
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUserEmail(session.user.email ?? null);
        setUserName(session.user.user_metadata?.name || session.user.user_metadata?.display_name || null);
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        if (profile?.role) {
          setUserRole(profile.role.toLowerCase().trim());
        }
      } else if (event === 'SIGNED_OUT') {
        setUserRole(null);
        setUserEmail(null);
        setUserName(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const displayName = userName || userEmail || 'Usuario';



  return (
    <header
      className="bg-white border-b-4 border-black flex justify-between items-center px-8 py-4 select-none relative z-50 shadow-[0_4px_0_0_rgba(15,23,42,0.05)]"
      style={{ fontFamily: '"Space Grotesk", sans-serif' }}
    >
      {/* ── LADO IZQUIERDO: LOGO + ACCIONES ROL ────── */}
      <div className="flex items-center gap-6">
        <Link
          href="/dashboard"
          className="text-2xl font-black tracking-tighter uppercase text-[#0F172A] hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <span
            className="w-4 h-4 rounded-full bg-cross-accent block"
            style={{ boxShadow: '0 0 0 2px #0F172A' }}
          />
          CROSSATTENTION
        </Link>

        {/* Etiqueta movida a la izquierda: */}
        {!loading && userRole === 'admin' && (
          <div
            id="nav-badge-admin"
            className="bg-white border-4 border-black px-4 py-2 font-black uppercase tracking-wider text-sm cursor-default hidden sm:block shadow-[2px_2px_0px_0px_#0F172A]"
          >
            CONTROL DE USUARIOS
          </div>
        )}

        {/* NUEVO: Botones del Rol USER en la izquierda con links corregidos */}
        {!loading && userRole === 'user' && (
          <div className="hidden md:flex gap-4">
            <Link href="/dashboard" className="bg-blue-300 border-4 border-black px-4 py-2 font-black uppercase transition-colors hover:bg-blue-400">
              Mis Tickets
            </Link>
            <Link href="/reportar" className="bg-white hover:bg-gray-200 border-4 border-black px-4 py-2 font-black uppercase transition-colors">
              Nuevo Ticket
            </Link>
          </div>
        )}
      </div>

      {/* ── LADO DERECHO: ZONA DE ROL + CONTROLES ────────────────── */}
      <div className="flex gap-4 items-center">

        {/* Badge Dinámico */}
        {!loading && userRole && (
          userRole === 'user' ? (
            <div className="bg-pink-300 border-2 border-black px-3 py-1 text-sm font-black uppercase cursor-default hidden sm:block truncate max-w-[150px]" title={displayName}>
              {displayName}
            </div>
          ) : (
            <div className="bg-gray-200 border-2 border-black px-3 py-1 text-sm font-black uppercase cursor-default hidden sm:block">
              {userRole}
            </div>
          )
        )}

        {/* ── Notificaciones ───────────────────────────────────── */}
        <NotificationBell />

        {/* ── BOTÓN DE LOGOUT INDESTRUCTIBLE ───────────────────── */}
        <LogoutButton />
      </div>
    </header>
  );
}
