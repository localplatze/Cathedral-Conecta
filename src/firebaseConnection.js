import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getDatabase, ref, set, serverTimestamp } from 'firebase/database';
import {getStorage} from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyBd0eQg2SORLk0YyTbqCgWvnkBv8WycsA4",
  authDomain: "cathedralconecta.firebaseapp.com",
  databaseURL: "https://cathedralconecta-default-rtdb.firebaseio.com",
  projectId: "cathedralconecta",
  storageBucket: "cathedralconecta.firebasestorage.app",
  messagingSenderId: "607866866368",
  appId: "1:607866866368:web:09c800f276ae8a6b7e7b25",
  measurementId: "G-2TGNQWCQY5"
};

const FIREBASE_APP = initializeApp(firebaseConfig);
const FIREBASE_AUTH = initializeAuth(FIREBASE_APP, {persistence: getReactNativePersistence(AsyncStorage)});
const FIREBASE_DB = getDatabase(FIREBASE_APP);
const FIREBASE_STORAGE = getStorage(FIREBASE_APP);

export { FIREBASE_AUTH, FIREBASE_DB, FIREBASE_STORAGE };