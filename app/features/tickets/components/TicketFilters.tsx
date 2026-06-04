'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────
export interface TicketFiltersState {
  priority: string;
  status: string;
  assignment: string;
  dateFrom: string;
}

// ─── NeoBrutalist Select ──────────────────────────────────────
function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
  accentColor,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  accentColor?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-[10px] font-black uppercase tracking-[0.18em] text-black"
        style={{ fontFamily: '"Space Grotesk", sans-serif' }}
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none border-4 border-black px-3 py-2 text-xs font-bold uppercase tracking-wider
                   bg-white text-black cursor-pointer outline-none
                   shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
                   focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                   hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                   transition-all duration-100"
        style={{
          fontFamily: '"Space Grotesk", sans-serif',
          borderRadius: '0px',
          ...(accentColor ? { background: accentColor } : {}),
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── NeoBrutalist Date Input ──────────────────────────────────
function FilterDate({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-[10px] font-black uppercase tracking-[0.18em] text-black"
        style={{ fontFamily: '"Space Grotesk", sans-serif' }}
      >
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-4 border-black px-3 py-2 text-xs font-bold
                   bg-white text-black cursor-pointer outline-none
                   shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
                   focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                   hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                   transition-all duration-100"
        style={{ fontFamily: '"Space Grotesk", sans-serif', borderRadius: '0px' }}
      />
    </div>
  );
}

// ─── Main TicketFilters Component ────────────────────────────
export default function TicketFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentPriority   = searchParams.get('priority')   ?? '';
  const currentStatus     = searchParams.get('status')     ?? '';
  const currentAssignment = searchParams.get('assignment') ?? '';
  const currentDateFrom   = searchParams.get('dateFrom')   ?? '';

  // ── Update search params without full page reload ──────────
  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  // ── Reset all filters ─────────────────────────────────────
  const handleReset = () => {
    router.replace(pathname, { scroll: false });
  };

  const hasActiveFilters = currentPriority || currentStatus || currentAssignment || currentDateFrom;

  return (
    <div
      id="ticket-filters"
      className="w-full bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4"
      style={{ fontFamily: '"Space Grotesk", sans-serif' }}
    >
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            className="bg-amber-400 border-2 border-black px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            FILTROS
          </span>
          {hasActiveFilters && (
            <span
              className="bg-cross-accent border-2 border-black px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-pulse"
            >
              ACTIVO
            </span>
          )}
        </div>

        {/* Reset button */}
        {hasActiveFilters && (
          <button
            id="reset-filters-btn"
            onClick={handleReset}
            className="bg-red-400 border-4 border-black px-4 py-2 text-[10px] font-black uppercase tracking-wider
                       shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
                       hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]
                       hover:translate-x-[2px] hover:translate-y-[2px]
                       active:shadow-none active:translate-x-[3px] active:translate-y-[3px]
                       transition-all duration-100"
          >
            LIMPIAR
          </button>
        )}
      </div>

      {/* ── Filters row ──────────────────────────────────── */}
      <div className="flex flex-wrap gap-4 items-end">

        {/* Prioridad */}
        <FilterSelect
          id="filter-priority"
          label="Prioridad"
          value={currentPriority}
          onChange={(v) => updateParam('priority', v)}
          accentColor={currentPriority === 'alta' ? '#FE81D4' : currentPriority === 'media' ? '#FFEA6C' : currentPriority === 'baja' ? '#bbf7d0' : '#fff'}
          options={[
            { value: '',      label: 'TODAS' },
            { value: 'alta',  label: 'ALTA' },
            { value: 'media', label: 'MEDIA' },
            { value: 'baja',  label: 'BAJA' },
          ]}
        />

        {/* Estado */}
        <FilterSelect
          id="filter-status"
          label="Estado"
          value={currentStatus}
          onChange={(v) => updateParam('status', v)}
          options={[
            { value: '',            label: 'TODOS' },
            { value: 'abierto',     label: 'ABIERTO' },
            { value: 'en progreso', label: 'EN PROGRESO' },
            { value: 'escalado',    label: 'ESCALADO' },
            { value: 'resuelto',    label: 'RESUELTO' },
          ]}
        />

        {/* Asignación */}
        <FilterSelect
          id="filter-assignment"
          label="Asignación"
          value={currentAssignment}
          onChange={(v) => updateParam('assignment', v)}
          options={[
            { value: '',           label: 'TODOS' },
            { value: 'mine',       label: 'MIS TICKETS' },
            { value: 'unassigned', label: 'SIN ASIGNAR' },
          ]}
        />

        {/* Fecha desde */}
        <FilterDate
          id="filter-date-from"
          label="Desde Fecha"
          value={currentDateFrom}
          onChange={(v) => updateParam('dateFrom', v)}
        />
      </div>
    </div>
  );
}
