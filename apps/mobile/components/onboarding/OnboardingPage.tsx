import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Colors from '@/constants/colors';

const c = Colors.dark;

interface OnboardingPageProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge: string;
}

export default function OnboardingPage({ icon, title, subtitle, badge }: OnboardingPageProps) {
  const { width } = useWindowDimensions();

  return (
    <View style={[styles.page, { width }]}>
      <View style={styles.content}>
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>

        <View style={styles.iconArea}>
          {icon}
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  content: {
    alignItems: 'center',
    gap: 20,
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
  iconArea: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
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
    paddingHorizontal: 8,
    maxWidth: 340,
  },
});
