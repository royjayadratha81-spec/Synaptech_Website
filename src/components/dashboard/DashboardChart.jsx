import {
ResponsiveContainer,
BarChart,
Bar,
XAxis,
YAxis,
CartesianGrid,
Tooltip,
Cell
} from "recharts";


export default function DashboardChart({ analytics }) {
    const data = [
  {
    module: "Python",
    progress: analytics?.modules?.python ?? 0,
    color: "#2563eb",
  },
  {
    module: "NumPy",
    progress: analytics?.modules?.numpy ?? 0,
    color: "#22c55e",
  },
  {
    module: "Pandas",
    progress: analytics?.modules?.pandas ?? 0,
    color: "#9333ea",
  },
  {
    module: "Data Visualization",
    progress: analytics?.modules?.datavisualization ?? 0,
    color: "#f97316",
  },
  {
    module: "EDA",
    progress: analytics?.modules?.eda ?? 0,
    color: "#06b6d4",
  },
  {
    module: "Stats & Maths",
    progress: analytics?.modules?.statistics ?? 0,
    color: "#6366f1",
  },
  {
    module: "SQL",
    progress: analytics?.modules?.sql ?? 0,
    color: "#f59e0b",
  },
  {
    module: "Excel",
    progress: analytics?.modules?.excel ?? 0,
    color: "#84cc16",
  },
  {
    module: "Power BI",
    progress: analytics?.modules?.powerbi ?? 0,
    color: "#eab308",
  },
  {
    module: "Tableau",
    progress: analytics?.modules?.tableau ?? 0,
    color: "#ec4899",
  },
  {
    module: "Machine Learning",
    progress: analytics?.modules?.machinelearning ?? 0,
    color: "#ef4444",
  },
  {
    module: "Deep Learning",
    progress: analytics?.modules?.deeplearning ?? 0,
    color: "#8b5cf6",
  },
  {
    module: "Gen AI",
    progress: analytics?.modules?.generativeai ?? 0,
    color: "#10b981",
  },
  {
    module: "Agentic AI",
    progress: analytics?.modules?.agenticai ?? 0,
    color: "#0ea5e9",
  },
  {
    module: "MLOps",
    progress: analytics?.modules?.mlops ?? 0,
    color: "#6b7280",
  },

  // Analytics-based progress (not module progress)
  {
    module: "Projects",
    progress: analytics?.projectAverage ?? 0,
    color: "#1d4ed8",
  },
  {
    module: "Interview",
    progress: analytics?.modules?.interview ?? 0,
    color: "#65a30d",
  },
];

    return (
        <div className="bg-white rounded-3xl shadow-lg p-6">

            <h2 className="text-2xl font-bold mb-1">
                Course Progress Overview
            </h2>

            <p className="text-gray-500 mb-6">
                Track your progress across all modules
            </p>

            <div style={{ width: "100%", height: 470 }}>

                <ResponsiveContainer>

                    <BarChart data={data}>

                        <CartesianGrid strokeDasharray="3 3" />

                        <XAxis
    dataKey="module"
    angle={-35}
    textAnchor="end"
    interval={0}
    height={90}
/>

                        <YAxis />

                        <Tooltip />

                        <Bar
    dataKey="progress"
    radius={[8,8,0,0]}
>
    {data.map((entry,index)=>(
        <Cell
            key={index}
            fill={entry.color}
        />
    ))}
</Bar>

                    </BarChart>

                </ResponsiveContainer>

            </div>

        </div>
    );
}