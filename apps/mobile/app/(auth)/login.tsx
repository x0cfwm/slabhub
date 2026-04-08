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
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as AppleAuthentication from 'expo-apple-authentication';

const c = Colors.dark;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
  const { signIn, signInWithApple } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(available => {
      console.log(`[LoginScreen] Apple ID availability: ${available}, OS: ${Platform.OS}`);
      setAppleAuthAvailable(available);
    });
  }, []);

  const handleSendCode = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      const { ok } = await signIn(email);
      if (ok) {
        router.push({
          pathname: '/(auth)/otp' as any,
          params: { email },
        });
      } else {
        setError('Failed to send code. Please try again.');
      }
    } catch (e: any) {
      setError(e.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { ok } = await signInWithApple();
      if (ok) {
        // AuthContext will update and _layout will redirect to tabs
      }
    } catch (e: any) {
      setError(e.message || 'Apple Sign In failed');
    } finally {
      setLoading(false);
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
          {/* Logo & Branding */}
          <View style={styles.brandArea}>
            <View style={styles.logoContainer}>
              <MaterialCommunityIcons name="cards-playing-outline" size={44} color={c.accent} />
              <View style={styles.logoRing} />
            </View>

            <Text style={styles.title}>Sign In to{'\n'}SlabHub</Text>
            <Text style={styles.subtitle}>
              The ultimate tool for slab collectors
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View
                style={[
                  styles.inputWrapper,
                  focused && styles.inputWrapperFocused,
                  error ? styles.inputWrapperError : null,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={focused ? c.accent : c.textTertiary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="email@example.com"
                  placeholderTextColor={c.textTertiary}
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    if (error) setError(null);
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  returnKeyType="go"
                  onSubmitEditing={handleSendCode}
                />
              </View>
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
              onPress={handleSendCode}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={c.accentText} />
              ) : (
                <>
                  <Text style={styles.buttonText}>Send Verification Code</Text>
                  <Ionicons name="arrow-forward" size={18} color={c.accentText} />
                </>
              )}
            </Pressable>

            {(appleAuthAvailable || Platform.OS === 'ios') && (
              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.divider} />
              </View>
            )}

            {(appleAuthAvailable || Platform.OS === 'ios') && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={14}
                style={styles.appleButton}
                onPress={handleAppleSignIn}
              />
            )}
          </View>

          {/* Footer */}
          <View style={{ height: 40 }} />
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
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  // Brand
  brandArea: {
    alignItems: 'center',
    marginBottom: 40,
    gap: 16,
  },
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: c.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  logoRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: c.accent + '20',
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
    maxWidth: 300,
  },

  // Form
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textSecondary,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 16,
  },
  inputWrapperFocused: {
    borderColor: c.accent + '60',
    backgroundColor: c.surfaceElevated,
  },
  inputWrapperError: {
    borderColor: c.error + '60',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: c.text,
    fontSize: 16,
    paddingVertical: 16,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
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
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 8,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: c.border,
    opacity: 0.5,
  },
  dividerText: {
    fontSize: 14,
    color: c.textTertiary,
    fontWeight: '500',
  },
  appleButton: {
    width: '100%',
    height: 52,
  },
});
