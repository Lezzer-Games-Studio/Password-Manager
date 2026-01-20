// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
// ПЕРЕВІРТЕ ЦЕЙ ІМПОРТ: нам потрібна функція initializeFirestore
import { initializeFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyA41V-D1nxs7_rOloAV3CjzAVG8Y8atF90",
    authDomain: "manager-password-f7812.firebaseapp.com",
    projectId: "manager-password-f7812",
    storageBucket: "manager-password-f7812.firebasestorage.app",
    messagingSenderId: "290607610660",
    appId: "1:290607610660:web:414f022122f7c9e4de11b1",
    measurementId: "G-JPH5HF39ER"
};

const app = initializeApp(firebaseConfig);

// ЗАМІСТЬ getFirestore(app) ПИШЕМО ЦЕ:
export const db = initializeFirestore(app, {
    experimentalForceLongPolling: true, // Це виправить помилку 400 в Electron
});

export const auth = getAuth(app);
