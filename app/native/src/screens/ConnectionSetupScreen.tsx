import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useServerConnection } from '../context/ServerConnectionContext';

interface ConnectionSetupScreenProps {
  onConnectionSuccess: () => void;
}

export default function ConnectionSetupScreen({ onConnectionSuccess }: ConnectionSetupScreenProps) {
  const { serverUrl, setServerUrl, checkConnection, isChecking, error, clearError } = useServerConnection();
  const [inputUrl, setInputUrl] = useState(serverUrl);

  const handleConnect = async () => {
    if (!inputUrl.trim()) {
      Alert.alert('Error', 'Please enter a server URL');
      return;
    }

    // Update the server URL
    await setServerUrl(inputUrl);

    // Test connection
    const success = await checkConnection();
    
    if (success) {
      onConnectionSuccess();
    }
  };

  const handleInputChange = (text: string) => {
    setInputUrl(text);
    clearError();
  };

  const presetUrls = [
    { label: 'Localhost', url: 'http://localhost:9001' },
    { label: 'Local Network', url: 'http://192.168.0.138:9001' },
  ];

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>⚙️</Text>
          </View>
          <Text style={styles.title}>DOCKPILOT</Text>
          <Text style={styles.subtitle}>SYSTEM CONTROLLER</Text>
          <Text style={styles.version}>v1.1</Text>
        </View>

        {/* Connection Form */}
        <View style={styles.formContainer}>
          <Text style={styles.label}>SERVER ADDRESS</Text>
          <Text style={styles.helpText}>
            Enter the IP address or hostname of your DockPilot server
          </Text>

          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            value={inputUrl}
            onChangeText={handleInputChange}
            placeholder="http://192.168.0.138:9001"
            placeholderTextColor="#525252"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!isChecking}
          />

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Preset URLs */}
          <View style={styles.presetsContainer}>
            <Text style={styles.presetsLabel}>QUICK PRESETS</Text>
            <View style={styles.presetsButtons}>
              {presetUrls.map((preset) => (
                <TouchableOpacity
                  key={preset.url}
                  style={styles.presetButton}
                  onPress={() => setInputUrl(preset.url)}
                  disabled={isChecking}
                >
                  <Text style={styles.presetButtonText}>{preset.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Connect Button */}
          <TouchableOpacity
            style={[styles.connectButton, isChecking && styles.connectButtonDisabled]}
            onPress={handleConnect}
            disabled={isChecking}
            activeOpacity={0.8}
          >
            {isChecking ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text style={styles.connectButtonText}>CONNECT TO SERVER</Text>
            )}
          </TouchableOpacity>

          {/* Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              💡 Make sure your device is on the same network as the server{'\n'}
              {'\n'}
              📋 To find your server IP:{'\n'}
              • Windows: Open CMD and type "ipconfig"{'\n'}
              • Look for "IPv4 Address" (usually 192.168.x.x){'\n'}
              • Use that IP with port 9001{'\n'}
              {'\n'}
              ⚠️ Server must be started with: python main.py{'\n'}
              (Not uvicorn directly, to ensure network access)
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconText: {
    fontSize: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#525252',
    letterSpacing: 3,
    marginBottom: 8,
  },
  version: {
    fontSize: 12,
    color: '#404040',
    fontWeight: '600',
  },
  formContainer: {
    backgroundColor: '#0A0A0A',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#171717',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#737373',
    letterSpacing: 2,
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    color: '#525252',
    marginBottom: 16,
    lineHeight: 18,
  },
  input: {
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 16,
  },
  inputError: {
    borderColor: '#DC2626',
    borderWidth: 2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#450A0A',
    borderWidth: 1,
    borderColor: '#7F1D1D',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#FCA5A5',
    fontWeight: '600',
  },
  presetsContainer: {
    marginBottom: 24,
  },
  presetsLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#525252',
    letterSpacing: 2,
    marginBottom: 12,
  },
  presetsButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  presetButton: {
    flex: 1,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  presetButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A3A3A3',
  },
  connectButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  connectButtonDisabled: {
    opacity: 0.6,
  },
  connectButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1,
  },
  infoContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  infoText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    textAlign: 'center',
  },
});

