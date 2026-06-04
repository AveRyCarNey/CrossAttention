'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';

interface HeroCTAProps {
  initialSessionExists: boolean;
}

export default function HeroCTA({ initialSessionExists }: HeroCTAProps) {
  const [sessionExists, setSessionExists] = useState(initialSessionExists);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSessionExists(!!session);
      } catch (error) {
        console.error('Error checking session in HeroCTA:', error);
      } finally {
        setLoading(false);
      }
    }
    checkSession();

    // Listen to real-time changes to update instantly if state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSessionExists(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    // Elegant brutalist skeleton loaders to prevent layout shift during client hydration
    return (
      <div className="flex flex-col sm:flex-row gap-6 justify-center items-center min-h-[76px] mt-8">
        {initialSessionExists ? (
          <div className="h-16 w-64 bg-white border-4 border-[#0F172A] rounded-none shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] animate-pulse" />
        ) : (
          <>
            <div className="h-16 w-48 bg-white border-4 border-[#0F172A] rounded-none shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] animate-pulse" />
            <div className="h-16 w-48 bg-white border-4 border-[#0F172A] rounded-none shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] animate-pulse" />
          </>
        )}
      </div>
    );
  }

  if (sessionExists) {
    return (
      <div className="flex justify-center mt-8 animate-fade-in-up">
        <Link
          href="/dashboard"
          className="px-8 py-4 bg-white text-[#0F172A] border-4 border-[#0F172A] text-xl font-black uppercase tracking-wider shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] hover:bg-[#FF61F8] hover:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:translate-x-1 hover:translate-y-1 active:translate-x-2 active:translate-y-2 active:shadow-none transition-all duration-150 select-none text-center inline-block"
          style={{ fontFamily: '"Space Grotesk", sans-serif' }}
        >
          IR AL DASHBOARD
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mt-8 animate-fade-in-up">
      <Link
        href="/login"
        className="w-full sm:w-auto px-8 py-4 bg-white text-[#0F172A] border-4 border-[#0F172A] text-xl font-black uppercase tracking-wider shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] hover:bg-[#FF61F8] hover:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:translate-x-1 hover:translate-y-1 active:translate-x-2 active:translate-y-2 active:shadow-none transition-all duration-150 text-center select-none"
        style={{ fontFamily: '"Space Grotesk", sans-serif' }}
      >
        INICIAR SESIÓN
      </Link>
      <Link
        href="/registro"
        className="w-full sm:w-auto px-8 py-4 bg-[#FF61F8] text-[#0F172A] border-4 border-[#0F172A] text-xl font-black uppercase tracking-wider shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] hover:bg-[#86EFAC] hover:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:translate-x-1 hover:translate-y-1 active:translate-x-2 active:translate-y-2 active:shadow-none transition-all duration-150 text-center select-none"
        style={{ fontFamily: '"Space Grotesk", sans-serif' }}
      >
        CREAR CUENTA
      </Link>
    </div>
  );
}
