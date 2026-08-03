import {
    doc,
    setDoc,
    updateDoc,
    addDoc,
    collection,
    serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";

/*
----------------------------------------------------
Update Student
----------------------------------------------------
*/

export const updateStudentAdmission = async (
    student,
    admission
) => {

    await updateDoc(doc(db, "students", student.id), {
    status: "Fee Pending",

    course: admission.course,

    batchId: admission.batchId,

    batchName: admission.batchName || "",

    updatedAt: serverTimestamp(),
});

};


/*
----------------------------------------------------
Finance Record
----------------------------------------------------
*/

export const createFinanceRecord = async (
    student,
    admission
) => {
    const finalFee =
    Number(admission.agreedFee) -
    Number(admission.discount);

    await setDoc(
        doc(db, "finance", student.id),

        {

            studentId: student.id,

            studentName: student.name,

            studentEmail: student.email,

            course: admission.course,

            batch: admission.batchName,

            agreedFee: Number(admission.agreedFee),

discount: Number(admission.discount),

finalFee: finalFee,

amountPaid: Number(admission.initialDeposit),

balanceAmount:
    finalFee -
    Number(admission.initialDeposit),

            paymentPlan: admission.paymentPlan,

            paymentStatus:

                Number(admission.initialDeposit) > 0

                    ? "Partially Paid"

                    : "Pending",

            paymentProofUploaded: false,

            paymentProofUrl: "",

            createdAt: serverTimestamp(),

            updatedAt: serverTimestamp(),

        }

    );

};


/*
----------------------------------------------------
Initial Payment
----------------------------------------------------
*/

export const createInitialPaymentRecord = async (
    student,
    admission
) => {

    if (Number(admission.initialDeposit) <= 0) {
        return;
    }

    await addDoc(
        collection(db, "payments"),
        {

            studentId: student.id,

            studentName: student.name,

            studentEmail: student.email,

            amount: Number(admission.initialDeposit),

            paymentType: "Admission Fee",

            paymentMode: admission.paymentMode || "Offline",

            paymentStatus: "Pending Verification",

            transactionId: "",

            verificationRemarks: "",

            verified: false,

            createdAt: serverTimestamp(),

        }
    );

};



/*
----------------------------------------------------
Master Function
----------------------------------------------------
*/

export const completeAdmission = async (
    student,
    admission
) => {

    await updateStudentAdmission(
    student,
    admission
);

await createFinanceRecord(
    student,
    admission
);
await createInitialPaymentRecord(
    student,
    admission
);

};