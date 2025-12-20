import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ServerConnectionProvider, useServerConnection } from './src/context/ServerConnectionContext';
import { SettingsProvider } from './src/context/SettingsContext';
import ConnectionSetupScreen from './src/screens/ConnectionSetupScreen';
import MacroScreen from './src/screens/MacroScreen';

function AppContent() {
  const { isConnected, checkConnection } = useServerConnection();
  const [showMacroScreen, setShowMacroScreen] = useState(false);

  useEffect(() => {
    // Check if we have a saved connection on mount
    const initCheck = async () => {
      const connected = await checkConnection();
      setShowMacroScreen(connected);
    };
    initCheck();
  }, []);

  const handleConnectionSuccess = () => {
    setShowMacroScreen(true);
  };

  const handleDisconnect = () => {
    setShowMacroScreen(false);
  };

  if (showMacroScreen && isConnected) {
    return <MacroScreen onDisconnect={handleDisconnect} />;
  }

  return <ConnectionSetupScreen onConnectionSuccess={handleConnectionSuccess} />;
}

export default function App() {
  return (
    <SettingsProvider>
      <ServerConnectionProvider>
        <StatusBar style="light" />
        <AppContent />
      </ServerConnectionProvider>
    </SettingsProvider>
  );
}
