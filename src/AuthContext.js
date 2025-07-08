import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { FIREBASE_AUTH, FIREBASE_DB } from './firebaseConnection';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(FIREBASE_AUTH, async (firebaseUser) => {
      setIsLoadingAuth(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        await fetchAndSetUserData(firebaseUser.uid, firebaseUser.email);
      } else {
        setUser(null);
        setUserData(null);
        await AsyncStorage.removeItem('appUserData');
      }
      setIsLoadingAuth(false);
    });
    return unsubscribe;
  }, []);

  const fetchAndSetUserData = async (uid, email) => {
    try {
      const userDbRef = ref(FIREBASE_DB, `users/${uid}`);
      const snapshot = await get(userDbRef);
      if (snapshot.exists()) {
        const dbData = snapshot.val();
        const fullUserData = { uid, email, ...dbData };
        setUserData(fullUserData);
        await AsyncStorage.setItem('appUserData', JSON.stringify(fullUserData));
      } else {
        console.warn("Dados do usuário não encontrados no Realtime Database para UID:", uid);
        const minimalUserData = { uid, email, name: FIREBASE_AUTH.currentUser?.displayName || 'Usuário', role: 'unknown', isAdmin: false };
        setUserData(minimalUserData);
        await AsyncStorage.setItem('appUserData', JSON.stringify(minimalUserData));
      }
    } catch (e) {
      console.error("Erro ao buscar/salvar dados do usuário:", e);
      setUserData(null);
      await AsyncStorage.removeItem('appUserData');
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(FIREBASE_AUTH);
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      Alert.alert("Erro", "Não foi possível sair da sua conta no momento.");
    }
  };

  return (
    <AuthContext.Provider value={{ user, userData, isLoadingAuth, logout, fetchAndSetUserData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);