'use client';

export default function Loader() {
  return (
    <div className="min-h-screen bg-cross-bg flex flex-col items-center justify-center gap-6 p-6 select-none animate-fade-in">
      <ul className="loader-ul">
        <li className="loader-li"></li>
        <li className="loader-li"></li>
        <li className="loader-li"></li>
        <li className="loader-li"></li>
        <li className="loader-li"></li>
      </ul>
      <span
        className="text-2xl font-black uppercase tracking-widest text-black"
        style={{ fontFamily: '"Space Grotesk", sans-serif' }}
      >
        CARGANDO...
      </span>
    </div>
  );
}
