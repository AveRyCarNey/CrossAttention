'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';

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
  if (message.includes('User already registered') || message.includes('already registered')) {
    return 'Este correo ya está registrado. ¿Quieres iniciar sesión?';
  }
  if (message.includes('Password should be at least')) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  if (message.includes('invalid email') || message.includes('Invalid email')) {
    return 'El formato del correo electrónico no es válido.';
  }
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
  }
  return 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo.';
}

// ─── Component ────────────────────────────────────────────────
export default function RegistroPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isValid = nombre.trim() !== '' && email.trim() !== '' && password.length >= 6;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValid || isLoading) return;

    setIsLoading(true);
    setErrorMsg(null);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          display_name: nombre.trim(),
        },
      },
    });

    setIsLoading(false);

    if (error) {
      setErrorMsg(parseSupabaseError(error.message));
      return;
    }

    // Registro exitoso → redirigir a login con parámetro de éxito
    router.push('/login?registered=1');
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
              CrossAttention — Crear Cuenta
            </span>
          </div>

          <h1
            className="text-4xl md:text-5xl font-black text-cross-text uppercase leading-none tracking-tighter mb-3"
            style={{ fontFamily: '"Space Grotesk", sans-serif' }}
          >
            Únete Ahora
          </h1>

          <p
            className="text-cross-text-dim text-base leading-relaxed font-medium"
            style={{ fontFamily: '"DM Sans", sans-serif' }}
          >
            Crea tu cuenta para reportar incidencias y hacer seguimiento de tus tickets.
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
              Formulario de Registro
            </span>
          </div>

          {/* Fields */}
          <div className="p-6 md:p-8 space-y-5">

            {/* Error Banner */}
            {errorMsg && (
              <div
                role="alert"
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

            {/* Nombre / Usuario */}
            <fieldset className="space-y-2">
              <label
                htmlFor="reg-nombre"
                className="block text-[11px] font-black text-cross-text uppercase tracking-[0.15em]"
                style={{ fontFamily: '"Space Grotesk", sans-serif' }}
              >
                Nombre de Usuario
                <span className="text-cross-accent ml-1" aria-label="obligatorio">*</span>
              </label>
              <input
                id="reg-nombre"
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="ej. María García"
                className={INPUT_BASE}
                style={{ fontFamily: '"DM Sans", sans-serif' }}
                disabled={isLoading}
                autoComplete="name"
                autoFocus
              />
            </fieldset>

            {/* Email */}
            <fieldset className="space-y-2">
              <label
                htmlFor="reg-email"
                className="block text-[11px] font-black text-cross-text uppercase tracking-[0.15em]"
                style={{ fontFamily: '"Space Grotesk", sans-serif' }}
              >
                Correo Electrónico
                <span className="text-cross-accent ml-1" aria-label="obligatorio">*</span>
              </label>
              <input
                id="reg-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ej. maria@empresa.com"
                className={INPUT_BASE}
                style={{ fontFamily: '"DM Sans", sans-serif' }}
                disabled={isLoading}
                autoComplete="email"
              />
            </fieldset>

            {/* Contraseña */}
            <fieldset className="space-y-2">
              <label
                htmlFor="reg-password"
                className="block text-[11px] font-black text-cross-text uppercase tracking-[0.15em]"
                style={{ fontFamily: '"Space Grotesk", sans-serif' }}
              >
                Contraseña
                <span className="text-cross-accent ml-1" aria-label="obligatorio">*</span>
              </label>
              <input
                id="reg-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className={INPUT_BASE}
                style={{ fontFamily: '"DM Sans", sans-serif' }}
                disabled={isLoading}
                autoComplete="new-password"
              />
              {password.length > 0 && password.length < 6 && (
                <p
                  className="text-[11px] font-semibold text-cross-text-dim"
                  style={{ fontFamily: '"DM Sans", sans-serif' }}
                >
                  Faltan {6 - password.length} caracteres para el mínimo requerido.
                </p>
              )}
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
                  Creando cuenta...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Crear mi Cuenta
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
          ¿Ya tienes una cuenta?{' '}
          <Link
            href="/login"
            className="
              inline-flex items-center gap-1 font-black text-cross-text
              border-b-[2px] border-cross-accent
              hover:text-cross-accent transition-colors duration-100
            "
            style={{ fontFamily: '"Space Grotesk", sans-serif' }}
          >
            Iniciar Sesión →
          </Link>
        </p>

      </div>
    </div>
  );
}
