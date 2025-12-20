import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Pressable,
  useWindowDimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Button, PluginSchema } from '../types';
import { apiClient } from '../utils/api';

type DynamicConfig = Record<string, any>;

interface ConfigButtonModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  button: Button | null;
  schema: PluginSchema['schema'];
  availableIcons: string[];
}

export const ConfigButtonModal = ({
  visible,
  onClose,
  onSuccess,
  button,
  schema,
  availableIcons,
}: ConfigButtonModalProps) => {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [config, setConfig] = useState<DynamicConfig>({});
  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'icon'>('settings');
  const [isSaving, setIsSaving] = useState(false);
  const [openPickers, setOpenPickers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (visible && button) {
      setLabel(button.label);
      setIcon(button.icon || null);
      setActiveTab('settings');
      loadConfig();
    }
  }, [visible, button]);

  const loadConfig = async () => {
    if (!button) return;
    try {
      const res = await apiClient.getButtonConfig(button.button_id);
      const dbConfig = res.data.config || {};
      const merged = { ...dbConfig };
      schema.forEach((field) => {
        if (merged[field.key] === undefined && field.default !== undefined) {
          merged[field.key] = field.default;
        }
      });
      setConfig(merged);
    } catch {
      const defaults: DynamicConfig = {};
      schema.forEach((field) => {
        if (field.default !== undefined) defaults[field.key] = field.default;
      });
      setConfig(defaults);
    }
  };

  const handleSave = async () => {
    if (!button) return;
    setIsSaving(true);
    try {
      await Promise.all([
        apiClient.updateButtonConfig(button.button_id, config),
        apiClient.updateButton(button.button_id, { label, icon }),
      ]);
      onSuccess();
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!button) return;
    Alert.alert('Delete Button', `Are you sure you want to delete "${button.label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.deleteButton(button.button_id);
            onSuccess();
            onClose();
          } catch (error: any) {
            Alert.alert('Error', 'Failed to delete button');
          }
        },
      },
    ]);
  };

  if (!visible || !button) return null;

  // --- RENDER CONTENT HELPERS ---

  const renderConfigFields = () => (
    <View style={styles.settingsTab}>
      {schema.length === 0 && (
        <View style={styles.noConfigContainer}>
          <Text style={styles.noConfigText}>No configuration required.</Text>
        </View>
      )}
      {schema.map((field) => {
        const value = config[field.key] ?? (field.default || '');
        return (
          <View key={field.key} style={styles.configField}>
            <Text style={styles.fieldLabel}>
              {field.label} {field.required && <Text style={styles.required}>*</Text>}
            </Text>
            {field.type === 'enum' ? (
              <>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setOpenPickers({ ...openPickers, [field.key]: true })}
                >
                  <Text style={styles.selectButtonText}>{value || 'Select option'}</Text>
                  <Text style={styles.selectButtonArrow}>▼</Text>
                </TouchableOpacity>

                {openPickers[field.key] && (
                  <Modal
                    visible={openPickers[field.key]}
                    transparent
                    animationType="fade"
                    onRequestClose={() =>
                      setOpenPickers({ ...openPickers, [field.key]: false })
                    }
                  >
                    <Pressable
                      style={styles.pickerOverlay}
                      onPress={() => setOpenPickers({ ...openPickers, [field.key]: false })}
                    >
                      <Pressable style={styles.pickerContainer} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.pickerHeader}>
                          <Text style={styles.pickerTitle}>{field.label}</Text>
                          <TouchableOpacity
                            onPress={() =>
                              setOpenPickers({ ...openPickers, [field.key]: false })
                            }
                          >
                            <Text style={styles.closeButtonText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 300 }}>
                          {field.values?.map((v) => (
                            <TouchableOpacity
                              key={v}
                              style={[
                                styles.pickerOption,
                                value === v && styles.pickerOptionActive,
                              ]}
                              onPress={() => {
                                setConfig({ ...config, [field.key]: v });
                                setOpenPickers({ ...openPickers, [field.key]: false });
                              }}
                            >
                              <Text
                                style={[
                                  styles.pickerOptionText,
                                  value === v && styles.pickerOptionTextActive,
                                ]}
                              >
                                {v}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </Pressable>
                    </Pressable>
                  </Modal>
                )}
              </>
            ) : (
              <TextInput
                style={styles.input}
                value={String(value)}
                onChangeText={(text) =>
                  setConfig({
                    ...config,
                    [field.key]: field.type === 'number' ? Number(text) || 0 : text,
                  })
                }
                placeholder={field.placeholder}
                placeholderTextColor="#525252"
                keyboardType={field.type === 'number' ? 'numeric' : 'default'}
              />
            )}
          </View>
        );
      })}
    </View>
  );

  const renderIconGrid = () => (
    <View style={styles.iconTab}>
      <View style={styles.iconGridContainer}>
        <TouchableOpacity
          style={[styles.iconOption, icon === null && styles.iconOptionActive, styles.iconOptionNone]}
          onPress={() => setIcon(null)}
        >
          <Text style={styles.iconOptionX}>✕</Text>
          <Text style={[styles.iconOptionLabel, icon === null && styles.iconOptionLabelActive]}>
            NONE
          </Text>
        </TouchableOpacity>

        {availableIcons.map((iconName) => (
          <TouchableOpacity
            key={iconName}
            style={[styles.iconOption, icon === iconName && styles.iconOptionActive]}
            onPress={() => setIcon(iconName)}
          >
            <Image
              source={{ uri: apiClient.getIconUrl(iconName) }}
              style={styles.iconOptionImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        ))}
      </View>
      {availableIcons.length === 0 && (
        <Text style={styles.noIconsText}>No icons found in /icons/ folder.</Text>
      )}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.modalOverlay} onPress={onClose}>
          <Pressable 
            style={[
              styles.modalContent, 
              isLandscape && styles.modalContentLandscape
            ]} 
            onPress={(e) => e.stopPropagation()}
          >
            {/* 
                LAYOUT STRATEGY:
                Portrait: Vertical Stack (Header -> Content -> Footer)
                Landscape: Split View (Left: Header/Meta/Footer, Right: Scrollable Config)
            */}
            
            {isLandscape ? (
              <View style={styles.landscapeContainer}>
                {/* LEFT PANE: Info & Actions */}
                <View style={styles.landscapeLeftPane}>
                  {/* Header / Meta */}
                  <View>
                    <View style={styles.configHeader}>
                       <Text style={styles.landscapeTitle}>EDIT BUTTON</Text>
                       <TouchableOpacity onPress={onClose}><Text style={styles.closeButtonText}>✕</Text></TouchableOpacity>
                    </View>
                    
                    <View style={styles.configHeaderContent}>
                      <View style={styles.iconPreview}>
                        {icon ? (
                          <Image
                            source={{ uri: apiClient.getIconUrl(icon) }}
                            style={styles.iconPreviewImage}
                            resizeMode="contain"
                          />
                        ) : (
                          <Text style={styles.iconPreviewPlaceholder}>⚡</Text>
                        )}
                      </View>
                      <View style={styles.configHeaderText}>
                        <TextInput
                          style={styles.labelInput}
                          value={label}
                          onChangeText={setLabel}
                          placeholder="Label"
                          placeholderTextColor="#525252"
                        />
                        <View style={styles.typeBadgeContainer}>
                          <Text style={styles.typeBadge}>{button.type}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Tabs */}
                  <View style={styles.tabContainerLandscape}>
                     <TouchableOpacity style={[styles.tab, activeTab === 'settings' && styles.tabActive]} onPress={() => setActiveTab('settings')}>
                        <Text style={[styles.tabText, activeTab === 'settings' && styles.tabTextActive]}>SETTINGS</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[styles.tab, activeTab === 'icon' && styles.tabActive]} onPress={() => setActiveTab('icon')}>
                        <Text style={[styles.tabText, activeTab === 'icon' && styles.tabTextActive]}>ICON</Text>
                     </TouchableOpacity>
                  </View>

                  {/* Footer Actions */}
                  <View style={styles.landscapeFooter}>
                    <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                      <Text style={styles.deleteButtonText}>🗑️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                      onPress={handleSave}
                      disabled={isSaving}
                    >
                      {isSaving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveButtonText}>SAVE</Text>}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* RIGHT PANE: Scrollable Content */}
                <View style={styles.landscapeRightPane}>
                  <ScrollView contentContainerStyle={styles.modalBodyContent}>
                    {activeTab === 'settings' ? renderConfigFields() : renderIconGrid()}
                  </ScrollView>
                </View>
              </View>
            ) : (
              // PORTRAIT LAYOUT (Original)
              <>
                <View style={styles.configHeader}>
                  <View style={styles.tabContainer}>
                    <TouchableOpacity style={[styles.tab, activeTab === 'settings' && styles.tabActive]} onPress={() => setActiveTab('settings')}>
                      <Text style={[styles.tabText, activeTab === 'settings' && styles.tabTextActive]}>SETTINGS</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tab, activeTab === 'icon' && styles.tabActive]} onPress={() => setActiveTab('icon')}>
                      <Text style={[styles.tabText, activeTab === 'icon' && styles.tabTextActive]}>ICON</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.configHeaderContent}>
                  <View style={styles.iconPreview}>
                    {icon ? (
                      <Image source={{ uri: apiClient.getIconUrl(icon) }} style={styles.iconPreviewImage} resizeMode="contain" />
                    ) : (
                      <Text style={styles.iconPreviewPlaceholder}>⚡</Text>
                    )}
                  </View>
                  <View style={styles.configHeaderText}>
                    <TextInput style={styles.labelInput} value={label} onChangeText={setLabel} placeholder="Button Label" placeholderTextColor="#525252" />
                    <View style={styles.typeBadgeContainer}><Text style={styles.typeBadge}>{button.type}</Text></View>
                  </View>
                </View>

                <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
                  {activeTab === 'settings' ? renderConfigFields() : renderIconGrid()}
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}><Text style={styles.deleteButtonText}>🗑️</Text></TouchableOpacity>
                  <View style={styles.footerRight}>
                    <TouchableOpacity style={styles.cancelButton} onPress={onClose}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} onPress={handleSave} disabled={isSaving}>
                      {isSaving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    width: '100%',
    height: '100%',
  },
  modalContent: {
    backgroundColor: '#171717',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#262626',
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    overflow: 'hidden',
    flexDirection: 'column',
  },
  modalContentLandscape: {
    maxWidth: 700, // Wider for split view
    height: '80%',
    flexDirection: 'row', // Enable split view
  },
  
  // Landscape Split Layout
  landscapeContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  landscapeLeftPane: {
    width: '40%',
    borderRightWidth: 1,
    borderRightColor: '#262626',
    padding: 0,
    justifyContent: 'space-between',
    backgroundColor: '#121212',
  },
  landscapeRightPane: {
    width: '60%',
    backgroundColor: '#171717',
  },
  landscapeTitle: {
      color: 'white', fontWeight: '900', fontSize: 12, letterSpacing: 1
  },
  landscapeFooter: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: '#262626',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  tabContainerLandscape: {
      flexDirection: 'row',
      padding: 16,
      gap: 8,
  },

  // Common Headers
  configHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#0A0A0A',
    borderRadius: 8,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: '#262626',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#262626',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#525252',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  configHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 16,
    gap: 16,
  },
  iconPreview: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPreviewImage: {
    width: 40,
    height: 40,
  },
  iconPreviewPlaceholder: {
    fontSize: 32,
    color: '#404040',
  },
  configHeaderText: {
    flex: 1,
  },
  labelInput: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
    padding: 0,
  },
  typeBadgeContainer: {
    alignSelf: 'flex-start',
  },
  typeBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#525252',
    backgroundColor: '#0A0A0A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 20,
  },
  settingsTab: {
    gap: 20,
  },
  noConfigContainer: {
    padding: 40,
    borderWidth: 1,
    borderColor: '#262626',
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
  },
  noConfigText: {
    color: '#525252',
    fontStyle: 'italic',
    textAlign: 'center',
    fontSize: 14,
  },
  configField: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A3A3A3',
    textTransform: 'uppercase',
  },
  required: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    minHeight: 48,
  },
  selectButton: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  selectButtonArrow: {
    fontSize: 12,
    color: '#525252',
    marginLeft: 8,
  },
  // Pickers
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerContainer: {
    backgroundColor: '#171717',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262626',
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pickerOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  pickerOptionActive: {
    backgroundColor: '#0A0A0A',
  },
  pickerOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pickerOptionTextActive: {
    color: '#10B981',
  },
  // Icon Tab
  iconTab: {
    minHeight: 300,
  },
  iconGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
  },
  iconOption: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  iconOptionActive: {
    backgroundColor: '#262626',
    borderColor: '#10B981',
    borderWidth: 2,
  },
  iconOptionNone: {
    flexDirection: 'column',
    gap: 4,
  },
  iconOptionX: {
    fontSize: 20,
    color: '#525252',
  },
  iconOptionLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#525252',
    textTransform: 'uppercase',
  },
  iconOptionLabelActive: {
    color: '#FFFFFF',
  },
  iconOptionImage: {
    width: '100%',
    height: '100%',
  },
  noIconsText: {
    textAlign: 'center',
    color: '#525252',
    padding: 40,
    fontSize: 14,
  },
  // Footer
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#262626',
  },
  footerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#737373',
  },
  saveButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#450A0A',
    borderWidth: 1,
    borderColor: '#7F1D1D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 18,
  },
});