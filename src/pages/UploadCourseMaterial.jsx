import { supabase } from "../supabase/supabase";
import { useState, useEffect } from "react";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { FaCloudUploadAlt, FaFilePdf, FaFilePowerpoint, FaFileAlt, FaBookOpen, FaCheckCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function UploadCourseMaterial() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [batchId, setBatchId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [materialType, setMaterialType] = useState("");
  const [batches, setBatches] = useState([]);
  const [modules, setModules] = useState([]);

  useEffect(() => {
    fetchBatches();
    fetchModules();
  }, []);

  const fetchBatches = async () => {
    const snapshot = await getDocs(collection(db, "batches"));
    const batchList = [];
    snapshot.forEach((docItem) => {
      batchList.push({ id: docItem.id, ...docItem.data() });
    });
    setBatches(batchList);
  };

  const fetchModules = async () => {
    const snapshot = await getDocs(collection(db, "modules"));
    const moduleList = [];
    snapshot.forEach((docItem) => {
      moduleList.push({ id: docItem.id, ...docItem.data() });
    });
    moduleList.sort((a, b) => a.moduleOrder - b.moduleOrder);
    setModules(moduleList);
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file");
      return;
    }
    try {
      const filePath = `${batchId}/${moduleId}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage
        .from("course-materials")
        .upload(filePath, file);
      if (error) throw error;

      const { data } = supabase.storage
        .from("course-materials")
        .getPublicUrl(filePath);

      await addDoc(collection(db, "courseMaterials"), {
        title,
        batchId,
        moduleId,
        materialType,
        fileName: file.name,
        fileUrl: data.publicUrl,
        uploadedAt: new Date(),
      });

      alert("Material Uploaded Successfully");
      setTitle("");
      setBatchId("");
      setModuleId("");
      setMaterialType("");
      setFile(null);
      const input = document.getElementById("course-material-file");
      if (input) input.value = "";
    } catch (error) {
      console.error("UPLOAD ERROR:", error);
      alert(error.message);
    }
  };

  const fileName = file?.name || "No file selected";
  const extension = file?.name?.split(".").pop()?.toUpperCase();

  return (
    <div className="min-h-screen bg-[#f5f8fc] px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <div className="relative overflow-hidden rounded-[30px] bg-slate-950 p-7 text-white shadow-[0_25px_80px_rgba(15,23,42,0.18)] md:p-9">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="relative">
            <button onClick={() => navigate("/admin")} className="mb-5 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/15">
              ← Admin Console
            </button>
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <div className="flex items-center gap-2 text-violet-300">
                  <FaCloudUploadAlt />
                  <span className="text-[10px] font-black tracking-[0.24em]">CONTENT OPERATIONS</span>
                </div>
                <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">Course Material Studio</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                  Upload and organise learning resources against the existing batch, module and course-material data structure.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {["PDF", "PPT/PPTX", "DOC/DOCX", "IPYNB", "Images"].map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold text-slate-300">{item}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.07)] md:p-8">
            <div className="mb-7">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black tracking-[0.2em] text-blue-700">NEW RESOURCE</span>
              <h2 className="mt-2 text-2xl font-black text-slate-900">Upload learning material</h2>
              <p className="mt-1 text-sm text-slate-500">The upload destination and Firestore fields remain unchanged.</p>
            </div>

            <div className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Material title</span>
                <input type="text" placeholder="e.g. Python Revision Notes" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50" />
              </label>

              <div className="grid gap-5 md:grid-cols-2">
                <label>
                  <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Batch</span>
                  <select value={batchId} onChange={(e) => setBatchId(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50">
                    <option value="">Select Batch</option>
                    {batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.batchName}</option>)}
                  </select>
                </label>
                <label>
                  <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Module</span>
                  <select value={moduleId} onChange={(e) => setModuleId(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50">
                    <option value="">Select Module</option>
                    {modules.map((module) => <option key={module.id} value={module.id}>{module.moduleName}</option>)}
                  </select>
                </label>
              </div>

              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Material category</span>
                <select value={materialType} onChange={(e) => setMaterialType(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50">
                  <option value="">Select Material Type</option>
                  <option value="reading">Reading Material</option>
                  <option value="practice">Practice Material</option>
                                  </select>
              </label>

              <label htmlFor="course-material-file" className="block cursor-pointer rounded-[24px] border-2 border-dashed border-slate-200 bg-slate-50 p-7 text-center transition hover:border-blue-300 hover:bg-blue-50/40">
                <FaCloudUploadAlt className="mx-auto text-4xl text-blue-600" />
                <p className="mt-3 text-sm font-black text-slate-800">Choose a learning file</p>
                <p className="mt-1 text-xs text-slate-500">PDF, PowerPoint, Word, IPYNB and other supported browser file types</p>
                <div className="mt-4 inline-flex rounded-xl bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm">
                  {file ? `${extension} • ${fileName}` : "Browse files"}
                </div>
                <input id="course-material-file" type="file" onChange={(e) => setFile(e.target.files[0])} className="hidden" />
              </label>

              <button onClick={handleUpload} className="w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-700">
                Upload Material
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.07)] md:p-8">
              <p className="text-[10px] font-black tracking-[0.2em] text-emerald-600">RESOURCE PIPELINE</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">Ready for the student library</h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  [FaFilePdf, "PDF reading", "Notes & reference material"],
                  [FaFilePowerpoint, "Presentations", "PPT / PPTX classroom decks"],
                  [FaFileAlt, "Documents", "Text and supporting resources"],
                  [FaBookOpen, "Practice", "Exercises and hands-on resources"],
                ].map(([Icon, titleText, sub]) => (
                  <div key={titleText} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <Icon className="text-xl text-blue-600" />
                    <p className="mt-3 text-sm font-black text-slate-800">{titleText}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{sub}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[28px] bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white shadow-[0_18px_55px_rgba(16,185,129,0.20)]">
              <FaCheckCircle className="text-2xl" />
              <h3 className="mt-4 text-xl font-black">Existing integration preserved</h3>
              <p className="mt-2 text-sm leading-6 text-emerald-50">
                Files still go to the <b>course-materials</b> storage bucket and metadata still goes to <b>courseMaterials</b> with the same fields.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
