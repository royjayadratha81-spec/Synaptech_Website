export default function AssessmentHistoryTable({ data = [] }) {
  const moduleRows = (data || []).filter((row) => !row?.isCapstone);

  const statusClasses = (status) => {
    switch (status) {
      case "Complete":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Evaluation Awaited":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "In Progress":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Not Started":
      default:
        return "bg-slate-50 text-slate-500 border-slate-200";
    }
  };

  const StatusBadge = ({ status }) => (
    <span
      className={`inline-flex px-3 py-1.5 rounded-full border text-xs font-bold whitespace-nowrap ${statusClasses(
        status
      )}`}
    >
      {status || "Not Started"}
    </span>
  );

  const cellValue = (value) => value || "—";

  const AssessmentCell = ({ dueDate, score, submissionDate, tone }) => {
    const toneClasses = {
      indigo: "bg-indigo-50 border-indigo-100 text-indigo-700",
      blue: "bg-blue-50 border-blue-100 text-blue-700",
      purple: "bg-purple-50 border-purple-100 text-purple-700",
    };

    return (
      <div className="min-w-[190px] space-y-2">
        <div className="text-xs text-slate-500">
          <span className="font-semibold text-slate-700">Due:</span>{" "}
          {cellValue(dueDate)}
        </div>

        <div
          className={`inline-flex min-w-[74px] justify-center px-3 py-2 rounded-xl border font-extrabold ${
            toneClasses[tone]
          }`}
        >
          {cellValue(score)}
        </div>

        <div className="text-xs text-slate-500">
          <span className="font-semibold text-slate-700">Submitted:</span>{" "}
          {cellValue(submissionDate)}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-10">
      <div className="mb-5 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              📊
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900">
                Assessment History
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Your module-wise academic assessment record
              </p>
            </div>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-semibold text-gray-600">
            {moduleRows.length} Modules
          </span>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-[0_12px_40px_rgba(15,23,42,0.08)] overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-slate-50 via-white to-blue-50 border-b border-gray-200">
          <p className="text-sm font-semibold text-gray-800">
            Your Learning Progress
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            One consolidated assessment record for each course module
          </p>
        </div>

        <div className="w-full max-w-full overflow-x-auto">
          <table className="w-full text-sm table-fixed" style={{ tableLayout: "fixed" }}>
            <colgroup>
  <col style={{ width: "4%" }} />
  <col style={{ width: "12%" }} />
  <col style={{ width: "10%" }} />

  <col style={{ width: "7%" }} />
  <col style={{ width: "7%" }} />
  <col style={{ width: "7%" }} />

  <col style={{ width: "7%" }} />
  <col style={{ width: "7%" }} />
  <col style={{ width: "7%" }} />

  <col style={{ width: "7%" }} />
  <col style={{ width: "7%" }} />
  <col style={{ width: "7%" }} />

  <col style={{ width: "10%" }} />
</colgroup>
            <thead>
              <tr className="bg-gradient-to-r from-[#16245c] via-[#1f3b91] to-[#284bb8] text-white">
                <th rowSpan="2" className="px-2 py-4 text-left text-xs font-bold uppercase tracking-wider w-[65px]">
                  S.No
                </th>
                <th rowSpan="2" className="px-2 py-4 text-left text-xs font-bold uppercase tracking-wider min-w-[130px]">
                  Module
                </th>
                <th rowSpan="2" className="px-2 py-4 text-left text-xs font-bold uppercase tracking-wider min-w-[130px]">
                  Assessment Window
                </th>
                <th colSpan="3" className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider bg-indigo-800">
                  Mini-Test
                </th>
                <th colSpan="3" className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider bg-blue-800">
                  Assignment
                </th>
                <th colSpan="3" className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider bg-purple-800">
                  Project
                </th>
                <th rowSpan="2" className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider min-w-[105px]">
                  Status
                </th>
              </tr>
              <tr className="bg-[#243a86] text-white/95">
                <th className="px-3 py-3 text-center text-[10px] font-bold uppercase">Due Date</th>
                <th className="px-3 py-3 text-center text-[10px] font-bold uppercase">Score</th>
                <th className="px-3 py-3 text-center text-[10px] font-bold uppercase">Submission</th>
                <th className="px-3 py-3 text-center text-[10px] font-bold uppercase">Due Date</th>
                <th className="px-3 py-3 text-center text-[10px] font-bold uppercase">Score</th>
                <th className="px-3 py-3 text-center text-[10px] font-bold uppercase">Submission</th>
                <th className="px-3 py-3 text-center text-[10px] font-bold uppercase">Due Date</th>
                <th className="px-3 py-3 text-center text-[10px] font-bold uppercase">Score</th>
                <th className="px-3 py-3 text-center text-[10px] font-bold uppercase">Submission</th>
              </tr>
            </thead>

            <tbody>
              {moduleRows.length === 0 ? (
                <tr>
                  <td colSpan="13" className="px-6 py-16 text-center">
                    <div className="text-4xl mb-3">📚</div>
                    <h3 className="text-lg font-bold text-gray-800">
                      No assessment records yet
                    </h3>
                    <p className="text-sm text-gray-500 mt-2">
                      Assessment records will appear here once the course assessments are configured.
                    </p>
                  </td>
                </tr>
              ) : (
                moduleRows.map((item, index) => (
                  <tr
                    key={item.id || item.moduleId || index}
                    className="border-b border-gray-100 last:border-b-0 hover:bg-blue-50/40 transition"
                  >
                    <td className="px-2 py-5 align-top">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                        {index + 1}
                      </div>
                    </td>

                    <td className="px-2 py-5 align-top">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                          {(item.module || "?").substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-extrabold text-gray-900">
                            {item.module || "—"}
                          </div>
                          <div className="text-[10px] text-gray-500 mt-1">
                            Module Assessment
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-2 py-5 align-top text-sm font-semibold text-gray-700">
                      {cellValue(item.dateRange)}
                      {item.dateRange && item.dateRange !== "—" && (
                        <div className="text-[10px] text-gray-400 mt-1">
                          Assessment window
                        </div>
                      )}
                    </td>

                    <td className="px-2 py-5 align-top text-center text-xs text-slate-600">
                      {cellValue(item.mcqDueDate)}
                    </td>
                    <td className="px-2 py-5 align-top text-center">
                      <span className="inline-flex min-w-[64px] justify-center px-2.5 py-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold">
                        {cellValue(item.mcqScore || item.mcq)}
                      </span>
                    </td>
                    <td className="px-2 py-5 align-top text-center text-xs text-slate-600">
                      {cellValue(item.mcqSubmissionDate || item.mcqUploadDate)}
                    </td>

                    <td className="px-2 py-5 align-top text-center text-xs text-slate-600">
                      {cellValue(item.assignmentDueDate)}
                    </td>
                    <td className="px-2 py-5 align-top text-center">
                      <span className="inline-flex min-w-[64px] justify-center px-2.5 py-2 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 font-extrabold">
                        {cellValue(item.assignmentScore || item.assignment)}
                      </span>
                    </td>
                    <td className="px-2 py-5 align-top text-center text-xs text-slate-600">
                      {cellValue(item.assignmentSubmissionDate || item.assignmentUploadDate)}
                    </td>

                    <td className="px-2 py-5 align-top text-center text-xs text-slate-600">
                      {cellValue(item.projectDueDate)}
                    </td>
                    <td className="px-2 py-5 align-top text-center">
                      <span className="inline-flex min-w-[64px] justify-center px-2.5 py-2 rounded-xl bg-purple-50 border border-purple-100 text-purple-700 font-extrabold">
                        {cellValue(item.projectScore || item.project)}
                      </span>
                    </td>
                    <td className="px-2 py-5 align-top text-center text-xs text-slate-600">
                      {cellValue(item.projectSubmissionDate || item.projectUploadDate)}
                    </td>

                    <td className="px-2 py-5 align-top text-center">
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {moduleRows.length > 0 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-xs text-gray-500">
              Scores and submission dates are driven from the actual assessment records.
            </p>
            <p className="text-xs font-semibold text-gray-600">
              Assessment status is independent of Course Module learning completion.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
