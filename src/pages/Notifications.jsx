import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import Sidebar from "../components/Sidebar";
import {
  markNotificationRead,
  subscribeToStudentNotifications,
} from "../services/notificationsService";

const css = `
.nt-page{min-height:100vh;background:#f6f8fc;color:#172033;display:flex}.nt-main{flex:1;max-width:1000px;margin:auto;padding:30px 34px}
.nt-head{margin-bottom:22px}.nt-head h1{margin:0 0 7px;font-size:30px}.nt-head p{color:#687386}
.nt-list{display:grid;gap:12px}.nt-item{background:#fff;border:1px solid #e4e8f0;border-radius:16px;padding:18px;cursor:pointer}.nt-item.unread{border-left:4px solid #4f46e5}
.nt-title{font-weight:800}.nt-message{margin-top:6px;color:#687386;line-height:1.5}.nt-time{margin-top:10px;font-size:12px;color:#929bab}
`;

function formatDate(value) {
  if (!value) return "";
  const date =
    typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

export default function Notifications() {
  const [email, setEmail] = useState("");
  const [items, setItems] = useState([]);

  useEffect(() => {
    const auth = getAuth();
    return onAuthStateChanged(auth, (user) => {
      const cached = JSON.parse(localStorage.getItem("studentData") || "null");
      setEmail(user?.email || cached?.email || "");
    });
  }, []);

  useEffect(() => {
    if (!email) return undefined;
    return subscribeToStudentNotifications(email, setItems);
  }, [email]);

  const open = async (item) => {
    if (!item.read) {
      await markNotificationRead(item.id);
    }
    if (item.route) window.location.href = item.route;
  };

  return (
    <>
      <style>{css}</style>
      <div className="nt-page">
        <Sidebar />
        <main className="nt-main">
          <div className="nt-head">
            <h1>Notifications</h1>
            <p>Important updates from your Synaptech learning journey.</p>
          </div>
          <div className="nt-list">
            {!items.length && (
              <div className="nt-item">You are all caught up.</div>
            )}
            {items.map((item) => (
              <div
                key={item.id}
                className={`nt-item ${item.read ? "" : "unread"}`}
                onClick={() => open(item)}
              >
                <div className="nt-title">{item.title}</div>
                <div className="nt-message">{item.message}</div>
                <div className="nt-time">{formatDate(item.createdAt)}</div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
