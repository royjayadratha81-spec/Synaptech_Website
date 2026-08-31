import { useEffect, useState } from "react";
import {
  INTERVIEW_CATEGORIES,
  INTERVIEW_MATERIAL_EXTENSIONS,
  loadInterviewCategories,
  seedInterviewCategories,
  loadAllInterviewQuestions,
  saveInterviewQuestion,
  loadInterviewMaterials,
  uploadInterviewMaterial,
  deleteInterviewMaterial,
  repairInterviewCategoryDuplicates,
} from "../services/interviewQnAService";

const css = `
.aq-page{min-height:100vh;background:#f6f8fc;color:#172033;padding:32px}.aq-container{max-width:1400px;margin:0 auto}.aq-hero{border-radius:24px;padding:30px;color:#fff;background:linear-gradient(135deg,#172554,#312e81 55%,#0f766e);box-shadow:0 18px 45px rgba(30,41,59,.16)}.aq-eyebrow{text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:800;opacity:.78}.aq-hero h1{margin:8px 0;font-size:32px}.aq-hero p{margin:0;opacity:.86;max-width:850px}.aq-layout{display:grid;grid-template-columns:340px 1fr;gap:22px;margin-top:22px}.aq-panel{background:#fff;border:1px solid #e5e9f2;border-radius:20px;padding:22px;box-shadow:0 10px 28px rgba(15,23,42,.05)}.aq-panel h2{margin:0 0 16px;font-size:18px}.aq-category{width:100%;text-align:left;border:1px solid #e5e9f2;background:#fff;border-radius:13px;padding:13px 14px;margin-bottom:9px;cursor:pointer;font-weight:700;transition:.18s}.aq-category:hover{transform:translateY(-1px);box-shadow:0 7px 18px rgba(15,23,42,.08)}.aq-category.active{background:#eef2ff;border-color:#6366f1;color:#4338ca}.aq-label{display:block;font-size:13px;font-weight:800;margin-bottom:7px;color:#334155}.aq-input,.aq-textarea,.aq-select{width:100%;box-sizing:border-box;border:1px solid #dbe1eb;border-radius:12px;padding:12px 13px;background:#fff;font-size:14px}.aq-textarea{min-height:150px;resize:vertical}.aq-file{width:100%;box-sizing:border-box;border:1px dashed #cbd5e1;border-radius:12px;padding:12px;background:#f8fafc}.aq-field{margin-bottom:17px}.aq-row{display:grid;grid-template-columns:1fr 160px 160px;gap:14px}.aq-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:20px}.aq-btn{border:0;border-radius:11px;padding:11px 17px;font-weight:800;cursor:pointer}.aq-btn:disabled{opacity:.55;cursor:not-allowed}.aq-primary{background:#4f46e5;color:#fff}.aq-secondary{background:#eef1f6;color:#273449}.aq-danger{background:#fee2e2;color:#991b1b}.aq-list{margin-top:22px}.aq-item{border:1px solid #e5e9f2;border-radius:16px;padding:18px;margin-top:12px;background:#fff}.aq-item-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.aq-question{font-weight:800;line-height:1.5}.aq-answer{margin-top:10px;background:#f7f8fb;border-radius:12px;padding:13px;white-space:pre-wrap;line-height:1.6;color:#475569}.aq-badge{display:inline-block;padding:5px 9px;border-radius:999px;font-size:11px;font-weight:800;white-space:nowrap}.aq-published{background:#dcfce7;color:#166534}.aq-draft{background:#fef3c7;color:#92400e}.aq-empty{padding:30px;text-align:center;color:#64748b;border:1px dashed #cbd5e1;border-radius:16px}.aq-divider{height:1px;background:#e5e9f2;margin:28px 0}.aq-material-head{display:flex;justify-content:space-between;gap:15px;align-items:flex-start;flex-wrap:wrap}.aq-material-title{font-size:17px;font-weight:800}.aq-meta{font-size:12px;color:#64748b;margin-top:7px;line-height:1.6}.aq-file-name{font-size:13px;color:#334155;margin-top:8px;word-break:break-word}.aq-supported{font-size:12px;color:#64748b;margin-top:7px;line-height:1.5}.aq-material-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.aq-section-note{background:#f8fafc;border:1px solid #e2e8f0;border-radius:13px;padding:12px 14px;font-size:13px;color:#475569;margin-bottom:18px}.aq-section-note strong{color:#172033}@media(max-width:950px){.aq-page{padding:18px}.aq-layout{grid-template-columns:1fr}.aq-row{grid-template-columns:1fr}}
`;

