import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminUsersClient from './AdminUsersClient';
import LogoutButton from '../../../components/LogoutButton';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export default async function AdminUsersPage() {
  // 1. Obtención ASÍNCRONA de las cookies
  const cookieStore = await cookies();

  // 2. Instanciación del cliente de Supabase para el servidor
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  // 3. Verificación de Autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  // 4. Verificación de Rol (Seguridad)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const safeRole = profile?.role?.toLowerCase().trim() || 'NINGUNO';

  if (profileError || !profile || safeRole !== 'admin') {
    return (
      <div className="p-8 w-full min-h-screen flex items-center justify-center bg-yellow-300">
        <div className="bg-red-400 border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-6 w-full max-w-2xl">
          <h1 className="text-4xl font-black uppercase text-white leading-none tracking-tighter">Bloqueo de Seguridad</h1>
          <p className="font-bold text-lg text-black">
            El servidor te ha negado el acceso a la tabla de usuarios. Rol detectado: {safeRole.toUpperCase()}
          </p>
          <div className="bg-white border-4 border-black p-4 font-mono text-lg flex flex-col gap-2">
            <p><strong>SESIÓN DETECTADA:</strong> SÍ</p>
            <p><strong>ACCESO PERMITIDO:</strong> EXCLUSIVO PARA ADMINISTRADORES</p>
          </div>
          <div className="flex justify-end mt-4">
            <LogoutButton />
          </div>
        </div>
      </div>
    );
  }

  // 5. Obtención de Datos Filtrados (Excluyendo 'user')
  const { data: teamMembers } = await supabase
    .from('profiles')
    .select('*')
    .neq('role', 'user') // Filtro estricto: Excluye a los clientes finales
    .order('created_at', { ascending: false });

  const initialProfiles = teamMembers || [];

  return (
    <div className="min-h-screen bg-cross-bg px-6 py-8 md:px-12 md:py-12 selection:bg-cross-accent selection:text-white">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* ── HEADER ──────────────────────────────────────────── */}
        <header className="animate-slide-header flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <h1
              className="text-5xl md:text-7xl font-black text-cross-text uppercase leading-none tracking-tighter"
              style={{ fontFamily: '"Space Grotesk", sans-serif' }}
            >
              CONTROL DE ROLES
            </h1>

            <p
              className="text-cross-text-dim text-base md:text-lg max-w-xl leading-relaxed font-medium mt-2"
              style={{ fontFamily: '"DM Sans", sans-serif' }}
            >
              Administra los permisos del sistema asignando roles al personal interno.
            </p>
          </div>
        </header>

        {/* ── INTERACTIVE TABLE ───────────────────────────────── */}
        <AdminUsersClient initialProfiles={initialProfiles} />
      </div>
    </div>
  );
}
