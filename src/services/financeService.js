import {
    collection,
    doc,
    getDocs,
    getDoc,
    query,
    where,
    updateDoc
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";
export async function getPendingPayments() {

    const q = query(
        collection(db, "payments"),
        where("paymentStatus", "==", "Pending")
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

}