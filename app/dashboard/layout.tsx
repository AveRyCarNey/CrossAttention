import Navbar from '../components/Navbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full min-h-screen">
      {/* Renderizamos la barra de navegación global del dashboard */}
      <Navbar />
      
      {/* Renderizamos el contenido específico de la página */}
      {children}
    </div>
  );
}
