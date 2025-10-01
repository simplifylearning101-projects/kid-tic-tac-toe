import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDmpcLO6m1JTffUkFJsqVWHLWXADIKB0n0",
  authDomain: "kid-tic-tac-toe.firebaseapp.com",
  databaseURL: "https://kid-tic-tac-toe-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "kid-tic-tac-toe",
  storageBucket: "kid-tic-tac-toe.firebasestorage.app",
  messagingSenderId: "45800526257",
  appId: "1:45800526257:web:9f1de814b0e1264abd2d90"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getDatabase(app);
