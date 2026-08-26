export default function AIBackground() {
  return (
    <>
      {/* Blue Glow */}
      <div className="fixed -top-32 -left-32 w-96 h-96 rounded-full bg-blue-400 opacity-20 blur-[120px] pointer-events-none" />

      {/* Purple Glow */}
      <div className="fixed top-40 -right-32 w-[500px] h-[500px] rounded-full bg-violet-400 opacity-20 blur-[150px] pointer-events-none" />

      {/* Cyan Glow */}
      <div className="fixed bottom-0 left-1/3 w-[400px] h-[400px] rounded-full bg-cyan-300 opacity-20 blur-[140px] pointer-events-none" />

      {/* Decorative Grid */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(#2563eb 1px, transparent 1px),
            linear-gradient(90deg,#2563eb 1px,transparent 1px)
          `,
          backgroundSize: "45px 45px",
        }}
      />
    </>
  );
}