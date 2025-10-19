import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const apiKey = import.meta.env.fire_base_apiKey

const firebaseConfig = {
  apiKey: "AIzaSyCk9k7F32SVanJrk58yrllogHqY7x5JHXo",
  authDomain: "pitchcraft-44ece.firebaseapp.com",
  projectId: "pitchcraft-44ece",
  storageBucket: "pitchcraft-44ece.firebasestorage.app",
  messagingSenderId: "1035176254737",
  appId: "1:1035176254737:web:d97517d6faf54ef52880b0",
  measurementId: "G-JZX1D3T6XW"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
