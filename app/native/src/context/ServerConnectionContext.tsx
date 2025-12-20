import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../utils/api';

interface ServerConnectionContextType {
  serverUrl: string;
  isConnected: boolean;
  isChecking: boolean;
  error: string | null;
  setServerUrl: (url: string) => void;
  checkConnection: () => Promise<boolean>;
  disconnect: () => void;
  clearError: () => void;
}

const ServerConnectionContext = createContext<ServerConnectionContextType | undefined>(undefined);

const STORAGE_KEY = '@dockpilot:serverUrl';

export const ServerConnectionProvider = ({ children }: { children: ReactNode }) => {
  const [serverUrl, setServerUrlState] = useState('http://192.168.0.138:9001');
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved server URL on mount
  useEffect(() => {
    loadServerUrl();
  }, []);

  // Update API client when URL changes
  useEffect(() => {
    apiClient.setBaseURL(serverUrl);
  }, [serverUrl]);

  const loadServerUrl = async () => {
    try {
      const savedUrl = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedUrl) {
        setServerUrlState(savedUrl);
      }
    } catch (err) {
      console.error('Failed to load server URL:', err);
    }
  };

  const setServerUrl = async (url: string) => {
    const cleanUrl = url.trim().replace(/\/$/, '');
    setServerUrlState(cleanUrl);
    setIsConnected(false);
    setError(null);

    // Save to storage
    try {
      await AsyncStorage.setItem(STORAGE_KEY, cleanUrl);
    } catch (err) {
      console.error('Failed to save server URL:', err);
    }
  };

  const checkConnection = async (): Promise<boolean> => {
    setIsChecking(true);
    setError(null);

    try {
      const connected = await apiClient.testConnection();
      setIsConnected(connected);
      
      if (!connected) {
        setError('Server not responding');
      }
      
      setIsChecking(false);
      return connected;
    } catch (err: any) {
      let errorMessage = 'Failed to connect to server';
      
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorMessage = 'Connection timeout - check if server is running and IP is correct';
      } else if (err.code === 'ERR_NETWORK' || err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
        errorMessage = `Cannot reach server at ${serverUrl}\n\nCheck:\n• Server is running\n• Correct IP address\n• Same Wi-Fi network\n• Windows Firewall allows port 9001`;
      } else if (err.response) {
        // Server responded but with error status
        errorMessage = `Server responded with error: ${err.response.status}`;
      } else {
        errorMessage = `Connection failed: ${err.message || 'Unknown error'}`;
      }

      setError(errorMessage);
      setIsConnected(false);
      setIsChecking(false);
      return false;
    }
  };

  const disconnect = () => {
    setIsConnected(false);
    setError(null);
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <ServerConnectionContext.Provider
      value={{
        serverUrl,
        isConnected,
        isChecking,
        error,
        setServerUrl,
        checkConnection,
        disconnect,
        clearError,
      }}
    >
      {children}
    </ServerConnectionContext.Provider>
  );
};

export const useServerConnection = () => {
  const context = useContext(ServerConnectionContext);
  if (!context) {
    throw new Error('useServerConnection must be used within ServerConnectionProvider');
  }
  return context;
};

