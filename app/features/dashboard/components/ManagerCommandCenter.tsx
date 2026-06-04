'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';

// ─── Types ────────────────────────────────────────────────────
interface RawTicket {
  status: string;
  priority?: string | null;
  risk_level: string | null;
  assigned_to: { id: string; email: string; name?: string } | { id: string; email: string; name?: string }[] | null;
}

interface AgentStat {
  email: string;
  total: number;
  resolved: number;
  escalated: number;
  name?: string;
}

interface Metrics {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  resolutionRate: number;
  agentPerformance: AgentStat[];
  priorityStats: { alta: number; media: number; baja: number };
  statusStats: { abierto: number; enProgreso: number; resuelto: number; escalado: number };
  assignedTickets: number;
  unassignedTickets: number;
}

// ─── Metric Card ──────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: number | string;
  badge: string;
  bg: string;
  delay?: string;
}

function MetricCard({ label, value, badge, bg, delay = '0ms' }: MetricCardProps) {
  return (
    <div
      className="relative flex flex-col justify-between p-6 border-[4px] border-[#0F172A] transition-transform duration-200 hover:-translate-y-1 hover:scale-[1.02] cursor-default select-none animate-fade-in-up"
      style={{
        backgroundColor: bg,
        boxShadow: '6px 6px 0px 0px #0F172A',
        animationDelay: delay,
      }}
      role="article"
      aria-label={`${label}: ${value}`}
    >
      {/* Badge */}
      <span
        className="text-[9px] font-black uppercase bg-[#0F172A] text-white px-2 py-0.5 border border-black inline-block mb-4 leading-none self-start select-none"
        style={{ fontFamily: '"Space Grotesk", sans-serif' }}
      >
        {badge}
      </span>

      {/* Number */}
      <p
        className="text-6xl font-black leading-none tracking-tighter text-[#0F172A]"
        style={{ fontFamily: '"Space Grotesk", sans-serif' }}
      >
        {value}
      </p>

      {/* Label */}
      <p
        className="text-[11px] font-black uppercase tracking-[0.18em] text-[#334155] mt-3"
        style={{ fontFamily: '"Space Grotesk", sans-serif' }}
      >
        {label}
      </p>

      {/* Corner accent */}
      <span
        className="absolute top-4 right-4 w-3 h-3 rounded-full border-[3px] border-[#0F172A] bg-white"
        aria-hidden="true"
      />
    </div>
  );
}

// ─── Skeleton Card ─────────────────────────────────────────────
function SkeletonCard({ delay = '0ms' }: { delay?: string }) {
  return (
    <div
      className="border-[4px] border-[#0F172A] p-6 animate-pulse"
      style={{ boxShadow: '6px 6px 0px 0px #0F172A', animationDelay: delay }}
    >
      <div className="w-14 h-4 rounded animate-shimmer mb-4 bg-slate-200" />
      <div className="w-20 h-16 rounded animate-shimmer mb-3 bg-slate-200" />
      <div className="w-28 h-3 rounded-full animate-shimmer bg-slate-200" />
    </div>
  );
}

