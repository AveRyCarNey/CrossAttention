'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';

// ─── Types ────────────────────────────────────────────────────
interface TicketRow {
  status: string;
  risk_level: string | null;
}

interface Metrics {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
}

// ─── Metric Card ──────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: number | string;
  emoji: string;
  bg: string;
  border: string;
  shadow: string;
  delay?: string;
}

function MetricCard({ label, value, emoji, bg, border, shadow, delay = '0ms' }: MetricCardProps) {
  return (
    <div
      className="relative flex flex-col justify-between p-5 rounded-2xl border-[3px] transition-transform duration-200 hover:-translate-y-1 hover:scale-[1.02] cursor-default select-none animate-fade-in-up"
      style={{
        backgroundColor: bg,
        borderColor: border,
        boxShadow: `5px 5px 0px 0px ${shadow}`,
        animationDelay: delay,
      }}
      role="article"
      aria-label={`${label}: ${value}`}
    >
      {/* Brutalist text badge instead of emoji */}
      <span
        className="text-[9px] font-black uppercase bg-[#0F172A] text-white px-2 py-0.5 border border-black rounded inline-block mb-3 leading-none self-start select-none"
        style={{ fontFamily: '"Space Grotesk", sans-serif' }}
      >
        {emoji}
      </span>

      {/* Number */}
      <p
        className="text-5xl font-black leading-none tracking-tighter text-[#0F172A] mb-1"
        style={{ fontFamily: '"Space Grotesk", sans-serif' }}
      >
        {value}
      </p>

      {/* Label */}
      <p
        className="text-[11px] font-black uppercase tracking-[0.18em] text-[#334155] mt-2"
        style={{ fontFamily: '"Space Grotesk", sans-serif' }}
      >
        {label}
      </p>

      {/* Decorative corner accent */}
      <span
        className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full border-2 border-[#0F172A]"
        style={{ backgroundColor: border }}
        aria-hidden="true"
      />
    </div>
  );
}

// ─── Skeleton Card ─────────────────────────────────────────────
function SkeletonCard({ delay = '0ms' }: { delay?: string }) {
  return (
    <div
      className="rounded-2xl border-[3px] border-[#0F172A] p-5 animate-fade-in-up"
      style={{
        animationDelay: delay,
        boxShadow: '5px 5px 0px 0px #0F172A',
      }}
    >
      {/* Emoji placeholder */}
      <div className="w-8 h-8 rounded-lg animate-shimmer mb-3" />
      {/* Number placeholder */}
      <div className="w-16 h-12 rounded-lg animate-shimmer mb-2" />
      {/* Label placeholder */}
      <div className="w-24 h-3 rounded-full animate-shimmer mt-2" />
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────
interface ManagerMetricsProps {
  userRole?: string;
}

export default function ManagerMetrics({ userRole = 'manager' }: ManagerMetricsProps) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      const { data, error } = await supabase
        .from('tickets')
        .select('status, risk_level');

      if (error || !data) {
        // On error, show zeroes rather than crashing
        setMetrics({ total: 0, open: 0, inProgress: 0, resolved: 0 });
      } else {
        const rows = data as TicketRow[];
        setMetrics({
          total:      rows.length,
          open:       rows.filter(t => t.status?.toLowerCase() === 'open'        || t.status?.toLowerCase() === 'abierto').length,
          inProgress: rows.filter(t => t.status?.toLowerCase() === 'in progress' || t.status?.toLowerCase() === 'en progreso').length,
          resolved:   rows.filter(t => t.status?.toLowerCase() === 'resolved'    || t.status?.toLowerCase() === 'resuelto').length,
        });
      }
      setIsLoading(false);
    }

    fetchMetrics();
  }, []);

  const CARDS = metrics
    ? [
        {
          label:  'Total de Tickets',
          value:  metrics.total,
          emoji:  'TOTAL',
          bg:     '#FFEA6C',   // cross-bg yellow
          border: '#0F172A',
          shadow: '#0F172A',
        },
        {
          label:  'Tickets Abiertos',
          value:  metrics.open,
          emoji:  'ABIERTOS',
          bg:     '#93C5FD',   // vivid sky blue
          border: '#0F172A',
          shadow: '#0F172A',
        },
        {
          label:  'En Progreso',
          value:  metrics.inProgress,
          emoji:  'PROGRESO',
          bg:     '#FDE68A',   // amber 200
          border: '#0F172A',
          shadow: '#0F172A',
        },
        {
          label:  'Resueltos',
          value:  metrics.resolved,
          emoji:  'RESUELTOS',
          bg:     '#86EFAC',   // green 300
          border: '#0F172A',
          shadow: '#0F172A',
        },
      ]
    : [];

  return (
    <section aria-label="Métricas de Manager" className="w-full">
      {/* Section heading */}
      <div className="flex items-center gap-3 mb-5">
        <span
          className="block w-1.5 h-6 rounded-full bg-[#FF61F8] border-2 border-[#0F172A]"
          aria-hidden="true"
        />
        <h2
          className="text-sm font-black uppercase tracking-[0.2em] text-[#334155]"
          style={{ fontFamily: '"Space Grotesk", sans-serif' }}
        >
          Métricas del Sistema
        </h2>
        {/* Live indicator */}
        <span
          className="ml-auto inline-flex items-center gap-1.5 border-2 border-[#0F172A] rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider bg-white"
          style={{ boxShadow: '2px 2px 0 #0F172A', fontFamily: '"Space Grotesk", sans-serif' }}
        >
          <span
            className={`block w-1.5 h-1.5 rounded-full ${userRole?.toLowerCase() === 'admin' ? 'bg-red-500' : 'bg-green-500'}`}
            style={{ animation: 'pulse-badge 2s ease-in-out infinite' }}
            aria-hidden="true"
          />
          {userRole?.toUpperCase()}
        </span>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} delay={`${i * 80}ms`} />
            ))
          : CARDS.map((card, i) => (
              <MetricCard
                key={card.label}
                label={card.label}
                value={card.value}
                emoji={card.emoji}
                bg={card.bg}
                border={card.border}
                shadow={card.shadow}
                delay={`${i * 80}ms`}
              />
            ))}
      </div>
    </section>
  );
}
