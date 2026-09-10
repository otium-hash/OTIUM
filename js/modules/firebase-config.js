/* =====================================================
   OTIUM - CONFIGURACIÓN FIREBASE
   Versión: 20260903
   Firebase 12.17.1

   Inicializa:
   - Firebase App
   - Firebase Authentication
   - Cloud Firestore
===================================================== */

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


/* =====================================================
   CONFIGURACIÓN DEL PROYECTO
===================================================== */

export const firebaseConfig = {

    apiKey: "AIzaSyAn33voku5AiWtQzIlaSPYKE7Gd4nA-dTI",

    authDomain: "otium-e0e7e.firebaseapp.com",

    projectId: "otium-e0e7e",

    storageBucket: "otium-e0e7e.firebasestorage.app",

    messagingSenderId: "175356882678",

    appId: "1:175356882678:web:65673abbcab96d1e7746d7"

};


/* =====================================================
   INICIALIZAR FIREBASE
===================================================== */

export const app = initializeApp(firebaseConfig);


/* =====================================================
   FIREBASE AUTHENTICATION
===================================================== */

export const auth = getAuth(app);


/* =====================================================
   CLOUD FIRESTORE
===================================================== */

export const db = getFirestore(app);