import { useEffect, useState } from "react";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { createStudentAnalytics } from "../utils/createStudentAnalytics";

export default function AssignBatch() {
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);

  useEffect(() => {
    fetchStudents();
    fetchBatches();
  }, []);

  const fetchStudents = async () => {
    const snapshot = await getDocs(
      collection(db, "students")
    );

    const studentList = [];

    snapshot.forEach((docItem) => {
      studentList.push({
        id: docItem.id,
        ...docItem.data(),
      });
    });

    setStudents(studentList);
  };

  const fetchBatches = async () => {
    const snapshot = await getDocs(
      collection(db, "batches")
    );

    const batchList = [];

    snapshot.forEach((docItem) => {
      batchList.push({
    id: docItem.id,
    batchId: docItem.id,
    ...docItem.data(),
});
    });

    setBatches(batchList);
  };

  const assignBatch = async (
  studentId,
  batchId
) => {

  const selectedBatch = batches.find(
    (batch) => batch.batchId === batchId
);

  if (!selectedBatch) {
    alert("Batch not found");
    return;
  }

  await updateDoc(
  doc(db, "students", studentId),
  {
    batchId: selectedBatch.batchId,
    batchName: selectedBatch.batchName,
    course: selectedBatch.course,
    startDate: selectedBatch.startDate,
    endDate: selectedBatch.endDate,
  }
);
  const studentRef = doc(db, "students", studentId);

const studentSnap = await getDoc(studentRef);

const student = studentSnap.data();
await createStudentAnalytics(student);

  alert("Batch Assigned Successfully");

  fetchStudents();
};

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-8 text-white shadow-[0_25px_80px_rgba(15,23,42,0.18)] md:px-9 md:py-10">
          <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="absolute -bottom-32 left-1/4 h-72 w-72 rounded-full bg-violet-600/20 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">Academic Management • Cohort Operations</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">Assign Batch</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">Move approved students into the right learning cohort while keeping the existing student and analytics update workflow intact.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:min-w-[300px]">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl"><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Students</div><div className="mt-2 text-2xl font-black">{students.filter((student) => student.approved === true).length}</div></div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl"><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Batches</div><div className="mt-2 text-2xl font-black">{batches.length}</div></div>
            </div>
          </div>
        </section>

        <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] md:p-7">
          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600">Approved learners</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">Cohort assignment workspace</h2>
              <p className="mt-1 text-sm text-slate-500">Select a batch directly on each student card.</p>
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">{students.filter((student) => student.approved === true).length} active records</div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {students.filter((student) => student.approved === true).map((student) => {
              const assigned = Boolean(student.batchId);
              return (
                <article key={student.id} className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_20px_55px_rgba(15,23,42,0.10)]">
                  <div className="h-1.5 bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400" />
                  <div className="p-5 md:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 text-sm font-black text-white">{(student.name || 'S').charAt(0).toUpperCase()}</div>
                          <div className="min-w-0"><h3 className="truncate text-lg font-black text-slate-950">{student.name || 'Unnamed Student'}</h3><p className="truncate text-xs text-slate-500">{student.email}</p></div>
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${assigned ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{assigned ? 'Assigned' : 'Pending'}</span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-slate-50 p-4"><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Current batch</div><div className="mt-1 truncate text-sm font-black text-slate-800">{student.batchName || 'Not Assigned'}</div></div>
                      <div className="rounded-2xl bg-slate-50 p-4"><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Course</div><div className="mt-1 truncate text-sm font-black text-slate-800">{student.course || '—'}</div></div>
                    </div>

                    <label className="mt-5 block"><span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">Assign to batch</span><select value={student.batchId || ''} onChange={(e) => assignBatch(student.id, e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-50"><option value="">Select Batch</option>{batches.map((batch) => (<option key={batch.id} value={batch.batchId}>{batch.batchName}</option>))}</select></label>
                  </div>
                </article>
              );
            })}
          </div>

          {students.filter((student) => student.approved === true).length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center"><div className="text-4xl">◌</div><h3 className="mt-4 text-lg font-black text-slate-900">No approved students</h3><p className="mt-2 text-sm text-slate-500">Approved student records will appear here for cohort assignment.</p></div>
          )}
        </div>
      </div>
    </div>
  );

}