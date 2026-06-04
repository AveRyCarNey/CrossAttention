'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────
type Priority = 'baja' | 'media' | 'alta';

interface Category {
  id: string;
  name: string;
}

interface TicketClassification {
  priority: "baja" | "media" | "alta";
  sentiment: "positivo" | "neutral" | "negativo";
}

interface TicketSuggestions {
  response: string;
  nextAction: "asignar" | "escalar" | "cerrar" | "pedir más datos";
}

interface AIAnalysis {
  summary: string;
  classification: TicketClassification;
  suggestions: TicketSuggestions;
  riskLevel: "bajo" | "medio" | "alto";
}

interface AnalyzeAPIResponse {
  aiData: AIAnalysis;
  promptUsed: string;
  modelVersion: string;
  latency: number;
  rawResult: string;
}

// ─── Shared input classes ─────────────────────────────────────
const INPUT_BASE = [
  'w-full px-4 py-3.5 text-base font-medium text-cross-text',
  'bg-white/60 placeholder:text-cross-text-dim/50',
  'border-[3px] border-cross-text rounded-xl',
  'shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]',
  'outline-none transition-all duration-150',
  'focus:border-cross-accent focus:shadow-[4px_4px_0px_0px_#FF61F8]',
  'focus:ring-2 focus:ring-cross-accent/20',
].join(' ');

const INPUT_READONLY = [
  'w-full px-4 py-3.5 text-base font-medium text-cross-text-dim',
  'bg-white/30 cursor-not-allowed',
  'border-[3px] border-cross-text/50 rounded-xl',
  'shadow-[2px_2px_0px_0px_rgba(15,23,42,0.4)]',
  'outline-none select-none',
].join(' ');

// ─── Helpers ──────────────────────────────────────────────────
function sanitizePriority(raw: string): Priority {
  const normalized = raw?.toLowerCase().trim();
  if (normalized === 'baja' || normalized === 'media' || normalized === 'alta') {
    return normalized;
  }
  return 'media';
}

// ─── AI Badge — shown after analysis ─────────────────────────
const SENTIMENT_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  positivo: { emoji: '', label: 'POSITIVO', color: '#22c55e' },
  neutro:   { emoji: '', label: 'NEUTRO',   color: '#eab308' },
  negativo: { emoji: '', label: 'NEGATIVO', color: '#ef4444' },
};

const RISK_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  bajo: { emoji: '', label: 'BAJO',  color: '#22c55e' },
  medio:{ emoji: '', label: 'MEDIO', color: '#eab308' },
  alto: { emoji: '', label: 'ALTO',  color: '#ef4444' },
};

const PRIORITY_CONFIG: Record<Priority, { emoji: string; label: string }> = {
  baja:  { emoji: '', label: 'BAJA'  },
  media: { emoji: '', label: 'MEDIA' },
  alta:  { emoji: '', label: 'ALTA'  },
};