export default function AdminInterviewQnA() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [materials, setMaterials] = useState([]);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [order, setOrder] = useState(1);
  const [isPublished, setIsPublished] = useState(false);

  const [materialTitle, setMaterialTitle] = useState("");
  const [materialDifficulty, setMaterialDifficulty] = useState("Medium");
  const [materialOrder, setMaterialOrder] = useState(1);
  const [materialPublished, setMaterialPublished] = useState(false);
  const [materialFile, setMaterialFile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [repairingCategories, setRepairingCategories] = useState(false);

  useEffect(() => {
    const initialise = async () => {
      try {
        let data = await loadInterviewCategories();
        if (!data.length) {
          await seedInterviewCategories();
          data = await loadInterviewCategories();
        }
        setCategories(data);
        if (data.length) setSelectedCategory(data[0]);
      } catch (error) {
        console.error("Interview Q&A admin load failed:", error);
      } finally {
        setLoading(false);
      }
    };
    initialise();
  }, []);

  const refreshCategoryData = async (categoryId) => {
    const [questionData, materialData] = await Promise.all([
      loadAllInterviewQuestions(categoryId),
      loadInterviewMaterials(categoryId),
    ]);
    setQuestions(questionData);
    setMaterials(materialData);

    const nextQuestionOrder = questionData.length
      ? Math.max(...questionData.map((item) => Number(item.order || 0))) + 1
      : 1;
    const nextMaterialOrder = materialData.length
      ? Math.max(...materialData.map((item) => Number(item.order || 0))) + 1
      : 1;
    setOrder(nextQuestionOrder);
    setMaterialOrder(nextMaterialOrder);
  };

  useEffect(() => {
    if (!selectedCategory) {
      setQuestions([]);
      setMaterials([]);
      return;
    }
    refreshCategoryData(selectedCategory.id).catch((error) => {
      console.error("Interview category data load failed:", error);
    });
  }, [selectedCategory]);

  const handleSave = async (event) => {
    event.preventDefault();
    if (!selectedCategory) return alert("Please select a category.");
    if (!question.trim() || !answer.trim()) {
      alert("Please enter both the question and answer.");
      return;
    }
    try {
      setSaving(true);
      await saveInterviewQuestion({
        categoryId: selectedCategory.id,
        categoryName: selectedCategory.name,
        question,
        answer,
        difficulty,
        order,
        isPublished,
      });
      alert(isPublished ? "Interview question published successfully." : "Interview question saved as draft.");
      setQuestion("");
      setAnswer("");
      setDifficulty("Intermediate");
      await refreshCategoryData(selectedCategory.id);
    } catch (error) {
      console.error("Interview question save failed:", error);
      alert(error.message || "Unable to save interview question.");
    } finally {
      setSaving(false);
    }
  };

  const handleMaterialUpload = async (event) => {
    event.preventDefault();
    if (!selectedCategory) return alert("Please select a category.");
    if (!materialTitle.trim()) return alert("Please enter a material title.");
    if (!materialFile) return alert("Please select a material file.");

    try {
      setUploading(true);
      await uploadInterviewMaterial({
        title: materialTitle,
        categoryId: selectedCategory.id,
        categoryName: selectedCategory.name,
        difficulty: materialDifficulty,
        order: materialOrder,
        isPublished: materialPublished,
        file: materialFile,
      });
      alert(materialPublished ? "Study material published successfully." : "Study material saved as draft.");
      setMaterialTitle("");
      setMaterialDifficulty("Medium");
      setMaterialPublished(false);
      setMaterialFile(null);
      const input = document.getElementById("interview-material-file");
      if (input) input.value = "";
      await refreshCategoryData(selectedCategory.id);
    } catch (error) {
      console.error("Interview material upload failed:", error);
      alert(error.message || "Unable to upload interview material.");
    } finally {
      setUploading(false);
    }
  };

  const handleRepairCategories = async () => {
    const confirmed = window.confirm(
      "Repair duplicate Interview Q&A categories now? Existing questions, study materials and student progress linked to duplicate category IDs will be moved to the canonical category before duplicates are deleted."
    );
    if (!confirmed) return;

    try {
      setRepairingCategories(true);
      const result = await repairInterviewCategoryDuplicates();
      alert(
        `Category repair complete. Duplicate categories removed: ${result.duplicateCategoriesRemoved}. References migrated: ${result.referencesMigrated}.`
      );
      const data = await loadInterviewCategories();
      setCategories(data);
      const nextCategory = data.find((item) => item.id === selectedCategory?.id) || data[0] || null;
      setSelectedCategory(nextCategory);
      if (nextCategory) await refreshCategoryData(nextCategory.id);
    } catch (error) {
      console.error("Interview category repair failed:", error);
      alert(error.message || "Unable to repair interview categories.");
    } finally {
      setRepairingCategories(false);
    }
  };

  const handleDeleteMaterial = async (material) => {
    const confirmed = window.confirm(`Delete "${material.title}"? This will remove the stored file as well.`);
    if (!confirmed) return;
    try {
      setDeletingId(material.id);
      await deleteInterviewMaterial(material);
      await refreshCategoryData(selectedCategory.id);
      alert("Study material deleted successfully.");
    } catch (error) {
      console.error("Interview material delete failed:", error);
      alert(error.message || "Unable to delete study material.");
    } finally {
      setDeletingId("");
    }
  };

  if (loading) return <div style={{ padding: 40 }}>Loading Interview Q&A Management…</div>;

  return (
    <>
      <style>{css}</style>
      <div className="aq-page">
        <div className="aq-container">
          <section className="aq-hero">
            <div className="aq-eyebrow">Career & Interview Preparation</div>
            <h1>Interview Q&A Management</h1>
            <p>
              Create, organize and publish interview questions, model answers and study materials across every interview preparation module.
            </p>
            <div style={{ marginTop: 18 }}>
              <button
                type="button"
                className="aq-btn aq-secondary"
                onClick={handleRepairCategories}
                disabled={repairingCategories}
              >
                {repairingCategories ? "Repairing Categories..." : "Repair Duplicate Categories"}
              </button>
            </div>
          </section>

          <div className="aq-layout">
            <section className="aq-panel">
              <h2>Interview Categories</h2>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={`aq-category ${selectedCategory?.id === category.id ? "active" : ""}`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category.name}
                </button>
              ))}
            </section>

            <section className="aq-panel">
              <h2>{selectedCategory ? `Add Question — ${selectedCategory.name}` : "Add Interview Question"}</h2>
              <form onSubmit={handleSave}>
                <div className="aq-field">
                  <label className="aq-label">Interview Question</label>
                  <textarea className="aq-textarea" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Enter the interview question..." />
                </div>
                <div className="aq-field">
                  <label className="aq-label">Model Answer</label>
                  <textarea className="aq-textarea" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Enter the model answer..." />
                </div>
                <div className="aq-row">
                  <div>
                    <label className="aq-label">Difficulty</label>
                    <select className="aq-select" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                      <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
                    </select>
                  </div>
                  <div>
                    <label className="aq-label">Display Order</label>
                    <input className="aq-input" type="number" min="1" value={order} onChange={(e) => setOrder(Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="aq-label">Publish</label>
                    <select className="aq-select" value={isPublished ? "published" : "draft"} onChange={(e) => setIsPublished(e.target.value === "published")}>
                      <option value="draft">Draft</option><option value="published">Published</option>
                    </select>
                  </div>
                </div>
                <div className="aq-actions">
                  <button type="button" className="aq-btn aq-secondary" onClick={() => { setQuestion(""); setAnswer(""); setDifficulty("Intermediate"); setIsPublished(false); }}>Clear</button>
                  <button type="submit" className="aq-btn aq-primary" disabled={saving || !selectedCategory}>{saving ? "Saving..." : isPublished ? "Publish Question" : "Save Draft"}</button>
                </div>
              </form>

              <div className="aq-list">
                <h2>Existing Questions{selectedCategory ? ` — ${selectedCategory.name}` : ""}</h2>
                {!questions.length ? <div className="aq-empty">No questions have been added to this category yet.</div> : questions.map((item, index) => (
                  <div className="aq-item" key={item.id}>
                    <div className="aq-item-top">
                      <div className="aq-question">{index + 1}. {item.question}</div>
                      <span className={`aq-badge ${item.isPublished ? "aq-published" : "aq-draft"}`}>{item.isPublished ? "Published" : "Draft"}</span>
                    </div>
                    <div className="aq-answer">{item.answer}</div>
                    <div className="aq-meta">Difficulty: {item.difficulty || "Intermediate"} • Order: {item.order || 1}</div>
                  </div>
                ))}
              </div>

              <div className="aq-divider" />

              <h2>Interview Study Materials — {selectedCategory?.name || "Category"}</h2>
              <div className="aq-section-note">
                <strong>Supported:</strong> PDF, PPT, PPTX, DOC, DOCX, HTML, HTM, IPYNB, XLS, XLSX, CSV, TXT and MD. Files are stored separately from questions and are visible to students only after publication.
              </div>

              <form onSubmit={handleMaterialUpload}>
                <div className="aq-field">
                  <label className="aq-label">Material Title</label>
                  <input className="aq-input" value={materialTitle} onChange={(e) => setMaterialTitle(e.target.value)} placeholder="e.g. Python Interview Preparation Notes" />
                </div>

                <div className="aq-field">
                  <label className="aq-label">Study Material File</label>
                  <input
                    id="interview-material-file"
                    className="aq-file"
                    type="file"
                    accept={INTERVIEW_MATERIAL_EXTENSIONS.map((ext) => `.${ext}`).join(",")}
                    onChange={(e) => setMaterialFile(e.target.files?.[0] || null)}
                  />
                  <div className="aq-supported">Maximum file size: 50 MB. {materialFile ? `Selected: ${materialFile.name}` : "No file selected."}</div>
                </div>

                <div className="aq-row">
                  <div>
                    <label className="aq-label">Material Difficulty</label>
                    <select className="aq-select" value={materialDifficulty} onChange={(e) => setMaterialDifficulty(e.target.value)}>
                      <option>Easy</option><option>Medium</option><option>Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="aq-label">Display Order</label>
                    <input className="aq-input" type="number" min="1" value={materialOrder} onChange={(e) => setMaterialOrder(Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="aq-label">Publish</label>
                    <select className="aq-select" value={materialPublished ? "published" : "draft"} onChange={(e) => setMaterialPublished(e.target.value === "published")}>
                      <option value="draft">Draft</option><option value="published">Published</option>
                    </select>
                  </div>
                </div>

                <div className="aq-actions">
                  <button type="button" className="aq-btn aq-secondary" onClick={() => { setMaterialTitle(""); setMaterialDifficulty("Medium"); setMaterialPublished(false); setMaterialFile(null); const input = document.getElementById("interview-material-file"); if (input) input.value = ""; }}>Clear</button>
                  <button type="submit" className="aq-btn aq-primary" disabled={uploading || !selectedCategory}>{uploading ? "Uploading..." : materialPublished ? "Upload & Publish" : "Upload as Draft"}</button>
                </div>
              </form>

              <div className="aq-list">
                <h2>Existing Study Materials</h2>
                {!materials.length ? <div className="aq-empty">No study materials have been uploaded to this category yet.</div> : materials.map((material) => (
                  <div className="aq-item" key={material.id}>
                    <div className="aq-material-head">
                      <div>
                        <div className="aq-material-title">{material.title}</div>
                        <div className="aq-meta">{String(material.fileType || "file").toUpperCase()} • {material.difficulty || "Medium"} • Order {material.order || 1}</div>
                        <div className="aq-file-name">{material.fileName}</div>
                      </div>
                      <span className={`aq-badge ${material.isPublished ? "aq-published" : "aq-draft"}`}>{material.isPublished ? "Published" : "Draft"}</span>
                    </div>
                    <div className="aq-material-actions">
                      {material.fileUrl && <a className="aq-btn aq-secondary" href={material.fileUrl} target="_blank" rel="noreferrer">Open File</a>}
                      <button type="button" className="aq-btn aq-danger" disabled={deletingId === material.id} onClick={() => handleDeleteMaterial(material)}>{deletingId === material.id ? "Deleting..." : "Delete"}</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
