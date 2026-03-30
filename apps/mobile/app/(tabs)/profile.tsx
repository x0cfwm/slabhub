import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/colors';
import {
  PaymentMethod,
  FulfillmentOption,
  PAYMENT_LABELS,
  FULFILLMENT_LABELS,
} from '@/constants/types';
import { listStatuses } from '@/lib/api';
import { WorkflowStatus } from '@/lib/types';

const c = Colors.dark;

const ALL_PAYMENTS: PaymentMethod[] = ['paypal_gs', 'venmo', 'zelle', 'cashapp', 'cash', 'crypto', 'other'];
const ALL_FULFILLMENTS: FulfillmentOption[] = ['shipping', 'meetups_local', 'meetups_travel'];
const EMBEDDED_APP_CONFIG = require('../../app.json') as {
  expo?: {
    ios?: { buildNumber?: string };
    android?: { versionCode?: number };
  };
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useApp();
  const { signOut, user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [localProfile, setLocalProfile] = useState(profile);
  const [newTradeshow, setNewTradeshow] = useState({ name: '', date: '', link: '' });
  const [newReference, setNewReference] = useState({ name: '', link: '' });
  const [statuses, setStatuses] = useState<WorkflowStatus[]>([]);
  const appVersion =
    Constants.nativeAppVersion ??
    Constants.expoConfig?.version ??
    'unknown';
  const buildNumber =
    Constants.nativeBuildVersion ??
    Constants.expoConfig?.ios?.buildNumber ??
    EMBEDDED_APP_CONFIG.expo?.ios?.buildNumber ??
    Constants.expoConfig?.android?.versionCode?.toString() ??
    EMBEDDED_APP_CONFIG.expo?.android?.versionCode?.toString() ??
    'unknown';
  const handleOpenWebVersion = async () => {
    const url = 'https://slabhub.gg';

    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('Unable to open link', 'This device cannot open the web version right now.');
        return;
      }

      await Linking.openURL(url);
    } catch {
      Alert.alert('Unable to open link', 'Failed to open the web version.');
    }
  };

  React.useEffect(() => {
    fetchStatuses();
  }, []);

  const fetchStatuses = async () => {
    try {
      const data = await listStatuses(true);
      setStatuses(data);
    } catch (err) {
      console.error('Failed to fetch statuses:', err);
    }
  };

  React.useEffect(() => {
    if (!editing) {
      setLocalProfile(profile);
    }
  }, [profile, editing]);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const handleSave = async () => {
    await updateProfile(localProfile);
    setEditing(false);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleEdit = () => {
    setLocalProfile(profile);
    setEditing(true);
  };

  const togglePayment = (method: PaymentMethod) => {
    const current = localProfile.paymentMethods;
    const updated = current.includes(method)
      ? current.filter((m) => m !== method)
      : [...current, method];
    setLocalProfile({ ...localProfile, paymentMethods: updated });
  };

  const toggleFulfillment = (option: FulfillmentOption) => {
    const current = localProfile.fulfillmentOptions;
    const updated = current.includes(option)
      ? current.filter((o) => o !== option)
      : [...current, option];
    setLocalProfile({ ...localProfile, fulfillmentOptions: updated });
  };

  const addTradeshow = () => {
    if (newTradeshow.name.trim()) {
      setLocalProfile({
        ...localProfile,
        tradeshows: [...localProfile.tradeshows, { ...newTradeshow }],
      });
      setNewTradeshow({ name: '', date: '', link: '' });
    }
  };

  const removeTradeshow = (index: number) => {
    setLocalProfile({
      ...localProfile,
      tradeshows: localProfile.tradeshows.filter((_, i) => i !== index),
    });
  };

  const addReference = () => {
    if (newReference.name.trim()) {
      setLocalProfile({
        ...localProfile,
        references: [...localProfile.references, { ...newReference }],
      });
      setNewReference({ name: '', link: '' });
    }
  };

  const removeReference = (index: number) => {
    setLocalProfile({
      ...localProfile,
      references: localProfile.references.filter((_, i) => i !== index),
    });
  };

  const displayProfile = editing ? localProfile : profile;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>SlabHub</Text>
          <Text style={styles.title}>Profile</Text>
        </View>
        {editing ? (
          <View style={styles.headerActions}>
            <Pressable
              style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => setEditing(false)}
            >
              <Ionicons name="close" size={22} color={c.textSecondary} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.saveBtn, { opacity: pressed ? 0.8 : 1 }]}
              onPress={handleSave}
            >
              <Ionicons name="checkmark" size={20} color={c.accentText} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.editBtn, { opacity: pressed ? 0.8 : 1 }]}
            onPress={handleEdit}
          >
            <Feather name="edit-2" size={18} color={c.accent} />
          </Pressable>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shop Info</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Username / Shop Name</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={localProfile.username}
                onChangeText={(t) => setLocalProfile({ ...localProfile, username: t })}
                placeholder="Your shop name"
                placeholderTextColor={c.textTertiary}
              />
            ) : (
              <Text style={styles.fieldValue}>{displayProfile.username || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            <Text style={styles.fieldValue}>{user?.email || 'N/A'}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Handle (URL slug)</Text>
            {editing ? (
              <View style={styles.handleRow}>
                <Text style={styles.handlePrefix}>@</Text>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={localProfile.handle}
                  onChangeText={(t) => setLocalProfile({ ...localProfile, handle: t.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  placeholder="your-handle"
                  placeholderTextColor={c.textTertiary}
                  autoCapitalize="none"
                />
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.fieldValue}>
                  {displayProfile.handle ? `@${displayProfile.handle}` : 'Not set'}
                </Text>
                {displayProfile.handle && (
                  <Pressable
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, padding: 4 }]}
                    onPress={async () => {
                      const url = `https://slabhub.gg/vendor?handle=${displayProfile.handle}`;
                      await Clipboard.setStringAsync(url);
                      Alert.alert('Link Copied', 'Your store link has been copied to clipboard.');
                    }}
                  >
                    <Feather name="copy" size={16} color={c.accent} />
                  </Pressable>
                )}
              </View>
            )}
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Location</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={localProfile.location}
                onChangeText={(t) => setLocalProfile({ ...localProfile, location: t })}
                placeholder="City, State"
                placeholderTextColor={c.textTertiary}
              />
            ) : (
              <Text style={styles.fieldValue}>{displayProfile.location || 'Not set'}</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Methods</Text>
          <View style={styles.chipGrid}>
            {ALL_PAYMENTS.map((method) => {
              const isSelected = displayProfile.paymentMethods.includes(method);
              return (
                <Pressable
                  key={method}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={editing ? () => togglePayment(method) : undefined}
                  disabled={!editing}
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
              const isSelected = displayProfile.fulfillmentOptions.includes(option);
              return (
                <Pressable
                  key={option}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={editing ? () => toggleFulfillment(option) : undefined}
                  disabled={!editing}
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tradeshows</Text>
          {displayProfile.tradeshows.map((show, i) => (
            <View key={i} style={styles.listItem}>
              <View style={styles.listItemInfo}>
                <View style={styles.tradeshowHeader}>
                  <Text style={styles.listItemName}>{show.name}</Text>
                  {show.date ? <Text style={styles.listItemDate}>{show.date}</Text> : null}
                </View>
                {show.link ? <Text style={styles.listItemLink} numberOfLines={1}>{show.link}</Text> : null}
              </View>
              {editing && (
                <Pressable onPress={() => removeTradeshow(i)} hitSlop={8}>
                  <Ionicons name="close-circle" size={20} color={c.error} />
                </Pressable>
              )}
            </View>
          ))}
          {editing && (
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
          )}
          {displayProfile.tradeshows.length === 0 && !editing && (
            <Text style={styles.emptyField}>No tradeshows added</Text>
          )}
        </View>


        <View style={styles.section}>
          <Text style={styles.sectionTitle}>References</Text>
          {displayProfile.references.map((ref, i) => (
            <View key={i} style={styles.listItem}>
              <View style={styles.listItemInfo}>
                <Text style={styles.listItemName}>{ref.name}</Text>
                {ref.link ? <Text style={styles.listItemLink} numberOfLines={1}>{ref.link}</Text> : null}
              </View>
              {editing && (
                <Pressable onPress={() => removeReference(i)} hitSlop={8}>
                  <Ionicons name="close-circle" size={20} color={c.error} />
                </Pressable>
              )}
            </View>
          ))}
          {editing && (
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
          )}
          {displayProfile.references.length === 0 && !editing && (
            <Text style={styles.emptyField}>No references added</Text>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Workflow & Kanban</Text>
            <View style={styles.webNote}>
              <Text style={styles.webNoteText}>Web Only</Text>
            </View>
          </View>
          <View style={styles.statusGrid}>
            {statuses.map((status) => (
              <View 
                key={status.id} 
                style={[
                  styles.statusChip, 
                  !status.isEnabled && styles.statusDisabled,
                  !status.showOnKanban && styles.statusHidden
                ]}
              >
                <View style={[styles.statusColor, { backgroundColor: status.color || '#94a3b8' }]} />
                <Text style={[styles.statusChipText, !status.isEnabled && { color: c.textTertiary }]}>
                  {status.name}
                </Text>
                {!status.showOnKanban && <Feather name="eye-off" size={10} color={c.textTertiary} style={{marginLeft: 4}} />}
              </View>
            ))}
          </View>
          <Text style={styles.managementNote}>
            Kanban customization is available on web version
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wishlist</Text>
          {editing ? (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={localProfile.wishlist}
              onChangeText={(t) => setLocalProfile({ ...localProfile, wishlist: t })}
              placeholder="What are you looking to buy?"
              placeholderTextColor={c.textTertiary}
              multiline
              numberOfLines={4}
            />
          ) : (
            <Text style={styles.fieldValue}>{displayProfile.wishlist || 'Not set'}</Text>
          )}
        </View>

        <Pressable
          style={({ pressed }) => [styles.webVersionBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={handleOpenWebVersion}
        >
          <Ionicons name="globe-outline" size={18} color={c.accent} />
          <Text style={styles.webVersionText}>Open SlabHub.gg</Text>
        </Pressable>

        {!editing && (
          <Pressable
            style={({ pressed }) => [styles.logoutBtn, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => {
              if (Platform.OS === 'web') {
                if (window.confirm('Are you sure you want to log out?')) {
                  signOut();
                }
              } else {
                Alert.alert(
                  'Logout',
                  'Are you sure you want to log out?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Logout', style: 'destructive', onPress: signOut },
                  ]
                );
              }
            }}
          >
            <Ionicons name="log-out-outline" size={20} color={c.error} />
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        )}

        <View style={styles.versionFooter}>
          <Text style={styles.versionText}>Version {appVersion}</Text>
          <Text style={styles.versionDivider}>•</Text>
          <Text style={styles.versionText}>Build {buildNumber}</Text>
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  brand: {
    fontSize: 13,
    color: c.accent,
    fontWeight: '600' as const,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: c.text,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.borderLight,
  },
  cancelBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: '600' as const,
    color: c.text,
  },
  field: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 12,
    color: c.textTertiary,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  fieldValue: {
    fontSize: 15,
    color: c.textSecondary,
    lineHeight: 22,
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
    letterSpacing: 0,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    letterSpacing: 0,
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
    fontWeight: '500' as const,
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
    fontWeight: '600' as const,
    color: c.text,
  },
  listItemLink: {
    fontSize: 12,
    color: c.info,
    marginTop: 2,
  },
  addItemForm: {
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
  addItemFormVertical: {
    gap: 8,
  },
  addItemRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  tradeshowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemDate: {
    fontSize: 12,
    color: c.textTertiary,
    fontWeight: '500',
  },
  emptyField: {
    fontSize: 14,
    color: c.textTertiary,
    fontStyle: 'italic',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: c.borderLight,
    marginTop: 8,
  },
  webVersionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: c.borderLight,
  },
  versionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 4,
    paddingBottom: 8,
  },
  versionText: {
    fontSize: 12,
    color: c.textTertiary,
    fontWeight: '500' as const,
  },
  versionDivider: {
    fontSize: 12,
    color: c.textTertiary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  webNote: {
    backgroundColor: c.accentDim,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: c.accent,
  },
  webNoteText: {
    fontSize: 10,
    color: c.accent,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: c.surfaceHighlight,
    borderWidth: 1,
    borderColor: c.border,
  },
  statusDisabled: {
    opacity: 0.4,
    borderStyle: 'dashed',
  },
  statusHidden: {
    opacity: 0.7,
    backgroundColor: 'transparent',
    borderColor: c.borderLight,
  },
  statusColor: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusChipText: {
    fontSize: 13,
    color: c.textSecondary,
    fontWeight: '600',
  },
  managementNote: {
    fontSize: 11,
    color: c.textTertiary,
    marginTop: 12,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  logoutText: {
    color: c.error,
    fontSize: 16,
    fontWeight: '600',
  },
  webVersionText: {
    color: c.accent,
    fontSize: 16,
    fontWeight: '600',
  },
});
