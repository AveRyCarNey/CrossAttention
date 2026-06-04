'use client';

import { useState } from 'react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────
interface TicketProps {
  index: number;
  id: string;
  title: string;
  status: string;
  priority: string;
  sender: string;
  createdAt?: string;
  isMock?: boolean;
}

// ─── Priority config ──────────────────────────────────────────
const PRIORITY_CONFIG: Record<string, { label: string; bg: string; textColor: string; dot: string; pulse: boolean }> = {
  alta: {
    label: 'Alta',
    bg: 'bg-cross-accent',
    textColor: 'text-cross-text',
    dot: 'bg-red-500',
    pulse: true,
  },
  media: {
    label: 'Media',
    bg: 'bg-amber-400',
    textColor: 'text-cross-text',
    dot: 'bg-amber-600',
    pulse: false,
  },
  baja: {
    label: 'Baja',
    bg: 'bg-emerald-400',
    textColor: 'text-cross-text',
    dot: 'bg-emerald-700',
    pulse: false,
  },
};

// ─── Status config ────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { ring: string; text: string }> = {
  'abierto':     { ring: 'border-blue-400',   text: 'text-blue-700' },
  'en progreso': { ring: 'border-amber-400',  text: 'text-amber-700' },
  'escalado':    { ring: 'border-rose-400',   text: 'text-rose-700' },
  'resuelto':    { ring: 'border-emerald-400', text: 'text-emerald-700' },
};

// ─── Relative time helper ─────────────────────────────────────
function relativeTime(isoDate?: string): string {
  if (!isoDate) return '';
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const mins   = Math.floor(diffMs / 60000);
  if (mins < 1)    return 'ahora';
  if (mins < 60)   return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24)  return `${hours}h`;
  const days  = Math.floor(hours / 24);
  return `${days}d`;
}

// ─── Avatar initials ──────────────────────────────────────────
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');

  // Deterministic pastel background from name
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  return (
    <div
      className="flex-shrink-0 w-8 h-8 rounded-full border-2 border-cross-text
                 flex items-center justify-center text-[10px] font-black text-cross-text
                 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]"
      style={{
        background: `hsl(${hue}, 70%, 80%)`,
        fontFamily: '"Space Grotesk", sans-serif',
      }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

// ─── TicketListItem ───────────────────────────────────────────
export default function TicketListItem({
  index,
  id,
  title,
  status,
  priority,
  sender,
  createdAt,
  isMock = false,
}: TicketProps) {
  const [hovered, setHovered] = useState(false);

  const pKey = priority.toLowerCase();
  const sKey = status.toLowerCase();

  const prioConfig   = PRIORITY_CONFIG[pKey]   ?? PRIORITY_CONFIG['baja'];
  const statusConfig = STATUS_CONFIG[sKey]     ?? { ring: 'border-cross-text/40', text: 'text-cross-text-dim' };

  return (
    <Link
      href={`/dashboard/ticket/${id}`}
      aria-label={`Ver detalle — Ticket de ${sender}: ${title}`}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
    >
    <div
      role="row"
      aria-label={`Ticket de ${sender}: ${title}`}
      tabIndex={0}
      className="ticket-row group grid grid-cols-12 items-center gap-x-4 px-5 py-3.5
                 cursor-pointer outline-none
                 focus-visible:ring-2 focus-visible:ring-cross-accent focus-visible:ring-inset
                 transition-colors duration-150"
      style={{
        animationDelay: `${index * 55}ms`,
        background: hovered ? 'rgba(255,97,248,0.10)' : 'transparent',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      data-ticket-id={id}
    >
      {/* ── Col 1: Index ─────────────────────────────────── */}
      <div
        className="col-span-1 hidden sm:flex items-center justify-center"
        aria-hidden="true"
      >
        <span
          className="text-[11px] font-black text-cross-text-dim tabular-nums"
          style={{ fontFamily: '"Space Grotesk", sans-serif' }}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>

      {/* ── Col 2-5: Sender + Title ───────────────────────── */}
      <div className="col-span-8 sm:col-span-4 flex items-center gap-3 min-w-0">
        <Avatar name={sender} />
        <div className="flex flex-col min-w-0">
          <span
            className="text-[13px] font-black text-cross-text uppercase truncate leading-tight tracking-tight"
            style={{ fontFamily: '"Space Grotesk", sans-serif' }}
            title={sender}
          >
            {sender}
          </span>
          <span
            className="text-sm text-cross-text-dim truncate font-medium leading-snug"
            title={title}
          >
            {title}
          </span>
        </div>
      </div>

      {/* ── Col 6-8: Priority badge (md+) ────────────────── */}
      <div className="col-span-3 hidden md:flex justify-center">
        <span
          className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider
                     px-2.5 py-1 rounded-full border-2 border-cross-text
                     ${prioConfig.bg} ${prioConfig.textColor}
                     shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]
                     ${prioConfig.pulse ? 'priority-alta' : ''}`}
          style={{ fontFamily: '"Space Grotesk", sans-serif' }}
          aria-label={`Prioridad: ${prioConfig.label}`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${prioConfig.dot}`}
            aria-hidden="true"
          />
          {prioConfig.label}
        </span>
      </div>

      {/* ── Col 9-12: Status + time (md+) ────────────────── */}
      <div className="col-span-3 hidden md:flex items-center justify-end gap-3">
        <span
          className={`text-[11px] font-bold uppercase tracking-wide border rounded-full px-2.5 py-0.5
                     ${statusConfig.ring} ${statusConfig.text} bg-white/20`}
          style={{ fontFamily: '"Space Grotesk", sans-serif' }}
          aria-label={`Estado: ${status}`}
        >
          {status}
        </span>
        {createdAt && (
          <span
            className="text-[11px] text-cross-text-dim font-medium tabular-nums w-7 text-right shrink-0"
            title={new Date(createdAt).toLocaleString('es')}
          >
            {relativeTime(createdAt)}
          </span>
        )}
      </div>

      {/* ── Mobile: Priority + Status collapsed ──────────── */}
      <div className="col-span-4 sm:col-span-3 flex md:hidden justify-end items-center gap-1.5">
        <span
          className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md border border-cross-text
                     ${prioConfig.bg} ${prioConfig.textColor}
                     shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]`}
          style={{ fontFamily: '"Space Grotesk", sans-serif' }}
        >
          {prioConfig.label}
        </span>
        <span
          className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-md border
                     ${statusConfig.ring} ${statusConfig.text} bg-white/20`}
          style={{ fontFamily: '"Space Grotesk", sans-serif' }}
        >
          {status}
        </span>
      </div>

      {/* ── Hover arrow indicator ─────────────────────────── */}
      <span
        aria-hidden="true"
        className="absolute right-4 text-cross-accent text-lg font-black
                   transition-all duration-200 pointer-events-none"
        style={{
          opacity: hovered ? 1 : 0,
          transform: hovered ? 'translateX(0)' : 'translateX(-6px)',
          position: 'absolute',
          right: '1.25rem',
        }}
      >
        →
      </span>
    </div>
    </Link>
  );
}