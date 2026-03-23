import React from 'react';
import { View, StyleSheet, Animated, useWindowDimensions } from 'react-native';
import Colors from '@/constants/colors';

const c = Colors.dark;

interface PaginationDotsProps {
  count: number;
  scrollX: Animated.Value;
  pageWidth: number;
}

export default function PaginationDots({ count, scrollX, pageWidth }: PaginationDotsProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => {
        const inputRange = [
          (i - 1) * pageWidth,
          i * pageWidth,
          (i + 1) * pageWidth,
        ];

        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 24, 8],
          extrapolate: 'clamp',
        });

        const dotOpacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                width: dotWidth,
                opacity: dotOpacity,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: c.accent,
  },
});
