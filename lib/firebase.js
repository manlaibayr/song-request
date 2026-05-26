// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAvybYGQrfNSrUa6XKLuE7livIqN0TpxzQ",
  authDomain: "song-web-57c64.firebaseapp.com",
  projectId: "song-web-57c64",
  storageBucket: "song-web-57c64.firebasestorage.app",
  messagingSenderId: "96204587589",
  appId: "1:96204587589:web:68ee1562ec830617e7192c",
  measurementId: "G-YTKM05QZLF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);