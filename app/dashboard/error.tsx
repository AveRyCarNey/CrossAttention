'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(
      '🔴 ERROR CAPTURADO POR BOUNDARY DEL DASHBOARD:',
      error.message,
      error.digest ? `| DIGEST: ${error.digest}` : '',
      error,
    );
  }, [error]);

  return (
    <div
      className="min-h-[80vh] flex items-center justify-center px-6 py-12 bg-cross-bg selection:bg-cross-accent selection:text-white animate-fade-in"
      style={{ background: '#FFEA6C' }}
    >
      <div
        style={{
          background: '#FFA6FB',
          border: '4px solid #0F172A',
          boxShadow: '8px 8px 0px 0px #0F172A',
          borderRadius: '1rem',
          padding: '2.5rem 2rem',
          maxWidth: '520px',
          width: '100%',
          textAlign: 'center',
        }}
        className="animate-fade-in-up"
      >
        {/* Error category label */}
        <div
          style={{
            display: 'inline-block',
            background: '#EF4444',
            color: '#FFFFFF',
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 900,
            fontSize: '0.8125rem',
            letterSpacing: '0.12em',
            padding: '0.5rem 1rem',
            border: '3px solid #0F172A',
            borderRadius: '0.5rem',
            marginBottom: '1.5rem',
            textTransform: 'uppercase',
            boxShadow: '3px 3px 0px 0px #0F172A',
          }}
        >
          ERROR EN PANEL
        </div>

        {/* Big Brutalist Heading */}
        <h1
          style={{
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 900,
            fontSize: '2.25rem',
            textTransform: 'uppercase',
            color: '#0F172A',
            marginBottom: '0.75rem',
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
          }}
        >
          ¡Ha ocurrido un error!
        </h1>

        <p
          style={{
            fontFamily: '"DM Sans", sans-serif',
            color: '#334155',
            fontSize: '1rem',
            marginBottom: '1.75rem',
            lineHeight: 1.6,
            fontWeight: 500,
          }}
        >
          No pudimos procesar la solicitud para esta página. Esto suele deberse a un problema de conexión temporal o una consulta de base de datos colgada.
        </p>

        {/* Message Error Box in Red */}
        <div
          style={{
            background: '#FEE2E2',
            border: '3px solid #EF4444',
            borderRadius: '0.75rem',
            padding: '1rem 1.25rem',
            textAlign: 'left',
            marginBottom: '2rem',
            boxShadow: '4px 4px 0px 0px #EF4444',
          }}
        >
          <p
            style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 900,
              fontSize: '0.6875rem',
              letterSpacing: '0.1em',
              color: '#EF4444',
              textTransform: 'uppercase',
              marginBottom: '0.25rem',
            }}
          >
            Detalles del fallo:
          </p>
          <pre
            style={{
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              fontWeight: 700,
              color: '#B91C1C',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              margin: 0,
            }}
          >
            {error.message || 'Error desconocido del servidor.'}
          </pre>
          {error.digest && (
            <span
              style={{
                display: 'block',
                marginTop: '0.5rem',
                fontFamily: '"Space Grotesk", sans-serif',
                fontSize: '0.625rem',
                fontWeight: 600,
                color: 'rgba(239, 68, 68, 0.7)',
                letterSpacing: '0.05em',
              }}
            >
              DIGEST ID: {error.digest}
            </span>
          )}
        </div>

        {/* Thick black Neo-Brutalist button */}
        <button
          onClick={() => reset()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            background: '#0F172A',
            color: '#FFFFFF',
            border: '4px solid #0F172A',
            boxShadow: '6px 6px 0px 0px #FF61F8',
            borderRadius: '0.75rem',
            padding: '1rem 2rem',
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 900,
            fontSize: '1rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all 0.12s ease',
          }}
          onMouseEnter={(e) => {
            const btn = e.currentTarget;
            btn.style.background = '#FF61F8';
            btn.style.color = '#0F172A';
            btn.style.boxShadow = '3px 3px 0px 0px #0F172A';
            btn.style.transform = 'translate(3px, 3px)';
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget;
            btn.style.background = '#0F172A';
            btn.style.color = '#FFFFFF';
            btn.style.boxShadow = '6px 6px 0px 0px #FF61F8';
            btn.style.transform = 'translate(0px, 0px)';
          }}
          onMouseDown={(e) => {
            const btn = e.currentTarget;
            btn.style.boxShadow = 'none';
            btn.style.transform = 'translate(6px, 6px)';
          }}
          onMouseUp={(e) => {
            const btn = e.currentTarget;
            btn.style.boxShadow = '3px 3px 0px 0px #0F172A';
            btn.style.transform = 'translate(3px, 3px)';
          }}
        >
          REINTENTAR
        </button>
      </div>
    </div>
  );
}
