export default function CapstoneHistoryTable({ data = [] }) {
  const capstones = data.filter((item) => item?.isCapstone === true);

  const scoreLabel = (item) => {
    if (item?.score !== null && item?.score !== undefined) return item.score;
    return "—";
  };

  return (
    <section className="bg-white border border-orange-100 rounded-3xl shadow-lg overflow-hidden">
      <div className="px-6 py-5 bg-gradient-to-r from-orange-50 via-white to-red-50 border-b border-orange-100">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white shadow-md">
            🏆
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-900">
              Capstone Project History
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Final course-level capstone evaluation record
            </p>
          </div>
        </div>
      </div>

      {capstones.length === 0 ? (
        <div className="p-10 text-center">
          <div className="text-4xl mb-3">🏆</div>
          <h4 className="text-lg font-bold text-slate-800">
            No capstone evaluation available yet.
          </h4>
          <p className="text-sm text-slate-500 mt-2">
            Capstone results will appear here after submission and evaluation.
          </p>
        </div>
      ) : (
        <div className="w-full overflow-hidden">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-[6%]" />
              <col className="w-[32%]" />
              <col className="w-[16%]" />
              <col className="w-[14%]" />
              <col className="w-[18%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead>
              <tr className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                <th className="px-5 py-4 text-left text-[11px] uppercase tracking-wider">S.No</th>
                <th className="px-5 py-4 text-left text-[11px] uppercase tracking-wider">Capstone Project</th>
                <th className="px-5 py-4 text-left text-[11px] uppercase tracking-wider">Due Date</th>
                <th className="px-5 py-4 text-center text-[11px] uppercase tracking-wider">Marks</th>
                <th className="px-5 py-4 text-left text-[11px] uppercase tracking-wider">Submission Date</th>
                <th className="px-5 py-4 text-center text-[11px] uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {capstones.map((item, index) => (
                <tr key={item.id || index} className="border-b border-slate-100 last:border-b-0 hover:bg-orange-50/30">
                  <td className="px-4 py-5 text-sm font-bold text-slate-600">{index + 1}</td>
                  <td className="px-4 py-5 text-sm font-extrabold text-slate-900">{item.title || "Capstone Project"}</td>
                  <td className="px-4 py-5 text-sm text-slate-600">{item.dueDate || "—"}</td>
                  <td className="px-5 py-5 text-center">
                    <span className="inline-flex min-w-[82px] justify-center px-3 py-2 rounded-xl border bg-orange-50 text-orange-700 border-orange-100 text-sm font-extrabold">
                      {scoreLabel(item)}
                    </span>
                  </td>
                  <td className="px-4 py-5 text-sm text-slate-600">{item.submissionDate || "—"}</td>
                  <td className="px-5 py-5 text-center">
                    <span className={`inline-flex px-3 py-1.5 rounded-full text-xs font-bold border ${
                      item.status === "Complete"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : item.status === "Evaluation Awaited"
                        ? "bg-amber-50 text-amber-700 border-amber-100"
                        : "bg-slate-50 text-slate-500 border-slate-200"
                    }`}>
                      {item.status || "Not Started"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
