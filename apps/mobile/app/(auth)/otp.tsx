import * as React from 'react';
import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const c = Colors.dark;

export default function OtpScreen() {
  const insets = useSafeAreaInsets();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const { verifyOtp, signIn } = useAuth();
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();

  const handleVerify = async () => {
    if (!otp || otp.length < 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      const { ok } = await verifyOtp(email, otp);
      if (ok) {
        router.replace('/(tabs)/inventory');
      } else {
        setError('Invalid verification code');
      }
    } catch (e: any) {
      setError(e.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      await signIn(email);
      setResent(true);
      setTimeout(() => setResent(false), 3000);
    } catch (e: any) {
      setError('Failed to resend code');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <Pressable
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
            onPress={() => router.back()}
            hitSlop={12}
          >
            <Ionicons name="arrow-back" size={20} color={c.accent} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          {/* Header */}
          <View style={styles.headerArea}>
            <View style={styles.iconContainer}>
              <Ionicons name="mail-open-outline" size={36} color={c.accent} />
            </View>

            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>Verification</Text>
            </View>

            <Text style={styles.title}>Check Your{'\n'}Email</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to
            </Text>
            <Text style={styles.emailHighlight}>{email}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.otpWrapper}>
              <TextInput
                style={styles.otpInput}
                placeholder="000000"
                placeholderTextColor={c.textTertiary}
                value={otp}
                onChangeText={(t) => {
                  setOtp(t);
                  if (error) setError(null);
                }}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                textAlign="center"
                returnKeyType="go"
                onSubmitEditing={handleVerify}
              />
            </View>

            {error && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={16} color={c.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.button,
                loading && styles.buttonDisabled,
                { opacity: pressed && !loading ? 0.85 : 1 },
              ]}
              onPress={handleVerify}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={c.accentText} />
              ) : (
                <>
                  <Text style={styles.buttonText}>Verify Code</Text>
                  <Ionicons name="checkmark-circle" size={18} color={c.accentText} />
                </>
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.resendBtn, { opacity: pressed ? 0.6 : 1 }]}
              onPress={handleResend}
              disabled={loading || resent}
            >
              {resent ? (
                <View style={styles.resendRow}>
                  <Ionicons name="checkmark" size={16} color={c.success} />
                  <Text style={[styles.resendText, { color: c.success }]}>Code resent!</Text>
                </View>
              ) : (
                <Text style={styles.resendText}>
                  Didn't receive a code?{' '}
                  <Text style={styles.resendHighlight}>Resend</Text>
                </Text>
              )}
            </Pressable>
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
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  // Back
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 16,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.accent,
  },

  // Header
  headerArea: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
    gap: 14,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: c.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: c.accent + '25',
    marginBottom: 4,
  },
  badgeContainer: {
    backgroundColor: c.accentDim,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.accent + '25',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.accent,
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: c.text,
    textAlign: 'center',
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  emailHighlight: {
    fontSize: 15,
    fontWeight: '600',
    color: c.accent,
    textAlign: 'center',
  },

  // Form
  form: {
    gap: 20,
  },
  otpWrapper: {
    backgroundColor: c.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: 4,
    paddingHorizontal: 16,
  },
  otpInput: {
    color: c.text,
    fontSize: 32,
    fontWeight: '700',
    paddingVertical: 16,
    letterSpacing: 12,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  errorText: {
    color: c.error,
    fontSize: 14,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accent,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    shadowColor: c.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    color: c.accentText,
  },
  resendBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resendText: {
    fontSize: 14,
    color: c.textSecondary,
  },
  resendHighlight: {
    color: c.accent,
    fontWeight: '600',
  },
});
