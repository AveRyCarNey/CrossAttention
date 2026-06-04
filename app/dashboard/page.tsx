import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import DashboardShell from './DashboardShell';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

/**
 * DISTRIBUIDOR PRINCIPAL — Server Component con RBAC estricto.
 *
 * Usa getUser() (no getSession()) porque:
 *   - getUser() revalida el JWT contra Supabase Auth en cada render → seguro en SSR.
 *   - getSession() solo lee el JWT localmente → puede devolver null si la cookie
 *     no fue refrescada por el middleware (bug silencioso).
 *
 * Flujo de control por rol:
 *   admin   → Trampa diagnóstica si no hay sesión / redirect a /dashboard/admin/users
 *   manager → <DashboardShell role="manager" /> (sin tickets)
 *   agent   → Fetch TODOS los tickets
 *   user    → Fetch SOLO sus tickets (filtrado por user_id)
 */
export default async function DashboardPage() {
  // 1. Instanciar el lector de cookies de Next.js
  const cookieStore = await cookies();

  // 2. Crear el cliente de Supabase estricto para el servidor
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Se ignora el error: los Server Components no pueden setear cookies,
            // pero Supabase SSR requiere que este método exista en la configuración.
          }
        },
      },
    }
  );

  // 3. Obtener el usuario de forma segura (revalida JWT contra Supabase)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // ── 2. TRAMPA DE DIAGNÓSTICO ────────────────────────────────────────
  // Si no hay usuario, NO redireccionamos (eso causa el bucle).
  // En su lugar, renderizamos una pantalla de error explicativa
  // para que podamos ver exactamente qué está fallando.
  if (!user) {
    return (
      <div className="p-8 w-full min-h-screen flex items-center justify-center bg-yellow-300">
        <div
          className="bg-red-400 border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-2xl w-full"
          style={{ fontFamily: '"Space Grotesk", sans-serif' }}
        >
          <h1 className="text-3xl font-black uppercase mb-4 text-white">
            ⚠ Error de Lectura de Sesión
          </h1>
          <p className="font-bold text-lg mb-6 text-black">
            El servidor (Next.js) no puede leer tus cookies de Supabase,
            por lo que te considera deslogueado.
          </p>
          <div className="bg-white border-4 border-black p-4 font-mono text-sm flex flex-col gap-3">
            <p>
              <strong>Mensaje del servidor:</strong>{' '}
              {authError?.message ?? 'No hay sesión detectada en las cookies del request.'}
            </p>
            <p>
              <strong>Código de error:</strong>{' '}
              {authError?.code ?? '—'}
            </p>
            <hr className="border-black border-2" />
            <p className="text-xs text-gray-600">
              <strong>Diagnóstico técnico:</strong> El middleware de Supabase SSR
              debe ejecutar <code>supabase.auth.getUser()</code> en cada request
              para refrescar el JWT en las cookies antes de que llegue al Server Component.
              Revisa que <code>middleware.ts</code> esté usando{' '}
              <code>@supabase/ssr → createServerClient</code> correctamente.
            </p>
            <p className="text-xs text-gray-600">
              <strong>Acción inmediata:</strong> Cierra sesión, vuelve a iniciarla
              y recarga. Si el error persiste, verifica las variables de entorno
              <code> NEXT_PUBLIC_SUPABASE_URL</code> y{' '}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> en <code>.env.local</code>.
            </p>
          </div>
          <a
            href="/login"
            className="mt-6 block text-center bg-black text-white font-black uppercase px-6 py-3 hover:bg-gray-800 transition-colors"
          >
            Volver al Login
          </a>
        </div>
      </div>
    );
  }

  // ── 3. Obtener rol del perfil ──────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // Tipo amplio para la bifurcación inicial (incluye admin)
  const safeRole = (profile?.role ?? 'user').toLowerCase().trim() as
    | 'manager'
    | 'admin'
    | 'agent'
    | 'user';

  // ── 4. ADMIN → Redirigir a su panel exclusivo ──────────────────────
  // (Solo se ejecuta si el usuario SÍ está autenticado — sin bucle posible)
  if (safeRole === 'admin') {
    const { redirect } = await import('next/navigation');
    redirect('/dashboard/admin/users');
  }

  // ── 5. MANAGER → Vista de métricas (sin tickets) ──────────────────
  if (safeRole === 'manager') {
    return <DashboardShell role="manager" tickets={[]} userId={user.id} />;
  }

  // A partir de aquí, safeRole solo puede ser 'agent' | 'user'
  // (admin ya fue redirigido, manager ya fue devuelto)
  const shellRole = safeRole as 'agent' | 'user';

  // ── 6. AGENT / USER → Fetch condicional de tickets ────────────────
  let query = supabase
    .from('tickets')
    .select('*, assigned_to:profiles!assigned_to(id, email)')
    .order('created_at', { ascending: false });

  // Usuario normal: solo ve sus propios tickets (filtrado por user_id)
  if (shellRole === 'user') {
    query = query.eq('user_id', user.id);
  }

  const { data: rawTickets, error: ticketsError } = await query;

  if (ticketsError) {
    console.error('🔴 [DashboardPage] Error al obtener tickets:', ticketsError.message);
  }

  // Normalizar el join a campos planos
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tickets = (rawTickets ?? []).map((t: any) => {
    const assignedProfile = t.assigned_to as
      | { id?: string; email?: string }
      | null;
    return {
      id: t.id as string,
      title: t.title as string,
      status: t.status as string,
      priority: t.priority as string,
      sender: (t.sender as string) ?? undefined,
      created_at: (t.created_at as string) ?? undefined,
      assigned_to: assignedProfile?.id ?? null,
      assigned_email: assignedProfile?.email ?? null,
      assigned_name: null,
    };
  });

  // ── 7. Renderizar bandeja de entrada (Agent / User) ────────────────
  return (
    <DashboardShell
      role={shellRole}
      tickets={tickets}
      userId={user.id}
    />
  );
}