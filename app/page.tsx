import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // ─── LÓGICA DE AUTENTICACIÓN (Server Component) ───
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  // Inicializamos el cliente de Supabase para Server Components
  const supabaseServer = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
    }
  });

  let initialSessionExists = false;

  try {
    // Intentamos extraer la sesión del usuario leyendo las cookies de la petición
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;

    if (token) {
      const { data: { user } } = await supabaseServer.auth.getUser(token);
      initialSessionExists = !!user;
    }
  } catch (error) {
    console.error('Error fetching user session on server:', error);
  }

  return (
    <main className="min-h-screen bg-[#FFEA6C] flex flex-col justify-between selection:bg-[#FF61F8] selection:text-white relative overflow-hidden">
      {/* Elementos decorativos Neo-Brutalistas de fondo */}
      <div 
        className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full border-8 border-[#0F172A] opacity-10 pointer-events-none hidden md:block" 
        style={{ transform: 'rotate(-15deg)' }} 
      />
      <div 
        className="absolute bottom-[20%] left-[-10%] w-[35vw] h-[35vw] border-8 border-[#0F172A] opacity-5 pointer-events-none hidden md:block" 
        style={{ transform: 'rotate(45deg)' }} 
      />

      {/* ── SECCIÓN HERO (Principal) ── */}
      <section className="flex-1 flex flex-col justify-center items-center px-6 py-16 md:py-24 text-center max-w-6xl mx-auto w-full">
        
        {/* Eyebrow Label brutalista */}
        <div className="inline-flex items-center gap-3 px-4 py-2 bg-[#0F172A] text-white border-4 border-[#0F172A] mb-8 shadow-[4px_4px_0px_0px_rgba(255,97,248,1)] animate-fade-in select-none">
          <span className="block w-3 h-3 bg-[#FF61F8]" />
          <span 
            className="text-xs font-black tracking-[0.25em] uppercase"
            style={{ fontFamily: '"Space Grotesk", sans-serif' }}
          >
            SISTEMA DE SOPORTE CROSSATTENTION
          </span>
        </div>

        {/* Título Gigante */}
        <h1 
          className="text-5xl sm:text-6xl md:text-8xl font-black text-[#0F172A] uppercase leading-none tracking-tighter mb-6 max-w-5xl select-none animate-fade-in-up"
          style={{ fontFamily: '"Space Grotesk", sans-serif' }}
        >
          SOPORTE INMEDIATO
        </h1>

        {/* Subtítulo Grueso */}
        <p 
          className="text-lg sm:text-xl md:text-2xl font-bold text-[#0F172A] uppercase tracking-wide border-4 border-[#0F172A] bg-white px-6 py-4 inline-block shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] max-w-3xl leading-snug animate-fade-in select-none"
          style={{ fontFamily: '"Space Grotesk", sans-serif' }}
        >
          RESPUESTAS RÁPIDAS. CLASIFICACIÓN DE PRIORIDAD.
        </p>

        {/* Botones de acción (Dual Call-to-Action) */}
        <div className="flex flex-wrap gap-4 justify-center mt-8 animate-fade-in-up">
          <Link
            href="/login"
            className="px-8 py-4 bg-white text-black border-4 border-black text-xl font-black uppercase tracking-wider shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 text-center select-none"
            style={{ fontFamily: '"Space Grotesk", sans-serif' }}
          >
            INICIAR SESIÓN
          </Link>
          <Link
            href="/registro"
            className="px-8 py-4 bg-fuchsia-400 text-black border-4 border-black text-xl font-black uppercase tracking-wider shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 text-center select-none"
            style={{ fontFamily: '"Space Grotesk", sans-serif' }}
          >
            REGISTRARSE
          </Link>
        </div>

      </section>

      {/* ── SECCIÓN DE CARACTERÍSTICAS (Cards) ── */}
      <section className="w-full max-w-6xl mx-auto px-6 pb-20 select-none">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Tarjeta 1: IA INTEGRADA (Fondo rosa/fucsia) */}
          <div className="bg-[#FFA6FB] border-4 border-[#0F172A] p-8 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(15,23,42,1)] transition-all duration-150 flex flex-col justify-between group">
            <div>
              <h3 
                className="text-2xl sm:text-3xl font-black text-[#0F172A] uppercase tracking-tighter mb-4 border-b-4 border-[#0F172A] pb-3"
                style={{ fontFamily: '"Space Grotesk", sans-serif' }}
              >
                IA INTEGRADA
              </h3>
              <p 
                className="text-base font-bold text-[#334155] leading-relaxed"
                style={{ fontFamily: '"DM Sans", sans-serif' }}
              >
                Análisis de riesgo y clasificación automática de tickets.
              </p>
            </div>
            <div className="mt-8 flex justify-end">
              <span className="w-10 h-10 border-4 border-[#0F172A] bg-white flex items-center justify-center font-black text-[#0F172A] group-hover:bg-[#FFEA6C] transition-colors">
                1
              </span>
            </div>
          </div>

          {/* Tarjeta 2: AUTOMATIZACIÓN N8N (Fondo azul claro) */}
          <div className="bg-[#93C5FD] border-4 border-[#0F172A] p-8 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(15,23,42,1)] transition-all duration-150 flex flex-col justify-between group">
            <div>
              <h3 
                className="text-2xl sm:text-3xl font-black text-[#0F172A] uppercase tracking-tighter mb-4 border-b-4 border-[#0F172A] pb-3"
                style={{ fontFamily: '"Space Grotesk", sans-serif' }}
              >
                AUTOMATIZACIÓN N8N
              </h3>
              <p 
                className="text-base font-bold text-[#334155] leading-relaxed"
                style={{ fontFamily: '"DM Sans", sans-serif' }}
              >
                Notificaciones por correo y alertas críticas en Slack.
              </p>
            </div>
            <div className="mt-8 flex justify-end">
              <span className="w-10 h-10 border-4 border-[#0F172A] bg-white flex items-center justify-center font-black text-[#0F172A] group-hover:bg-[#FF61F8] transition-colors">
                2
              </span>
            </div>
          </div>

          {/* Tarjeta 3: MÉTRICAS EN TIEMPO REAL (Fondo verde menta) */}
          <div className="bg-[#86EFAC] border-4 border-[#0F172A] p-8 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(15,23,42,1)] transition-all duration-150 flex flex-col justify-between group">
            <div>
              <h3 
                className="text-2xl sm:text-3xl font-black text-[#0F172A] uppercase tracking-tighter mb-4 border-b-4 border-[#0F172A] pb-3"
                style={{ fontFamily: '"Space Grotesk", sans-serif' }}
              >
                MÉTRICAS EN TIEMPO REAL
              </h3>
              <p 
                className="text-base font-bold text-[#334155] leading-relaxed"
                style={{ fontFamily: '"DM Sans", sans-serif' }}
              >
                Paneles de control exclusivos para Managers y Admins.
              </p>
            </div>
            <div className="mt-8 flex justify-end">
              <span className="w-10 h-10 border-4 border-[#0F172A] bg-white flex items-center justify-center font-black text-[#0F172A] group-hover:bg-[#FFA6FB] transition-colors">
                3
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer 
        className="w-full bg-[#0F172A] border-t-4 border-[#0F172A] py-6 text-center text-white select-none relative z-10"
        style={{ fontFamily: '"Space Grotesk", sans-serif' }}
      >
        <p className="text-sm font-black tracking-[0.2em] leading-relaxed">
          CrossAttention - VeneSoft - Made by WuLliBer Yepez
        </p>
      </footer>
    </main>
  );
}