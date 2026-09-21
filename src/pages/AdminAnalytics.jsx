import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { useNavigate } from "react-router-dom";
import { getAdmissionsOverview } from "../platform/services/admissionsApi";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";
import { FaArrowLeft, FaUsers, FaUserCheck, FaUserClock, FaUserTimes, FaSyncAlt, FaExclamationTriangle, FaWallet, FaReceipt, FaChartLine, FaShieldAlt } from "react-icons/fa";

const safeNumber = (v) => {
  const number = Number(v);
  return Number.isFinite(number) ? number : 0;
};
const money = (v) => `₹${safeNumber(v).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const normalized = (v) => String(v || "").trim().toLowerCase();
const hasOwn = (record, key) => Object.prototype.hasOwnProperty.call(record || {}, key);
const uniqueValues = (values) => [...new Set(values.map(normalized).filter(Boolean))];
const identityValues = (record) => uniqueValues([
  record?.id,
  record?.studentId,
  record?.student_id,
  record?.firebaseUid,
  record?.firebase_uid,
  record?.firebaseUidReserved,
  record?.firebase_uid_reserved,
  record?.lmsStudentReference,
  record?.lms_student_reference,
  record?.userId,
  record?.uid,
]);
const emailValues = (record) => uniqueValues([
  record?.email,
  record?.studentEmail,
  record?.student_email,
  record?.admissionEmail,
  record?.contactEmail,
]);
const hasExplicitStudentFinanceClearance = (record) =>
  hasOwn(record, "financeClearanceStatus") ||
  hasOwn(record, "clearanceStatus") ||
  hasOwn(record, "financeVerified");
const hasExplicitFinanceAccountClearance = (record) =>
  hasExplicitStudentFinanceClearance(record) ||
  hasOwn(record, "verified");
const hasVerifiedFinanceStatus = (record) => {
  const status = normalized(
    record?.financeClearanceStatus ||
    record?.clearanceStatus
  );

  return (
    record?.financeVerified === true ||
    ["verified", "cleared", "finance_verified"].includes(status)
  );
};
const isFinanceAccountVerified = (record) =>
  record?.verified === true || hasVerifiedFinanceStatus(record);
const dateValue = (v) => {
  if (!v) return null;
  if (typeof v?.toDate === "function") return v.toDate();
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

function Kpi({ label, value, sub, icon, tone }) {
  return <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_14px_45px_rgba(15,23,42,.06)]">
    <div className="flex items-start justify-between"><div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>{icon}</div><span className="text-[9px] font-black tracking-[.18em] text-slate-300">LIVE</span></div>
    <p className="mt-5 text-[10px] font-black uppercase tracking-[.18em] text-slate-400">{label}</p>
    <p className="mt-1 text-3xl font-black tracking-tight text-slate-900">{value}</p>
    <p className="mt-1 text-xs text-slate-500">{sub}</p>
  </div>;
}

const Panel = ({ eyebrow, title, children, className="" }) => <section className={`rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,.065)] md:p-7 ${className}`}>
  <p className="text-[10px] font-black tracking-[.22em] text-blue-600">{eyebrow}</p>
  <h2 className="mt-1 text-xl font-black text-slate-900 md:text-2xl">{title}</h2>
  {children}
</section>;

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [rejected, setRejected] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [modules, setModules] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [mcqTests, setMcqTests] = useState([]);
  const [mcqResults, setMcqResults] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [finance, setFinance] = useState([]);
  const [payments, setPayments] = useState([]);
  const [studentAnalytics, setStudentAnalytics] = useState([]);
  const [admissions, setAdmissions] = useState(null);
  const [admissionsError, setAdmissionsError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const read = async (name) => {
      try {
        const snap = await getDocs(collection(db, name));
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch {
        return [];
      }
    };
    setAdmissionsError(null);
    const admissionsRequest = (async () => {
      try {
        return await getAdmissionsOverview();
      } catch (firstError) {
        if (Number(firstError?.statusCode) === 401) {
          try {
            return await getAdmissionsOverview({ forceRefresh: true });
          } catch (retryError) {
            setAdmissionsError({
              message: retryError?.message || "Admissions analytics are unavailable for this account.",
              statusCode: Number(retryError?.statusCode) || 0,
            });
            return null;
          }
        }

        setAdmissionsError({
          message: firstError?.message || "Admissions analytics are unavailable for this account.",
          statusCode: Number(firstError?.statusCode) || 0,
        });
        return null;
      }
    })();
    const [
      st, rej, cr, ba, mo, asg, sub, tests, results, sessions, recs,
      financeRows, paymentRows, analyticsRows, admissionsOverview
    ] = await Promise.all([
      read("students"), read("rejectedStudents"), read("courses"), read("batches"),
      read("modules"), read("assignments"), read("submissions"), read("mcqTests"),
      read("mcqResults"), read("liveSessions"), read("recordedSessions"),
      read("finance"), read("payments"), read("studentAnalytics"), admissionsRequest
    ]);
    setStudents(st); setRejected(rej); setCourses(cr); setBatches(ba); setModules(mo);
    setAssignments(asg); setSubmissions(sub); setMcqTests(tests); setMcqResults(results);
    setLiveSessions(sessions); setRecordings(recs);
    setFinance(financeRows); setPayments(paymentRows); setStudentAnalytics(analyticsRows);
    setAdmissions(admissionsOverview);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const approved = students.filter((s) => s.approved === true).length;
  const pending = students.filter((s) => !s.approved).length;
  const active = students.filter((s) => String(s.status || "").toLowerCase() === "active").length;
  const awaitingLms = students.filter((s) => String(s.status || "").toLowerCase() === "awaiting lms access").length;
  const deniedLms = students.filter((s) => String(s.status || "").toLowerCase().includes("denied")).length;
  const completed = students.filter((s) => String(s.status || "").toLowerCase() === "completed").length;
  const alumni = students.filter((s) => String(s.status || "").toLowerCase() === "alumni").length;
  const approvalRate = students.length ? Math.round((approved / students.length) * 100) : 0;

  const financeSummary = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let expected = 0;
    let collected = 0;
    let outstanding = 0;
    let overdueInstallments = 0;
    let configuredPlans = 0;

    finance.forEach((account) => {
      const agreedFee = safeNumber(account.agreedFee);
      const discount = safeNumber(account.discount);
      const finalFee = account.finalFee === null || account.finalFee === undefined
        ? Math.max(0, agreedFee - discount)
        : safeNumber(account.finalFee);
      const amountPaid = safeNumber(account.amountPaid);
      const balance = account.balanceAmount === null || account.balanceAmount === undefined
        ? Math.max(0, finalFee - amountPaid)
        : Math.max(0, safeNumber(account.balanceAmount));

      expected += finalFee;
      collected += amountPaid;
      outstanding += balance;

      const installments = Array.isArray(account.installments) ? account.installments : [];
      if (installments.length) configuredPlans += 1;
      installments.forEach((installment) => {
        const dueDate = dateValue(installment.dueDate);
        if (dueDate) dueDate.setHours(0, 0, 0, 0);
        if (dueDate && dueDate < today && normalized(installment.status) !== "paid") {
          overdueInstallments += 1;
        }
      });
    });

    const verifiedPayments = payments.filter((payment) => payment.verified === true);
    const pendingReceipts = payments.filter((payment) =>
      payment.verified !== true && normalized(payment.paymentStatus) !== "verified"
    ).length;

    return {
      expected,
      collected,
      outstanding,
      overdueInstallments,
      configuredPlans,
      verifiedTransactions: verifiedPayments.length,
      pendingReceipts,
      collectionRate: expected ? Math.round((collected / expected) * 100) : 0,
      paidAccounts: finance.filter((account) => normalized(account.paymentStatus) === "paid").length,
      partialAccounts: finance.filter((account) => normalized(account.paymentStatus) === "partially paid").length,
      unpaidAccounts: finance.filter((account) => safeNumber(account.amountPaid) === 0).length,
    };
  }, [finance, payments]);

  const admissionsSummary = useMemo(() => {
    const applications = Array.isArray(admissions?.applications) ? admissions.applications : [];
    const countStatus = (value) => applications.filter((application) => normalized(application.status) === value).length;
    return {
      candidates: safeNumber(admissions?.summary?.candidate_count),
      applications: safeNumber(admissions?.summary?.application_count),
      crmWon: applications.filter((application) => normalized(application.intake_route) === "crm_won").length,
      manual: applications.filter((application) => normalized(application.intake_route) === "manual").length,
      financePending: countStatus("finance_pending"),
      admitted: countStatus("admitted"),
    };
  }, [admissions]);

  const analyticsEmails = useMemo(() => new Set(studentAnalytics.flatMap((row) => [
    normalized(row.id), normalized(row.email), normalized(row.studentEmail)
  ]).filter(Boolean)), [studentAnalytics]);

  const financeIntegrity = useMemo(() => {
    const studentRecords = students.map((student) => ({
      student,
      ids: new Set(identityValues(student)),
      emails: new Set(emailValues(student)),
      accounts: [],
    }));

    let unmatchedFinanceAccounts = 0;

    finance.forEach((account) => {
      const accountIds = identityValues(account);
      const accountEmails = emailValues(account);
      const matches = studentRecords.filter((entry) =>
        accountIds.some((value) => entry.ids.has(value)) ||
        accountEmails.some((value) => entry.emails.has(value))
      );

      if (!matches.length) {
        unmatchedFinanceAccounts += 1;
        return;
      }

      matches.forEach((entry) => entry.accounts.push(account));
    });

    let explicitLmsAccessViolations = 0;
    let legacyFinanceUnclassified = 0;

    studentRecords.forEach(({ student, accounts }) => {
      if (student.lmsAccess !== true) return;

      const verified =
        hasVerifiedFinanceStatus(student) ||
        accounts.some(isFinanceAccountVerified);

      if (verified) return;

      const hasExplicitStatus =
        hasExplicitStudentFinanceClearance(student) ||
        accounts.some(hasExplicitFinanceAccountClearance);

      if (hasExplicitStatus) {
        explicitLmsAccessViolations += 1;
      } else {
        legacyFinanceUnclassified += 1;
      }
    });

    return {
      explicitLmsAccessViolations,
      legacyFinanceUnclassified,
      unmatchedFinanceAccounts,
    };
  }, [students, finance]);

  const activeStudents = students.filter((student) => normalized(student.status) === "active");
  const activeWithoutBatch = activeStudents.filter((student) => !student.batchId).length;
  const activeWithoutAnalytics = activeStudents.filter((student) => {
    const email = normalized(student.email);
    return email && !analyticsEmails.has(email);
  }).length;
  const financeClearedAccounts = finance.filter(isFinanceAccountVerified).length;

  const financeMix = useMemo(() => [
    { name: "Collected", value: financeSummary.collected },
    { name: "Outstanding", value: financeSummary.outstanding },
  ].filter((item) => item.value > 0), [financeSummary.collected, financeSummary.outstanding]);

  const admissionsFunnel = useMemo(() => {
    const liveStages = [];

    if (admissions) {
      liveStages.push(
        { name: "Candidates", value: admissionsSummary.candidates },
        { name: "Applications", value: admissionsSummary.applications }
      );
    }

    liveStages.push(
      { name: "Finance cleared", value: financeClearedAccounts },
      { name: "Active LMS", value: active }
    );

    return liveStages;
  }, [admissions, admissionsSummary, financeClearedAccounts, active]);

  // `rejectedStudents` is a separate historical/archive collection. It must
  // not be added to the live `students` population or the approval chart would
  // report a denominator larger than Total students.
  const studentStatus = useMemo(() => [
    { name: "Approved", value: approved },
    { name: "Pending", value: pending },
  ].filter(x => x.value > 0), [approved, pending]);

  const operational = [
    { name: "Students", value: students.length },
    { name: "Courses", value: courses.length },
    { name: "Batches", value: batches.length },
    { name: "Modules", value: modules.length },
    { name: "Assignments", value: assignments.length },
    { name: "Submissions", value: submissions.length },
    { name: "Mini Tests", value: mcqTests.length },
    { name: "Live Sessions", value: liveSessions.length },
    { name: "Recordings", value: recordings.length },
    { name: "Finance Accounts", value: finance.length },
    { name: "Payment Ledger", value: payments.length }
  ];

  const activity = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - (6-i));
      return { date: d, name: d.toLocaleDateString("en-IN", { day:"2-digit", month:"short" }), Students:0, Submissions:0, Sessions:0 };
    });
    students.forEach(s => { const d=dateValue(s.createdAt || s.registeredAt); if(!d)return; const x=days.find(y=>y.date.toDateString()===d.toDateString()); if(x)x.Students++; });
    submissions.forEach(s => { const d=dateValue(s.submittedAt || s.createdAt); if(!d)return; const x=days.find(y=>y.date.toDateString()===d.toDateString()); if(x)x.Submissions++; });
    liveSessions.forEach(s => { const d=dateValue(s.startTime || s.scheduledAt || s.createdAt); if(!d)return; const x=days.find(y=>y.date.toDateString()===d.toDateString()); if(x)x.Sessions++; });
    return days;
  }, [students, submissions, liveSessions]);

  const redFlags = [
    awaitingLms > 0 && { label: `${awaitingLms} finance-cleared student${awaitingLms > 1 ? "s" : ""} awaiting LMS activation`, severity: "Provisioning", action: "Open Student Operations" },
    pending > 0 && { label: `${pending} student${pending > 1 ? "s" : ""} awaiting approval`, severity: "Attention", action: "Review Student Management" },
    financeSummary.pendingReceipts > 0 && { label: `${financeSummary.pendingReceipts} payment receipt${financeSummary.pendingReceipts > 1 ? "s" : ""} awaiting Finance verification`, severity: "Finance", action: "Open Finance Dashboard" },
    financeSummary.overdueInstallments > 0 && { label: `${financeSummary.overdueInstallments} overdue EMI milestone${financeSummary.overdueInstallments > 1 ? "s" : ""}`, severity: "Collections", action: "Review Finance schedules" },
    activeWithoutBatch > 0 && { label: `${activeWithoutBatch} active student${activeWithoutBatch > 1 ? "s have" : " has"} no batch assignment`, severity: "Data quality", action: "Open Student Operations" },
    activeWithoutAnalytics > 0 && { label: `${activeWithoutAnalytics} active student${activeWithoutAnalytics > 1 ? "s are" : " is"} missing an analytics profile`, severity: "Analytics", action: "Review analytics initialization" },
    financeIntegrity.explicitLmsAccessViolations > 0 && { label: `${financeIntegrity.explicitLmsAccessViolations} LMS-enabled student${financeIntegrity.explicitLmsAccessViolations > 1 ? "s have" : " has"} an explicit non-verified Finance state`, severity: "Critical control", action: "Review immediately" },
    financeIntegrity.legacyFinanceUnclassified > 0 && { label: `${financeIntegrity.legacyFinanceUnclassified} LMS-enabled legacy student${financeIntegrity.legacyFinanceUnclassified > 1 ? "s have" : " has"} no canonical Finance-clearance marker`, severity: "Compatibility review", action: "Classify before treating as a violation" },
    financeIntegrity.unmatchedFinanceAccounts > 0 && { label: `${financeIntegrity.unmatchedFinanceAccounts} Finance account${financeIntegrity.unmatchedFinanceAccounts > 1 ? "s do" : " does"} not match a student by UID, student reference, or email`, severity: "Data integrity", action: "Review Finance records" },
    assignments.length > 0 && submissions.length === 0 && { label: "No assignment submissions are currently recorded", severity: "Watch", action: "Review Submissions" },
    liveSessions.filter(s => !dateValue(s.startTime || s.scheduledAt)).length > 0 && { label: "Some live-session records have no recognised schedule date", severity: "Data quality", action: "Review Live Sessions" },
  ].filter(Boolean);

  return <div className="min-h-screen bg-[#f4f7fb] px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
    <div className="mx-auto max-w-[1750px] space-y-6">
      <header className="relative overflow-hidden rounded-[32px] bg-slate-950 p-7 text-white shadow-[0_25px_80px_rgba(15,23,42,.20)] md:p-9">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl"/><div className="absolute -bottom-36 left-1/3 h-80 w-80 rounded-full bg-violet-500/15 blur-3xl"/>
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div><button onClick={()=>navigate("/admin")} className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold text-slate-300"><FaArrowLeft/> Admin Console</button>
            <p className="text-[10px] font-black tracking-[.25em] text-blue-300">EXECUTIVE ANALYTICS</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">Admin Analytics Command Centre</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">Read-only institutional intelligence from the existing LMS, Finance and payment collections, with the secured tenant Admissions overview. No operational record is modified.</p>
          </div>
          <button onClick={load} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-900"><FaSyncAlt className={loading?"animate-spin":""}/> Refresh data</button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Total students" value={students.length} sub="Registered student records" icon={<FaUsers/>} tone="bg-blue-50 text-blue-700"/>
        <Kpi label="Approved" value={approved} sub={`${approvalRate}% approval rate`} icon={<FaUserCheck/>} tone="bg-emerald-50 text-emerald-700"/>
        <Kpi label="Pending" value={pending} sub="Requires administrative review" icon={<FaUserClock/>} tone="bg-amber-50 text-amber-700"/>
        <Kpi label="Rejected archive" value={rejected.length} sub="Separate historical records" icon={<FaUserTimes/>} tone="bg-rose-50 text-rose-700"/>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Final fee value" value={money(financeSummary.expected)} sub={`${finance.length} canonical Finance accounts`} icon={<FaWallet/>} tone="bg-emerald-50 text-emerald-700"/>
        <Kpi label="Revenue collected" value={money(financeSummary.collected)} sub={`${financeSummary.collectionRate}% of final payable fees`} icon={<FaChartLine/>} tone="bg-cyan-50 text-cyan-700"/>
        <Kpi label="Outstanding balance" value={money(financeSummary.outstanding)} sub={`${financeSummary.partialAccounts} partial • ${financeSummary.unpaidAccounts} unpaid`} icon={<FaReceipt/>} tone="bg-amber-50 text-amber-700"/>
        <Kpi label="Receipts awaiting review" value={financeSummary.pendingReceipts} sub={`${financeSummary.verifiedTransactions} verified ledger transactions`} icon={<FaShieldAlt/>} tone="bg-violet-50 text-violet-700"/>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <Panel eyebrow="ADMISSIONS TO LMS" title="Controlled conversion funnel">
          {admissionsError ? <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-base leading-6 text-amber-900">
            <strong>Admissions view unavailable:</strong> {admissionsError.message} Existing LMS and Finance analytics remain available; unavailable Admissions stages are omitted rather than shown as zero.
            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={() => navigate("/admin-login", { state: { from: "/admin-analytics" } })} className="rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-black text-white">Re-authenticate Admin</button>
              <button onClick={() => navigate("/platform-session-check")} className="rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-black text-amber-900">Verify platform access</button>
            </div>
          </div> : null}
          <div className="mt-6 h-[300px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={admissionsFunnel}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="value" fill="#059669" radius={[9,9,0,0]}/></BarChart></ResponsiveContainer></div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-2xl bg-blue-50 p-4"><p className="text-xs font-bold text-blue-700">CRM Won intake</p><p className="mt-1 text-2xl font-black">{admissions ? admissionsSummary.crmWon : "—"}</p></div><div className="rounded-2xl bg-violet-50 p-4"><p className="text-xs font-bold text-violet-700">Manual intake</p><p className="mt-1 text-2xl font-black">{admissions ? admissionsSummary.manual : "—"}</p></div><div className="rounded-2xl bg-amber-50 p-4"><p className="text-xs font-bold text-amber-700">Finance pending</p><p className="mt-1 text-2xl font-black">{admissions ? admissionsSummary.financePending : "—"}</p></div><div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-bold text-emerald-700">Admitted</p><p className="mt-1 text-2xl font-black">{admissions ? admissionsSummary.admitted : "—"}</p></div></div>
        </Panel>
        <Panel eyebrow="FINANCIAL POSITION" title="Collected versus outstanding">
          <div className="mt-4 h-[250px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={financeMix} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={4}>{financeMix.map((_,i)=><Cell key={i} fill={["#10b981","#f59e0b"][i%2]}/>)}</Pie><Tooltip formatter={(value)=>money(value)}/><Legend/></PieChart></ResponsiveContainer></div>
          <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-bold text-emerald-700">Paid accounts</p><p className="mt-1 text-2xl font-black">{financeSummary.paidAccounts}</p></div><div className="rounded-2xl bg-amber-50 p-4"><p className="text-xs font-bold text-amber-700">Payment plans</p><p className="mt-1 text-2xl font-black">{financeSummary.configuredPlans}</p></div><div className="rounded-2xl bg-rose-50 p-4"><p className="text-xs font-bold text-rose-700">Overdue milestones</p><p className="mt-1 text-2xl font-black">{financeSummary.overdueInstallments}</p></div><div className="rounded-2xl bg-cyan-50 p-4"><p className="text-xs font-bold text-cyan-700">Analytics profiles</p><p className="mt-1 text-2xl font-black">{studentAnalytics.length}</p></div></div>
        </Panel>
      </div>

      <section className="overflow-hidden rounded-[28px] border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/60 to-amber-50/50 p-6 text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,.08)] md:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black tracking-[.20em] text-emerald-700">LMS PROVISIONING</p><h2 className="mt-1 text-3xl font-black">Controlled student lifecycle</h2><p className="mt-2 text-base text-slate-600">Separate operational signals; existing LMS analytics and lifecycle rules remain unchanged.</p></div><button onClick={()=>navigate("/admin/students")} className="rounded-2xl bg-emerald-700 px-5 py-3 text-base font-black text-white shadow-lg shadow-emerald-700/15">Open Student Operations</button></div>
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">{[
          ["Awaiting access", awaitingLms, "text-amber-700"], ["Active", active, "text-emerald-700"],
          ["Access denied", deniedLms, "text-rose-700"], ["Completed", completed, "text-cyan-700"],
          ["Alumni", alumni, "text-violet-700"],
        ].map(([label,value,color])=><div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase tracking-[.14em] text-slate-500">{label}</p><p className={`mt-2 text-3xl font-black ${color}`}>{value}</p></div>)}</div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <Panel eyebrow="7-DAY OPERATING PULSE" title="Student, submission & session activity">
          <div className="mt-6 h-[320px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={activity}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis allowDecimals={false}/><Tooltip/><Legend/><Line type="monotone" dataKey="Students" stroke="#2563eb" strokeWidth={3}/><Line type="monotone" dataKey="Submissions" stroke="#10b981" strokeWidth={3}/><Line type="monotone" dataKey="Sessions" stroke="#8b5cf6" strokeWidth={3}/></LineChart></ResponsiveContainer></div>
        </Panel>
        <Panel eyebrow="STUDENT HEALTH" title="Current approval distribution">
          <div className="mt-4 h-[260px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={studentStatus} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={4}>{studentStatus.map((_,i)=><Cell key={i} fill={["#2563eb","#f59e0b"][i%2]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div>
          <div className="grid grid-cols-3 gap-2">
            {studentStatus.map((x)=><div key={x.name} className="rounded-2xl bg-slate-50 p-3 text-center"><p className="text-lg font-black text-slate-900">{x.value}</p><p className="text-[10px] font-bold text-slate-500">{x.name}</p></div>)}
            <div className="rounded-2xl bg-rose-50 p-3 text-center"><p className="text-lg font-black text-rose-700">{rejected.length}</p><p className="text-[10px] font-bold text-rose-600">Rejected archive</p></div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Panel eyebrow="INSTITUTIONAL FOOTPRINT" title="Operational volume by function">
          <div className="mt-6 h-[330px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={operational} layout="vertical" margin={{left:20,right:20}}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" allowDecimals={false}/><YAxis type="category" dataKey="name" width={85}/><Tooltip/><Bar dataKey="value" fill="#4f46e5" radius={[0,8,8,0]}/></BarChart></ResponsiveContainer></div>
        </Panel>
        <Panel eyebrow="MANAGEMENT FLAGS" title="What needs attention now">
          <div className="mt-6 space-y-3">
            {redFlags.length ? redFlags.map((f,i)=><div key={i} className="flex gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 p-4"><div className="mt-1 text-amber-600"><FaExclamationTriangle/></div><div><p className="text-sm font-black text-slate-900">{f.label}</p><p className="mt-1 text-xs font-bold text-amber-700">{f.severity} • {f.action}</p></div></div>) : <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5"><p className="font-black text-emerald-800">No immediate red flags detected.</p><p className="mt-1 text-xs text-emerald-700">The current snapshot is within the available data signals.</p></div>}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Course library</p><p className="mt-1 text-2xl font-black">{courses.length}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Learning modules</p><p className="mt-1 text-2xl font-black">{modules.length}</p></div></div>
        </Panel>
      </div>

      <Panel eyebrow="MANAGEMENT REGISTER" title="Live operating data">
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[780px] text-left"><thead><tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400"><th className="p-3">Area</th><th className="p-3">Records</th><th className="p-3">Signal</th></tr></thead><tbody>{operational.map(x=><tr key={x.name} className="border-b border-slate-100"><td className="p-3 text-sm font-bold text-slate-800">{x.name}</td><td className="p-3 text-sm font-black text-slate-900">{x.value}</td><td className="p-3"><span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700">READ-ONLY LIVE</span></td></tr>)}</tbody></table></div>
        <p className="mt-4 text-xs text-slate-400">{lastUpdated ? `Last refreshed ${lastUpdated.toLocaleString("en-IN")}` : "Loading live snapshot…"}</p>
      </Panel>
    </div>
  </div>;
}