// ─── Component ────────────────────────────────────────────────
export default function CreateTicketForm() {
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );
  const router = useRouter();

  // Auto-filled from authenticated session
  const [userEmail, setUserEmail] = useState<string>('Cargando...');
  const [userId, setUserId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');

  // Loading / submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingText, setLoadingText] = useState('Enviando...');

  // ── Fetch authenticated user on mount ──────────────────────
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.user_metadata?.name || user.user_metadata?.display_name || user.email || 'Usuario Desconocido');
        setUserId(user.id);
      } else {
        setUserEmail('No autenticado');
      }
    };
    fetchUser();
  }, [supabase]);

  // ── Fetch categories on mount ──────────────────────────────
  useEffect(() => {
    async function fetchCategories() {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');
      
      if (!error && data) {
        setCategories(data);
      }
    }
    fetchCategories();
  }, [supabase]);

  const isValid =
    userId !== null && title.trim() !== '' && description.trim() !== '' && selectedCategory !== '';

  // ── Submit — AI analysis → Supabase insert ─────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);

    // ── Step 1: Call the AI analysis endpoint ────────────────
    setLoadingText('Analizando ticket con IA...');

    let apiResponse: AnalyzeAPIResponse | null = null;

    try {
      const res = await fetch('/api/analyze-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
        }),
      });

      if (res.ok) {
        apiResponse = (await res.json()) as AnalyzeAPIResponse;
      } else {
        console.warn(
          '[CreateTicketForm] /api/analyze-ticket respondió con error:',
          res.status,
        );
      }
    } catch (err) {
      console.error('[CreateTicketForm] Fallo al llamar /api/analyze-ticket:', err);
    }

    // ── Step 2: Prepare payload — fallback if AI failed ─────
    const aiData = apiResponse?.aiData ?? null;

    const finalPriority: Priority = aiData
      ? sanitizePriority(aiData.classification.priority)
      : 'media';

    const insertPayload = {
      user_id: userId,
      category_id: selectedCategory,
      sender: userEmail,
      title: title.trim(),
      description: description.trim(),
      priority: finalPriority,
      status: 'open',
      created_at: new Date().toISOString(),
      // ── AI fields ──────────────────────────────────────────
      ai_summary:           aiData?.summary                    ?? null,
      sentiment:            aiData?.classification.sentiment   ?? null,
      risk_level:           aiData?.riskLevel                  ?? null,
      ai_suggested_response: aiData?.suggestions.response      ?? null,
      ai_next_action:       aiData?.suggestions.nextAction     ?? null,
      // ── Observability fields ───────────────────────────────
      ai_prompt:            apiResponse?.promptUsed            ?? null,
      ai_model:             apiResponse?.modelVersion          ?? null,
      ai_latency:           apiResponse?.latency               ?? null,
      ai_raw_result:        apiResponse?.rawResult             ?? null,
    };

    // ── Step 3: Insert into Supabase ─────────────────────────
    setLoadingText('Guardando ticket...');

    const { error } = await supabase.from('tickets').insert([insertPayload]);

    setIsSubmitting(false);

    if (error) {
      console.error('[CreateTicketForm] Error al guardar el ticket:', error);
      alert('Hubo un problema al enviar el ticket. Asegúrate de estar autenticado.');
    } else {
      // ── Notificar a n8n (Webhook) ──────────────────────────
      try {
        const { data: sessionData } = await supabase.auth.getUser();
        const userEmail = sessionData.user?.email || '';

        await fetch(process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL as string, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            priority: aiData?.classification.priority || 'media',
            userEmail: userEmail,
            riskLevel: aiData?.riskLevel || 'medio',
          }),
        });
      } catch (n8nErr) {
        console.error('[CreateTicketForm] Error al notificar a n8n:', n8nErr);
      }

      router.push('/dashboard');
      router.refresh();
    }
  };

  // ─── Form ───────────────────────────────────────────────────
  return (
    <form
      onSubmit={handleSubmit}
      className="w-full bg-cross-card border-[3px] border-cross-text rounded-2xl
                 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] overflow-hidden
                 animate-fade-in"
    >
      {/* ── Header strip ─────────────────────────────────────── */}
      <div className="px-6 py-4 bg-cross-text text-cross-bg flex items-center gap-3">
        <span
          className="block w-3 h-3 rounded-full bg-cross-accent"
          style={{ boxShadow: '0 0 0 3px #FF61F830' }}
          aria-hidden="true"
        />
        <span
          className="text-[11px] font-black tracking-[0.2em] uppercase"
          style={{ fontFamily: '"Space Grotesk", sans-serif' }}
        >
          Nuevo Reporte de Incidencia
        </span>

        {/* AI badge */}
        <span
          className="ml-auto px-2.5 py-0.5 rounded-md bg-cross-accent text-cross-text
                     text-[9px] font-black uppercase tracking-widest"
          style={{ fontFamily: '"Space Grotesk", sans-serif' }}
          aria-hidden="true"
        >
          ✦ IA
        </span>
      </div>

      {/* ── Fields ───────────────────────────────────────────── */}
      <div className="p-6 md:p-8 space-y-6">

        {/* Sender — auto-filled from auth session, read-only */}
        <fieldset className="space-y-2">
          <label
            htmlFor="ticket-sender"
            className="block text-[11px] font-black text-cross-text uppercase tracking-[0.15em]"
            style={{ fontFamily: '"Space Grotesk", sans-serif' }}
          >
            Reportado por
            <span className="text-cross-accent ml-1" aria-label="automático">✦</span>
          </label>

          <div className="relative">
            <input
              id="ticket-sender"
              type="text"
              disabled
              value={userEmail}
              aria-label="Correo del usuario autenticado (auto-completado)"
              className={INPUT_READONLY}
              style={{ fontFamily: '"DM Sans", sans-serif' }}
            />
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2
                         px-2 py-0.5 rounded-md
                         bg-cross-text text-cross-bg
                         text-[9px] font-black uppercase tracking-widest"
              style={{ fontFamily: '"Space Grotesk", sans-serif' }}
              aria-hidden="true"
            >
              AUTO
            </span>
          </div>

          <p
            className="text-[10px] font-medium text-cross-text-dim"
            style={{ fontFamily: '"DM Sans", sans-serif' }}
          >
            Detectado automáticamente desde tu sesión activa.
          </p>
        </fieldset>

        {/* Title */}
        <fieldset className="space-y-2">
          <label
            htmlFor="ticket-title"
            className="block text-[11px] font-black text-cross-text uppercase tracking-[0.15em]"
            style={{ fontFamily: '"Space Grotesk", sans-serif' }}
          >
            Título del Ticket
            <span className="text-cross-accent ml-1" aria-label="obligatorio">*</span>
          </label>
          <input
            id="ticket-title"
            type="text"
            required
            maxLength={80}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Error al iniciar sesión en el portal"
            className={INPUT_BASE}
            style={{
              fontFamily: '"DM Sans", sans-serif',
              background: 'rgba(255,234,108,0.45)',
            }}
            disabled={isSubmitting}
          />
          <p
            className="text-[10px] font-medium text-cross-text-dim text-right"
            style={{ fontFamily: '"DM Sans", sans-serif' }}
            aria-live="polite"
          >
            {title.length}/80
          </p>
        </fieldset>

        {/* Category */}
        <fieldset className="space-y-2">
          <label
            htmlFor="ticket-category"
            className="block text-[11px] font-black text-cross-text uppercase tracking-[0.15em]"
            style={{ fontFamily: '"Space Grotesk", sans-serif' }}
          >
            Categoría
            <span className="text-cross-accent ml-1" aria-label="obligatorio">*</span>
          </label>
          <select
            id="ticket-category"
            required
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={`${INPUT_BASE} cursor-pointer`}
            style={{ fontFamily: '"DM Sans", sans-serif' }}
            disabled={isSubmitting || categories.length === 0}
          >
            <option value="" disabled>
              Selecciona una categoría...
            </option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </fieldset>

        {/* Description */}
        <fieldset className="space-y-2">
          <label
            htmlFor="ticket-description"
            className="block text-[11px] font-black text-cross-text uppercase tracking-[0.15em]"
            style={{ fontFamily: '"Space Grotesk", sans-serif' }}
          >
            Descripción del Problema
            <span className="text-cross-accent ml-1" aria-label="obligatorio">*</span>
          </label>
          <textarea
            id="ticket-description"
            required
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe tu problema con el mayor detalle posible..."
            className={`${INPUT_BASE} resize-none`}
            style={{ fontFamily: '"DM Sans", sans-serif' }}
            disabled={isSubmitting}
          />
        </fieldset>

        {/* ── AI Info banner (shown while analyzing) ────────────── */}
        {isSubmitting && (
          <div
            className="flex items-center gap-3 px-4 py-3
                       bg-cross-accent/10 border-[2px] border-cross-accent
                       rounded-xl animate-pulse"
            role="status"
            aria-live="polite"
          >
            <span
              className="block w-4 h-4 border-[2px] border-cross-accent border-t-transparent
                         rounded-full animate-spin shrink-0"
              aria-hidden="true"
            />
            <span
              className="text-[11px] font-black text-cross-accent uppercase tracking-widest"
              style={{ fontFamily: '"Space Grotesk", sans-serif' }}
            >
              {loadingText}
            </span>
          </div>
        )}

        {/* ── AI Decision info (static reminder) ─────────────────── */}
        {!isSubmitting && (
          <div
            className="flex items-start gap-3 px-4 py-3
                       bg-white/30 border-[2px] border-cross-text/30
                       rounded-xl"
          >
            <span className="text-[10px] font-black bg-cross-text text-cross-bg px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 select-none" style={{ fontFamily: '"Space Grotesk", sans-serif' }} aria-hidden="true">IA</span>
            <p
              className="text-[10px] font-medium text-cross-text-dim leading-relaxed"
              style={{ fontFamily: '"DM Sans", sans-serif' }}
            >
              La <strong className="text-cross-text">inteligencia artificial</strong> analizará
              tu ticket para asignar automáticamente la prioridad, el sentimiento y el nivel
              de riesgo. No necesitas seleccionarlos manualmente.
            </p>
          </div>
        )}
      </div>

      {/* ── Footer / Submit ──────────────────────────────────── */}
      <div className="px-6 md:px-8 pb-6 md:pb-8">
        <button
          id="submit-ticket-btn"
          type="submit"
          disabled={!isValid || isSubmitting}
          className="
            w-full py-4 px-6 rounded-xl
            bg-cross-accent text-cross-text
            border-[3px] border-cross-text
            shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]
            text-base font-black uppercase tracking-wider
            transition-all duration-100 cursor-pointer
            hover:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[2px] hover:translate-y-[2px]
            active:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] active:translate-x-[5px] active:translate-y-[5px]
            disabled:bg-[#D1D5DB] disabled:text-[#9CA3AF] disabled:border-[#9CA3AF] disabled:shadow-none disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0
            focus-visible:ring-2 focus-visible:ring-cross-text focus-visible:ring-offset-2 focus-visible:ring-offset-cross-card
          "
          style={{ fontFamily: '"Space Grotesk", sans-serif' }}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-3">
              <span
                className="block w-5 h-5 border-[3px] border-[#9CA3AF] border-t-transparent rounded-full animate-spin"
                aria-hidden="true"
              />
              PROCESANDO...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              Analizar y Enviar Ticket
            </span>
          )}
        </button>

        {!isValid && (title.length > 0 || description.length > 0) && userEmail !== 'Cargando...' && (
          <p
            className="mt-3 text-center text-[11px] font-semibold text-cross-text-dim"
            role="status"
          >
            Completa todos los campos obligatorios para enviar.
          </p>
        )}
      </div>
    </form>
  );
}
