import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Crea un cliente de Supabase para Server Components y Route Handlers.
 * Lee las cookies de sesión directamente desde los headers de Next.js,
 * lo que permite verificar la autenticación de forma segura en el servidor.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
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
            // setAll puede fallar en Server Components de solo lectura.
            // Se puede ignorar si hay un Middleware que refresca la sesión.
          }
        },
      },
    }
  );
}
