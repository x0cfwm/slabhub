import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Alert } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { getOptimizedImageUrl } from '@/lib/image-utils';

export interface ShareCardHandle {
    captureAndShare: () => Promise<void>;
}

interface ShareCardProps {
    item: any;
}

const c = Colors.dark;
const { width } = Dimensions.get('window');

// Dimensions for the shared image (approx 4:5 aspect ratio)
const CARD_WIDTH = width;
const CARD_HEIGHT = width * 1.25;

const ShareCard = forwardRef<ShareCardHandle, ShareCardProps>(({ item }, ref) => {
    const viewRef = useRef<ViewShot>(null);

    useImperativeHandle(ref, () => ({
        captureAndShare: async () => {
            try {
                if (!viewRef.current || !viewRef.current.capture) {
                    console.error("ViewRef missing capture method");
                    return;
                }

                const imageUri = await viewRef.current.capture();

                if (!imageUri) {
                    throw new Error('Failed to capture image');
                }

                const isAvailable = await Sharing.isAvailableAsync();
                if (!isAvailable) {
                    Alert.alert('Error', 'Sharing is not available on this device');
                    return;
                }

                await Sharing.shareAsync(imageUri, {
                    dialogTitle: 'Share this slab!',
                    mimeType: 'image/jpeg',
                    UTI: 'public.jpeg',
                });

            } catch (error) {
                console.error('Error sharing card:', error);
                Alert.alert('Error', 'Failed to share the card. Please try again.');
            }
        }
    }));

    const price = item.listedPrice > 0 ? item.listedPrice : item.marketPrice;
    const priceLabel = item.listedPrice > 0 ? 'Listed Price' : 'Market Price';

    return (
        <View style={styles.hiddenContainer} pointerEvents="none">
            <ViewShot
                ref={viewRef}
                options={{ format: 'jpg', quality: 1.0 }}
                style={styles.captureArea}
            >
                <LinearGradient
                    colors={['#1c1c1e', '#000000']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.card}
                >
                    {/* Inner Card Container */}
                    <View style={styles.innerCard}>
                        {/* Image */}
                        {item.imageUri ? (
                            <Image
                                source={{ uri: getOptimizedImageUrl(item.imageUri, { height: 800 }) }}
                                style={styles.image}
                                contentFit="cover"
                            />
                        ) : (
                            <View style={[styles.image, styles.placeholderImage]} />
                        )}

                        {/* Details */}
                        <View style={styles.detailsContainer}>
                            <View style={styles.titleRow}>
                                <Text style={styles.title} numberOfLines={2}>
                                    {item.name}
                                </Text>
                            </View>

                            {(item.setCode || item.cardNumber || item.setName) && (
                                <Text style={styles.subtitle} numberOfLines={1}>
                                    {item.setCode} {item.cardNumber} {item.setName ? `- ${item.setName}` : ''}
                                </Text>
                            )}

                            <View style={styles.statsRow}>
                                {item.gradingCompany && item.grade ? (
                                    <View style={styles.statBox}>
                                        <Text style={styles.statLabel}>Grade</Text>
                                        <Text style={styles.statValue}>
                                            {item.gradingCompany} {item.grade}
                                        </Text>
                                    </View>
                                ) : null}

                                {Number(price) > 0 && (
                                    <View style={styles.statBox}>
                                        <Text style={styles.statLabel}>{priceLabel}</Text>
                                        <Text style={[styles.statValue, { color: c.accent }]}>
                                            ${Number(price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Brand Footer */}
                        <View style={styles.footer}>
                            <View style={styles.brandRow}>
                                <Text style={styles.brandText}>SlabHub</Text>
                            </View>
                            <Text style={styles.footerTag}>Track your collection</Text>
                        </View>
                    </View>
                </LinearGradient>
            </ViewShot>
        </View>
    );
});

ShareCard.displayName = 'ShareCard';

const styles = StyleSheet.create({
    // Position the card way off-screen so it's rendered but invisible
    hiddenContainer: {
        position: 'absolute',
        // Move slightly off-screen instead of -10000 to prevent iOS from
        // generating an excessively large view bounding box that crashes CoreAnimation.
        left: -width * 2,
        top: 0,
    },
    captureArea: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
    },
    card: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    innerCard: {
        width: '100%',
        backgroundColor: '#2c2c2e',
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
        borderWidth: 1,
        borderColor: '#3a3a3c',
    },
    image: {
        width: '100%',
        aspectRatio: 1, // Square image
        backgroundColor: '#1c1c1e',
    },
    placeholderImage: {
        backgroundColor: '#3a3a3c',
    },
    detailsContainer: {
        padding: 20,
        gap: 8,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: '#ffffff',
        flex: 1,
        lineHeight: 32,
    },
    subtitle: {
        fontSize: 16,
        color: '#a1a1aa',
        fontWeight: '500',
        marginBottom: 6,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 8,
    },
    statBox: {
        flex: 1,
        backgroundColor: '#1c1c1e',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#3a3a3c',
    },
    statLabel: {
        fontSize: 12,
        color: '#a1a1aa',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#ffffff',
    },
    footer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: '#3a3a3c',
        paddingTop: 16,
        marginTop: 4,
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    brandText: {
        fontSize: 20,
        fontWeight: '900',
        color: '#ffffff',
        letterSpacing: -0.5,
    },
    footerTag: {
        fontSize: 12,
        color: '#a1a1aa',
        fontWeight: '500',
    },
});

export default ShareCard;
