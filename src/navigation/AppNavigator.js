import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack'; 
import { useAuth } from '../AuthContext';

// Telas de Autenticação
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { RecoverScreen } from '../screens/RecoverScreen';

// Telas Principais (Comuns e Admin)
import { HomeScreen } from '../screens/HomeScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { NotasScreen } from '../screens/NotasScreen';
import { TarefasScreen } from '../screens/TarefasScreen';
import { ArquivosScreen } from '../screens/ArquivosScreen';
import { AgendaScreen } from '../screens/AgendaScreen';
import { RelatoriosScreen } from '../screens/RelatoriosScreen';

import { View, ActivityIndicator, StyleSheet, StatusBar, Text } from 'react-native';

const AuthStack = createNativeStackNavigator();
const MainAppStack = createNativeStackNavigator();

// Stack para telas de autenticação
const AuthScreens = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
    <AuthStack.Screen name="Recover" component={RecoverScreen} />
  </AuthStack.Navigator>
);

const AppScreens = () => (
  <MainAppStack.Navigator
    initialRouteName="Home" 
    screenOptions={{ headerShown: false }}
  >
    {/* Telas acessíveis por todos os usuários logados */}
    <MainAppStack.Screen name="Home" component={HomeScreen} />
    <MainAppStack.Screen name="Profile" component={ProfileScreen} />
    <MainAppStack.Screen name="Notas" component={NotasScreen} />
    <MainAppStack.Screen name="Tarefas" component={TarefasScreen} />
    <MainAppStack.Screen name="Arquivos" component={ArquivosScreen} />
    <MainAppStack.Screen name="Agenda" component={AgendaScreen} />
    <MainAppStack.Screen name="Relatorios" component={RelatoriosScreen} />
  </MainAppStack.Navigator>
);

const AppNavigator = () => {
  const { user, userData, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor="#1D854C" barStyle="light-content" />
        <ActivityIndicator size="large" color="#1D854C" />
        <Text style={styles.loadingText}>Carregando Sessão...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? ( 
        <AppScreens /> 
      ) : (
        <AuthScreens />
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF', 
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#1D854C',
  },
});

export default AppNavigator;