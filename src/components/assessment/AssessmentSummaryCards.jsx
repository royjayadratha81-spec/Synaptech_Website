import { useMemo } from "react";

/*
  AssessmentSummaryCards
  ----------------------
  The Assessment History table data is the ONLY source used here.

  KPI rules:
    - Assignment count = rows where assignmentStatus === Complete
    - Project count   = rows where projectStatus === Complete
    - Mini-Test count = rows where mcqStatus === Complete
    - Capstone count  = rows where isCapstone === true and status === Complete
    - Average         = average of the evaluated scores represented in the table

  A submitted-but-not-evaluated assessment never contributes a score.
*/

function parseScore(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const match = String(value).match(
    /(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)/
  );

  if (!match) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  const obtained = Number(match[1]);
  const maximum = Number(match[2]);

  if (!Number.isFinite(obtained) || !Number.isFinite(maximum) || maximum <= 0) {
    return null;
  }

  return Number(((obtained / maximum) * 100).toFixed(1));
}

function getGrade(average) {
  if (average >= 90) return "A+";
  if (average >= 80) return "A";
  if (average >= 70) return "B";
  if (average >= 60) return "C";
  if (average >= 50) return "D";
  return "F";
}

function getEvaluatedScore(row, type) {
  if (type === "assignment") {
    if (row.assignmentStatus !== "Complete") return null;
    return parseScore(row.assignment);
  }

  if (type === "project") {
    if (row.projectStatus !== "Complete") return null;
    return parseScore(row.project);
  }

  if (type === "mcq") {
    if (row.mcqStatus !== "Complete") return null;
    return parseScore(row.mcq);
  }

  if (type === "capstone") {
    if (row.status !== "Complete") return null;
    return parseScore(row.score || row.marks);
  }

  return null;
}

export default function AssessmentSummaryCards({ data = [] }) {
  const kpis = useMemo(() => {
    const completedScores = [];

    let assignmentCount = 0;
    let projectCount = 0;
    let miniTestCount = 0;
    let capstoneCount = 0;

    data.forEach((row) => {
      if (row.isCapstone) {
        const score = getEvaluatedScore(row, "capstone");

        if (score !== null) {
          capstoneCount += 1;
          completedScores.push(score);
        }

        return;
      }

      if (row.assignmentExists && row.assignmentStatus === "Complete") {
        assignmentCount += 1;
        const score = getEvaluatedScore(row, "assignment");
        if (score !== null) completedScores.push(score);
      }

      if (row.projectExists && row.projectStatus === "Complete") {
        projectCount += 1;
        const score = getEvaluatedScore(row, "project");
        if (score !== null) completedScores.push(score);
      }

      if (row.mcqExists && row.mcqStatus === "Complete") {
        miniTestCount += 1;
        const score = getEvaluatedScore(row, "mcq");
        if (score !== null) completedScores.push(score);
      }
    });

    const average = completedScores.length
      ? Number(
          (
            completedScores.reduce((sum, score) => sum + score, 0) /
            completedScores.length
          ).toFixed(1)
        )
      : 0;

    return {
      average,
      grade: getGrade(average),
      assignmentCount,
      projectCount,
      capstoneCount,
      miniTestCount,
    };
  }, [data]);

  const cards = [
    {
      label: "Average",
      value: `${kpis.average}%`,
      progress: kpis.average,
      footer: `${kpis.average}% evaluated performance`,
      className: "bg-blue-600 text-white",
    },
    {
      label: "Grade",
      value: kpis.grade,
      progress: kpis.average,
      footer:
        kpis.average > 0
          ? `${kpis.average}% evaluated score`
          : "No evaluated score",
      className: "bg-green-600 text-white",
    },
    {
      label: "Assignments",
      value: kpis.assignmentCount,
      footer: `${kpis.assignmentCount} evaluated`,
      className: "bg-purple-600 text-white",
    },
    {
      label: "Projects",
      value: kpis.projectCount,
      footer: `${kpis.projectCount} evaluated`,
      className: "bg-orange-600 text-white",
    },
    {
      label: "Capstones",
      value: kpis.capstoneCount,
      footer: `${kpis.capstoneCount} evaluated`,
      className: "bg-red-600 text-white",
    },
    {
      label: "Mini Tests",
      value: kpis.miniTestCount,
      footer: `${kpis.miniTestCount} completed`,
      className: "bg-indigo-600 text-white",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5 mb-8">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`${card.className} rounded-2xl p-5 shadow-lg`}
        >
          <p className="text-sm opacity-95">{card.label}</p>

          <h2 className="text-3xl font-bold mt-1">
            {card.value}
          </h2>

          <div className="mt-3 h-1.5 rounded-full bg-white/25 overflow-hidden">
            {card.progress !== undefined ? (
              <div
                className="h-full rounded-full bg-white/80 transition-all duration-700"
                style={{
                  width: `${Math.max(0, Math.min(100, card.progress))}%`,
                }}
              />
            ) : (
              <div className="h-full w-0" />
            )}
          </div>

          <p className="text-[10px] font-semibold mt-2 opacity-90">
            {card.footer}
          </p>
        </div>
      ))}
    </div>
  );
}
