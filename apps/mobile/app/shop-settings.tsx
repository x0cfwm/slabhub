import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  Alert,
  KeyboardAvoidingView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';
import { getVendorPage, uploadMedia } from '@/lib/api';
import Colors from '@/constants/colors';
import {
  PaymentMethod,
  FulfillmentOption,
  PAYMENT_LABELS,
  FULFILLMENT_LABELS,
} from '@/constants/types';

const c = Colors.dark;

const ALL_PAYMENTS: PaymentMethod[] = ['paypal_gs', 'venmo', 'zelle', 'cashapp', 'cash', 'crypto', 'other'];
const ALL_FULFILLMENTS: FulfillmentOption[] = ['shipping', 'meetups_local', 'meetups_travel'];

type HandleStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export default function ShopSettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { profile, updateProfile } = useApp();
  const [localProfile, setLocalProfile] = useState(profile);
  const [newTradeshow, setNewTradeshow] = useState({ name: '', date: '', link: '' });
  const [newReference, setNewReference] = useState({ name: '', link: '' });
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [handleStatus, setHandleStatus] = useState<HandleStatus>('idle');
  const handleCheckTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasChangesRef = useRef(false);
  hasChangesRef.current = hasChanges;

  useEffect(() => {
    setLocalProfile(profile);
    setHasChanges(false);
  }, [profile]);

  // Debounced handle availability check
  useEffect(() => {
    const candidate = localProfile.handle.trim().toLowerCase();
    if (handleCheckTimeout.current) clearTimeout(handleCheckTimeout.current);

    if (!candidate) {
      setHandleStatus('idle');
      return;
    }
    if (!/^[a-z0-9][a-z0-9-]{1,29}$/.test(candidate)) {
      setHandleStatus('invalid');
      return;
    }
    if (candidate === (profile.handle || '').toLowerCase()) {
      setHandleStatus('available');
      return;
    }

    setHandleStatus('checking');
    handleCheckTimeout.current = setTimeout(async () => {
      try {
        await getVendorPage(candidate);
        setHandleStatus('taken');
      } catch {
        setHandleStatus('available');
      }
    }, 400);

    return () => {
      if (handleCheckTimeout.current) clearTimeout(handleCheckTimeout.current);
    };
  }, [localProfile.handle, profile.handle]);

  // Unsaved-changes guard
  useEffect(() => {
    const unsub = (navigation as any).addListener('beforeRemove', (e: any) => {
      if (!hasChangesRef.current || saving) return;
      e.preventDefault();
      Alert.alert(
        'Discard changes?',
        'You have unsaved changes. Leave without saving?',
        [
          { text: 'Keep editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => (navigation as any).dispatch(e.data.action),
          },
        ],
      );
    });
    return unsub;
  }, [navigation, saving]);

  const markChanged = () => setHasChanges(true);

  const pickShopImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need gallery permissions to pick an image.');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;
    setUploadingAvatar(true);
    try {
      const { mediaId, url } = await uploadMedia(uri);
      setLocalProfile({ ...localProfile, avatarId: mediaId, avatarUrl: url });
      markChanged();
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      Alert.alert('Upload failed', 'Could not upload shop image. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeShopImage = () => {
    setLocalProfile({ ...localProfile, avatarId: null, avatarUrl: null });
    markChanged();
  };

  const canSave = hasChanges && handleStatus !== 'taken' && handleStatus !== 'invalid' && handleStatus !== 'checking';

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(localProfile);
      hasChangesRef.current = false;
      setHasChanges(false);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.back();
    } catch (e) {
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const togglePayment = (method: PaymentMethod) => {
    const current = localProfile.paymentMethods;
    const updated = current.includes(method)
      ? current.filter((m) => m !== method)
      : [...current, method];
    setLocalProfile({ ...localProfile, paymentMethods: updated });
    markChanged();
  };

  const toggleFulfillment = (option: FulfillmentOption) => {
    const current = localProfile.fulfillmentOptions;
    const updated = current.includes(option)
      ? current.filter((o) => o !== option)
      : [...current, option];
    setLocalProfile({ ...localProfile, fulfillmentOptions: updated });
    markChanged();
  };

  const addTradeshow = () => {
    if (newTradeshow.name.trim()) {
      setLocalProfile({
        ...localProfile,
        tradeshows: [...localProfile.tradeshows, { ...newTradeshow }],
      });
      setNewTradeshow({ name: '', date: '', link: '' });
      markChanged();
    }
  };

  const removeTradeshow = (index: number) => {
    setLocalProfile({
      ...localProfile,
      tradeshows: localProfile.tradeshows.filter((_, i) => i !== index),
    });
    markChanged();
  };

  const addReference = () => {
    if (newReference.name.trim()) {
      setLocalProfile({
        ...localProfile,
        references: [...localProfile.references, { ...newReference }],
      });
      setNewReference({ name: '', link: '' });
      markChanged();
    }
  };

  const removeReference = (index: number) => {
    setLocalProfile({
      ...localProfile,
      references: localProfile.references.filter((_, i) => i !== index),
    });
    markChanged();
  };

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Shop Settings</Text>
        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            !canSave && styles.saveBtnDisabled,
            { opacity: pressed && canSave ? 0.8 : 1 },
          ]}
          onPress={handleSave}
          disabled={!canSave || saving}
        >
          <Text style={[styles.saveBtnText, !canSave && styles.saveBtnTextDisabled]}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Visibility */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Visibility</Text>
            {(() => {
              const canActivate = !!localProfile.handle && !!localProfile.username && handleStatus !== 'taken' && handleStatus !== 'invalid';
              const isActive = localProfile.isActive && canActivate;
              const missingName = !localProfile.username;
              const missingHandle = !localProfile.handle;
              let hintText: string;
              if (missingName && missingHandle) hintText = 'Add a shop name and handle to go live';
              else if (missingName) hintText = 'Add a shop name to go live';
              else if (missingHandle) hintText = 'Add a handle to go live';
              else if (handleStatus === 'taken') hintText = 'Handle is taken — pick another to go live';
              else if (handleStatus === 'invalid') hintText = 'Handle is invalid — fix it to go live';
              else if (isActive) hintText = `Visible at slabhub.gg/vendor/${localProfile.handle}`;
              else hintText = 'Your shop is hidden from buyers';

              return (
                <View style={styles.activeToggleRow}>
                  <View style={styles.activeToggleInfo}>
                    <View style={[styles.activeToggleDot, { backgroundColor: isActive ? c.success : c.textTertiary }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activeToggleLabel}>
                        {isActive ? 'Shop is Active' : 'Shop is Inactive'}
                      </Text>
                      <Text style={styles.activeToggleHint}>{hintText}</Text>
                    </View>
                  </View>
                  <Switch
                    value={isActive}
                    disabled={!canActivate}
                    onValueChange={(value) => {
                      setLocalProfile({ ...localProfile, isActive: value });
                      markChanged();
                    }}
                    trackColor={{ false: c.surfaceHighlight, true: c.success + '40' }}
                    thumbColor={isActive ? c.success : c.textTertiary}
                    ios_backgroundColor={c.surfaceHighlight}
                  />
                </View>
              );
            })()}
          </View>

          {/* Shop Identity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shop Identity</Text>
            <View style={styles.logoRow}>
              <Pressable
                style={({ pressed }) => [styles.avatarPicker, { opacity: pressed ? 0.8 : 1 }]}
                onPress={pickShopImage}
                disabled={uploadingAvatar}
              >
                {localProfile.avatarUrl ? (
                  <Image source={{ uri: localProfile.avatarUrl }} style={styles.avatarImage} contentFit="cover" />
                ) : (
                  <Ionicons name="storefront-outline" size={24} color={c.textTertiary} />
                )}
                {uploadingAvatar && (
                  <View style={styles.avatarOverlay}>
                    <ActivityIndicator size="small" color={c.text} />
                  </View>
                )}
              </Pressable>
              <View style={styles.logoInfo}>
                <Text style={styles.logoLabel}>Shop Logo</Text>
                <Text style={styles.logoHelper}>Square image, shown on your storefront</Text>
              </View>
              <View style={styles.logoActions}>
                <Pressable onPress={pickShopImage} disabled={uploadingAvatar} hitSlop={6}>
                  <Text style={styles.logoActionText}>
                    {localProfile.avatarUrl ? 'Change' : 'Upload'}
                  </Text>
                </Pressable>
                {localProfile.avatarUrl && !uploadingAvatar ? (
                  <Pressable onPress={removeShopImage} hitSlop={6}>
                    <Text style={[styles.logoActionText, { color: c.error }]}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Shop Name</Text>
              <TextInput
                style={styles.input}
                value={localProfile.username}
                onChangeText={(t) => { setLocalProfile({ ...localProfile, username: t }); markChanged(); }}
                placeholder="Your shop name"
                placeholderTextColor={c.textTertiary}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Handle (URL slug)</Text>
              <View style={styles.handleRow}>
                <Text style={styles.handlePrefix}>@</Text>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={localProfile.handle}
                  onChangeText={(t) => {
                    setLocalProfile({ ...localProfile, handle: t.toLowerCase().replace(/[^a-z0-9-]/g, '') });
                    markChanged();
                  }}
                  placeholder="your-handle"
                  placeholderTextColor={c.textTertiary}
                  autoCapitalize="none"
                />
              </View>
              {localProfile.handle ? (
                <View style={styles.handleStatusRow}>
                  {handleStatus === 'checking' && (
                    <>
                      <ActivityIndicator size="small" color={c.textTertiary} />
                      <Text style={styles.handleHint}>Checking…</Text>
                    </>
                  )}
                  {handleStatus === 'available' && (
                    <>
                      <Ionicons name="checkmark-circle" size={14} color={c.success} />
                      <Text style={[styles.handleHint, { color: c.success }]}>
                        slabhub.gg/vendor/{localProfile.handle}
                      </Text>
                    </>
                  )}
                  {handleStatus === 'taken' && (
                    <>
                      <Ionicons name="close-circle" size={14} color={c.error} />
                      <Text style={[styles.handleHint, { color: c.error }]}>
                        Handle already taken
                      </Text>
                    </>
                  )}
                  {handleStatus === 'invalid' && (
                    <>
                      <Ionicons name="alert-circle" size={14} color={c.error} />
                      <Text style={[styles.handleHint, { color: c.error }]}>
                        3–30 chars, a–z, 0–9, hyphens. Must start with a letter or number.
                      </Text>
                    </>
                  )}
                </View>
              ) : null}
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Location</Text>
              <TextInput
                style={styles.input}
                value={localProfile.location}
                onChangeText={(t) => { setLocalProfile({ ...localProfile, location: t }); markChanged(); }}
                placeholder="City, State"
                placeholderTextColor={c.textTertiary}
              />
            </View>
          </View>



          {/* Payments & Fulfillment */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Methods</Text>
            <View style={styles.chipGrid}>
              {ALL_PAYMENTS.map((method) => {
                const isSelected = localProfile.paymentMethods.includes(method);
                return (
                  <Pressable
                    key={method}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => togglePayment(method)}
                  >
                    {isSelected && <Ionicons name="checkmark" size={14} color={c.accent} />}
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {PAYMENT_LABELS[method]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fulfillment Options</Text>
            <View style={styles.chipGrid}>
              {ALL_FULFILLMENTS.map((option) => {
                const isSelected = localProfile.fulfillmentOptions.includes(option);
                return (
                  <Pressable
                    key={option}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => toggleFulfillment(option)}
                  >
                    {isSelected && <Ionicons name="checkmark" size={14} color={c.accent} />}
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {FULFILLMENT_LABELS[option]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Tradeshows */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            {localProfile.tradeshows.map((show, i) => (
              <View key={i} style={styles.listItem}>
                <View style={styles.listItemInfo}>
                  <View style={styles.tradeshowHeader}>
                    <Text style={styles.listItemName}>{show.name}</Text>
                    {show.date ? <Text style={styles.listItemDate}>{show.date}</Text> : null}
                  </View>
                  {show.link ? <Text style={styles.listItemLink} numberOfLines={1}>{show.link}</Text> : null}
                </View>
                <Pressable onPress={() => removeTradeshow(i)} hitSlop={8}>
                  <Ionicons name="close-circle" size={20} color={c.error} />
                </Pressable>
              </View>
            ))}
            <View style={styles.addItemFormVertical}>
              <View style={styles.addItemRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={newTradeshow.name}
                  onChangeText={(t) => setNewTradeshow({ ...newTradeshow, name: t })}
                  placeholder="Event name"
                  placeholderTextColor={c.textTertiary}
                />
                <TextInput
                  style={[styles.input, { width: 120 }]}
                  value={newTradeshow.date}
                  onChangeText={(t) => setNewTradeshow({ ...newTradeshow, date: t })}
                  placeholder="e.g. March 10"
                  placeholderTextColor={c.textTertiary}
                />
              </View>
              <View style={styles.addItemRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={newTradeshow.link}
                  onChangeText={(t) => setNewTradeshow({ ...newTradeshow, link: t })}
                  placeholder="Link (optional)"
                  placeholderTextColor={c.textTertiary}
                  autoCapitalize="none"
                />
                <Pressable
                  style={[styles.addSmallBtn, !newTradeshow.name.trim() && { opacity: 0.4 }]}
                  onPress={addTradeshow}
                  disabled={!newTradeshow.name.trim()}
                >
                  <Ionicons name="add" size={18} color={c.accentText} />
                </Pressable>
              </View>
            </View>
          </View>

          {/* References */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reference Links</Text>
            {localProfile.references.map((ref, i) => (
              <View key={i} style={styles.listItem}>
                <View style={styles.listItemInfo}>
                  <Text style={styles.listItemName}>{ref.name}</Text>
                  {ref.link ? <Text style={styles.listItemLink} numberOfLines={1}>{ref.link}</Text> : null}
                </View>
                <Pressable onPress={() => removeReference(i)} hitSlop={8}>
                  <Ionicons name="close-circle" size={20} color={c.error} />
                </Pressable>
              </View>
            ))}
            <View style={styles.addItemForm}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={newReference.name}
                onChangeText={(t) => setNewReference({ ...newReference, name: t })}
                placeholder="Source name"
                placeholderTextColor={c.textTertiary}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={newReference.link}
                onChangeText={(t) => setNewReference({ ...newReference, link: t })}
                placeholder="Link"
                placeholderTextColor={c.textTertiary}
                autoCapitalize="none"
              />
              <Pressable
                style={[styles.addSmallBtn, !newReference.name.trim() && { opacity: 0.4 }]}
                onPress={addReference}
                disabled={!newReference.name.trim()}
              >
                <Ionicons name="add" size={18} color={c.accentText} />
              </Pressable>
            </View>
          </View>

          {/* Wishlist */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Wishlist</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={localProfile.wishlist}
              onChangeText={(t) => { setLocalProfile({ ...localProfile, wishlist: t }); markChanged(); }}
              placeholder="What are you looking to buy?"
              placeholderTextColor={c.textTertiary}
              multiline
              numberOfLines={4}
            />
          </View>


        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: c.text,
    textAlign: 'center',
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: c.accent,
  },
  saveBtnDisabled: {
    backgroundColor: c.surfaceHighlight,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: c.accentText,
  },
  saveBtnTextDisabled: {
    color: c.textTertiary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  section: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: c.borderLight,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: c.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  activeToggleInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activeToggleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  activeToggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: c.text,
  },
  activeToggleHint: {
    fontSize: 12,
    color: c.textTertiary,
    marginTop: 2,
  },
  field: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 12,
    color: c.textTertiary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: c.surfaceHighlight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: c.text,
    borderWidth: 1,
    borderColor: c.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  handlePrefix: {
    fontSize: 14,
    color: c.textTertiary,
  },
  handleHint: {
    fontSize: 11,
    color: c.textTertiary,
  },
  handleStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    minHeight: 16,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: c.surfaceHighlight,
    borderWidth: 1,
    borderColor: c.border,
  },
  chipActive: {
    backgroundColor: c.accentDim,
    borderColor: c.accent,
  },
  chipText: {
    fontSize: 13,
    color: c.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: c.accent,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surfaceHighlight,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  listItemInfo: {
    flex: 1,
  },
  listItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: c.text,
  },
  listItemLink: {
    fontSize: 12,
    color: c.info,
    marginTop: 2,
  },
  listItemDate: {
    fontSize: 12,
    color: c.textTertiary,
    fontWeight: '500',
  },
  tradeshowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addItemForm: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  addItemFormVertical: {
    gap: 8,
  },
  addItemRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  addSmallBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoInfo: {
    flex: 1,
    gap: 2,
  },
  logoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: c.text,
  },
  logoHelper: {
    fontSize: 12,
    color: c.textTertiary,
  },
  logoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logoActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.accent,
  },
  avatarPicker: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: c.surfaceHighlight,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },

});
