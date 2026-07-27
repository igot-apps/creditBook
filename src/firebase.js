import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// 👇 PASTE YOUR ACTUAL FIREBASE CONFIG HERE
const firebaseConfig = {
  apiKey: "AIzaSyAmF79_fPWPKkq3Wp2NbHsCCB13YiQHWkE",
  authDomain: "creditbook-e927f.firebaseapp.com",
  projectId: "creditbook-e927f",
  storageBucket: "creditbook-e927f.firebasestorage.app",
  messagingSenderId: "787454711698",
  appId: "1:787454711698:web:22c2b3e19804abe49bd34b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);