import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { PluginSchema } from '../types';
import { apiClient } from '../utils/api';

interface CreateButtonModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  profileId: string;
  pluginSchemas: PluginSchema[];
}

export const CreateButtonModal = ({
  visible,
  onClose,
  onSuccess,
  profileId,
  pluginSchemas,
}: CreateButtonModalProps) => {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [label, setLabel] = useState('');
  const [type, setType] = useState(pluginSchemas[0]?.type || '');
  const [isCreating, setIsCreating] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);

  useEffect(() => {
    if (visible && pluginSchemas.length > 0) {
      setType(pluginSchemas[0].type);
      setLabel('');
      setShowTypePicker(false);
    }
  }, [visible, pluginSchemas]);

  const handleCreate = async () => {
    if (!label.trim() || !type) {
      Alert.alert('Error', 'Please enter a label and select a type');
      return;
    }

    setIsCreating(true);
    try {
      await apiClient.createButton({
        profile_id: profileId,
        label: label.trim(),
        type,
      });
      setLabel('');
      onSuccess();
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create button');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable 
          style={[
            styles.modalContent, 
            isLandscape && styles.modalContentLandscape
          ]} 
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>CREATE NEW BUTTON</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={styles.modalBody}>
            <ScrollView contentContainerStyle={styles.modalBodyContent}>
              <View style={[
                styles.formContainer,
                isLandscape && styles.formContainerLandscape
              ]}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Button Label</Text>
                  <TextInput
                    style={styles.input}
                    value={label}
                    onChangeText={setLabel}
                    placeholder="Enter button name"
                    placeholderTextColor="#525252"
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Button Type</Text>
                  <TouchableOpacity
                    style={styles.selectButton}
                    onPress={() => setShowTypePicker(true)}
                  >
                    <Text style={styles.selectButtonText}>{type || 'Select type'}</Text>
                    <Text style={styles.selectButtonArrow}>▼</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>

          {/* Type Picker Modal (Nested) */}
          {showTypePicker && (
            <Modal
              visible={showTypePicker}
              transparent
              animationType="fade"
              onRequestClose={() => setShowTypePicker(false)}
            >
              <Pressable
                style={styles.pickerOverlay}
                onPress={() => setShowTypePicker(false)}
              >
                <Pressable style={styles.pickerContainer} onPress={(e) => e.stopPropagation()}>
                  <View style={styles.pickerHeader}>
                    <Text style={styles.pickerTitle}>Select Type</Text>
                    <TouchableOpacity onPress={() => setShowTypePicker(false)}>
                      <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={{ maxHeight: 300 }}>
                    {pluginSchemas.map((schema) => (
                      <TouchableOpacity
                        key={schema.type}
                        style={[
                          styles.pickerOption,
                          type === schema.type && styles.pickerOptionActive,
                        ]}
                        onPress={() => {
                          setType(schema.type);
                          setShowTypePicker(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.pickerOptionText,
                            type === schema.type && styles.pickerOptionTextActive,
                          ]}
                        >
                          {schema.type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </Pressable>
              </Pressable>
            </Modal>
          )}

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createButton, isCreating && styles.createButtonDisabled]}
              onPress={handleCreate}
              disabled={isCreating || !label.trim()}
            >
              {isCreating ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={styles.createButtonText}>Create</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#171717',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#262626',
    width: '100%',
    maxWidth: 450,
    maxHeight: '90%',
    overflow: 'hidden',
    flexDirection: 'column',
  },
  modalContentLandscape: {
    maxWidth: 600, // Wider for landscape
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
    backgroundColor: '#171717',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
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
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 24,
  },
  formContainer: {
    flexDirection: 'column',
    gap: 20,
  },
  formContainerLandscape: {
    flexDirection: 'row', // Side by side inputs
    gap: 16,
  },
  inputGroup: {
    flex: 1,
    gap: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A3A3A3',
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
    minHeight: 50,
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
    minHeight: 50,
  },
  selectButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  selectButtonArrow: {
    fontSize: 12,
    color: '#525252',
    marginLeft: 8,
  },
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
    backgroundColor: '#262626',
  },
  pickerOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pickerOptionTextActive: {
    color: '#10B981',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#262626',
    gap: 12,
    backgroundColor: '#171717',
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#737373',
  },
  createButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    minWidth: 100,
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
  },
});