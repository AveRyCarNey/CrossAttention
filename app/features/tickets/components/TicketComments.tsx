'use client';

import { useEffect, useRef, useState, ChangeEvent } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { revalidateDashboard } from '../actions';



// ─── Types ────────────────────────────────────────────────────
interface Comment {
  id: string;
  ticket_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface TicketCommentsProps {
  ticketId: string;
  currentUser: string;
  /** UUID del agente asignado al ticket (ticket.assigned_to). Necesario para notificarle cuando el usuario comenta. */
  assignedTo: string | null;
  /** UUID del dueño del ticket (ticket.user_id). Se usa para filtrar mensajes por sesión activa. */
  ticketOwnerId?: string | null;
  /** Si es true, el usuario tiene rol agente o admin y puede ver el botón de IA. */
  isAgent?: boolean;
}

// ─── Send Button (Neo-Brutalist) ──────────────────────────────
function SendButton({
  disabled,
  loading,
}: {
  disabled: boolean;
  loading: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      aria-label="Enviar comentario"
      className={`font-black uppercase px-5.5 py-2.5 rounded-lg border-4 border-black transition-all flex-shrink-0
        ${disabled 
          ? 'bg-gray-200 text-gray-400 border-gray-400 cursor-not-allowed shadow-none' 
          : 'bg-gray-300 text-black cursor-pointer hover:bg-gray-400 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px]'
        }`}
      style={{
        fontFamily: '"Space Grotesk", sans-serif',
        fontSize: '0.8125rem',
        letterSpacing: '0.06em',
        whiteSpace: 'nowrap',
      }}
    >
      {loading ? 'PROCESANDO...' : 'ENVIAR'}
    </button>
  );
}

// ─── Single Comment Bubble ────────────────────────────────────
function CommentBubble({
  comment,
  isOwn,
}: {
  comment: Comment;
  isOwn: boolean;
}) {
  const timeStr = new Date(comment.created_at).toLocaleString('es', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isOwn ? 'flex-end' : 'flex-start',
        gap: '0.25rem',
        animation: 'fade-in-up 0.3s cubic-bezier(0.22,1,0.36,1) both',
      }}
    >
      {/* Bubble */}
      <div
        style={{
          maxWidth: '75%',
          background: isOwn ? '#FE81D4' : '#FFFBEB',
          border: '3px solid #0F172A',
          boxShadow: isOwn
            ? '-4px 4px 0px 0px #0F172A'
            : '4px 4px 0px 0px #0F172A',
          borderRadius: isOwn
            ? '1rem 0.25rem 1rem 1rem'
            : '0.25rem 1rem 1rem 1rem',
          padding: '0.75rem 1rem',
          fontFamily: '"DM Sans", sans-serif',
          fontSize: '0.9375rem',
          lineHeight: 1.6,
          color: '#0F172A',
          wordBreak: 'break-word',
        }}
      >
        {comment.content}
      </div>

      {/* Timestamp */}
      <span
        style={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontWeight: 600,
          fontSize: '0.625rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#64748b',
          paddingInline: '0.25rem',
        }}
      >
        {isOwn ? `Tú · ${timeStr}` : timeStr}
      </span>
    </div>
  );
}

