import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { reportAbuse, AbuseReportReason, AbuseReportTarget } from '@/lib/api';

const c = Colors.dark;

const REASONS: { value: AbuseReportReason; label: string; description: string }[] = [
  { value: 'SPAM', label: 'Spam or misleading', description: 'Repeated or misleading listings' },
  { value: 'INAPPROPRIATE', label: 'Inappropriate content', description: 'Offensive, adult, or illegal' },
  { value: 'HARASSMENT', label: 'Harassment or hate', description: 'Targeted abuse or hate speech' },
  { value: 'SCAM', label: 'Scam or fraud', description: 'Fake listings, misrepresentation' },
  { value: 'OTHER', label: 'Something else', description: 'Please describe below' },
];

export function ReportModal({
  visible,
  onClose,
  targetType,
  targetId,
  targetLabel,
}: {
  visible: boolean;
  onClose: () => void;
  targetType: AbuseReportTarget;
  targetId: string;
  targetLabel?: string;
}) {
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState<AbuseReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetAndClose = () => {
    setReason(null);
    setDetails('');
    setSubmitting(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!reason || submitting) return;
    setSubmitting(true);
    try {
      await reportAbuse({
        targetType,
        targetId,
        reason,
        details: details.trim() || undefined,
      });
      if (Platform.OS === 'web') {
        alert('Thanks — your report has been sent to our moderation team.');
      } else {
        Alert.alert(
          'Report submitted',
          'Thanks — our moderation team will review this within 24 hours.',
          [{ text: 'OK', onPress: resetAndClose }],
        );
        return;
      }
      resetAndClose();
    } catch (e: any) {
      const msg = e?.message || 'Could not submit report. Try again.';
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={resetAndClose}>
      <TouchableWithoutFeedback onPress={resetAndClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
            >
              <View style={styles.dragHandle} />
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>Report {targetType === 'VENDOR' ? 'vendor' : 'item'}</Text>
                  {targetLabel ? <Text style={styles.subtitle} numberOfLines={1}>{targetLabel}</Text> : null}
                </View>
                <Pressable onPress={resetAndClose} hitSlop={8} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={c.text} />
                </Pressable>
              </View>

              <ScrollView
                style={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.sectionLabel}>Reason</Text>
                <View style={styles.reasonsList}>
                  {REASONS.map((r) => {
                    const active = reason === r.value;
                    return (
                      <Pressable
                        key={r.value}
                        onPress={() => setReason(r.value)}
                        style={({ pressed }) => [
                          styles.reasonRow,
                          active && styles.reasonRowActive,
                          { opacity: pressed ? 0.8 : 1 },
                        ]}
                      >
                        <View style={[styles.radio, active && styles.radioActive]}>
                          {active ? <View style={styles.radioInner} /> : null}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.reasonLabel}>{r.label}</Text>
                          <Text style={styles.reasonDescription}>{r.description}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Additional details (optional)</Text>
                <TextInput
                  value={details}
                  onChangeText={setDetails}
                  placeholder="What happened? Add any helpful context."
                  placeholderTextColor={c.textTertiary}
                  multiline
                  maxLength={1000}
                  style={styles.detailsInput}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{details.length} / 1000</Text>

                <Text style={styles.disclaimer}>
                  Reports are reviewed by our moderation team within 24 hours. Abuse of the reporting system
                  may result in account restrictions.
                </Text>
              </ScrollView>

              <View style={styles.footer}>
                <Pressable
                  onPress={resetAndClose}
                  style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.7 : 1 }]}
                  disabled={submitting}
                >
                  <Text style={styles.secondaryBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSubmit}
                  disabled={!reason || submitting}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    (!reason || submitting) && styles.primaryBtnDisabled,
                    { opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Submit report</Text>
                  )}
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: '90%',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: c.text,
  },
  subtitle: {
    fontSize: 13,
    color: c.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: c.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flexGrow: 0,
  },
  sectionLabel: {
    fontSize: 12,
    color: c.textTertiary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  reasonsList: {
    gap: 8,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.borderLight,
    backgroundColor: c.surfaceElevated,
  },
  reasonRowActive: {
    borderColor: c.accent,
    backgroundColor: c.accentDim,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: c.accent,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: c.accent,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: c.text,
  },
  reasonDescription: {
    fontSize: 12,
    color: c.textSecondary,
    marginTop: 2,
  },
  detailsInput: {
    backgroundColor: c.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.borderLight,
    padding: 12,
    fontSize: 14,
    color: c.text,
    minHeight: 90,
  },
  charCount: {
    fontSize: 11,
    color: c.textTertiary,
    textAlign: 'right',
    marginTop: 4,
  },
  disclaimer: {
    fontSize: 11,
    color: c.textTertiary,
    lineHeight: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: c.borderLight,
    marginTop: 8,
  },
  secondaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textSecondary,
  },
  primaryBtn: {
    flex: 1.2,
    height: 48,
    borderRadius: 12,
    backgroundColor: c.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: {
    backgroundColor: c.surfaceHighlight,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
