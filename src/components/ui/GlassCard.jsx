export default function GlassCard({ children, className = "" }) {
  return (
    <div
      className={`
        rounded-3xl
        bg-white/90
        backdrop-blur-md
        shadow-2xl
        border border-white/40
        ${className}
      `}
    >
      {children}
    </div>
  );
}