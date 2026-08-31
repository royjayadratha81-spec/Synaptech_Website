import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

const css = `
.an-page{min-height:100vh;background:#f6f8fc;padding:30px 34px;color:#172033}.an-wrap{max-width:1100px;margin:auto}.an-panel{background:#fff;border:1px solid #e4e8f0;border-radius:18px;padding:22px}
.an-input,.an-textarea,.an-select{width:100%;box-sizing:border-box;border:1px solid #dbe1eb;border-radius:11px;padding:11px 12px;margin-top:7px}.an-textarea{min-height:130px;resize:vertical}.an-form{display:grid;gap:15px}.an-btn{border:0;border-radius:11px;padding:11px 16px;background:#4f46e5;color:#fff;font-weight:800;cursor:pointer}.an-list{margin-top:25px;display:grid;gap:10px}.an-item{border:1px solid #e5e9f2;border-radius:14px;padding:15px}
`;

export default function AdminNews() {
  const [form, setForm] = useState({
    title: "",
    summary: "",
    sourceName: "",
    sourceUrl: "",
    category: "Artificial Intelligence",
  });
  const [items, setItems] = useState([]);

  const load = async () => {
    const snapshot = await getDocs(
      query(collection(db, "newsItems"), orderBy("publishedAt", "desc"))
    );
    setItems(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  };

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const save = async () => {
    if (!form.title.trim() || !form.summary.trim()) {
      alert("Title and summary are required.");
      return;
    }

    await addDoc(collection(db, "newsItems"), {
      ...form,
      isPublished: true,
      publishedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setForm({
      title: "",
      summary: "",
      sourceName: "",
      sourceUrl: "",
      category: "Artificial Intelligence",
    });
    await load();
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="relative overflow-hidden rounded-[32px] bg-slate-950 p-7 text-white shadow-[0_28px_90px_rgba(15,23,42,.20)] md:p-10">
          <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl"/>
          <div className="absolute -bottom-36 left-1/3 h-80 w-80 rounded-full bg-violet-500/15 blur-3xl"/>
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <button onClick={() => window.history.back()} className="mb-5 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/15">← Back</button>
              <p className="text-[10px] font-black tracking-[.25em] text-cyan-300">CONTENT INTELLIGENCE</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">News Management Studio</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Curate attributed Data Science and AI news for the student News experience using the existing <b>newsItems</b> collection.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
              <p className="text-[10px] font-black tracking-wider text-slate-400">PUBLISHED ITEMS</p>
              <p className="mt-1 text-3xl font-black">{items.length}</p>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,.065)] md:p-8">
            <p className="text-[10px] font-black tracking-[.22em] text-violet-600">EDITORIAL DESK</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">Publish a news item</h2>
            <p className="mt-2 text-sm text-slate-500">The existing fields and Firestore write contract are unchanged.</p>
            <div className="mt-6 space-y-5">
              <label className="block"><span className="text-xs font-black uppercase tracking-wider text-slate-500">Headline</span><input className="an-input" value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} placeholder="Enter a concise headline"/></label>
              <label className="block"><span className="text-xs font-black uppercase tracking-wider text-slate-500">Executive summary</span><textarea className="an-textarea" value={form.summary} onChange={(e)=>setForm({...form,summary:e.target.value})} placeholder="What should students know?"/></label>
              <label className="block"><span className="text-xs font-black uppercase tracking-wider text-slate-500">Category</span><select className="an-select" value={form.category} onChange={(e)=>setForm({...form,category:e.target.value})}>{["Artificial Intelligence","Generative AI","Agentic AI","Machine Learning","Deep Learning","Data Science","MLOps"].map(x=><option key={x}>{x}</option>)}</select></label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block"><span className="text-xs font-black uppercase tracking-wider text-slate-500">Source</span><input className="an-input" value={form.sourceName} onChange={(e)=>setForm({...form,sourceName:e.target.value})} placeholder="e.g. Reuters"/></label>
                <label className="block"><span className="text-xs font-black uppercase tracking-wider text-slate-500">Original article URL</span><input className="an-input" value={form.sourceUrl} onChange={(e)=>setForm({...form,sourceUrl:e.target.value})} placeholder="https://..."/></label>
              </div>
              <button className="w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-lg hover:bg-blue-700" onClick={save}>Publish to Student News</button>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,.065)] md:p-8">
            <div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-black tracking-[.22em] text-blue-600">NEWS LIBRARY</p><h2 className="mt-1 text-2xl font-black text-slate-900">Published intelligence</h2></div><span className="rounded-full bg-blue-50 px-3 py-2 text-[10px] font-black text-blue-700">LIVE FIRESTORE</span></div>
            <div className="mt-6 space-y-3">
              {items.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">No published news items yet.</div> :
                items.map((item,index)=><article key={item.id} className="group rounded-[22px] border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="flex items-start gap-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-xs font-black text-white">{String(index+1).padStart(2,"0")}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-violet-50 px-2.5 py-1 text-[9px] font-black uppercase text-violet-700">{item.category}</span><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase text-emerald-700">Published</span></div><h3 className="mt-3 text-base font-black text-slate-900">{item.title}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{item.summary}</p><div className="mt-3 flex flex-wrap gap-3 text-[11px] font-bold text-slate-400"><span>{item.sourceName || "Source not specified"}</span>{item.sourceUrl && <a className="text-blue-600 hover:underline" href={item.sourceUrl} target="_blank" rel="noreferrer">Open original ↗</a>}</div></div></div>
                </article>)}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
