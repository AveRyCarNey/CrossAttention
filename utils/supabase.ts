import { createBrowserClient } from '@supabase/ssr';

/**
 * Singleton del cliente Supabase para el navegador.
 *
 * Usamos createBrowserClient de @supabase/ssr (que maneja cookies en vez de
 * localStorage) y lo instanciamos UNA SOLA VEZ a nivel de módulo.
 * Cualquier componente que haga `import { supabase } from '@/utils/supabase'`
 * recibirá siempre la misma instancia, eliminando el warning de
 * "Multiple GoTrueClient instances".
 */
let _supabase: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (!_supabase) {
    _supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _supabase;
}

// Alias de compatibilidad — los componentes que ya importan `supabase`
// directamente siguen funcionando sin cambiar sus imports.
export const supabase = getSupabaseBrowserClient();