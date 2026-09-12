import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD1e2mgsT3U0B4Mydn6zrLh7RWjQc5cjYs",
  authDomain: "red-sync-7c1d0.firebaseapp.com",
  projectId: "red-sync-7c1d0",
  storageBucket: "red-sync-7c1d0.firebasestorage.app",
  messagingSenderId: "444824620305",
  appId: "1:444824620305:web:fb4126d81f7c1c5c55d0b0",
  measurementId: "G-DX6Z742VKT"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);