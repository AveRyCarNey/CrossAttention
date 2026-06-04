import CreateTicketForm from '../features/tickets/components/CreateTicketForm';

export default function ReportarPage() {
  return (
    <div className="min-h-screen bg-cross-bg px-6 py-8 md:px-12 md:py-12 selection:bg-cross-accent selection:text-white">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* ── HEADER ────────────────────────────────────────── */}
        <header className="animate-slide-header">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 mb-4">
            <span
              className="block w-2.5 h-2.5 rounded-full bg-cross-accent"
              style={{ boxShadow: '0 0 0 3px #FF61F820, 0 0 0 6px #FF61F810' }}
              aria-hidden="true"
            />
            <span
              className="text-xs font-bold tracking-[0.2em] uppercase text-cross-text-dim"
              style={{ fontFamily: '"Space Grotesk", sans-serif' }}
            >
              Soporte — Nuevo Ticket
            </span>
          </div>

          <h1
            className="text-4xl md:text-6xl font-black text-cross-text uppercase leading-none tracking-tighter mb-3"
            style={{ fontFamily: '"Space Grotesk", sans-serif' }}
          >
            Reportar Incidencia
          </h1>

          <p
            className="text-cross-text-dim text-base md:text-lg max-w-xl leading-relaxed font-medium mt-4"
            style={{ fontFamily: '"DM Sans", sans-serif' }}
          >
            Completa el formulario y un agente de soporte atenderá tu solicitud lo antes posible.
          </p>

          {/* Back link */}
          <a
            href="/dashboard"
            className="inline-flex items-center gap-1.5 mt-5 px-4 py-2 text-xs font-black uppercase tracking-wider
                       text-cross-text bg-white/40 border-2 border-cross-text rounded-full
                       shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]
                       hover:bg-white/70 hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]
                       hover:translate-x-[1px] hover:translate-y-[1px]
                       active:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] active:translate-x-[2px] active:translate-y-[2px]
                       transition-all duration-100"
            style={{ fontFamily: '"Space Grotesk", sans-serif' }}
          >
            <span aria-hidden="true">←</span>
            Ver Bandeja
          </a>
        </header>

        {/* ── FORM ──────────────────────────────────────────── */}
        <main>
          <CreateTicketForm />
        </main>

      </div>
    </div>
  );
}
