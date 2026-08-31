import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import Sidebar from "../components/Sidebar";
import { db } from "../firebase/firebaseConfig";

const css = `
.nw-page{min-height:100vh;background:#f6f8fc;color:#172033;display:flex}.nw-main{flex:1;max-width:1200px;margin:auto;padding:30px 34px}
.nw-head h1{margin:0 0 7px;font-size:30px}.nw-head p{color:#687386}.nw-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-top:22px}
.nw-card{background:#fff;border:1px solid #e4e8f0;border-radius:18px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,.05)}.nw-body{padding:18px}.nw-card h3{margin:0 0 8px}.nw-summary{color:#687386;line-height:1.55}.nw-meta{font-size:12px;color:#929bab;margin-top:12px}.nw-link{display:inline-block;margin-top:14px;color:#4338ca;font-weight:800;text-decoration:none}
`;

export default function News() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const snapshot = await getDocs(
          query(
            collection(db, "newsItems"),
            where("isPublished", "==", true),
            orderBy("publishedAt", "desc")
          )
        );
        setItems(
          snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
        );
      } catch (error) {
        console.error("News load failed:", error);
      }
    };
    load();
  }, []);

  return (
    <>
      <style>{css}</style>
      <div className="nw-page">
        <Sidebar />
        <main className="nw-main">
          <div className="nw-head">
            <h1>Data Science & AI News</h1>
            <p>
              Curated industry developments across AI, Data Science, GenAI,
              Agentic AI and related technologies.
            </p>
          </div>

          <div className="nw-grid">
            {!items.length && (
              <article className="nw-card">
                <div className="nw-body">
                  No published news is available yet.
                </div>
              </article>
            )}

            {items.map((item) => (
              <article className="nw-card" key={item.id}>
                <div className="nw-body">
                  <h3>{item.title}</h3>
                  <div className="nw-summary">{item.summary}</div>
                  <div className="nw-meta">
                    {item.sourceName || "Synaptech"}{" "}
                    {item.category ? `• ${item.category}` : ""}
                  </div>
                  {item.sourceUrl && (
                    <a
                      className="nw-link"
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Read Full Article →
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
