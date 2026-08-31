import { useEffect } from "react";
import { ArrowRight, CheckCircle2, BarChart3, Database, Code2 } from "lucide-react";

export default function DataAnalytics() {
  useEffect(() => {
    document.title =
      "Data Analytics Course in Ghaziabad | Python, SQL, Power BI & Tableau | Synaptech Education";

    const description =
      "Learn Data Analytics with Python, SQL, Excel, Power BI, Tableau, statistics and practical projects at Synaptech Education in Ghaziabad.";

    let meta = document.querySelector('meta[name="description"]');

    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }

    meta.setAttribute("content", description);

    return () => {
      document.title = "Synaptech Education | Data Science & AI Courses in Ghaziabad";
    };
  }, []);

  const modules = [
    {
      title: "Python for Data Analytics",
      description:
        "Build practical Python foundations for working with data and analytical workflows.",
      icon: Code2,
    },
    {
      title: "NumPy & Pandas",
      description:
        "Work with arrays, data structures, data manipulation and analytical datasets.",
      icon: Database,
    },
    {
      title: "Exploratory Data Analysis",
      description:
        "Understand datasets, identify patterns and prepare data for meaningful analysis.",
      icon: BarChart3,
    },
    {
      title: "SQL & Databases",
      description:
        "Learn how to work with structured data and retrieve information using SQL.",
      icon: Database,
    },
    {
      title: "Excel for Analytics",
      description:
        "Use Excel-based analytical techniques for practical business data problems.",
      icon: BarChart3,
    },
    {
      title: "Data Visualization",
      description:
        "Create meaningful visual representations of analytical results using Python tools.",
      icon: BarChart3,
    },
    {
      title: "Tableau",
      description:
        "Build interactive dashboards and communicate insights visually.",
      icon: BarChart3,
    },
    {
      title: "Power BI",
      description:
        "Develop business intelligence dashboards and turn data into actionable insights.",
      icon: BarChart3,
    },
  ];

  const tools = [
    "Python",
    "NumPy",
    "Pandas",
    "SQL",
    "Excel",
    "Tableau",
    "Power BI",
    "Data Visualization",
  ];

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900">

      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-950 px-5 pb-20 pt-32 text-white lg:px-10 lg:pb-28 lg:pt-40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(34,211,238,0.18),transparent_32%)]" />

        <div className="relative mx-auto max-w-[1440px]">
          <div className="max-w-4xl">

            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">
              <BarChart3 size={14} />
              Data Analytics Program
            </div>

            <h1 className="text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl lg:text-7xl">
              Data Analytics Course in{" "}
              <span className="text-cyan-300">Ghaziabad</span>
            </h1>

            <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-300">
              Build practical data analytics skills across Python, SQL,
              Excel, data visualization, Tableau and Power BI through a
              structured, project-oriented learning journey.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href="/register"
                className="group inline-flex items-center gap-2 rounded-full bg-cyan-400 px-6 py-3.5 text-sm font-extrabold text-slate-950 transition hover:bg-cyan-300"
              >
                Enroll Now
                <ArrowRight
                  size={17}
                  className="transition group-hover:translate-x-1"
                />
              </a>

              <a
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Back to Synaptech
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* Overview */}
      <section className="bg-white px-5 py-20 lg:px-10 lg:py-28">
        <div className="mx-auto grid max-w-[1440px] gap-14 lg:grid-cols-[0.8fr_1.2fr]">

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-700">
              Program Overview
            </p>

            <h2 className="mt-4 text-4xl font-black tracking-[-0.035em] sm:text-5xl">
              Learn how to turn data into meaningful insights.
            </h2>
          </div>

          <div>
            <p className="text-lg leading-8 text-slate-600">
              The Data Analytics program is designed around the practical
              technologies and analytical workflows required to work with
              modern datasets.
            </p>

            <p className="mt-5 text-base leading-7 text-slate-500">
              The curriculum progresses through programming and data handling,
              analytical techniques, databases, spreadsheets, visualization
              and business intelligence tools.
            </p>
          </div>

        </div>
      </section>

      {/* Tools */}
      <section className="bg-[#f1f5f9] px-5 py-20 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-[1440px]">

          <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-700">
            Tools & Technologies
          </p>

          <h2 className="mt-4 text-4xl font-black tracking-[-0.035em] sm:text-5xl">
            Technologies you will work with
          </h2>

          <div className="mt-10 flex flex-wrap gap-3">
            {tools.map((tool) => (
              <span
                key={tool}
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm"
              >
                {tool}
              </span>
            ))}
          </div>

        </div>
      </section>

      {/* Curriculum */}
      <section className="bg-slate-950 px-5 py-20 text-white lg:px-10 lg:py-28">
        <div className="mx-auto max-w-[1440px]">

          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">
              Curriculum
            </p>

            <h2 className="mt-4 text-4xl font-black tracking-[-0.035em] sm:text-5xl">
              A structured journey from data to decisions.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {modules.map(({ title, description, icon: Icon }, index) => (
              <article
                key={title}
                className="rounded-[24px] border border-white/10 bg-white/[0.04] p-7 transition hover:-translate-y-1 hover:border-cyan-300/30"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                    <Icon size={21} />
                  </div>

                  <span className="text-xs font-bold text-slate-500">
                    0{index + 1}
                  </span>
                </div>

                <h3 className="mt-7 text-xl font-extrabold">
                  {title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-slate-400">
                  {description}
                </p>
              </article>
            ))}
          </div>

        </div>
      </section>

      {/* Learning approach */}
      <section className="bg-white px-5 py-20 lg:px-10 lg:py-28">
        <div className="mx-auto max-w-[1440px]">

          <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-700">
            Learning Experience
          </p>

          <h2 className="mt-4 max-w-3xl text-4xl font-black tracking-[-0.035em] sm:text-5xl">
            Learn by working with data, not just reading about it.
          </h2>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">

            {[
              "Structured curriculum",
              "Hands-on analytical exercises",
              "Practical projects",
              "Data visualization",
              "Assessment-driven learning",
              "Career-oriented preparation",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <CheckCircle2
                  size={19}
                  className="shrink-0 text-cyan-600"
                />

                <span className="font-semibold text-slate-700">
                  {item}
                </span>
              </div>
            ))}

          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-cyan-400 px-5 py-20 lg:px-10">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-8 lg:flex-row lg:items-center">

          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-800/60">
              Start learning
            </p>

            <h2 className="mt-3 max-w-3xl text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl">
              Ready to build your data analytics skills?
            </h2>
          </div>

          <a
            href="/register"
            className="group inline-flex w-fit shrink-0 items-center gap-3 rounded-full bg-slate-950 px-7 py-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5"
          >
            Enroll in Data Analytics
            <ArrowRight
              size={18}
              className="transition group-hover:translate-x-1"
            />
          </a>

        </div>
      </section>

    </div>
  );
}