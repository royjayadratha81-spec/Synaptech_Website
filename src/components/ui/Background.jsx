export default function Background({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-100">

      {/* Top Right Glow */}
      <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-blue-300 opacity-20 blur-3xl"></div>

      {/* Bottom Left Glow */}
      <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-cyan-300 opacity-20 blur-3xl"></div>

      {/* Main Content */}
      <div className="relative z-10">
        {children}
      </div>

    </div>
  );
}