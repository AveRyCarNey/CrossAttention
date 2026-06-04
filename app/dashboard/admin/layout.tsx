export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Eliminadas todas las redirecciones de servidor para permitir 
  // que la página maneje el "Debug UI"
  return <>{children}</>;
}
