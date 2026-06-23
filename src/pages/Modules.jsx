import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { Link } from "react-router-dom";
import dashboardBg from "../assets/dashboard-bg.jpg";

export default function Modules() {

  const [modules, setModules] = useState([]);
  useEffect(() => {

  fetchModules();

}, []);

const fetchModules = async () => {

  const snapshot = await getDocs(
    collection(db, "modules")
  );

  const moduleList = [];

  snapshot.forEach((docItem) => {

    moduleList.push({
      id: docItem.id,
      ...docItem.data(),
    });

  });

  moduleList.sort(
    (a, b) => a.moduleOrder - b.moduleOrder
  );

  setModules(moduleList);

};

  return (

    <div
  className="min-h-screen bg-cover bg-center bg-fixed"
  style={{
    backgroundImage: `url(${dashboardBg})`,
  }}
>
  <div className="min-h-screen bg-white/75 backdrop-blur-sm p-10">

      <h1 className="text-4xl font-bold mb-8">
        Course Modules
      </h1>

<div className="grid md:grid-cols-3 gap-6">

  {modules.map((module) => (
  <Link
    to={`/module/${module.id}`}
    key={module.id}
    className="block"
  >
    <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl cursor-pointer">
      <h2 className="text-xl font-bold text-blue-800">

  {module.moduleName === "Python" && "🐍 "}
  {module.moduleName === "NumPy" && "📊 "}
  {module.moduleName === "Pandas" && "🐼 "}
  {module.moduleName === "Data Visualization" && "📈 "}
  {module.moduleName === "EDA" && "🔍 "}
  {module.moduleName === "Tableau" && "📊 "}
  {module.moduleName === "Power BI" && "📉 "}
  {module.moduleName === "SQL" && "🗄️ "}
  {module.moduleName === "Excel" && "📗 "}
  {module.moduleName === "R Language" && "📐 "}
  {module.moduleName === "Statistics & Mathematics" && "📚 "}
  {module.moduleName === "Machine Learning" && "🤖 "}
  {module.moduleName === "Deep Learning" && "🧠 "}
  {module.moduleName === "Generative AI" && "✨ "}
  {module.moduleName === "Agentic AI" && "⚡ "}
  {module.moduleName === "MLOps" && "🚀 "}
  {module.moduleName === "Interview Questions & Answers" && "🎯 "}

  {module.moduleName}

</h2>
    </div>
  </Link>
))}

</div>

    </div>
    </div>

  );

}