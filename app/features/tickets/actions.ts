'use server';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { revalidatePath } from 'next/cache';

// ─── Helper local: Next.js 15+ compatible ─────────────────────
// Se define aquí (en lugar de importarlo) para garantizar que
// `await cookies()` se resuelva dentro del mismo contexto asíncrono
// de la Server Action, cumpliendo el requisito de Next.js 15+.
async function getSupabaseClient() {
  const cookieStore = await cookies(); // CRÍTICO: debe tener await

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
            // setAll puede lanzar en Server Components de solo lectura.
            // Se puede ignorar si el Middleware refresca la sesión.
          }
        },
      },
    }
  );
}

/**
 * Revalidates the dashboard and ticket paths to ensure the client-side
 * UI and notification bell update immediately.
 */
export async function revalidateDashboard() {
  revalidatePath('/dashboard');
}

/**
 * TOMAR TICKET — Asigna el ticket al agente autenticado y cambia el estado
 * a 'en progreso'. Inserta una notificacion al propietario del ticket.
 */
export async function takeTicket(ticketId: string) {
  try {
    const supabase = await getSupabaseClient();

    // 1. Leer la sesión desde las cookies (sin round-trip a la API de Supabase).
    //    getSession() opera directamente sobre el JWT almacenado en la cookie.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      return { error: 'Error interno: No se pudo verificar la sesión en el servidor.' };
    }

    // 2. Consultar datos previos del ticket (user_id para notificacion)
    const { data: ticketData, error: fetchError } = await supabase
      .from('tickets')
      .select('user_id, title, assigned_to')
      .eq('id', ticketId)
      .single();

    if (fetchError || !ticketData) {
      return { error: `ERROR AL OBTENER TICKET: ${fetchError?.message ?? 'NO ENCONTRADO'}` };
    }

    // Prevenir doble asignacion
    if (ticketData.assigned_to) {
      return { error: 'TICKET YA ASIGNADO A OTRO AGENTE' };
    }

    // 3. Actualizar: assigned_to + status
    const { error: updateError } = await supabase
      .from('tickets')
      .update({
        assigned_to: user.id,
        status: 'en progreso',
      })
      .eq('id', ticketId);

    if (updateError) {
      return { error: `ERROR AL ASIGNAR: ${updateError.message}` };
    }

    // 4. Notificacion al propietario del ticket
    if (ticketData.user_id) {
      await supabase.from('notifications').insert({
        user_id: ticketData.user_id,
        ticket_id: ticketId,
        title: 'Ticket Asignado',
        message: `Un agente ha tomado tu ticket "${ticketData.title ?? ticketId}" y esta en progreso.`,
        is_read: false,
      });
    }

    revalidatePath('/dashboard');
    revalidatePath(`/dashboard/ticket/${ticketId}`);
    revalidatePath('/', 'layout');

    return { success: true };

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { error: msg };
  }
}

/**
 * ESCALAR TICKET — Desasigna el ticket (assigned_to = null) y cambia el
 * estado a 'escalado' para que otro agente o manager pueda tomarlo.
 */
export async function escalateTicket(ticketId: string) {
  try {
    const supabase = await getSupabaseClient();

    // 1. Leer la sesión desde las cookies (sin round-trip a la API de Supabase).
    //    Mismo patrón que takeTicket: getSession() opera sobre el JWT de la cookie.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      return { error: 'Error interno: No se pudo verificar la sesión en el servidor.' };
    }

    // 2. Consultar datos previos del ticket
    const { data: ticketData, error: fetchError } = await supabase
      .from('tickets')
      .select('user_id, title, assigned_to')
      .eq('id', ticketId)
      .single();

    if (fetchError || !ticketData) {
      return { error: `ERROR AL OBTENER TICKET: ${fetchError?.message ?? 'NO ENCONTRADO'}` };
    }

    // Solo el agente asignado puede escalar
    if (ticketData.assigned_to !== user.id) {
      return { error: 'SOLO EL AGENTE ASIGNADO PUEDE ESCALAR ESTE TICKET' };
    }

    // 3. Actualizar: desasignar + estado escalado + registrar quién escaló
    const { error: updateError } = await supabase
      .from('tickets')
      .update({
        assigned_to: null,
        status: 'escalado',
        escalated_by: user.id,
      })
      .eq('id', ticketId);

    if (updateError) {
      return { error: `ERROR AL ESCALAR: ${updateError.message}` };
    }

    // 4. Notificacion al propietario del ticket
    if (ticketData.user_id) {
      await supabase.from('notifications').insert({
        user_id: ticketData.user_id,
        ticket_id: ticketId,
        title: 'Ticket Escalado',
        message: `Tu ticket "${ticketData.title ?? ticketId}" ha sido escalado para atencion prioritaria.`,
        is_read: false,
      });
    }

    revalidatePath('/dashboard');
    revalidatePath(`/dashboard/ticket/${ticketId}`);
    revalidatePath('/', 'layout');

    return { success: true };

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { error: msg };
  }
}
