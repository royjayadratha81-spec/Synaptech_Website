import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import {
  FaArrowLeft, FaCheck, FaChevronDown, FaClock, FaExclamationTriangle,
  FaGraduationCap, FaLock, FaPlus, FaSearch, FaShieldAlt, FaTimes,
  FaUserGraduate, FaUsers,
} from "react-icons/fa";
import { db } from "../firebase/firebaseConfig";
import {
  createManualAdmission, getAdmissionsOverview, getAdmissionsStudents,
  updateStudentLifecycle,
} from "../platform/services/admissionsApi";

const STATES = [
  ["awaiting_lms_access", "Awaiting LMS Access"],
  ["active", "Active"],
  ["lms_access_denied", "Deny LMS Access"],
  ["completed", "Completed"],
  ["alumni", "Alumni"],
  ["archive", "Delete Student (archive)"],
];
const INITIAL_FORM = {
  full_name: "", email: "", phone: "", city: "", programme_name: "",
  programme_code: "", batch_preference: "", academic_session: "",
  delivery_mode: "online", agreed_fee: "", currency: "INR",
  payment_terms: "", guardian_name: "", guardian_email: "",
  guardian_phone: "", note: "",
};

function stateKey(student) {
  if (student.lifecycleState) return student.lifecycleState;
  const value = String(student.status || "").toLowerCase();
  if (["active", "completed", "alumni"].includes(value)) return value;
  if (value.includes("denied") || value.includes("deny")) return "lms_access_denied";
  return "awaiting_lms_access";
}
function tone(student) {
  const key = stateKey(student);
  if (key === "active") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  if (key === "lms_access_denied") return "border-rose-400/30 bg-rose-400/10 text-rose-200";
  if (["completed", "alumni"].includes(key)) return "border-sky-400/30 bg-sky-400/10 text-sky-200";
  return "border-amber-400/30 bg-amber-400/10 text-amber-100";
}

function Metric({ icon, label, value, hint, glow }) {
  return <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
    <div className={`absolute -right-8 -top-8 h-28 w-28 rounded-full blur-3xl ${glow}`} />
    <div className="relative flex items-start justify-between gap-4"><div>
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div><div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.07] text-lg text-white">{icon}</div></div>
  </div>;
}

function Field({ label, required, className = "", ...props }) {
  return <label className={`block ${className}`}>
    <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}{required ? " *" : ""}</span>
    <input {...props} required={required} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/60 focus:ring-4 focus:ring-violet-500/10" />
  </label>;
}

function SelectField({ label, required, children, className = "", ...props }) {
  return <label className={`block ${className}`}>
    <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}{required ? " *" : ""}</span>
    <div className="relative">
      <select {...props} required={required} className="w-full appearance-none rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 pr-10 text-sm text-white outline-none focus:border-violet-400/60 focus:ring-4 focus:ring-violet-500/10">
        {children}
      </select>
      <FaChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-600" />
    </div>
  </label>;
}

