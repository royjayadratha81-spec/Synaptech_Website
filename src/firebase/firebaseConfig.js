import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAnpM6f6lrHYBYP1v57ccVGTMp506IX0M8",
  authDomain: "synaptech-new-web.firebaseapp.com",
  projectId: "synaptech-new-web",
  storageBucket: "synaptech-new-web.firebasestorage.app",
  messagingSenderId: "898312182556",
  appId: "1:898312182556:web:77cb8c0c7c7c41068178d9",
  measurementId: "G-RB6S3WM8XD"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };