import { Navigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useState, useEffect } from "react";
import { db } from "../firebase/firebaseConfig";

export default function ProtectedRoute({ children }) {

    const auth = getAuth();

    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {

            if (!currentUser) {
                setAuthorized(false);
                setLoading(false);
                return;
            }

            try {

                const studentRef = doc(db, "students", currentUser.uid);

                const studentSnap = await getDoc(studentRef);

                if (!studentSnap.exists()) {
                    setAuthorized(false);
                    setLoading(false);
                    return;
                }

                const student = studentSnap.data();

                if (
                    student.approved === true &&
                    student.lmsAccess === true
                ) {
                    setAuthorized(true);
                } else {
                    setAuthorized(false);
                }

            } catch (error) {

                console.error(error);
                setAuthorized(false);

            }

            setLoading(false);

        });

        return () => unsubscribe();

    }, []);

    if (loading) {

        return (
            <div className="min-h-screen flex justify-center items-center">
                Loading...
            </div>
        );

    }

    if (!authorized) {

        return (
            <Navigate
                to="/login"
                replace
            />
        );

    }

    return children;

}