function ManualAdmissionModal({ open, busy, error, catalogLoading, catalogError, courses, batches, onClose, onSubmit }) {
  const [form, setForm] = useState(INITIAL_FORM);
  if (!open) return null;
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const selectProgramme = (event) => {
    const selected = courses.find((course) => course.id === event.target.value);
    setForm((current) => ({
      ...current,
      programme_name: selected?.courseName || "",
      programme_code: selected?.courseCode || selected?.programmeCode || "",
      batch_preference: "",
    }));
  };
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/85 p-4 backdrop-blur-xl">
    <form onSubmit={(event) => { event.preventDefault(); onSubmit(form, () => setForm(INITIAL_FORM)); }} className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[34px] border border-white/10 bg-[#0b1020] shadow-[0_40px_120px_rgba(0,0,0,.65)]">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0b1020]/95 px-7 py-6 backdrop-blur-xl"><div>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-violet-300">Controlled manual intake</p>
        <h2 className="mt-2 text-2xl font-black text-white">Register a non-CRM student</h2>
        <p className="mt-1 text-sm text-slate-400">Uses the same Admissions → Finance → Students workflow.</p>
      </div><button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"><FaTimes /></button></div>
      <div className="grid gap-5 p-7 md:grid-cols-2 lg:grid-cols-3">
        <Field label="Full name" name="full_name" value={form.full_name} onChange={update} required />
        <Field label="Email" name="email" type="email" value={form.email} onChange={update} required />
        <Field label="Phone" name="phone" value={form.phone} onChange={update} />
        <SelectField label="Programme" value={courses.find((course) => course.courseName === form.programme_name)?.id || ""} onChange={selectProgramme} required disabled={catalogLoading || courses.length === 0}>
          <option value="">{catalogLoading ? "Loading programmes…" : "Select programme"}</option>
          {courses.map((course) => <option key={course.id} value={course.id}>{course.courseName}</option>)}
        </SelectField>
        <Field label="Programme code" name="programme_code" value={form.programme_code} readOnly placeholder="Not configured in Firebase" title="Programme code remains empty unless the selected course has a courseCode or programmeCode field." />
        <SelectField label="Batch preference" name="batch_preference" value={form.batch_preference} onChange={update} disabled={catalogLoading || batches.length === 0}>
          <option value="">{catalogLoading ? "Loading batches…" : "Select active batch (optional)"}</option>
          {batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.id} — {batch.batchName || "Unnamed batch"}{batch.course ? ` · ${batch.course}` : ""}</option>)}
        </SelectField>
        <Field label="Academic session" name="academic_session" value={form.academic_session} onChange={update} />
        <label><span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Delivery mode</span><select name="delivery_mode" value={form.delivery_mode} onChange={update} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"><option value="online">Online</option><option value="offline">Offline</option><option value="hybrid">Hybrid</option></select></label>
        <Field label="Agreed fee" name="agreed_fee" type="number" min="0" value={form.agreed_fee} onChange={update} />
        <Field label="Payment terms" name="payment_terms" value={form.payment_terms} onChange={update} placeholder="Full payment / EMI plan" />
        <Field label="City" name="city" value={form.city} onChange={update} />
        <Field label="Guardian name" name="guardian_name" value={form.guardian_name} onChange={update} />
        <Field label="Guardian email" name="guardian_email" type="email" value={form.guardian_email} onChange={update} />
        <Field label="Guardian phone" name="guardian_phone" value={form.guardian_phone} onChange={update} />
        <label className="md:col-span-2 lg:col-span-3"><span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Admissions note</span><textarea name="note" value={form.note} onChange={update} rows="3" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none" /></label>
      </div>
      {catalogError && <div className="mx-7 mb-5 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">{catalogError}</div>}
      {error && <div className="mx-7 mb-5 rounded-2xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</div>}
      <div className="flex flex-col gap-3 border-t border-white/10 px-7 py-5 sm:flex-row sm:items-center sm:justify-between"><p className="flex items-center gap-2 text-xs text-slate-500"><FaShieldAlt className="text-violet-300" />LMS access is not activated at intake.</p><div className="flex gap-3"><button type="button" onClick={onClose} className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-bold text-slate-300">Cancel</button><button disabled={busy || catalogLoading || courses.length === 0} className="rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-400 px-6 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{busy ? "Registering…" : catalogLoading ? "Loading catalogue…" : "Create Admissions record"}</button></div></div>
    </form>
  </div>;
}