// ─── TicketComments ───────────────────────────────────────────
export default function TicketComments({
  ticketId,
  currentUser,
  assignedTo,
  ticketOwnerId = null,
  isAgent = false,
}: TicketCommentsProps) {
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Sincronización DOM: recalcula la altura del textarea
  // siempre que inputValue cambie (escritura del usuario O inyección de la IA)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';                              // Resetea primero
      // Sumamos 8px para compensar los bordes superior e inferior y evitar el falso scroll
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 8}px`; // Expande al contenido real
    }
  }, [inputValue]);

  // Solo actualiza el estado; el useEffect de arriba se encarga del resize
  const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; 
      // Sumamos 8px para compensar los bordes superior e inferior y evitar el falso scroll
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 8}px`; 
    }
  };

  // ── Fetch comments + Realtime subscription ──────────────────
  useEffect(() => {
    if (!ticketId) return;
    let isMounted = true;

    // 1. Carga inicial de comentarios
    const loadComments = async () => {
      try {
        setIsLoadingComments(true);
        const { data, error } = await supabase
          .from('comments')
          .select('*')
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        if (data && isMounted) {
          setComments(data as Comment[]);
        }
      } catch (err) {
        console.error('Error al cargar comentarios:', err);
      } finally {
        if (isMounted) {
          setIsLoadingComments(false);
        }
      }
    };

    loadComments();

    // 2. Suscripción Realtime a la tabla 'comments'
    const channel = supabase
      .channel(`realtime:comments:${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          if (!isMounted) return;
          const incoming = payload.new as Comment;

          setComments((prev) => {
            // Deduplicar: si el mismo contenido + user_id ya existe con un ID
            // optimista (temp), lo reemplazamos. Así el remitente NO ve el doble.
            const optimisticIdx = prev.findIndex(
              (c) =>
                c.id.startsWith('optimistic-') &&
                c.user_id === incoming.user_id &&
                c.content === incoming.content
            );
            if (optimisticIdx !== -1) {
              const next = [...prev];
              next[optimisticIdx] = incoming;
              return next;
            }
            // Para el otro participante: simplemente añadir al final
            // (evitar duplicados exactos por doble fire)
            if (prev.some((c) => c.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
        }
      )
      .subscribe((status) => {
        if (!isMounted) return;
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });

    // 3. Cleanup: desuscribirse al desmontar para evitar fugas de memoria
    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, ticketId]);

  // ── Auto-scroll to bottom on new comments ───────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // ── Generar Respuesta Asistida (IA) ──────────────────────────
  const handleAiAssist = async () => {
    setIsAiLoading(true);
    setSendError(null);
    try {
      // 1. Obtener título y descripción del ticket para la IA
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select('title, description, sentiment')
        .eq('id', ticketId)
        .single();
        
      if (ticketError || !ticket) {
        throw new Error('No se pudo cargar la información del ticket.');
      }

      // 2. Llamar a la ruta de IA
      const res = await fetch('/api/suggest-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: ticket.title,
          description: ticket.description,
          sentiment: ticket.sentiment
        }),
      });

      let aiData: any;
      try {
        aiData = await res.json();
      } catch (e) {
        throw new Error('Hubo un error al generar la respuesta con la IA.');
      }

      if (aiData && aiData.suggestedResponse) {
        // 3. Inyectar en el input — el useEffect de sincronización recalculará la altura automáticamente
        setInputValue(aiData.suggestedResponse);
      } else {
        throw new Error(aiData?.error || 'Hubo un error al generar la respuesta con la IA.');
      }
    } catch (err: any) {
      console.error(err);
      setSendError(err.message || 'Error desconocido.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // ── Submit handler ───────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isSending) return;

    setSendError(null);
    setIsSending(true);

    // Optimistic update — generate a temporary id
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticComment: Comment = {
      id: optimisticId,
      ticket_id: ticketId,
      user_id: currentUser,
      content: trimmed,
      created_at: new Date().toISOString(),
    };

    setComments((prev) => [...prev, optimisticComment]);
    setInputValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        ticket_id: ticketId,
        user_id: currentUser,
        content: trimmed,
      })
      .select()
      .single();

    if (error) {
      // Rollback optimistic comment
      setComments((prev) => prev.filter((c) => c.id !== optimisticId));
      setInputValue(trimmed);
      setSendError(`No se pudo enviar: ${error.message}`);
    } else if (data) {
      // Replace optimistic comment with the real one from Supabase
      setComments((prev) =>
        prev.map((c) => (c.id === optimisticId ? (data as Comment) : c))
      );

      // ── Lógica de Notificaciones Bidireccional ─────────────────────
      // Caso A: Agente/Admin comenta → notificar al dueño del ticket (usuario)
      // Caso B: Usuario comenta       → notificar al agente asignado
      try {
        // Obtenemos el user_id del dueño del ticket
        const { data: ticketData, error: ticketError } = await supabase
          .from('tickets')
          .select('user_id')
          .eq('id', ticketId)
          .single();

        if (!ticketError && ticketData) {
          const ticketOwnerId = ticketData.user_id;

          // Quién está enviando el mensaje ahora mismo
          const { data: { user: sender } } = await supabase.auth.getUser();

          if (sender) {
            const senderIsOwner = sender.id === ticketOwnerId;

            if (senderIsOwner) {
              // ── Caso B: El USUARIO comenta → notificar al AGENTE asignado ──
              if (assignedTo && assignedTo !== sender.id) {
                await supabase.from('notifications').insert({
                  user_id: assignedTo,
                  ticket_id: ticketId,
                  title: 'Nueva Respuesta del Usuario',
                  message: 'El usuario ha respondido en uno de tus tickets asignados.',
                  is_read: false,
                });
              }
            } else {
              // ── Caso A: El AGENTE/ADMIN comenta → notificar al USUARIO dueño ──
              await supabase.from('notifications').insert({
                user_id: ticketOwnerId,
                ticket_id: ticketId,
                title: 'Nuevo Comentario',
                message: 'Tienes un nuevo mensaje de nuestro equipo de soporte en tu ticket.',
                is_read: false,
              });
            }
          }
        }
      } catch (notifErr) {
        console.error('Error al procesar la notificación del comentario:', notifErr);
      }

      // Revalidar el dashboard para que la campanita de notificaciones se actualice
      try {
        await revalidateDashboard();
      } catch (revalError) {
        console.error('Error al revalidar el dashboard:', revalError);
      }
    }

    setIsSending(false);
  }

  return (
    <section
      aria-label="Chat del ticket"
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
      }}
    >
      {/* ── Chat heading ─────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          marginBottom: '1.25rem',
          paddingBottom: '1rem',
          borderBottom: '3px solid #0F172A',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            background: '#FE81D4',
            border: '2px solid #0F172A',
            borderRadius: '0.375rem',
            padding: '0.25rem 0.625rem',
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 900,
            fontSize: '0.6875rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#0F172A',
          }}
        >
          CHAT DEL TICKET
        </span>
        <span
          style={{
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 600,
            fontSize: '0.6875rem',
            color: '#64748b',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          COMUNICACIÓN EN TIEMPO REAL
        </span>
        {/* ── Indicador LIVE ────────────────────────── */}
        <span
          title={isRealtimeConnected ? 'Realtime activo' : 'Conectando...'}
          style={{
            marginLeft: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            background: isRealtimeConnected ? '#bbf7d0' : '#fef08a',
            border: '2px solid #0F172A',
            borderRadius: '99px',
            padding: '0.2rem 0.6rem',
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 900,
            fontSize: '0.5625rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: '#0F172A',
            userSelect: 'none',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: isRealtimeConnected ? '#16a34a' : '#b45309',
              flexShrink: 0,
              animation: isRealtimeConnected ? 'pulse 1.8s infinite' : 'none',
            }}
            aria-hidden="true"
          />
          {isRealtimeConnected ? 'LIVE' : 'CONECTANDO'}
        </span>
      </div>

      {/* ── Comments list ─────────────────────────────────────── */}
      <div
        style={{
          background: '#FFEA6C',
          border: '3px solid #0F172A',
          boxShadow: '4px 4px 0px 0px #0F172A',
          borderRadius: '0.75rem',
          padding: '1.25rem',
          minHeight: '220px',
          maxHeight: '480px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          marginBottom: '1rem',
          scrollBehavior: 'smooth',
          flex: 1,
        }}
      >
        {isLoadingComments ? (
          <p
            style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 700,
              fontSize: '0.8125rem',
              color: '#334155',
              opacity: 0.6,
              textAlign: 'center',
              margin: 'auto',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            CARGANDO CHAT...
          </p>
        ) : (() => {
          // Filtrar mensajes: solo del dueño del ticket y del agente actualmente asignado.
          // Esto oculta mensajes de agentes anteriores que hayan escalado el ticket.
          const visibleComments = (ticketOwnerId || assignedTo)
            ? comments.filter((c) =>
                c.user_id === ticketOwnerId ||
                c.user_id === assignedTo ||
                c.user_id === currentUser
              )
            : comments;

          return visibleComments.length === 0 ? (
            <p
              style={{
                fontFamily: '"DM Sans", sans-serif',
                fontSize: '0.9375rem',
                color: '#334155',
                opacity: 0.55,
                fontStyle: 'italic',
                textAlign: 'center',
                margin: 'auto',
              }}
            >
              AÚN NO HAY MENSAJES. ¡SÉ EL PRIMERO!
            </p>
          ) : (
            visibleComments.map((comment) => (
              <CommentBubble
                key={comment.id}
                comment={comment}
                isOwn={comment.user_id === currentUser}
              />
            ))
          );
        })()
        }
        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* ── Error feedback ─────────────────────────────────────── */}
      {sendError && (
        <div
          role="alert"
          style={{
            background: '#fecaca',
            border: '3px solid #0F172A',
            boxShadow: '3px 3px 0px 0px #0F172A',
            borderRadius: '0.5rem',
            padding: '0.625rem 1rem',
            marginBottom: '0.75rem',
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 700,
            fontSize: '0.8125rem',
            color: '#0F172A',
          }}
        >
          ERROR: {sendError}
        </div>
      )}

      {/* ── BOTÓN IA Neo-Brutalista (solo visible para agentes/admins) ── */}
      {isAgent && (
        <button
          id="ai-assist-button"
          type="button"
          onClick={handleAiAssist}
          disabled={isAiLoading}
          className="w-full bg-purple-400 border-4 border-black p-3 font-black
                     flex justify-center items-center gap-2 mb-3
                     hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                     active:translate-x-[2px] active:translate-y-[2px]
                     transition-all duration-100 uppercase tracking-wider text-sm
                     disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ fontFamily: '"Space Grotesk", sans-serif', borderRadius: '0.5rem' }}
        >
          {isAiLoading ? (
            <>
              <span
                className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"
                aria-hidden="true"
              />
              GENERANDO...
            </>
          ) : (
            <>
              GENERAR RESPUESTA ASISTIDA (IA)
            </>
          )}
        </button>
      )}

      {/* ── Input form ──────────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-end',
        }}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          onChange={handleInput}
          // Atributos y Clases de Tailwind: pr-4 para separar de la barra lateral
          className="w-full min-h-[50px] max-h-40 overflow-y-auto resize-none border-4 border-black p-3 pr-4 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black"
          placeholder="Escribe un mensaje..."
          id="comment-input"
          value={inputValue}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          maxLength={1000}
          autoComplete="off"
          style={{
            flex: 1,
            background: '#ffffff',
            borderRadius: '0.625rem',
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '1rem',
            lineHeight: 1.5,
            color: '#0F172A',
          }}
        />
        <SendButton
          disabled={!inputValue.trim() || isSending}
          loading={isSending}
        />
      </form>
    </section>
  );
}
