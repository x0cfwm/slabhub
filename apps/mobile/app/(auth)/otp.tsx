import * as React from 'react';
import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const c = Colors.dark;

export default function OtpScreen() {
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
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
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const { ok } = await verifyOtp(email, otp);
            if (ok) {
                // Redirect to tabs
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
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await signIn(email);
            // Show some feedback that it was resent
        } catch (e: any) {
            setError('Failed to resend code');
        }
    };

    return (
        <LinearGradient colors={[c.background, '#1a1a1a']} style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.backButtonText}>← Back</Text>
                    </TouchableOpacity>

                    <View style={styles.header}>
                        <Text style={styles.title}>Verify Email</Text>
                        <Text style={styles.subtitle}>Enter the 6-digit code sent to {email}</Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={[styles.input, { letterSpacing: 8 }]}
                                placeholder="000000"
                                placeholderTextColor="#666"
                                value={otp}
                                onChangeText={setOtp}
                                keyboardType="number-pad"
                                maxLength={6}
                                autoFocus
                                textAlign="center"
                            />
                        </View>

                        {error && <Text style={styles.errorText}>{error}</Text>}

                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleVerify}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Verify Code</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.resendButton}
                            onPress={handleResend}
                            disabled={loading}
                        >
                            <Text style={styles.resendText}>Didn't receive a code? <Text style={styles.resendHighlight}>Resend</Text></Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
        paddingTop: 60,
    },
    backButton: {
        marginBottom: 32,
    },
    backButtonText: {
        color: c.tint,
        fontSize: 16,
        fontWeight: '600',
    },
    header: {
        marginBottom: 48,
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#999',
        textAlign: 'center',
        lineHeight: 24,
    },
    form: {
        gap: 24,
    },
    inputContainer: {
        alignItems: 'center',
    },
    input: {
        backgroundColor: '#222',
        borderRadius: 12,
        padding: 16,
        color: '#fff',
        fontSize: 32,
        fontWeight: 'bold',
        width: '100%',
        borderWidth: 1,
        borderColor: '#333',
    },
    button: {
        backgroundColor: c.tint,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    errorText: {
        color: '#ff4444',
        fontSize: 14,
        textAlign: 'center',
    },
    resendButton: {
        alignItems: 'center',
        marginTop: 8,
    },
    resendText: {
        color: '#999',
        fontSize: 14,
    },
    resendHighlight: {
        color: c.tint,
        fontWeight: '600',
    },
});
