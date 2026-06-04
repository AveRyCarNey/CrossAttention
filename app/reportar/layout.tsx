import Navbar from '../components/Navbar';

export default function ReportarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cross-bg flex flex-col">
      <Navbar />
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