// ─── Agent Performance Table ──────────────────────────────────
function AgentTable({ agents }: { agents: AgentStat[] }) {
  if (agents.length === 0) {
    return (
      <div className="px-6 py-10 text-center select-none">
        <p
          className="font-black text-[#0F172A] uppercase text-sm"
          style={{ fontFamily: '"Space Grotesk", sans-serif' }}
        >
          SIN DATOS DE AGENTES
        </p>
        <p className="text-xs text-cross-text-dim mt-2 font-medium uppercase">
          No hay tickets asignados a agentes en este momento.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {agents
        .sort((a, b) => b.total - a.total)
        .map((agent, idx) => {
          const total = agent.total || 0;
          const res = agent.resolved || 0;
          const esc = agent.escalated || 0;
          const resPct = total > 0 ? Math.round((res / total) * 100) : 0;
          const escPct = total > 0 ? Math.round((esc / total) * 100) : 0;

          return (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-12 items-center gap-4 border-b-4 border-black p-4 last:border-0 hover:bg-yellow-50 transition-colors">
              
              {/* COLUMNA 1: Nombre / Email (Alineado a la izquierda) */}
              <div className="md:col-span-5 font-bold text-lg truncate pl-2" title={agent.email}>
                {agent.name || agent.email}
              </div>
              
              {/* COLUMNA 2: Badges (Alineados perfectamente al centro) */}
              <div className="md:col-span-4 flex gap-2 justify-center text-xs font-black">
                <div className="bg-gray-200 border-2 border-black px-2 py-1">TOTAL: {total}</div>
                <div className="bg-green-300 border-2 border-black px-2 py-1">RES: {res}</div>
                <div className="bg-purple-300 border-2 border-black px-2 py-1">ESC: {esc}</div>
              </div>

              {/* COLUMNA 3: Gráfica de Tasa (Alineada a la derecha) */}
              <div className="md:col-span-3 flex items-center justify-end gap-2 pr-2">
                <div className="w-full h-5 flex border-2 border-black bg-white max-w-[150px]">
                  <div className="h-full bg-green-400" style={{ width: `${resPct}%` }}></div>
                  <div className="h-full bg-purple-400" style={{ width: `${escPct}%` }}></div>
                </div>
                <span className="text-xs font-black min-w-[4ch] text-right">{resPct}%</span>
              </div>
              
            </div>
          );
        })}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────
export default function ManagerCommandCenter() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        // Fetch ALL tickets — join assigned_to y escalated_by a profiles
        // escalated_by usa !escalated_by para desambiguar la FK frente a assigned_to
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase
          .from('tickets')
          .select('status, priority, risk_level, assigned_to:profiles!assigned_to(id, email), escalated_by_agent:profiles!escalated_by(id, email)') as any);

        if (error || !data) {
          console.error('Error al obtener métricas del manager:', error?.message);
          setMetrics({
            total: 0, open: 0, inProgress: 0, resolved: 0,
            resolutionRate: 0, agentPerformance: [],
            priorityStats: { alta: 0, media: 0, baja: 0 },
            statusStats: { abierto: 0, enProgreso: 0, resuelto: 0, escalado: 0 },
            assignedTickets: 0, unassignedTickets: 0,
          });
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows = data as any[];

        let totalTickets    = 0;
        let resolvedTickets = 0;
        let openTickets     = 0;
        let inProgressTickets = 0;
        const agentPerformance: Record<string, AgentStat> = {};

        const priorityStats = { alta: 0, media: 0, baja: 0 };
        let assignedTickets = 0;
        let unassignedTickets = 0;
        const statusStats = { abierto: 0, enProgreso: 0, resuelto: 0, escalado: 0 };

        const safeStatusStats = statusStats;

        rows.forEach((t) => {
          totalTickets++;

          const s = (t.status ?? '').toLowerCase();
          if (s === 'resuelto' || s === 'resolved') {
            resolvedTickets++;
          } else if (s === 'en progreso' || s === 'in progress') {
            inProgressTickets++;
          } else {
            openTickets++;
          }

          // Conteo de Prioridad
          const prio = t.priority?.toLowerCase() || 'baja';
          if (prio === 'alta') priorityStats.alta++;
          else if (prio === 'media') priorityStats.media++;
          else priorityStats.baja++;

          // Conteo de Asignación
          if (t.assigned_to) assignedTickets++;
          else unassignedTickets++;

          // Conteo detallado de Estatus
          const stat = t.status?.toUpperCase() || 'ABIERTO';
          if (stat === 'ABIERTO' || stat === 'OPEN') safeStatusStats.abierto++;
          else if (stat === 'EN PROGRESO') safeStatusStats.enProgreso++;
          else if (stat === 'RESUELTO') safeStatusStats.resuelto++;
          else if (stat === 'ESCALADO') safeStatusStats.escalado++; 

          // Rendimiento por Agente
          // - Tickets "en progreso" / "resuelto": el agente está en assigned_to.
          // - Tickets "escalado": assigned_to = null, usamos escalated_by_agent.
          const agent = Array.isArray(t.assigned_to) ? t.assigned_to[0] : t.assigned_to;
          const escalatedByAgent = t.escalated_by_agent ?? null;
          const responsibleAgent = agent ?? escalatedByAgent ?? null;

          if (responsibleAgent && responsibleAgent.email) {
            const agentEmail = responsibleAgent.email;
            if (!agentPerformance[agentEmail]) {
              agentPerformance[agentEmail] = {
                total: 0, resolved: 0, escalated: 0,
                email: agentEmail,
                name: responsibleAgent.name,
              };
            }
            agentPerformance[agentEmail].total++;
            if (stat === 'RESUELTO') agentPerformance[agentEmail].resolved++;
            if (stat === 'ESCALADO') agentPerformance[agentEmail].escalated++;
          }
        });

        const resolutionRate =
          totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0;

        setMetrics({
          total: totalTickets,
          open: openTickets,
          inProgress: inProgressTickets,
          resolved: resolvedTickets,
          resolutionRate,
          agentPerformance: Object.values(agentPerformance),
          priorityStats,
          statusStats,
          assignedTickets,
          unassignedTickets,
        });
      } catch (err) {
        console.error('Error fatal en ManagerCommandCenter:', err);
        setMetrics({
          total: 0, open: 0, inProgress: 0, resolved: 0,
          resolutionRate: 0, agentPerformance: [],
          priorityStats: { alta: 0, media: 0, baja: 0 },
          statusStats: { abierto: 0, enProgreso: 0, resuelto: 0, escalado: 0 },
          assignedTickets: 0, unassignedTickets: 0,
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchMetrics();
  }, []);

  // ── KPI card definitions ───────────────────────────────────
  const CARDS = metrics
    ? [
        {
          label: 'Total Tickets',
          value: metrics.total,
          badge: 'TOTAL',
          bg: '#FFEA6C',
          delay: '0ms',
        },
        {
          label: 'Tasa de Resolución',
          value: `${metrics.resolutionRate}%`,
          badge: 'TASA',
          bg: '#86EFAC',
          delay: '80ms',
        },
        {
          label: 'En Progreso',
          value: metrics.inProgress,
          badge: 'PROGRESO',
          bg: '#FDE68A',
          delay: '160ms',
        },
        {
          label: 'Abiertos / Sin Resolver',
          value: metrics.open,
          badge: 'ABIERTOS',
          bg: '#FCA5A5',
          delay: '240ms',
        },
      ]
    : [];

  const safePriorityStats = metrics?.priorityStats || { alta: 0, media: 0, baja: 0 };
  const safeStatusStats = metrics?.statusStats || { abierto: 0, enProgreso: 0, resuelto: 0, escalado: 0 };

  const safeTotal = metrics?.total || 0;
  const safeAssigned = metrics?.assignedTickets || 0;
  const safeUnassigned = metrics?.unassignedTickets || 0;

  const maxPrio = Math.max(safePriorityStats.alta, safePriorityStats.media, safePriorityStats.baja, 1);
  const assignedPercent = safeTotal > 0 ? Math.round((safeAssigned / safeTotal) * 100) : 0;
  const unassignedPercent = safeTotal > 0 ? Math.round((safeUnassigned / safeTotal) * 100) : 0;

  return (
    <div className="flex flex-col gap-10">

      <div>
        <h1 className="text-5xl font-black uppercase tracking-tighter mb-2 mt-4">
          Centro de Mando
        </h1>
        <p className="font-medium text-lg text-gray-800">
          Métricas operativas en tiempo real. Monitorea resolución, carga de trabajo y rendimiento por agente.
        </p>
      </div>

      {/* ── KPI CARDS ────────────────────────────────────────── */}
      <section aria-label="Métricas globales del sistema">
        <div className="flex items-center gap-3 mb-5">
          <span
            className="block w-1.5 h-6 bg-[#FF61F8] border-2 border-[#0F172A]"
            aria-hidden="true"
          />
          <h2
            className="text-sm font-black uppercase tracking-[0.2em] text-[#334155]"
            style={{ fontFamily: '"Space Grotesk", sans-serif' }}
          >
            Métricas del Sistema
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} delay={`${i * 80}ms`} />
              ))
            : CARDS.map((card) => (
                <MetricCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                  badge={card.badge}
                  bg={card.bg}
                  delay={card.delay}
                />
              ))}
        </div>
      </section>

      {/* ── BLOQUE DE GRÁFICAS ESTADÍSTICAS ────────────────── */}
      {!isLoading && metrics && (
        <section aria-label="Gráficas estadísticas" className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4 mb-10">
            
            {/* GRÁFICA DE BARRAS: PRIORIDADES */}
            <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col">
              <div className="bg-black text-white p-3 border-b-4 border-black">
                <h2 className="text-lg font-black uppercase tracking-wide" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Distribución por Prioridad</h2>
              </div>
              <div className="p-6 flex-grow flex items-end justify-around h-64 gap-4 pb-0">
                {/* Barra ALTA */}
                <div className="flex flex-col items-center w-full gap-2 h-full justify-end">
                  <span className="font-bold text-xl">{safePriorityStats.alta}</span>
                  <div className="w-full bg-red-400 border-4 border-black border-b-0 transition-all duration-1000" style={{ height: `${(safePriorityStats.alta / maxPrio) * 100}%`, minHeight: '8px' }}></div>
                  <span className="font-black border-t-4 border-black w-full text-center py-2 bg-gray-100">ALTA</span>
                </div>
                {/* Barra MEDIA */}
                <div className="flex flex-col items-center w-full gap-2 h-full justify-end">
                  <span className="font-bold text-xl">{safePriorityStats.media}</span>
                  <div className="w-full bg-yellow-400 border-4 border-black border-b-0 transition-all duration-1000" style={{ height: `${(safePriorityStats.media / maxPrio) * 100}%`, minHeight: '8px' }}></div>
                  <span className="font-black border-t-4 border-black w-full text-center py-2 bg-gray-100">MEDIA</span>
                </div>
                {/* Barra BAJA */}
                <div className="flex flex-col items-center w-full gap-2 h-full justify-end">
                  <span className="font-bold text-xl">{safePriorityStats.baja}</span>
                  <div className="w-full bg-green-400 border-4 border-black border-b-0 transition-all duration-1000" style={{ height: `${(safePriorityStats.baja / maxPrio) * 100}%`, minHeight: '8px' }}></div>
                  <span className="font-black border-t-4 border-black w-full text-center py-2 bg-gray-100">BAJA</span>
                </div>
              </div>
            </div>

            {/* GRÁFICAS HORIZONTALES: ESTATUS Y ASIGNACIÓN */}
            <div className="flex flex-col gap-6">
              
              {/* Tasa de Asignación */}
              <div className="bg-white border-4 border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="font-black uppercase" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Tasa de Asignación</h2>
                  <span className="font-bold bg-purple-300 border-2 border-black px-2 py-1 text-xs">{safeAssigned} ASIGNADOS / {safeUnassigned} SIN ASIGNAR</span>
                </div>
                <div className="w-full h-8 flex border-4 border-black bg-gray-200">
                  <div className="h-full bg-blue-400 border-r-4 border-black flex items-center justify-center font-bold text-xs overflow-hidden transition-all duration-1000" style={{ width: `${assignedPercent}%` }}>
                    {assignedPercent > 10 ? `${assignedPercent}%` : ''}
                  </div>
                  <div className="h-full bg-red-300 flex items-center justify-center font-bold text-xs overflow-hidden transition-all duration-1000" style={{ width: `${unassignedPercent}%` }}>
                    {unassignedPercent > 10 ? `${unassignedPercent}%` : ''}
                  </div>
                </div>
              </div>

              {/* Desglose Exacto de Estatus */}
              <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex-grow">
                <div className="bg-black text-white p-3">
                    <h2 className="text-sm font-black uppercase" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Desglose de Estatus</h2>
                </div>
                <div className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-center border-b-2 border-dashed border-black pb-2">
                      <span className="font-bold text-red-500">ABIERTO</span>
                      <span className="font-black text-xl">{safeStatusStats.abierto}</span>
                    </div>
                    <div className="flex justify-between items-center border-b-2 border-dashed border-black pb-2">
                      <span className="font-bold text-yellow-500">EN PROGRESO</span>
                      <span className="font-black text-xl">{safeStatusStats.enProgreso}</span>
                    </div>
                    <div className="flex justify-between items-center border-b-2 border-dashed border-black pb-2">
                      <span className="font-bold text-green-500">RESUELTO</span>
                      <span className="font-black text-xl">{safeStatusStats.resuelto}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-purple-500">ESCALADO</span>
                      <span className="font-black text-xl">{safeStatusStats.escalado || 0}</span>
                    </div>
                </div>
              </div>

            </div>
          </div>
        </section>
      )}

      {/* ── AGENT PERFORMANCE TABLE ──────────────────────────── */}
      <section aria-label="Rendimiento por agente" className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
        <div className="flex items-center gap-3 mb-5">
          <span
            className="block w-1.5 h-6 bg-[#93C5FD] border-2 border-[#0F172A]"
            aria-hidden="true"
          />
          <h2
            className="text-sm font-black uppercase tracking-[0.2em] text-[#334155]"
            style={{ fontFamily: '"Space Grotesk", sans-serif' }}
          >
            Rendimiento por Agente
          </h2>
          {!isLoading && metrics && (
            <span
              className="ml-auto text-[9px] font-black uppercase border-[2px] border-[#0F172A] bg-[#93C5FD] px-2 py-0.5 shadow-[1px_1px_0px_0px_#0F172A] select-none"
              style={{ fontFamily: '"Space Grotesk", sans-serif' }}
            >
              {metrics.agentPerformance.length} agente{metrics.agentPerformance.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div
          className="bg-white border-[4px] border-[#0F172A] overflow-hidden"
          style={{ boxShadow: '6px 6px 0px 0px #0F172A' }}
          role="table"
          aria-label="Tabla de rendimiento por agente"
        >
          {/* Table Header */}
          {/* ENCABEZADO DE LA TABLA (Reemplaza el div negro anterior) */}
          <div className="bg-black text-white p-4 hidden md:grid grid-cols-12 text-xs font-black uppercase tracking-widest">
            <div className="col-span-5 pl-2">AGENTE</div>
            <div className="col-span-4 text-center">ESTADÍSTICAS</div>
            <div className="col-span-3 text-right pr-2">TASA DE RESOLUCIÓN</div>
          </div>

          {/* Table Body */}
          {isLoading ? (
            <div className="divide-y-[3px] divide-[#0F172A]">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-6 py-4 flex items-center gap-4 animate-pulse">
                  <div className="w-6 h-6 bg-slate-200 rounded hidden sm:block" />
                  <div className="w-8 h-8 bg-slate-200 rounded-full" />
                  <div className="flex-1 h-4 bg-slate-200 rounded" />
                  <div className="w-20 h-8 bg-slate-200 rounded" />
                  <div className="w-20 h-8 bg-slate-200 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <AgentTable agents={metrics?.agentPerformance ?? []} />
          )}

          {/* Footer */}
          {!isLoading && metrics && (
            <div className="bg-gray-100 p-4 font-black text-xs uppercase flex justify-between border-t-4 border-black">
              <span>{safeTotal} TICKETS ASIGNADOS EN TOTAL</span>
              <div className="flex gap-4">
                <span className="text-green-600">{safeStatusStats.resuelto || 0} RESUELTOS</span>
                <span className="text-purple-600">{safeStatusStats.escalado || 0} ESCALADOS</span>
              </div>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
