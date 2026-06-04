import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Proxy de Supabase SSR — Next.js 16+
 *
 * En Next.js 16 el archivo `middleware.ts` fue renombrado a `proxy.ts`
 * y el export debe llamarse `proxy` (no `middleware`).
 *
 * Rol crítico: refresca el JWT de Supabase en cada request ANTES de que
 * llegue al Server Component. Sin este paso las cookies de sesión pueden
 * estar expiradas y getUser() devuelve null aunque el usuario esté logueado.
 *
 * Ref: https://supabase.com/docs/guides/auth/server-side/nextjs
 * Ref: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 */
export async function proxy(request: NextRequest) {
  // Creamos una respuesta inicial que iremos modificando
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // 1. Actualizamos las cookies en la petición actual
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // 2. Clonamos la respuesta para inyectar las nuevas cookies
          supabaseResponse = NextResponse.next({
            request,
          });
          // 3. Establecemos las cookies en la respuesta que va al navegador
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: Esta línea refresca el token y hace que el Server Component lo vea.
  // No cambiar por getSession() ni mover código entre createServerClient y esta línea.
  await supabase.auth.getUser();

  return supabaseResponse;
}

// Protegemos todo excepto estáticos y archivos de imagen
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
