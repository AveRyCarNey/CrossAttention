import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase-server';

/**
 * Server-Side Route Protection para /dashboard/manager
 *
 * Este layout se ejecuta EXCLUSIVAMENTE en el servidor antes de renderizar
 * cualquier contenido hijo. Actúa como un "cerrojo" que:
 *
 *  1. Verifica que exista una sesión activa   → si no, redirige a /login
 *  2. Consulta el rol del usuario en "profiles" → si no es 'manager' ni 'admin',
 *     redirige a /dashboard
 *  3. Solo si pasa ambas validaciones, renderiza {children}
 */
export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ── 1. Instanciar cliente de Supabase con cookies de servidor ────────────
  const supabase = await createClient();

  // ── 2. Verificar sesión activa ───────────────────────────────────────────
  //    Usamos getUser() (no getSession()) porque valida el JWT contra
  //    el servidor de Supabase Auth, eliminando el riesgo de tokens falsificados.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // No hay sesión → redirigir al login
    redirect('/login');
  }

  // ── 3. Consultar el rol del usuario en la tabla "profiles" ───────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // Condición tolerante para la alta gerencia:
  if (!profile || (profile.role !== 'admin' && profile.role !== 'manager')) {
    console.log("ACCESO DENEGADO AL PANEL PARA EL ROL:", profile?.role);
    redirect('/dashboard'); 
  }

  // ── 5. Usuario autorizado → renderizar contenido protegido ───────────────
  return <>{children}</>;
}
