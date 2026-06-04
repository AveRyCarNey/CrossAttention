'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';

// ─── Props ────────────────────────────────────────────────────
// Props mínimas: el padre decide si renderizar este componente o no.
// TicketActionButtons NO hace ninguna lógica de visibilidad automática
// ni ningún fetch al montarse — todo ocurre exclusivamente en onClick.
interface Props {
  ticketId: string;
  status: string;
  assignedTo: string | null;
  currentUserId?: string;
}

// ─── TicketActionButtons ──────────────────────────────────────
export default function TicketActionButtons({ ticketId, status, assignedTo, currentUserId: propUserId }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(propUserId || null);

  // Intentamos conseguir currentUserId si no lo mandan por props o si propUserId cambia
  useEffect(() => {
    if (propUserId) {
      setCurrentUserId(propUserId);
    } else if (!currentUserId) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) setCurrentUserId(user.id);
      });
    }
  }, [propUserId, currentUserId]);

  // ── TOMAR TICKET ─────────────────────────────────────────────
  // Se ejecuta ÚNICAMENTE cuando el usuario hace click.
  // No hay useEffect, no hay fetch automático, no hay side-effects
  // fuera de este handler.
  const handleTakeTicket = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Leer usuario desde el token en localStorage del navegador
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('No autenticado. Recarga la página.');

      // 2. Asignar ticket al agente + cambiar estado
      const { error: updateError } = await supabase
        .from('tickets')
        .update({ assigned_to: user.id, status: 'en progreso' })
        .eq('id', ticketId);

      if (updateError) throw updateError;

      // 3. Notificar al dueño del ticket (fire-and-forget, no bloquea)
      supabase
        .from('tickets')
        .select('user_id, title')
        .eq('id', ticketId)
        .single()
        .then(({ data }) => {
          if (data?.user_id) {
            supabase.from('notifications').insert({
              user_id: data.user_id,
              ticket_id: ticketId,
              title: 'Ticket Asignado',
              message: `Un agente ha tomado tu ticket "${data.title ?? ticketId}" y está en progreso.`,
              is_read: false,
            });
          }
        });

      setSuccessMsg('TICKET ASIGNADO');
      // Recarga dura del navegador para garantizar que el Server Component
      // re-evalúe los datos frescos de la DB sin interferencia del router cache.
      window.location.reload();

    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsProcessing(false);
    }
  };

  // ── ESCALAR TICKET ────────────────────────────────────────────
  // Misma garantía: solo se ejecuta en onClick, nunca automáticamente.
  const handleEscalateTicket = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Leer usuario desde el token en localStorage del navegador
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('No autenticado. Recarga la página.');

      // 2. Desasignar ticket + cambiar estado a escalado
      const { error: updateError } = await supabase
        .from('tickets')
        .update({ assigned_to: null, status: 'escalado' })
        .eq('id', ticketId);

      if (updateError) throw updateError;

      // 3. Notificar al dueño del ticket (fire-and-forget, no bloquea)
      supabase
        .from('tickets')
        .select('user_id, title')
        .eq('id', ticketId)
        .single()
        .then(({ data }) => {
          if (data?.user_id) {
            supabase.from('notifications').insert({
              user_id: data.user_id,
              ticket_id: ticketId,
              title: 'Ticket Escalado',
              message: `Tu ticket "${data.title ?? ticketId}" ha sido escalado para atención prioritaria.`,
              is_read: false,
            });
          }
        });

      setSuccessMsg('TICKET ESCALADO');
      // Recarga dura del navegador para garantizar que el Server Component
      // re-evalúe los datos frescos de la DB sin interferencia del router cache.
      window.location.reload();

    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-2 mt-4 w-full">
      {errorMsg && <div className="bg-red-300 border-4 border-black p-2 font-black">{errorMsg}</div>}
      
      {/* SOLO MUESTRA 'TOMAR TICKET' SI NO ESTÁ ASIGNADO A NADIE */}
      {!assignedTo && (
        <button 
          onClick={handleTakeTicket}
          disabled={isProcessing}
          className="w-full bg-green-400 border-4 border-black font-black p-3 disabled:opacity-50 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
        >
          {isProcessing ? 'PROCESANDO...' : 'TOMAR TICKET'}
        </button>
      )}

      {/* SOLO MUESTRA 'ESCALAR TICKET' SI EL TICKET ESTÁ ASIGNADO AL USUARIO ACTUAL */}
      {assignedTo === currentUserId && (
        <button 
          onClick={handleEscalateTicket}
          disabled={isProcessing}
          className="w-full bg-red-400 border-4 border-black font-black p-3 text-white disabled:opacity-50 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
        >
          {isProcessing ? 'PROCESANDO...' : 'ESCALAR TICKET'}
        </button>
      )}
    </div>
  );
}
