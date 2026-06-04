'use client';

import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // 2. Ejecutar el cierre de sesión en Supabase (Borra la cookie del navegador)
      await supabase.auth.signOut();
      
      // 3. Forzar a Next.js a re-evaluar la ruta y vaciar su caché de servidor
      router.refresh();
      
      // 4. Redirigir al usuario al login
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <button 
      id="nav-logout"
      onClick={handleLogout}
      className="bg-red-300 hover:bg-red-400 border-4 border-black px-4 py-2 font-black uppercase transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none whitespace-nowrap"
    >
      Cerrar Sesión
    </button>
  );
}
