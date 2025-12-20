import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useServerConnection } from '../context/ServerConnectionContext';

interface SettingsScreenProps {
  onBack: () => void;
  onDisconnect: () => void;
}

export default function SettingsScreen({ onBack, onDisconnect }: SettingsScreenProps) {
  const { serverUrl, isConnected, disconnect } = useServerConnection();

  const handleDisconnect = () => {
    disconnect();
    onDisconnect();
  };

  const maxSize = 10;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SETTINGS</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Server Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SERVER</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Server URL</Text>
              <Text style={styles.settingValue} numberOfLines={1}>
                {serverUrl}
              </Text>
            </View>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Connection Status</Text>
              <View style={styles.statusContainer}>
                <View
                  style={[
                    styles.statusDot,
                    isConnected ? styles.statusDotConnected : styles.statusDotDisconnected,
                  ]}
                />
                <Text style={styles.statusText}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
            <Text style={styles.disconnectButtonText}>Disconnect from Server</Text>
          </TouchableOpacity>
        </View>

        {/* Deck Mode Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DECK MODE</Text>
          <Text style={styles.sectionDescription}>
            Landscape mode displays buttons in a fixed 2×4 grid (8 buttons per page).
            Swipe left/right to navigate between pages when you have more than 8 buttons.
          </Text>
        </View>

        {/* App Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABOUT</Text>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>App Version</Text>
            <Text style={styles.settingValue}>1.1.0</Text>
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>DockPilot</Text>
            <Text style={styles.settingValue}>System Controller</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#171717',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  headerSpacer: {
    width: 60,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#737373',
    letterSpacing: 2,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  sectionDescription: {
    fontSize: 13,
    color: '#525252',
    marginBottom: 20,
    lineHeight: 18,
  },
  settingItem: {
    backgroundColor: '#171717',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#262626',
  },
  settingInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E5E5E5',
    flex: 1,
  },
  settingValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#737373',
    flex: 1,
    textAlign: 'right',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotConnected: {
    backgroundColor: '#10B981',
  },
  statusDotDisconnected: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#737373',
  },
  disconnectButton: {
    backgroundColor: '#450A0A',
    borderWidth: 1,
    borderColor: '#7F1D1D',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  disconnectButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FCA5A5',
  },
  gridSelector: {
    backgroundColor: '#171717',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#262626',
  },
  gridLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E5E5E5',
    marginBottom: 8,
  },
  gridSubLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#737373',
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  interactiveGridContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  gridWrapper: {
    backgroundColor: '#0A0A0A',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#262626',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 2,
  },
  gridCell: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#171717',
  },
  gridCellSelected: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  gridHint: {
    fontSize: 12,
    color: '#525252',
    textAlign: 'center',
    marginTop: 8,
  },
  sizeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  sizeOption: {
    flex: 1,
    minWidth: '18%',
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeOptionActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  sizeOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#737373',
  },
  sizeOptionTextActive: {
    color: '#000000',
  },
});

