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


export default function DashboardChart({ analytics, modules = [] }) {
    const getAnalyticsModuleKey = (moduleName) => {
    const name = String(moduleName || "")
        .trim()
        .toLowerCase();

    const keyMap = {
        "r language": "rlanguage",
        "statistics & mathematics": "statistics",
        "generative ai": "generativeai",
        "agentic ai": "agenticai",
        "machine learning": "machinelearning",
        "deep learning": "deeplearning",
        "data visualization": "datavisualization",
        "power bi": "powerbi",
        "mlops": "mlops",
        "python": "python",
        "numpy": "numpy",
        "pandas": "pandas",
        "eda": "eda",
        "tableau": "tableau",
        "sql": "sql",
        "excel": "excel",
    };

    return keyMap[name] || name.replace(/\s+/g, "");
};

const data = modules.map((module, index) => {
    const key = getAnalyticsModuleKey(module.moduleName);

    return {
        module: module.moduleName,
        progress: Number(
            analytics?.modules?.[key] ?? 0
        ),
        color: [
            "#2563eb",
            "#22c55e",
            "#9333ea",
            "#f97316",
            "#06b6d4",
            "#6366f1",
            "#f59e0b",
            "#84cc16",
            "#eab308",
            "#ec4899",
            "#ef4444",
            "#8b5cf6",
            "#10b981",
            "#0ea5e9",
            "#6b7280",
            "#7c3aed",
        ][index % 16],
    };
});

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