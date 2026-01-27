import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyDk9kQZDtblSb00WAF7GvNi7WiHW-Z8Huc",
    authDomain: "basantikaparivaar.firebaseapp.com",
    projectId: "basantikaparivaar",
    storageBucket: "basantikaparivaar.firebasestorage.app",
    messagingSenderId: "489202827457",
    appId: "1:489202827457:web:3fb4088944a0bfdfc79440",
    measurementId: "G-KEEX91NWBD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, db, analytics, storage };
