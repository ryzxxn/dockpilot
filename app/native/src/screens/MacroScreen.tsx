import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  ActivityIndicator,
  useWindowDimensions,
  Animated,
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
  const { isConnected } = useServerConnection();
  const { width, height } = useWindowDimensions();
  
  // --- LAYOUT CONSTANTS ---
  const GRID_ROWS = 3;
  const GRID_COLS = 5;
  const ITEMS_PER_PAGE = GRID_ROWS * GRID_COLS;
  const GAP = 12; // Gap between buttons
  const SCREEN_PADDING = 24; // Safe area padding edges

  // --- DYNAMIC SCALING CALCULATION ---
  const buttonSize = useMemo(() => {
    // 1. Calculate max width based on 5 columns
    const totalHorizontalPadding = (SCREEN_PADDING * 2) + ((GRID_COLS - 1) * GAP);
    const availableWidth = width - totalHorizontalPadding;
    const maxBtnWidth = Math.floor(availableWidth / GRID_COLS);

    // 2. Calculate max height based on 3 rows
    const totalVerticalPadding = (SCREEN_PADDING * 2) + ((GRID_ROWS - 1) * GAP);
    const availableHeight = height - totalVerticalPadding;
    const maxBtnHeight = Math.floor(availableHeight / GRID_ROWS);

    // 3. Use the smaller dimension to ensure squares fit within the screen boundaries
    return Math.min(maxBtnWidth, maxBtnHeight);
  }, [width, height]);

  // Calculate total width of the grid to center it perfectly within the page
  const gridContentWidth = (buttonSize * GRID_COLS) + ((GRID_COLS - 1) * GAP);
  
  // --- STATE ---
  const [showSettings, setShowSettings] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Data
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [buttons, setButtons] = useState<Button[]>([]);
  const [pluginSchemas, setPluginSchemas] = useState<PluginSchema[]>([]);
  const [availableIcons, setAvailableIcons] = useState<string[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [triggeringButton, setTriggeringButton] = useState<string | null>(null);
  const [buttonResults, setButtonResults] = useState<Record<string, TriggerResult>>({});
  
  // Modals
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [configButton, setConfigButton] = useState<Button | null>(null);
  
  // Toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('error');

  // --- EFFECTS ---
  useEffect(() => {
    if (isConnected) loadData();
  }, [isConnected]);

  useEffect(() => {
    if (selectedProfile) loadButtons();
  }, [selectedProfile]);

  // --- API CALLS ---
  const loadData = async () => {
    try {
      setLoading(true);
      const [profilesRes, schemasRes, iconsRes] = await Promise.all([
        apiClient.getProfiles(),
        apiClient.getPluginSchemas(),
        apiClient.getAvailableIcons(),
      ]);
      
      setProfiles(profilesRes.data);
      setPluginSchemas(schemasRes.data.plugins || []);
      setAvailableIcons(iconsRes.data.icons || []);
      
      const defaultProfile = profilesRes.data.find((p: Profile) => p.is_default === 1) || profilesRes.data[0];
      setSelectedProfile(defaultProfile || null);
    } catch (error) {
      showToast('Failed to load data. Check Connection.', 'error');
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
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  // --- ACTIONS ---
  const handleTriggerButton = async (button: Button) => {
    setTriggeringButton(button.button_id);
    
    // Clear previous result
    setButtonResults(prev => {
      const updated = { ...prev };
      delete updated[button.button_id];
      return updated;
    });

    try {
      const res = await apiClient.triggerButton(button.button_id);
      setButtonResults(prev => ({
        ...prev,
        [button.button_id]: {
          success: true,
          message: res.data.result.status || 'Success',
          timestamp: Date.now(),
        },
      }));
    } catch (error: any) {
      setButtonResults(prev => ({
        ...prev,
        [button.button_id]: {
          success: false,
          message: error.response?.data?.detail || 'Failed',
          timestamp: Date.now(),
        },
      }));
    } finally {
      setTriggeringButton(null);
      setTimeout(() => {
        setButtonResults(prev => {
          const updated = { ...prev };
          delete updated[button.button_id];
          return updated;
        });
      }, 3000);
    }
  };

  const handleOpenConfig = (button: Button) => {
    setConfigButton(button);
    setConfigModalVisible(true);
  };

  const handleConfigSuccess = () => {
    loadButtons();
  };

  // --- PAGINATION LOGIC ---
  const getButtonPages = () => {
    const pages: (Button | null)[][] = [];
    const totalItems = buttons.length > 0 ? buttons.length : 1;
    const totalPagesNeeded = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;

    for (let i = 0; i < totalPagesNeeded; i++) {
      const start = i * ITEMS_PER_PAGE;
      const pageSlice = buttons.slice(start, start + ITEMS_PER_PAGE);
      
      const fullPage: (Button | null)[] = [...pageSlice];
      // Pad the page with nulls to maintain grid structure
      while (fullPage.length < ITEMS_PER_PAGE) {
        fullPage.push(null);
      }
      pages.push(fullPage);
    }
    return pages;
  };

  const buttonPages = getButtonPages();

  // --- RENDER HELPERS ---
  const renderGridItem = ({ item }: { item: Button | null }) => {
    // 1. Render Empty Slot
    if (!item) {
      return (
        <View style={[styles.emptySlot, { width: buttonSize, height: buttonSize }]} />
      );
    }

    // 2. Render Macro Button
    return (
      <MacroButton
        button={item}
        isRunning={triggeringButton === item.button_id}
        result={buttonResults[item.button_id] ?? null}
        onPress={handleTriggerButton}
        onLongPress={handleOpenConfig}
        size={buttonSize}
      />
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  if (showSettings) {
    return <SettingsScreen onBack={() => setShowSettings(false)} onDisconnect={onDisconnect} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      {/* Background */}
      <View style={styles.backgroundGradient} />

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />

      {/* Profile Watermark */}
      <View style={styles.profileWatermark}>
        <Text style={styles.profileText}>
            {selectedProfile?.name || 'PROFILE'}
        </Text>
      </View>

      {/* Hidden Settings Trigger (Top Right) */}
      <TouchableOpacity 
        style={styles.settingsTrigger} 
        onLongPress={() => setShowSettings(true)}
        delayLongPress={1500}
        activeOpacity={0.1}
      />

      {/* Main Grid View */}
      <View style={styles.viewPort}>
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
        >
            {buttonPages.map((pageData, pageIndex) => (
                <View 
                    key={pageIndex} 
                    style={{ 
                        width: width, 
                        height: height, 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        padding: SCREEN_PADDING
                    }}
                >
                    {/* Inner Container restricted to precise grid width */}
                    <View style={{ width: gridContentWidth }}>
                        <FlatList
                            data={pageData}
                            keyExtractor={(item, idx) => item?.button_id || `empty-${pageIndex}-${idx}`}
                            renderItem={renderGridItem}
                            numColumns={GRID_COLS}
                            scrollEnabled={false} // Grid itself doesn't scroll, pages do
                            columnWrapperStyle={{ gap: GAP, marginBottom: GAP }}
                        />
                    </View>
                </View>
            ))}
        </Animated.ScrollView>
      </View>

      {/* Pagination Indicators */}
      {buttonPages.length > 1 && (
        <View style={styles.paginationContainer}>
            {buttonPages.map((_, i) => (
                <View 
                    key={i} 
                    style={[
                        styles.paginationDot, 
                        i === currentPage && styles.paginationDotActive
                    ]} 
                />
            ))}
        </View>
      )}

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setCreateModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

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
          
          {/* CRITICAL FIX: Only render config modal when a button is selected */}
          {configButton && (
            <ConfigButtonModal
              visible={configModalVisible}
              onClose={() => setConfigModalVisible(false)}
              onSuccess={handleConfigSuccess}
              button={configButton}
              schema={pluginSchemas.find((p) => p.type === configButton.type)?.schema || []}
              availableIcons={availableIcons}
            />
          )}
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
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#050505',
    zIndex: -1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewPort: {
    flex: 1,
  },
  profileWatermark: {
    position: 'absolute',
    top: 24,
    left: 24,
    zIndex: 10,
    opacity: 0.5,
  },
  profileText: {
    color: '#525252',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  settingsTrigger: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 80,
    height: 80,
    zIndex: 100,
  },
  emptySlot: {
    borderRadius: 24,
    backgroundColor: 'rgba(23, 23, 23, 0.4)',
    borderWidth: 1,
    borderColor: '#171717',
    borderStyle: 'dashed',
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#262626',
  },
  paginationDotActive: {
    backgroundColor: '#FFFFFF',
    width: 18,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  fabText: {
    fontSize: 32,
    color: '#000000',
    fontWeight: '300',
    lineHeight: 34,
    marginTop: -2,
  },
});