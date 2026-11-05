// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD3rcHgc1TaTahxlJEFB8fADWI9bipujfY",
  authDomain: "ubercloneconductor-e6b33.firebaseapp.com",
  projectId: "ubercloneconductor-e6b33",
  storageBucket: "ubercloneconductor-e6b33.firebasestorage.app",
  messagingSenderId: "18539783878",
  appId: "1:18539783878:web:4d2884f39a1e27ca2219c7",
  measurementId: "G-G795J1GNSG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);