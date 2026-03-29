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

interface ListedPromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { listingPrice: number; sellingDescription: string }) => Promise<void>;
  itemName?: string;
  item?: any;
}

export function ListedPromptDialog({ isOpen, onClose, onConfirm, itemName, item }: ListedPromptDialogProps) {
  const defaultMarketPrice = item?.marketPrice ? String(item.marketPrice) : "";
  const [listingPrice, setListingPrice] = useState<string>(item?.listingPrice ? String(item.listingPrice) : defaultMarketPrice);
  const [sellingDescription, setSellingDescription] = useState<string>(item?.sellingDescription || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setListingPrice(item?.listingPrice ? String(item.listingPrice) : (item?.marketPrice ? String(item.marketPrice) : ""));
      setSellingDescription(item?.sellingDescription || "");
    }
  }, [isOpen, item]);

  const handleConfirm = async () => {
    const price = parseFloat(listingPrice);
    if (isNaN(price)) return;
    
    setLoading(true);
    try {
      await onConfirm({ listingPrice: price, sellingDescription });
      onClose();
    } catch (error) {
      console.error("Failed to confirm listing:", error);
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
                  <Text style={styles.title}>List Item for Sale</Text>
                  <Text style={styles.subtitle}>
                    {itemName ? `Enter listing details for ${itemName}` : "Enter listing details for this item."}
                  </Text>
                </View>

                <View style={styles.body}>
                  <View style={styles.inputGroup}>
                    <View style={styles.labelRow}>
                      <Ionicons name="cash-outline" size={12} color={c.textSecondary} />
                      <Text style={styles.label}>LISTING PRICE ($)</Text>
                    </View>
                    <TextInput
                      style={styles.input}
                      value={listingPrice}
                      onChangeText={setListingPrice}
                      placeholder="0.00"
                      placeholderTextColor={c.textTertiary}
                      keyboardType="decimal-pad"
                      autoFocus
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <View style={styles.labelRow}>
                      <Ionicons name="chatbox-ellipses-outline" size={12} color={c.textSecondary} />
                      <Text style={styles.label}>PUBLIC DESCRIPTION</Text>
                    </View>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={sellingDescription}
                      onChangeText={setSellingDescription}
                      placeholder="Tell buyers about the description, terms, etc."
                      placeholderTextColor={c.textTertiary}
                      multiline
                      numberOfLines={4}
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
                    style={[styles.confirmBtn, (loading || !listingPrice) && styles.confirmBtnDisabled]}
                    onPress={handleConfirm}
                    disabled={loading || !listingPrice}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color={c.accentText} />
                    ) : (
                      <Text style={styles.confirmBtnText}>Confirm Listing</Text>
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    fontSize: 14,
    fontWeight: '400',
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
