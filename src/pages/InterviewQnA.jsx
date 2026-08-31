import { useEffect, useMemo, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import Sidebar from "../components/Sidebar";
import {
  INTERVIEW_CATEGORIES,
  loadInterviewCategories,
  loadInterviewMaterialProgress,
  loadInterviewMaterials,
  loadInterviewProgress,
  loadInterviewQuestions,
  recordInterviewMaterialViewed,
  recordInterviewQuestionViewed,
  seedInterviewCategories,
} from "../services/interviewQnAService";

const css = `
.iq-page{min-height:100vh;background:#f6f8fc;color:#172033;display:flex}.iq-main{flex:1;padding:30px 34px;max-width:1400px;margin:0 auto}.iq-hero{border-radius:24px;padding:30px;background:linear-gradient(135deg,#172554,#312e81 55%,#0f766e);color:#fff;box-shadow:0 18px 45px rgba(30,41,59,.16)}.iq-eyebrow{text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:800;opacity:.78}.iq-hero h1{margin:8px 0;font-size:32px}.iq-hero p{margin:0;opacity:.86;max-width:780px}.iq-progress{margin-top:22px;display:flex;gap:18px;align-items:center;flex-wrap:wrap}.iq-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-top:22px}.iq-card{border:1px solid #e5e9f2;background:#fff;border-radius:18px;padding:20px;text-align:left;cursor:pointer;transition:.18s;box-shadow:0 8px 24px rgba(15,23,42,.05)}.iq-card:hover{transform:translateY(-2px);box-shadow:0 14px 30px rgba(15,23,42,.09)}.iq-card h3{margin:0 0 8px;font-size:17px}.iq-card p{margin:0;color:#687386;font-size:13px}.iq-mini{margin-top:14px;height:6px;background:#edf0f5;border-radius:99px;overflow:hidden}.iq-mini>span{display:block;height:100%;background:#4f46e5}.iq-toolbar{display:flex;gap:12px;margin:22px 0;flex-wrap:wrap}.iq-input,.iq-select{border:1px solid #dbe1eb;border-radius:12px;padding:11px 13px;background:#fff}.iq-section{margin-top:22px;background:#fff;border:1px solid #e5e9f2;border-radius:20px;padding:24px;box-shadow:0 10px 28px rgba(15,23,42,.05)}.iq-section h2{margin:0 0 6px;font-size:20px}.iq-section-sub{color:#64748b;font-size:13px;margin-bottom:18px}.iq-question{margin-top:20px;background:#fff;border:1px solid #e5e9f2;border-radius:20px;padding:26px;box-shadow:0 10px 28px rgba(15,23,42,.05)}.iq-qnum{font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:#6366f1;font-weight:800}.iq-question h2{font-size:23px;line-height:1.4;margin:10px 0 20px}.iq-answer{background:#f7f8fb;border-radius:15px;padding:18px;line-height:1.7;white-space:pre-wrap}.iq-actions{display:flex;justify-content:space-between;gap:10px;margin-top:20px}.iq-btn{border:0;border-radius:11px;padding:11px 16px;font-weight:700;cursor:pointer}.iq-btn:disabled{opacity:.5;cursor:not-allowed}.iq-primary{background:#4f46e5;color:#fff}.iq-secondary{background:#eef1f6;color:#273449}.iq-material-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;margin-top:16px}.iq-material{border:1px solid #e5e9f2;border-radius:16px;padding:17px;background:#fff}.iq-material-title{font-weight:800;line-height:1.45}.iq-material-file{font-size:12px;color:#64748b;margin-top:7px;word-break:break-word}.iq-material-meta{font-size:12px;color:#475569;margin-top:9px}.iq-badge{display:inline-block;padding:5px 9px;border-radius:999px;font-size:11px;font-weight:800;margin-top:10px}.iq-easy{background:#dcfce7;color:#166534}.iq-medium{background:#fef3c7;color:#92400e}.iq-hard{background:#fee2e2;color:#991b1b}.iq-open{display:inline-flex;text-decoration:none;margin-top:13px}.iq-empty{padding:24px;text-align:center;color:#64748b;border:1px dashed #cbd5e1;border-radius:14px;margin-top:15px}.iq-back{margin-bottom:15px}@media(max-width:800px){.iq-main{padding:18px}.iq-hero h1{font-size:26px}.iq-question{padding:20px}}
`;

const difficultyClass = (difficulty) => {
  const value = String(difficulty || "Medium").toLowerCase();
  if (value === "easy") return "iq-easy";
  if (value === "hard") return "iq-hard";
  return "iq-medium";
};

export default function InterviewQnA() {
  const [email, setEmail] = useState("");
  const [categories, setCategories] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [progress, setProgress] = useState([]);
  const [materialProgress, setMaterialProgress] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [search, setSearch] = useState("");
  const [materialDifficultyFilter, setMaterialDifficultyFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [categoryLoading, setCategoryLoading] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    return onAuthStateChanged(auth, async (user) => {
      const cached = JSON.parse(localStorage.getItem("studentData") || "null");
      setEmail(user?.email || cached?.email || "");
    });
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        let cats = await loadInterviewCategories();
        if (!cats.length) {
          await seedInterviewCategories();
          cats = await loadInterviewCategories();
        }
        setCategories(cats);
        const [p, mp] = await Promise.all([
          loadInterviewProgress(email),
          loadInterviewMaterialProgress(email),
        ]);
        setProgress(p);
        setMaterialProgress(mp);
      } catch (error) {
        console.error("Interview Q&A load failed:", error);
      } finally {
        setLoading(false);
      }
    };
    if (email) load();
  }, [email]);

  const openCategory = async (category) => {
    setSelectedCategory(category);
    setQuestionIndex(0);
    setShowAnswer(false);
    setMaterialDifficultyFilter("All");
    setCategoryLoading(true);
    try {
      const [questionData, materialData] = await Promise.all([
        loadInterviewQuestions(category.id),
        loadInterviewMaterials(category.id, { publishedOnly: true }),
      ]);
      setQuestions(questionData);
      setMaterials(materialData);
    } catch (error) {
      console.error("Interview category content load failed:", error);
      setQuestions([]);
      setMaterials([]);
    } finally {
      setCategoryLoading(false);
    }
  };

  const markViewed = async (question) => {
    if (!question || !email) return;
    await recordInterviewQuestionViewed({ email, questionId: question.id, categoryId: selectedCategory?.id });
    setProgress((current) => current.some((item) => item.questionId === question.id) ? current : [...current, { questionId: question.id, categoryId: selectedCategory?.id }]);
  };

  const markMaterialViewed = async (material) => {
    if (!material || !email) return;
    try {
      await recordInterviewMaterialViewed({ email, materialId: material.id, categoryId: selectedCategory?.id });
      setMaterialProgress((current) => current.some((item) => item.materialId === material.id) ? current : [...current, { materialId: material.id, categoryId: selectedCategory?.id }]);
    } catch (error) {
      console.error("Interview material progress update failed:", error);
    }
  };

  const filteredCategories = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return categories;
    return categories.filter((item) => String(item.name || "").toLowerCase().includes(term));
  }, [categories, search]);

  const overallTotal = categories.reduce((sum, category) => sum + progress.filter((item) => item.categoryId === category.id).length, 0);
  const activeQuestion = questions[questionIndex];
  const filteredMaterials = useMemo(() => {
    if (materialDifficultyFilter === "All") return materials;
    return materials.filter((item) => String(item.difficulty || "Medium").toLowerCase() === materialDifficultyFilter.toLowerCase());
  }, [materials, materialDifficultyFilter]);

  useEffect(() => {
    if (activeQuestion && showAnswer) markViewed(activeQuestion);
  }, [showAnswer, activeQuestion]);

  if (loading) return <div style={{ padding: 40 }}>Loading Interview Q&A…</div>;

  return (
    <>
      <style>{css}</style>
      <div className="iq-page">
        <Sidebar />
        <main className="iq-main">
          <section className="iq-hero">
            <div className="iq-eyebrow">Career & Interview Preparation</div>
            <h1>Interview Q&A</h1>
            <p>Prepare systematically across all course modules with interview questions, model answers and curated study materials.</p>
            <div className="iq-progress">
              <strong>{overallTotal} questions explored</strong>
              <span>{materialProgress.length} study materials opened</span>
            </div>
          </section>

          {!selectedCategory ? (
            <>
              <div className="iq-toolbar">
                <input className="iq-input" placeholder="Search interview topics…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="iq-grid">
                {filteredCategories.map((category) => {
                  const viewed = progress.filter((item) => item.categoryId === category.id).length;
                  return (
                    <button className="iq-card" key={category.id} onClick={() => openCategory(category)}>
                      <h3>{category.name}</h3>
                      <p>{viewed} question{viewed === 1 ? "" : "s"} explored</p>
                      <div className="iq-mini"><span style={{ width: `${Math.min(100, viewed)}%` }} /></div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className="iq-section iq-back">
                <button className="iq-btn iq-secondary" onClick={() => setSelectedCategory(null)}>← All Categories</button>
              </div>

              {categoryLoading ? (
                <div className="iq-section">Loading {selectedCategory.name} interview content…</div>
              ) : (
                <>
                  <section className="iq-question">
                    <div className="iq-qnum">{selectedCategory.name} • Question {questions.length ? questionIndex + 1 : 0} of {questions.length}</div>
                    {activeQuestion ? (
                      <>
                        <h2>{activeQuestion.question}</h2>
                        {!showAnswer ? (
                          <button className="iq-btn iq-primary" onClick={() => setShowAnswer(true)}>Show Answer</button>
                        ) : (
                          <>
                            <div className="iq-answer">{activeQuestion.answer}</div>
                            <div className="iq-actions">
                              <button className="iq-btn iq-secondary" disabled={questionIndex === 0} onClick={() => { setQuestionIndex((i) => Math.max(0, i - 1)); setShowAnswer(false); }}>← Previous</button>
                              <button className="iq-btn iq-primary" disabled={questionIndex >= questions.length - 1} onClick={() => { setQuestionIndex((i) => Math.min(questions.length - 1, i + 1)); setShowAnswer(false); }}>Next →</button>
                            </div>
                          </>
                        )}
                      </>
                    ) : <p style={{ marginTop: 20 }}>No published questions are available in this category yet.</p>}
                  </section>

                  <section className="iq-section">
                    <h2>Interview Study Materials</h2>
                    <div className="iq-section-sub">{selectedCategory.name} • PDFs, presentations, documents, notebooks and other learning resources</div>
                    <div className="iq-toolbar">
                      <select className="iq-select" value={materialDifficultyFilter} onChange={(e) => setMaterialDifficultyFilter(e.target.value)}>
                        <option>All</option><option>Easy</option><option>Medium</option><option>Hard</option>
                      </select>
                    </div>

                    {!filteredMaterials.length ? (
                      <div className="iq-empty">No published study materials are available for this category and difficulty yet.</div>
                    ) : (
                      <div className="iq-material-grid">
                        {filteredMaterials.map((material) => (
                          <article className="iq-material" key={material.id}>
                            <div className="iq-material-title">{material.title}</div>
                            <div className="iq-material-file">{String(material.fileType || "file").toUpperCase()} • {material.fileName}</div>
                            <span className={`iq-badge ${difficultyClass(material.difficulty)}`}>{material.difficulty || "Medium"}</span>
                            <div className="iq-material-meta">
                              {materialProgress.some((item) => item.materialId === material.id) ? "✓ Opened" : "Not opened yet"}
                            </div>
                            {material.fileUrl && (
                              <a
                                className="iq-btn iq-primary iq-open"
                                href={material.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => markMaterialViewed(material)}
                              >
                                Open Material
                              </a>
                            )}
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
