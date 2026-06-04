'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';

// ─── Interfaces ────────────────────────────────────────────────
interface Profile {
  id: string;
  email?: string;
  role: string;
  created_at: string | null;
}

// ─── Mock Profiles for Demonstration/Testing ──────────────────
const MOCK_PROFILES: Profile[] = [
  { id: 'usr-1', email: 'admin@crossattention.com', role: 'admin', created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: 'usr-2', email: 'carlos.ruiz@soporte.com', role: 'agent', created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: 'usr-3', email: 'ana.martinez@crossattention.com', role: 'manager', created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
];

// ─── Helper for Dynamic Role Badge Backgrounds ──────────────────
function getRoleBg(role: string) {
  switch (role) {
    case 'admin':
      return 'bg-cross-accent border-[#0F172A] text-cross-text'; // Vivid pink
    case 'manager':
      return 'bg-[#FFA6FB] border-[#0F172A] text-cross-text'; // Soft pink
    case 'agent':
      return 'bg-[#93C5FD] border-[#0F172A] text-cross-text'; // Vivid blue
    case 'user':
    default:
      return 'bg-white border-[#0F172A] text-cross-text'; // Solid white
  }
}

interface AdminUsersClientProps {
  initialProfiles: Profile[];
}

export default function AdminUsersClient({ initialProfiles }: AdminUsersClientProps) {
  const router = useRouter();

  // State Management
  const [profiles, setProfiles] = useState<Profile[]>(() => {
    return initialProfiles && initialProfiles.length > 0 ? initialProfiles : MOCK_PROFILES;
  });
  const [isRealData] = useState<boolean>(initialProfiles && initialProfiles.length > 0);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Notification States
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Update User Role
  async function updateRole(userId: string, newRole: string) {
    const safeRole = newRole.toLowerCase(); // Forzamos minúsculas
    setIsUpdating(userId);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      if (isRealData) {
        // Real DB Update
        const { error } = await supabase
          .from('profiles')
          .update({ role: safeRole })
          .eq('id', userId);

        if (error) throw error;
      }

      // Sync React state
      setProfiles(prev =>
        prev.map(p => (p.id === userId ? { ...p, role: safeRole } : p))
      );

      // Display animated success message
      setSuccessMsg(`Rol del usuario actualizado a "${safeRole.toUpperCase()}" con éxito.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to update role:', err);
      setErrorMsg(err.message || 'Error al intentar actualizar el rol en la base de datos.');
    } finally {
      setIsUpdating(null);
    }
  }

  return (
    <div className="space-y-8 select-none">
      {/* ── NOTIFICATION BANNERS ────────────────────────────── */}
      {(successMsg || errorMsg) && (
        <div className="space-y-3 animate-fade-in">
          {successMsg && (
            <div
              role="alert"
              className="flex items-center gap-3 px-6 py-4 rounded-xl
                         bg-green-100 border-[3px] border-cross-text
                         shadow-[5px_5px_0px_0px_rgba(15,23,42,1)]"
            >
              <p className="text-sm font-black text-cross-text uppercase tracking-tight" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                {successMsg}
              </p>
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="flex items-center gap-3 px-6 py-4 rounded-xl
                         bg-red-100 border-[3px] border-cross-text
                         shadow-[5px_5px_0px_0px_rgba(15,23,42,1)]"
            >
              <p className="text-sm font-black text-cross-text uppercase tracking-tight" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                {errorMsg}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── DATA SOURCE WARNING (IF TESTING WITH MOCK DATA) ──── */}
      {!isRealData && (
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 rounded-xl
                     bg-amber-100 border-[3px] border-cross-text
                     shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] animate-fade-in"
        >
          <div className="flex items-start sm:items-center gap-3">
            <div>
              <h4 className="text-sm font-black text-cross-text uppercase tracking-tight" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                Entorno de Demostración
              </h4>
              <p className="text-xs font-semibold text-cross-text-dim" style={{ fontFamily: '"DM Sans", sans-serif' }}>
                La base de datos de perfiles está vacía o inasequible en este momento. Mostrando usuarios de prueba dinámicos para testing del UI.
              </p>
            </div>
          </div>
          <button
            onClick={() => router.refresh()}
            className="px-4 py-2 border-2 border-cross-text rounded-lg bg-white text-cross-text font-black text-[10px] uppercase tracking-wider
                       shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:bg-[#FFF] hover:-translate-y-0.5 active:translate-y-0 select-none cursor-pointer"
            style={{ fontFamily: '"Space Grotesk", sans-serif' }}
          >
            Refrescar Base de Datos
          </button>
        </div>
      )}

      {/* ── USERS TABLE/LIST ────────────────────────────────── */}
      <main className="animate-fade-in-up">
        {/* Brutalist User Table */}
        <div
          className="w-full border-[3px] border-cross-text rounded-2xl overflow-hidden
                     shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]"
          role="table"
          aria-label="Listado de perfiles de usuario"
        >
          {/* Table Header */}
          <div
            className="grid grid-cols-12 gap-x-4 px-6 py-4 bg-cross-text text-cross-bg text-xs font-black uppercase tracking-[0.18em] select-none"
            style={{ fontFamily: '"Space Grotesk", sans-serif' }}
            role="row"
          >
            <div className="col-span-1 hidden sm:block text-center">#</div>
            <div className="col-span-7 sm:col-span-5">Usuario (Email)</div>
            <div className="col-span-3 hidden sm:block">Fecha de Creación</div>
            <div className="col-span-5 sm:col-span-3 text-right sm:text-center">Rol del Sistema</div>
          </div>

          {/* Table Body */}
          <div className="flex flex-col bg-white divide-y-[3px] divide-cross-text">
            {profiles.map((profile, index) => {
              const isUserUpdating = isUpdating === profile.id;
              const creationDateStr = profile.created_at
                ? new Date(profile.created_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : 'N/A';

              return (
                <div
                  key={profile.id}
                  role="row"
                  className="ticket-row grid grid-cols-12 items-center gap-x-4 px-6 py-4
                             hover:bg-[#FFEA6C15] transition-colors duration-150 relative"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* 1. Index Column */}
                  <div className="col-span-1 hidden sm:flex justify-center" aria-hidden="true">
                    <span
                      className="text-[11px] font-black text-cross-text-dim tabular-nums"
                      style={{ fontFamily: '"Space Grotesk", sans-serif' }}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>

                  {/* 2. User Info Column */}
                  <div className="col-span-7 sm:col-span-5 flex items-center gap-3 min-w-0">
                    {/* Bullet points mimicking avatar initials determinant from email */}
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-full border-2 border-cross-text
                                 flex items-center justify-center text-[10px] font-black text-cross-text
                                 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] select-none bg-amber-200"
                      style={{ fontFamily: '"Space Grotesk", sans-serif' }}
                      aria-hidden="true"
                    >
                      {profile.email ? profile.email[0].toUpperCase() : '?'}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span
                        className="text-[13px] font-black text-cross-text truncate leading-tight tracking-tight uppercase"
                        style={{ fontFamily: '"Space Grotesk", sans-serif' }}
                        title={profile.email || 'Correo no disponible'}
                      >
                        {profile.email ? profile.email.split('@')[0] : 'Correo no disponible'}
                      </span>
                      <span
                        className="text-xs text-cross-text-dim truncate font-medium leading-snug"
                        title={profile.email || 'Correo no disponible'}
                      >
                        {profile.email || 'Correo no disponible'}
                      </span>
                    </div>
                  </div>

                  {/* 3. Created At Column */}
                  <div className="col-span-3 hidden sm:block">
                    <span
                      className="text-xs text-cross-text-dim font-bold tracking-tight uppercase"
                      style={{ fontFamily: '"Space Grotesk", sans-serif' }}
                    >
                      {creationDateStr}
                    </span>
                  </div>

                  {/* 4. Action Selector Column */}
                  <div className="col-span-5 sm:col-span-3 flex items-center justify-end sm:justify-center gap-2">
                    {isUserUpdating && (
                      <div className="w-4 h-4 border-2 border-cross-accent border-t-transparent rounded-full animate-spin shrink-0" aria-label="Actualizando..." />
                    )}

                    <select
                      value={profile.role}
                      onChange={(e) => updateRole(profile.id, e.target.value)}
                      disabled={isUserUpdating}
                      aria-label={`Cambiar rol para ${profile.email || 'Correo no disponible'}`}
                      className={`font-black uppercase text-xs border-[3px] border-cross-text rounded-xl px-3 py-1.5
                                  shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] focus:outline-none focus:ring-2 focus:ring-cross-accent
                                  focus:translate-x-0 focus:translate-y-0 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]
                                  transition-all cursor-pointer ${getRoleBg(profile.role)} disabled:opacity-50 disabled:cursor-not-allowed`}
                      style={{ fontFamily: '"Space Grotesk", sans-serif' }}
                    >
                      <option value="user" className="bg-white text-cross-text font-black">USER</option>
                      <option value="agent" className="bg-[#93C5FD] text-cross-text font-black">AGENT</option>
                      <option value="manager" className="bg-[#FFA6FB] text-cross-text font-black">MANAGER</option>
                      <option value="admin" className="bg-cross-accent text-cross-text font-black">ADMIN</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
