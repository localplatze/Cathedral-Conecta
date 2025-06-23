import { initializeApp } from "firebase/app";
import { Platform } from 'react-native'; // Importa a API de Plataforma do React Native
import { 
  getAuth,                          // Usado para a web
  initializeAuth,                   // Usado para mobile com persistência customizada
  getReactNativePersistence         // O mecanismo de persistência do mobile
} from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Suas credenciais não mudam
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

// Essas inicializações são universais e não mudam
const FIREBASE_APP = initializeApp(firebaseConfig);
const FIREBASE_DB = getDatabase(FIREBASE_APP);
const FIREBASE_STORAGE = getStorage(FIREBASE_APP);

// --- AQUI ESTÁ A LÓGICA DA CORREÇÃO ---
// Criamos uma variável 'auth' que será preenchida condicionalmente
let auth;

if (Platform.OS === 'web') {
  // Para a WEB, usamos a função getAuth(), que já lida com a persistência
  // do navegador (localStorage) por padrão.
  auth = getAuth(FIREBASE_APP);
} else {
  // Para NATIVE (iOS/Android), usamos a sua configuração original
  // com a persistência do AsyncStorage.
  auth = initializeAuth(FIREBASE_APP, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
}

// Exportamos a instância correta do Auth, junto com os outros serviços
export const FIREBASE_AUTH = auth;
export { FIREBASE_DB, FIREBASE_STORAGE };