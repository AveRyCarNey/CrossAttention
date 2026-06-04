'use client';

import { useState, useEffect, type FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';

// ─── Shared input classes (Neo-Brutalist system) ──────────────
const INPUT_BASE = [
  'w-full px-4 py-3.5 text-base font-medium text-cross-text',
  'bg-white/60 placeholder:text-cross-text-dim/50',
  'border-[3px] border-cross-text rounded-xl',
  'shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]',
  'outline-none transition-all duration-150',
  'focus:border-cross-accent focus:shadow-[4px_4px_0px_0px_#FF61F8]',
  'focus:ring-2 focus:ring-cross-accent/20',
  'disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ');

// ─── Human-readable error messages from Supabase ──────────────
function parseSupabaseError(message: string): string {
  if (
    message.includes('Invalid login credentials') ||
    message.includes('invalid credentials') ||
    message.includes('Invalid credentials')
  ) {
    return 'Correo o contraseña incorrectos. Verifica tus datos e inténtalo de nuevo.';
  }
  if (message.includes('Email not confirmed')) {
    return 'Debes confirmar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja.';
  }
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.';
  }
  return 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo.';
}

// ─── Component ────────────────────────────────────────────────
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Instancia del cliente Supabase que persiste la sesión en Cookies (no LocalStorage)
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Detect redirect from successful registration
  useEffect(() => {
    if (searchParams.get('registered') === '1') {
      setSuccessMsg(
        '¡Cuenta creada con éxito! 🎉 Revisa tu correo para confirmarla (si aplica) e inicia sesión.'
      );
    }
  }, [searchParams]);

  const isValid = email.trim() !== '' && password.length >= 1;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValid || isLoading) return;

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setIsLoading(false);

    if (error) {
      setErrorMsg(parseSupabaseError(error.message));
      return;
    }

    // Login exitoso → redirigir al dashboard y refrescar caché
    router.refresh(); // Crucial: sincroniza las cookies con el servidor
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-cross-bg flex items-center justify-center px-6 py-12 selection:bg-cross-accent selection:text-white">
      <div className="w-full max-w-md space-y-8 animate-fade-in-up">

        {/* ── Header ────────────────────────────────────────── */}
        <header className="animate-slide-header">
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
              CrossAttention — Acceso al Sistema
            </span>
          </div>

          <h1
            className="text-4xl md:text-5xl font-black text-cross-text uppercase leading-none tracking-tighter mb-3"
            style={{ fontFamily: '"Space Grotesk", sans-serif' }}
          >
            Iniciar Sesión
          </h1>

          <p
            className="text-cross-text-dim text-base leading-relaxed font-medium"
            style={{ fontFamily: '"DM Sans", sans-serif' }}
          >
            Accede a tu bandeja de tickets y gestiona tus incidencias en tiempo real.
          </p>
        </header>

        {/* ── Form Card ─────────────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="w-full bg-cross-card border-[3px] border-cross-text rounded-2xl
                     shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] overflow-hidden"
        >
          {/* Header strip */}
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
              Credenciales de Acceso
            </span>
          </div>

          {/* Fields */}
          <div className="p-6 md:p-8 space-y-5">

            {/* Success Banner (post-registro) */}
            {successMsg && (
              <div
                role="status"
                aria-live="polite"
                className="flex items-start gap-3 px-4 py-3 rounded-xl
                           bg-white/70 border-[3px] border-cross-text
                           shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]
                           animate-fade-in"
              >
                <span className="text-lg leading-none" aria-hidden="true">✅</span>
                <p
                  className="text-sm font-semibold text-cross-text leading-snug"
                  style={{ fontFamily: '"DM Sans", sans-serif' }}
                >
                  {successMsg}
                </p>
              </div>
            )}

            {/* Error Banner */}
            {errorMsg && (
              <div
                role="alert"
                aria-live="assertive"
                className="flex items-start gap-3 px-4 py-3 rounded-xl
                           bg-white/70 border-[3px] border-cross-text
                           shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]
                           animate-fade-in"
              >
                <span className="text-lg leading-none" aria-hidden="true">⚠️</span>
                <p
                  className="text-sm font-semibold text-cross-text leading-snug"
                  style={{ fontFamily: '"DM Sans", sans-serif' }}
                >
                  {errorMsg}
                </p>
              </div>
            )}

            {/* Email */}
            <fieldset className="space-y-2">
              <label
                htmlFor="login-email"
                className="block text-[11px] font-black text-cross-text uppercase tracking-[0.15em]"
                style={{ fontFamily: '"Space Grotesk", sans-serif' }}
              >
                Correo Electrónico
                <span className="text-cross-accent ml-1" aria-label="obligatorio">*</span>
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ej. maria@empresa.com"
                className={INPUT_BASE}
                style={{ fontFamily: '"DM Sans", sans-serif' }}
                disabled={isLoading}
                autoComplete="email"
                autoFocus
              />
            </fieldset>

            {/* Contraseña */}
            <fieldset className="space-y-2">
              <label
                htmlFor="login-password"
                className="block text-[11px] font-black text-cross-text uppercase tracking-[0.15em]"
                style={{ fontFamily: '"Space Grotesk", sans-serif' }}
              >
                Contraseña
                <span className="text-cross-accent ml-1" aria-label="obligatorio">*</span>
              </label>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                className={INPUT_BASE}
                style={{ fontFamily: '"DM Sans", sans-serif' }}
                disabled={isLoading}
                autoComplete="current-password"
              />
            </fieldset>

            {/* Submit */}
            <button
              type="submit"
              disabled={!isValid || isLoading}
              className="
                w-full py-4 px-6 rounded-xl mt-2
                bg-cross-accent text-cross-text
                border-[3px] border-cross-text
                shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]
                text-base font-black uppercase tracking-wider
                transition-all duration-100 cursor-pointer
                hover:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[2px] hover:translate-y-[2px]
                active:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] active:translate-x-[5px] active:translate-y-[5px]
                disabled:opacity-40 disabled:cursor-not-allowed
                disabled:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]
                disabled:translate-x-0 disabled:translate-y-0
                focus-visible:ring-2 focus-visible:ring-cross-text focus-visible:ring-offset-2
              "
              style={{ fontFamily: '"Space Grotesk", sans-serif' }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-3">
                  <span
                    className="block w-5 h-5 border-[3px] border-cross-text border-t-transparent rounded-full animate-spin"
                    aria-hidden="true"
                  />
                  Verificando...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Entrar al Sistema
                  <span aria-hidden="true">→</span>
                </span>
              )}
            </button>
          </div>
        </form>

        {/* ── Footer link ───────────────────────────────────── */}
        <p
          className="text-center text-sm font-semibold text-cross-text-dim"
          style={{ fontFamily: '"DM Sans", sans-serif' }}
        >
          ¿No tienes una cuenta todavía?{' '}
          <Link
            href="/registro"
            className="
              inline-flex items-center gap-1 font-black text-cross-text
              border-b-[2px] border-cross-accent
              hover:text-cross-accent transition-colors duration-100
            "
            style={{ fontFamily: '"Space Grotesk", sans-serif' }}
          >
            Crear una cuenta →
          </Link>
        </p>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cross-bg flex flex-col items-center justify-center p-6 text-center select-none">
        <div
          className="text-6xl mb-4 animate-bounce"
          aria-hidden="true"
          style={{ filter: 'drop-shadow(3px 4px 0 rgba(15,23,42,0.25))' }}
        >
          📬
        </div>
        <h2
          className="text-2xl font-black text-cross-text uppercase tracking-tight mb-2"
          style={{ fontFamily: '"Space Grotesk", sans-serif' }}
        >
          Cargando inicio de sesión...
        </h2>
        <p className="text-sm font-medium text-cross-text-dim max-w-xs">
          Cargando la interfaz de soporte de CrossAttention. Por favor espera.
        </p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