export default function AdminStudents() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [savingId, setSavingId] = useState(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualBusy, setManualBusy] = useState(false);
  const [manualError, setManualError] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedBatchIds, setSelectedBatchIds] = useState({});

  const loadCatalog = async () => {
    setCatalogLoading(true); setCatalogError("");
    try {
      const [courseSnapshot, batchSnapshot] = await Promise.all([
        getDocs(collection(db, "courses")),
        getDocs(collection(db, "batches")),
      ]);
      const courseList = courseSnapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .filter((item) => String(item.courseName || "").trim())
        .sort((a, b) => a.courseName.localeCompare(b.courseName));
      const batchList = batchSnapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .filter((item) => item.active !== false)
        .sort((a, b) => String(b.startDate || "").localeCompare(String(a.startDate || "")));
      setCourses(courseList); setBatches(batchList);
      if (!courseList.length) setCatalogError("No programmes were found in the Firebase courses collection.");
    } catch (catalogLoadError) {
      console.error(catalogLoadError);
      setCatalogError("Programme and batch lists could not be loaded from Firebase. Registration remains blocked to prevent inconsistent data.");
    } finally { setCatalogLoading(false); }
  };

  const loadStudents = async () => {
    setLoading(true); setError("");
    try {
      const overview = await getAdmissionsOverview({ forceRefresh: true });
      const organizationId = overview?.organization?.id || null;
      const result = await getAdmissionsStudents({ organizationId });
      setOrganization(result.organization || overview.organization || null);
      setStudents(result.students || []);
    } catch (loadError) { console.error(loadError); setError(loadError?.message || "Student operations could not be loaded."); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadStudents(); loadCatalog(); }, []);

  const metrics = useMemo(() => ({
    total: students.length,
    active: students.filter((student) => stateKey(student) === "active").length,
    awaiting: students.filter((student) => stateKey(student) === "awaiting_lms_access").length,
    completed: students.filter((student) => ["completed", "alumni"].includes(stateKey(student))).length,
  }), [students]);
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter((student) => {
      const matches = !query || [student.name, student.email, student.course, student.batch, student.batchId].some((value) => String(value || "").toLowerCase().includes(query));
      return matches && (filter === "all" || stateKey(student) === filter);
    });
  }, [students, search, filter]);

  const changeLifecycle = async (student, nextState) => {
    const label = STATES.find(([value]) => value === nextState)?.[1] || nextState;
    const selectedBatchId = selectedBatchIds[student.id] || student.batchId || (batches.some((batch) => batch.id === student.batch) ? student.batch : "");
    if (nextState === "archive" && !window.confirm("Archive this student? LMS sign-in will be disabled, while Finance and audit history remain preserved.")) return;
    if (nextState === "lms_access_denied" && !window.confirm("Deny LMS access and disable this student's Firebase sign-in?")) return;
    setSavingId(student.id); setError(""); setNotice("");
    try {
      const result = await updateStudentLifecycle({ organizationId: organization?.id || null, studentId: student.id, state: nextState, batchId: selectedBatchId || null, note: `Lifecycle changed to ${label} from Student Operations.`, forceRefresh: true });
      setNotice(result.message || "Student lifecycle updated."); await loadStudents();
    } catch (saveError) { console.error(saveError); setError(saveError?.message || "Student lifecycle could not be updated."); }
    finally { setSavingId(null); }
  };
  const submitManual = async (form, reset) => {
    setManualBusy(true); setManualError("");
    try {
      const result = await createManualAdmission({ organizationId: organization?.id || null, student: form, forceRefresh: true });
      reset(); setManualOpen(false); setNotice(result.message || "Manual Admissions record created.");
    } catch (submitError) { console.error(submitError); setManualError(submitError?.message || "Manual registration failed."); }
    finally { setManualBusy(false); }
  };

  return <div className="min-h-screen bg-[#050812] text-slate-100">
    <div className="pointer-events-none fixed inset-0 overflow-hidden"><div className="absolute -left-32 -top-20 h-[34rem] w-[34rem] rounded-full bg-violet-700/20 blur-[120px]" /><div className="absolute right-[-12rem] top-24 h-[38rem] w-[38rem] rounded-full bg-cyan-500/15 blur-[140px]" /></div>
    <main className="relative mx-auto max-w-[1600px] px-4 py-7 sm:px-7 lg:px-10">
      <header className="overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.025] p-6 shadow-[0_30px_90px_rgba(0,0,0,.35)] backdrop-blur-2xl lg:p-8"><div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between"><div className="flex items-start gap-4">
        <button onClick={() => navigate("/admin")} className="mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/5 text-slate-300"><FaArrowLeft /></button>
        <div><div className="flex flex-wrap gap-2"><span className="rounded-full border border-violet-300/25 bg-violet-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-violet-200">Student control plane</span><span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200">Finance-gated</span></div><h1 className="mt-4 text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">Student operations</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Activate LMS access, manage lifecycle states, and register non-CRM students without bypassing Admissions or Finance.</p>{organization?.name && <p className="mt-3 text-xs font-bold text-cyan-200">{organization.name}</p>}</div>
      </div><button onClick={() => { setManualError(""); loadCatalog(); setManualOpen(true); }} className="flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-violet-500 via-purple-500 to-cyan-400 px-6 py-4 text-sm font-black text-white shadow-2xl shadow-violet-600/25"><FaPlus />Register student manually</button></div></header>
      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={<FaUsers />} label="Student records" value={metrics.total} hint="Finance-cleared records" glow="bg-violet-500/40" /><Metric icon={<FaCheck />} label="Active LMS" value={metrics.active} hint="Authentication enabled" glow="bg-emerald-500/35" /><Metric icon={<FaClock />} label="Awaiting access" value={metrics.awaiting} hint="Explicit activation required" glow="bg-amber-500/35" /><Metric icon={<FaGraduationCap />} label="Completed & alumni" value={metrics.completed} hint="Learning history retained" glow="bg-cyan-500/35" /></section>
      {(error || notice) && <div className={`mt-5 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${error ? "border-rose-400/25 bg-rose-400/10 text-rose-200" : "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"}`}>{error ? <FaExclamationTriangle /> : <FaCheck />}<span>{error || notice}</span></div>}
      <section className="mt-6 overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] shadow-2xl shadow-black/25 backdrop-blur-xl">
        <div className="flex flex-col gap-4 border-b border-white/10 p-5 lg:flex-row"><div className="relative flex-1"><FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student, email, programme or batch" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 py-3 pl-11 pr-4 text-sm text-white outline-none" /></div><div className="relative min-w-64"><select value={filter} onChange={(event) => setFilter(event.target.value)} className="w-full appearance-none rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 pr-10 text-sm text-slate-200"><option value="all">All lifecycle states</option>{STATES.slice(0, -1).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><FaChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-600" /></div></div>
        {loading ? <div className="grid min-h-80 place-items-center text-sm text-slate-500">Loading secure student records…</div> : visible.length === 0 ? <div className="grid min-h-80 place-items-center px-6 text-center"><div><FaUserGraduate className="mx-auto text-4xl text-slate-700" /><p className="mt-4 font-bold text-slate-300">No students match this view</p><p className="mt-1 text-sm text-slate-600">Finance-cleared students will appear here automatically.</p></div></div> : <div className="divide-y divide-white/[0.07]">{visible.map((student) => <article key={student.id} className="grid gap-5 p-5 transition hover:bg-white/[0.025] xl:grid-cols-[1.4fr_1fr_1fr_1fr_auto] xl:items-center">
          <div className="flex min-w-0 items-center gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-violet-300/20 bg-gradient-to-br from-violet-500/25 to-cyan-400/10 text-violet-100"><FaUserGraduate /></div><div className="min-w-0"><p className="truncate font-black text-white">{student.name || "Student"}</p><p className="mt-1 truncate text-xs text-slate-500">{student.email || "Email unavailable"}</p></div></div>
          <div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">Programme</p><p className="mt-1 text-sm font-semibold text-slate-300">{student.course || "Not assigned"}</p></div><div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">Firebase batch</p><select value={selectedBatchIds[student.id] ?? student.batchId ?? (batches.some((batch) => batch.id === student.batch) ? student.batch : "")} onChange={(event) => setSelectedBatchIds((current) => ({ ...current, [student.id]: event.target.value }))} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs font-bold text-slate-200"><option value="">Select active batch</option>{batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.id} — {batch.batchName || "Unnamed batch"}</option>)}</select><p className="mt-1 text-[10px] text-slate-600">{student.batchName || "Required before LMS activation"}</p></div><div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">Finance</p><p className="mt-1 text-sm font-bold text-emerald-300">{student.financeClearanceStatus === "verified" ? "Verified" : "Pending"}</p><p className="mt-1 text-[11px] text-slate-600">{student.paymentStatus || "Payment status pending"}</p></div>
          <div className="min-w-[230px]"><span className={`mb-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${tone(student)}`}>{student.lmsAccess ? <FaCheck /> : <FaLock />}{student.status || "Awaiting LMS Access"}</span><select disabled={savingId === student.id} value={stateKey(student)} onChange={(event) => changeLifecycle(student, event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-xs font-bold text-slate-200 disabled:opacity-50">{STATES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        </article>)}</div>}
      </section>
      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.06] p-4 text-xs leading-5 text-slate-400"><FaShieldAlt className="mt-0.5 shrink-0 text-cyan-300" /><p>Lifecycle changes are server-enforced, synchronized with Firebase Authentication, and recorded in an audit trail. Finance and payment records are never deleted.</p></div>
    </main>
    <ManualAdmissionModal open={manualOpen} busy={manualBusy} error={manualError} catalogLoading={catalogLoading} catalogError={catalogError} courses={courses} batches={batches} onClose={() => !manualBusy && setManualOpen(false)} onSubmit={submitManual} />
  </div>;
}
