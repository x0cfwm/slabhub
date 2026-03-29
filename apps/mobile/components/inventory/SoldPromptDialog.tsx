import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';

const c = Colors.dark;

interface SoldPromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { soldPrice: number; soldDate: string }) => Promise<void>;
  itemName?: string;
  listingPrice?: number;
}

export function SoldPromptDialog({ isOpen, onClose, onConfirm, itemName, listingPrice }: SoldPromptDialogProps) {
  const [soldPrice, setSoldPrice] = useState<string>("");
  const [soldDate, setSoldDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSoldPrice("");
      setSoldDate(new Date().toISOString().split("T")[0]);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    const price = parseFloat(soldPrice);
    if (isNaN(price)) return;
    
    setLoading(true);
    try {
      await onConfirm({ soldPrice: price, soldDate });
      onClose();
    } catch (error) {
      console.error("Failed to confirm sale:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.content}>
                <View style={styles.header}>
                  <Text style={styles.title}>Mark as Sold</Text>
                  <Text style={styles.subtitle}>
                    {itemName ? `Enter final sale details for ${itemName}` : "Enter final sale details for this item."}
                  </Text>
                </View>

                <View style={styles.body}>
                  <View style={styles.inputGroup}>
                    <View style={styles.labelRow}>
                      <Ionicons name="cash-outline" size={12} color={c.textSecondary} />
                      <Text style={styles.label}>SALE PRICE ($)</Text>
                    </View>
                    <TextInput
                      style={styles.input}
                      value={soldPrice}
                      onChangeText={setSoldPrice}
                      placeholder="0.00"
                      placeholderTextColor={c.textTertiary}
                      keyboardType="decimal-pad"
                      autoFocus
                    />
                    {listingPrice && listingPrice > 0 && String(listingPrice) !== soldPrice && (
                      <Pressable 
                        style={styles.suggestion}
                        onPress={() => setSoldPrice(listingPrice.toString())}
                      >
                        <Ionicons name="trending-up-outline" size={14} color={c.accent} />
                        <Text style={styles.suggestionText}>
                          Use <Text style={styles.suggestionPrice}>${listingPrice}</Text> listing price
                        </Text>
                      </Pressable>
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <View style={styles.labelRow}>
                      <Ionicons name="calendar-outline" size={12} color={c.textSecondary} />
                      <Text style={styles.label}>DATE SOLD</Text>
                    </View>
                    <TextInput
                      style={styles.input}
                      value={soldDate}
                      onChangeText={setSoldDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={c.textTertiary}
                      maxLength={10}
                    />
                  </View>
                </View>

                <View style={styles.footer}>
                  <Pressable
                    style={styles.cancelBtn}
                    onPress={onClose}
                    disabled={loading}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.confirmBtn, (loading || !soldPrice) && styles.confirmBtnDisabled]}
                    onPress={handleConfirm}
                    disabled={loading || !soldPrice}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color={c.accentText} />
                    ) : (
                      <Text style={styles.confirmBtnText}>Confirm Sale</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  keyboardView: {
    width: '100%',
  },
  content: {
    backgroundColor: c.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: c.border,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: c.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: c.textSecondary,
    lineHeight: 20,
  },
  body: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: c.textSecondary,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: c.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: c.text,
    fontSize: 16,
    fontWeight: '600',
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  suggestionText: {
    fontSize: 12,
    color: c.textSecondary,
  },
  suggestionPrice: {
    fontWeight: '800',
    color: c.accent,
    textDecorationLine: 'underline',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 32,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  cancelBtnText: {
    color: c.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  confirmBtn: {
    backgroundColor: c.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: c.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnText: {
    color: c.accentText,
    fontSize: 14,
    fontWeight: '700',
  },
});
