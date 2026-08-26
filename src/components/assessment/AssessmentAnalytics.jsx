import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export default function AssessmentAnalytics({ data = [] }) {
  const rows = (data || [])
    .filter((item) => !item?.isCapstone)
    .map((item) => ({
      ...item,

      // Only evaluated/actual results are plotted.
      // null means no evaluated result exists.
      assignment:
        item.assignment === null ||
        item.assignment === undefined
          ? null
          : Number(item.assignment),

      mcq:
        item.mcq === null ||
        item.mcq === undefined
          ? null
          : Number(item.mcq),

      project:
        item.project === null ||
        item.project === undefined
          ? null
          : Number(item.project),
    }));

  return (
    <section className="bg-white border border-slate-200 rounded-3xl shadow-lg overflow-hidden mb-8">
      <div className="px-6 py-5 bg-gradient-to-r from-slate-50 via-white to-blue-50 border-b border-slate-100 flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">
            Performance Analytics
          </p>
          <h2 className="text-2xl font-black text-slate-900 mt-1">
            Assessment Analytics
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Module-wise Mini-Test, Assignment and Project performance
          </p>
        </div>
        <span className="text-xs font-semibold text-slate-500 hidden md:block">
          Capstone excluded — course-level assessment
        </span>
      </div>

      <div className="p-5 md:p-6">
        <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
          {rows.length === 0 ? (
            <div className="h-[340px] flex items-center justify-center text-slate-400">
              No module assessment data available yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <BarChart
                data={rows}
                margin={{ top: 10, right: 12, left: 0, bottom: 65 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="module"
                  angle={-28}
                  textAnchor="end"
                  interval={0}
                  height={80}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
  formatter={(value, name) => {
    if (value === null || value === undefined) {
      return [null, name];
    }

    return [`${value}%`, "Score"];
  }}
/>
                <Legend />
                <Bar dataKey="assignment" name="Assignment" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                <Bar dataKey="mcq" name="Mini-Test" fill="#2563eb" radius={[6, 6, 0, 0]} />
                <Bar dataKey="project" name="Project" fill="#ea580c" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}
