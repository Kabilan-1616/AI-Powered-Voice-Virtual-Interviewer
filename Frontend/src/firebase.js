import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "[GCP_API_KEY]",
  authDomain: "ai-interview-bot-5608f.firebaseapp.com",
  projectId: "ai-interview-bot-5608f",
  storageBucket: "ai-interview-bot-5608f.firebasestorage.app",
  messagingSenderId: "636082244148",
  appId: "1:636082244148:web:c878684eef4e76e58c9861"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);