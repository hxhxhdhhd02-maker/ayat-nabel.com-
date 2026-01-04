import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { ParentProvider, useParent } from './src/contexts/ParentContext';
import ParentLoginScreen from './src/screens/ParentLoginScreen';
import ParentDashboardScreen from './src/screens/ParentDashboardScreen';
import { StatusBar } from 'expo-status-bar';

function AppContent() {
  const { student, loading } = useParent();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  return student ? <ParentDashboardScreen /> : <ParentLoginScreen />;
}

import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';

function ThemedStatusBar() {
  const { theme } = useTheme();
  return <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <ParentProvider>
        <ThemedStatusBar />
        <AppContent />
      </ParentProvider>
    </ThemeProvider>
  );
}

