import * as React from 'react';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest, queryClient, registerAuthErrorHandler } from '@/lib/query-client';

const TOKEN_KEY = 'slabhub_session_token';
const USER_KEY = 'slabhub_user_data';
const CACHED_USER_DATA_KEYS = ['@slabhub_profile', '@slabhub/recent_shops_v1'];

async function clearLocalCaches() {
    try {
        queryClient.clear();
    } catch (e) {
        console.error('Failed to clear React Query cache:', e);
    }
    try {
        await AsyncStorage.multiRemove(CACHED_USER_DATA_KEYS);
    } catch (e) {
        console.error('Failed to clear cached app data:', e);
    }
}

interface User {
    id: string;
    email: string;
}

interface AuthContextValue {
    user: User | null;
    sessionToken: string | null;
    isLoading: boolean;
    signIn: (email: string) => Promise<{ ok: boolean }>;
    verifyOtp: (email: string, otp: string) => Promise<{ ok: boolean }>;
    signInWithApple: () => Promise<{ ok: boolean }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [sessionToken, setSessionToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const clearSession = useCallback(async () => {
        try {
            if (Platform.OS === 'web') {
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(USER_KEY);
            } else {
                await SecureStore.deleteItemAsync(TOKEN_KEY);
                await SecureStore.deleteItemAsync(USER_KEY);
            }
        } catch (e) {
            console.error('Failed to clear session:', e);
        } finally {
            await clearLocalCaches();
            setSessionToken(null);
            setUser(null);
        }
    }, []);

    useEffect(() => {
        registerAuthErrorHandler(() => {
            void clearSession();
        });
        return () => registerAuthErrorHandler(null);
    }, [clearSession]);

    useEffect(() => {
        loadSession();
    }, []);

    const loadSession = async () => {
        try {
            let token: string | null = null;
            let userData: string | null = null;

            if (Platform.OS === 'web') {
                token = localStorage.getItem(TOKEN_KEY);
                userData = localStorage.getItem(USER_KEY);
            } else {
                token = await SecureStore.getItemAsync(TOKEN_KEY);
                userData = await SecureStore.getItemAsync(USER_KEY);
            }

            console.log('[AuthContext] loadSession token found:', !!token);

            if (token) {
                setSessionToken(token);
                if (userData) {
                    try {
                        setUser(JSON.parse(userData));
                    } catch (e) {
                        console.error('Failed to parse cached user data:', e);
                    }
                }

                // Fetch fresh user info
                try {
                    const res = await apiRequest('GET', '/me');
                    console.log('[AuthContext] loadSession /me status:', res.status);
                    if (res.ok) {
                        const data = await res.json();
                        const freshUser = { id: data.id, email: data.email };
                        setUser(freshUser);

                        // Update cache
                        if (Platform.OS === 'web') {
                            localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
                        } else {
                            await SecureStore.setItemAsync(USER_KEY, JSON.stringify(freshUser));
                        }
                    }
                } catch (e: any) {
                    console.error('Failed to fetch user during session load:', e);
                    // apiRequest will already fire the 401 handler which clears the
                    // session; no further work needed here.
                }
            }
        } catch (e) {
            console.error('Failed to load session:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const signIn = useCallback(async (email: string) => {
        try {
            const res = await apiRequest('POST', '/auth/email/request-otp', { email });
            return { ok: res.ok };
        } catch (e) {
            console.error('Sign in error:', e);
            throw e;
        }
    }, []);

    const verifyOtp = useCallback(async (email: string, otp: string) => {
        try {
            const res = await apiRequest('POST', '/auth/email/verify-otp', { email, otp });
            const data = await res.json();

            if (data.sessionToken) {
                if (Platform.OS === 'web') {
                    localStorage.setItem(TOKEN_KEY, data.sessionToken);
                    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
                } else {
                    await SecureStore.setItemAsync(TOKEN_KEY, data.sessionToken);
                    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
                }
                setSessionToken(data.sessionToken);
                setUser(data.user);
                return { ok: true };
            }
            return { ok: false };
        } catch (e) {
            console.error('Verify OTP error:', e);
            throw e;
        }
    }, []);

    const signInWithApple = useCallback(async () => {
        try {
            if (Platform.OS === 'web') {
                throw new Error('Apple Sign In is not supported on web in this implementation');
            }

            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });

            if (!credential.identityToken) {
                throw new Error('No identity token received from Apple');
            }

            const res = await apiRequest('POST', '/auth/apple', {
                identityToken: credential.identityToken,
                fullName: credential.fullName
                    ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
                    : undefined,
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to sign in with Apple');
            }

            const data = await res.json();

            if (data.sessionToken) {
                await SecureStore.setItemAsync(TOKEN_KEY, data.sessionToken);
                await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
                setSessionToken(data.sessionToken);
                setUser(data.user);
                return { ok: true };
            }
            return { ok: false };
        } catch (e: any) {
            if (e.code === 'ERR_REQUEST_CANCELED') {
                return { ok: false }; // User cancelled
            }
            console.error('Apple Sign In error:', e);
            throw e;
        }
    }, []);

    const signOut = useCallback(async () => {
        try {
            if (sessionToken) {
                await apiRequest('POST', '/auth/logout');
            }
        } catch (e) {
            console.error('Logout error:', e);
        } finally {
            if (Platform.OS === 'web') {
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(USER_KEY);
            } else {
                await SecureStore.deleteItemAsync(TOKEN_KEY);
                await SecureStore.deleteItemAsync(USER_KEY);
            }
            await clearLocalCaches();
            setSessionToken(null);
            setUser(null);
        }
    }, [sessionToken]);

    return (
        <AuthContext.Provider value={{ user, sessionToken, isLoading, signIn, verifyOtp, signInWithApple, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
