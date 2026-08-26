export default function GlassCard({
  children,
  className = "",
}) {
  return (
    <div
      className={`
      relative
      overflow-hidden
      rounded-[32px]
      bg-white/70
      backdrop-blur-xl
      border border-white/60
      shadow-[0_20px_60px_rgba(37,99,235,0.18)]
      transition-all
      duration-500
      hover:-translate-y-1
      hover:shadow-[0_30px_80px_rgba(37,99,235,0.28)]
      ${className}
      `}
    >
      {/* Blue Glow */}
      <div className="absolute -top-20 -right-20 w-56 h-56 bg-blue-400/20 rounded-full blur-3xl"></div>

      {/* Purple Glow */}
      <div className="absolute -bottom-16 -left-10 w-44 h-44 bg-violet-400/20 rounded-full blur-3xl"></div>

      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}