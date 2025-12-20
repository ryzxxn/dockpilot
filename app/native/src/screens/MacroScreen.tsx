import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  useWindowDimensions,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { useServerConnection } from '../context/ServerConnectionContext';
import { apiClient } from '../utils/api';
import { Profile, Button, TriggerResult, PluginSchema } from '../types';
import Toast from '../components/Toast';
import MacroButton from '../components/MacroButton';
import SettingsScreen from './SettingsScreen';
import { CreateButtonModal } from '../components/CreateButtonModal';
import { ConfigButtonModal } from '../components/ConfigButtonModal';

interface MacroScreenProps {
  onDisconnect: () => void;
}

export default function MacroScreen({ onDisconnect }: MacroScreenProps) {
  const { serverUrl, isConnected, disconnect } = useServerConnection();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const [showSettings, setShowSettings] = useState(false);
  
  // Fixed layout: 2 rows × 4 columns = 8 buttons per page
  const FIXED_ROWS = 2;
  const FIXED_COLUMNS = 4;
  const BUTTONS_PER_PAGE = FIXED_ROWS * FIXED_COLUMNS; // 8
  const FIXED_BUTTON_SIZE = 180; // Fixed button size
  
  // Calculate gaps to fit screen for 2x4 layout
  const calculateGaps = () => {
    if (!isLandscape) {
      return { horizontalGap: 8, verticalGap: 8 }; // Default gaps in portrait
    }
    
    const horizontalPadding = 16; // Total padding (8px on each side)
    const verticalPadding = 16; // Total padding top/bottom
    
    // Calculate horizontal gap
    const totalButtonWidth = FIXED_BUTTON_SIZE * FIXED_COLUMNS;
    const availableWidthForGaps = width - horizontalPadding - totalButtonWidth;
    const horizontalGap = Math.max(4, Math.floor(availableWidthForGaps / (FIXED_COLUMNS - 1)));
    
    // Calculate vertical gap
    const totalButtonHeight = FIXED_BUTTON_SIZE * FIXED_ROWS;
    const availableHeightForGaps = height - verticalPadding - totalButtonHeight;
    const verticalGap = Math.max(4, Math.floor(availableHeightForGaps / (FIXED_ROWS - 1)));
    
    return { horizontalGap, verticalGap };
  };

  const { horizontalGap, verticalGap } = calculateGaps();
  const buttonSize = isLandscape ? FIXED_BUTTON_SIZE : undefined;
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [buttons, setButtons] = useState<Button[]>([]);
  const [pluginSchemas, setPluginSchemas] = useState<PluginSchema[]>([]);
  const [availableIcons, setAvailableIcons] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [triggeringButton, setTriggeringButton] = useState<string | null>(null);
  const [buttonResults, setButtonResults] = useState<Record<string, TriggerResult>>({});
  
  // Modal state
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [configButton, setConfigButton] = useState<Button | null>(null);
  
  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('error');

  useEffect(() => {
    if (isConnected) {
      loadData();
    }
  }, [isConnected]);

  useEffect(() => {
    if (selectedProfile) {
      loadButtons();
    }
  }, [selectedProfile]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profilesRes, schemasRes, iconsRes] = await Promise.all([
        apiClient.getProfiles(),
        apiClient.getPluginSchemas(),
        apiClient.getAvailableIcons(),
      ]);
      
      const profilesData = profilesRes.data;
      setProfiles(profilesData);
      setPluginSchemas(schemasRes.data.plugins || []);
      setAvailableIcons(iconsRes.data.icons || []);
      
      const defaultProfile = profilesData.find((p: Profile) => p.is_default === 1) || profilesData[0];
      setSelectedProfile(defaultProfile || null);
    } catch (error) {
      showToast('Failed to load data', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadButtons = async () => {
    if (!selectedProfile) return;
    
    try {
      const res = await apiClient.getButtons(selectedProfile.profile_id);
      setButtons(res.data);
    } catch (error) {
      showToast('Failed to load buttons', 'error');
      console.error(error);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleTriggerButton = async (button: Button) => {
    setTriggeringButton(button.button_id);
    setButtonResults(prev => {
      const updated = { ...prev };
      delete updated[button.button_id];
      return updated;
    });

    try {
      const res = await apiClient.triggerButton(button.button_id);
      const resultData = res.data.result;
      const message = resultData.status || 'Success';

      setButtonResults(prev => ({
        ...prev,
        [button.button_id]: {
          success: true,
          message,
          timestamp: Date.now(),
        },
      }));
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to trigger';
      
      // Show toast for errors
      showToast(message, 'error');
      
      setButtonResults(prev => ({
        ...prev,
        [button.button_id]: {
          success: false,
          message,
          timestamp: Date.now(),
        },
      }));
    } finally {
      setTriggeringButton(null);
      
      // Clear result after 3 seconds
      setTimeout(() => {
        setButtonResults(prev => {
          const updated = { ...prev };
          delete updated[button.button_id];
          return updated;
        });
      }, 3000);
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect',
      'Are you sure you want to disconnect from the server?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            disconnect();
            onDisconnect();
          },
        },
      ]
    );
  };

  // Split buttons into pages (8 buttons per page)
  const getButtonPages = () => {
    const pages: (Button | null)[][] = [];
    
    for (let i = 0; i < buttons.length; i += BUTTONS_PER_PAGE) {
      const pageButtons: (Button | null)[] = [...buttons.slice(i, i + BUTTONS_PER_PAGE)];
      // Fill remaining slots with null placeholders
      while (pageButtons.length < BUTTONS_PER_PAGE) {
        pageButtons.push(null);
      }
      pages.push(pageButtons);
    }
    
    // If no buttons, show one empty page
    if (pages.length === 0) {
      pages.push(Array(BUTTONS_PER_PAGE).fill(null) as (Button | null)[]);
    }
    
    return pages;
  };

  const buttonPages = getButtonPages();
  const totalPages = buttonPages.length;

  const renderButton = ({ item }: { item: Button | null }) => {
    // Create consistent size style for both buttons and placeholders
    const sizeStyle = buttonSize 
      ? { 
          width: buttonSize, 
          height: buttonSize,
          flex: 0, // Disable flex when size is set
        } 
      : { flex: 1 }; // Use flex in portrait mode

    // Empty placeholder
    if (!item) {
      return (
        <View 
          style={[
            styles.emptyButtonSlot,
            sizeStyle,
          ]} 
        />
      );
    }

    const isRunning = triggeringButton === item.button_id;
    const result = buttonResults[item.button_id];

    return (
      <MacroButton
        button={item}
        isRunning={isRunning}
        result={result ?? null}
        onPress={handleTriggerButton}
        onLongPress={handleOpenConfig}
        size={buttonSize}
      />
    );
  };

  const handleOpenConfig = (button: Button) => {
    setConfigButton(button);
    setConfigModalVisible(true);
  };

  const handleConfigSuccess = () => {
    loadButtons();
  };


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Toast */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
      
      {/* Settings Screen */}
      {showSettings ? (
        <SettingsScreen
          onBack={() => setShowSettings(false)}
          onDisconnect={onDisconnect}
        />
      ) : (
        <>
          {/* Header - Hidden in landscape */}
          {!isLandscape && (
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>DOCKPILOT</Text>
                <Text style={styles.subtitle}>SYSTEM CONTROLLER V1.1</Text>
              </View>
              <TouchableOpacity style={styles.disconnectButton} onPress={() => setShowSettings(true)}>
                <Text style={styles.disconnectButtonText}>⚙️</Text>
              </TouchableOpacity>
            </View>
          )}

      {/* Profile Selector - Hidden in landscape */}
      {!isLandscape && profiles.length > 1 && (
        <View style={styles.profileContainer}>
          <FlatList
            horizontal
            data={profiles}
            keyExtractor={(item) => item.profile_id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.profileButton,
                  selectedProfile?.profile_id === item.profile_id && styles.profileButtonActive,
                ]}
                onPress={() => setSelectedProfile(item)}
              >
                <Text
                  style={[
                    styles.profileButtonText,
                    selectedProfile?.profile_id === item.profile_id && styles.profileButtonTextActive,
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.profileList}
          />
        </View>
      )}

          {/* Buttons Grid with Pagination */}
          {isLandscape ? (
            <>
              <Animated.ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                  { useNativeDriver: false }
                )}
                onMomentumScrollEnd={(event) => {
                  const page = Math.round(event.nativeEvent.contentOffset.x / width);
                  setCurrentPage(page);
                }}
                style={styles.pageScrollView}
              >
                {buttonPages.map((pageButtons, pageIndex) => (
                  <View key={pageIndex} style={[styles.pageContainer, { width }]}>
                    <FlatList
                      data={pageButtons}
                      keyExtractor={(item, index) => item?.button_id || `empty-${pageIndex}-${index}`}
                      renderItem={renderButton}
                      numColumns={FIXED_COLUMNS}
                      scrollEnabled={false}
                      contentContainerStyle={[
                        styles.buttonsGrid,
                        styles.buttonsGridLandscape,
                        {
                          paddingHorizontal: 8,
                          paddingTop: 8,
                          paddingBottom: 8,
                        },
                      ]}
                      columnWrapperStyle={[
                        styles.buttonsRow,
                        { gap: horizontalGap, marginBottom: verticalGap },
                      ]}
                      ListEmptyComponent={
                        buttons.length === 0 && pageIndex === 0 ? (
                          <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No buttons configured</Text>
                            <Text style={styles.emptySubtext}>Add buttons from the web interface</Text>
                          </View>
                        ) : null
                      }
                    />
                  </View>
                ))}
              </Animated.ScrollView>
              
              {/* Floating Page Indicators */}
              {totalPages > 1 && (
                <View style={styles.pageIndicators}>
                  {buttonPages.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.pageIndicator,
                        currentPage === index && styles.pageIndicatorActive,
                      ]}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <>
              <FlatList
                data={buttons}
                keyExtractor={(item) => item.button_id}
                renderItem={renderButton}
                numColumns={2}
                contentContainerStyle={styles.buttonsGrid}
                columnWrapperStyle={styles.buttonsRow}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor="#FFFFFF"
                    colors={['#FFFFFF']}
                  />
                }
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No buttons configured</Text>
                    <Text style={styles.emptySubtext}>Tap + to create a button</Text>
                  </View>
                }
              />
              {/* Create Button - Portrait Mode */}
              <TouchableOpacity
                style={styles.createButtonPortrait}
                onPress={() => setCreateModalVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.createButtonText}>+</Text>
              </TouchableOpacity>
            </>
          )}

        </>
      )}

      {/* Modals */}
      {selectedProfile && (
        <>
          <CreateButtonModal
            visible={createModalVisible}
            onClose={() => setCreateModalVisible(false)}
            onSuccess={handleConfigSuccess}
            profileId={selectedProfile.profile_id}
            pluginSchemas={pluginSchemas}
          />
          <ConfigButtonModal
            visible={configModalVisible}
            onClose={() => setConfigModalVisible(false)}
            onSuccess={handleConfigSuccess}
            button={configButton}
            schema={pluginSchemas.find((p) => p.type === configButton?.type)?.schema || []}
            availableIcons={availableIcons}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#171717',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 8,
    fontWeight: '700',
    color: '#525252',
    letterSpacing: 2,
    marginTop: 2,
  },
  disconnectButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disconnectButtonText: {
    fontSize: 20,
  },
  profileContainer: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#171717',
  },
  profileList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  profileButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#262626',
    marginRight: 8,
  },
  profileButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  profileButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#737373',
  },
  profileButtonTextActive: {
    color: '#000000',
  },
  buttonsGrid: {
    padding: 16,
  },
  buttonsGridLandscape: {
    padding: 8,
    paddingTop: 8,
  },
  buttonsRow: {
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 0,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#525252',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#404040',
  },
  emptyButtonSlot: {
    backgroundColor: '#0A0A0A',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#171717',
    borderStyle: 'dashed',
  },
  landscapeSettingsButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  landscapeSettingsButtonText: {
    fontSize: 24,
  },
  pageScrollView: {
    flex: 1,
  },
  pageContainer: {
    flex: 1,
  },
  pageIndicators: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    zIndex: 100,
  },
  pageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#262626',
  },
  pageIndicatorActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
  createButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  createButtonText: {
    fontSize: 32,
    fontWeight: '300',
    color: '#000000',
    lineHeight: 32,
  },
  createButtonPortrait: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

