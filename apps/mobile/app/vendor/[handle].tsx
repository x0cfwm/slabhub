import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  Image,
  FlatList,
  Share,
  ActivityIndicator,
  Modal,
  Dimensions,
  Linking,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image as ExpoImage } from 'expo-image';
import { BlurView } from 'expo-blur';
import { getVendorPage, trackShopEvent } from '@/lib/api';
import { VendorItem, VendorProfile } from '@/lib/types';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import { ImageZoomModal } from '@/components/inventory/ImageZoomModal';
import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/colors';

const c = Colors.dark;
const SCREEN_WIDTH = Dimensions.get('window').width;

function VendorHeader({ profile }: { profile: VendorProfile }) {
  return (
    <View style={styles.vendorHeader}>
      <View style={styles.vendorHeaderTop}>
        <View style={styles.vendorAvatar}>
          {profile.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.vendorAvatarImage} />
          ) : (
            <Text style={styles.vendorAvatarText}>
              {(profile.shopName || 'V')[0].toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.vendorInfo}>
          <View style={styles.vendorNameRow}>
            <Text style={styles.vendorName} numberOfLines={1}>{profile.shopName}</Text>
            {profile.facebookVerifiedAt && (
              <Ionicons name="checkmark-circle" size={18} color={c.info} />
            )}
          </View>
          <Text style={styles.vendorHandle}>@{profile.handle}</Text>
          {profile.location ? (
            <View style={styles.vendorLocationRow}>
              <Ionicons name="location-outline" size={12} color={c.textTertiary} />
              <Text style={styles.vendorLocationText}>{profile.location}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.vendorBadges}>
        {profile.fulfillmentOptions.map((opt) => (
          <View key={opt} style={styles.vendorBadge}>
            <Ionicons
              name={opt === 'shipping' ? 'airplane-outline' : 'people-outline'}
              size={12}
              color={c.info}
            />
            <Text style={styles.vendorBadgeText}>
              {opt === 'shipping' ? 'Shipping' : opt === 'meetups_local' ? 'Local Meetups' : 'Travel Meetups'}
            </Text>
          </View>
        ))}
        {profile.paymentsAccepted.map((p) => (
          <View key={p} style={styles.vendorBadge}>
            <Ionicons name="card-outline" size={12} color={c.textSecondary} />
            <Text style={[styles.vendorBadgeText, { color: c.textSecondary }]}>{p}</Text>
          </View>
        ))}
        {profile.facebookVerifiedAt && (
          <Pressable
            style={[styles.vendorBadge, { backgroundColor: 'rgba(24, 119, 242, 0.15)', borderColor: '#1877F2' }]}
            onPress={() => profile.facebookProfileUrl && Linking.openURL(profile.facebookProfileUrl)}
          >
            <Ionicons name="logo-facebook" size={12} color="#1877F2" />
            <Text style={[styles.vendorBadgeText, { color: '#1877F2' }]}>Verified</Text>
          </Pressable>
        )}
        {profile.referenceLinks.map((link, i) => (
          <Pressable
            key={`ref-${i}`}
            style={[styles.vendorBadge, { borderColor: c.accent }]}
            onPress={() => link.url && Linking.openURL(link.url)}
          >
            <Feather name="link" size={10} color={c.accent} />
            <Text style={[styles.vendorBadgeText, { color: c.accent }]}>{link.title}</Text>
          </Pressable>
        ))}
      </View>

      {profile.upcomingEvents.length > 0 && (
        <View style={styles.eventsSection}>
          <Text style={styles.eventsSectionLabel}>Upcoming Events</Text>
          {profile.upcomingEvents.map((event, i) => (
            <View key={i} style={styles.eventItem}>
              <Ionicons name="calendar-outline" size={12} color={c.textSecondary} />
              <Text style={styles.eventText}>{event.name}</Text>
              {event.date && <Text style={styles.eventDate}>{event.date}</Text>}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function WishlistEditor({
  initialValue,
  onSave,
}: {
  initialValue: string;
  onSave: (text: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (!editing) setValue(initialValue);
  }, [initialValue, editing]);

  const startEdit = () => {
    setValue(initialValue);
    setEditing(true);
  };

  const cancelEdit = () => {
    setValue(initialValue);
    setEditing(false);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave(value);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <View style={styles.wishlistCard}>
        <Ionicons name="heart-outline" size={16} color={c.accent} style={{ marginTop: 4 }} />
        <View style={{ flex: 1 }}>
          {initialValue ? (
            <Text style={styles.wishlistText}>{initialValue}</Text>
          ) : (
            <Text style={[styles.wishlistText, { fontStyle: 'italic', color: c.textTertiary }]}>
              No wishlist yet. Tap edit to let shoppers know what you're after.
            </Text>
          )}
        </View>
        <Pressable
          style={({ pressed }) => [styles.wishlistEditBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={startEdit}
          hitSlop={8}
          accessibilityLabel="Edit wishlist"
        >
          <Feather name="edit-2" size={14} color={c.accent} />
          <Text style={styles.wishlistEditBtnText}>Edit</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wishlistCard}>
      <Ionicons name="heart-outline" size={16} color={c.accent} style={{ marginTop: 4 }} />
      <View style={{ flex: 1, gap: 10 }}>
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder="What are you looking for? (cards, sealed product, trades...)"
          placeholderTextColor={c.textTertiary}
          style={styles.wishlistInput}
          multiline
          autoFocus
          textAlignVertical="top"
        />
        <View style={styles.wishlistEditorRow}>
          <Pressable
            style={({ pressed }) => [styles.wishlistCancelBtn, { opacity: pressed ? 0.7 : 1 }]}
            onPress={cancelEdit}
            disabled={saving}
          >
            <Text style={styles.wishlistCancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.wishlistSaveBtn, { opacity: pressed || saving ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.wishlistSaveText}>{saving ? 'Saving…' : 'Save'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function ItemDetailModal({
  item,
  profile,
  visible,
  onClose,
}: {
  item: VendorItem | null;
  profile: VendorProfile | null;
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [zoomImageUri, setZoomImageUri] = useState<string | null>(null);

  React.useEffect(() => {
    if (visible) {
      setActivePhotoIndex(0);
      setZoomImageUri(null);
    }
  }, [visible, item?.id]);

  if (!item || !profile) return null;

  const photos = item.photos?.length
    ? item.photos
    : item.cardProfile?.imageUrl
      ? [item.cardProfile.imageUrl]
      : item.frontMediaUrl
        ? [item.frontMediaUrl]
        : [];

  const name = item.cardProfile?.name || item.productName || 'Unknown';
  const setName = item.cardProfile?.set || '';
  const setCode = item.cardProfile?.setCode || '';
  const cardNumber = item.cardProfile?.cardNumber || '';
  const isGraded = item.type === 'SINGLE_CARD_GRADED';
  const isSealed = item.type === 'SEALED_PRODUCT';

  const listingPrice = item.listingPrice ? Number(item.listingPrice) : null;
  const marketPrice = item.marketPrice ? Number(item.marketPrice) : null;
  const priceDelta = listingPrice && marketPrice ? listingPrice - marketPrice : null;
  const priceDeltaPct = priceDelta !== null && marketPrice ? (priceDelta / marketPrice) * 100 : null;

  const handleInquireEmail = () => {
    if (!profile.email) return;
    const subject = encodeURIComponent(`Inquiry about ${name} on SlabHub`);
    const body = encodeURIComponent(`Hi ${profile.shopName},\n\nI'm interested in your ${name}${listingPrice ? ` listed at $${listingPrice}` : ''}.\n\nBest regards`);
    Linking.openURL(`mailto:${profile.email}?subject=${subject}&body=${body}`);
    trackShopEvent({ type: 'INQUIRY_COMPLETE', handle: profile.handle, itemId: item.id, channel: 'email' });
  };

  const handleInquireFacebook = () => {
    if (!profile.facebookProfileUrl) return;
    Linking.openURL(profile.facebookProfileUrl);
    trackShopEvent({ type: 'INQUIRY_COMPLETE', handle: profile.handle, itemId: item.id, channel: 'facebook' });
  };

  const handleShareItem = async () => {
    const url = `https://slabhub.gg/vendor/${profile.handle}?item=${item.id}`;
    if (Platform.OS === 'web') {
      try { await navigator.clipboard.writeText(url); } catch {}
    } else {
      await Share.share({ url, message: `${name}${listingPrice ? ` — $${listingPrice}` : ''}\n${url}` });
    }
  };

  const hasContact = !!(profile.facebookProfileUrl || profile.email);
  const primaryContact: 'facebook' | 'email' | null = profile.facebookProfileUrl
    ? 'facebook'
    : profile.email
      ? 'email'
      : null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <View style={styles.modalDragHandle} />
          <View style={styles.modalHeaderActions}>
            <Pressable
              style={({ pressed }) => [styles.modalIconBtn, { opacity: pressed ? 0.7 : 1 }]}
              onPress={handleShareItem}
              accessibilityLabel="Share item"
            >
              <Ionicons name="share-outline" size={20} color={c.text} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.modalIconBtn, { opacity: pressed ? 0.7 : 1 }]}
              onPress={onClose}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={22} color={c.text} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={styles.modalScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 + (hasContact ? 96 : 0) + insets.bottom }}
        >
          <View style={styles.photoGallery}>
            {photos.length > 0 ? (
              <>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                    setActivePhotoIndex(idx);
                  }}
                >
                  {photos.map((uri, i) => (
                    <Pressable
                      key={i}
                      style={styles.photoSlide}
                      onPress={() => setZoomImageUri(getOptimizedImageUrl(uri, { quality: 90 }))}
                    >
                      <ExpoImage
                        source={{ uri: getOptimizedImageUrl(uri, { height: 320 }) }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                        blurRadius={15}
                      />
                      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                      <ExpoImage
                        source={{ uri: getOptimizedImageUrl(uri, { height: 800 }) }}
                        style={styles.photoImage}
                        contentFit="contain"
                        priority={i === 0 ? 'high' : 'normal'}
                      />
                    </Pressable>
                  ))}
                </ScrollView>
                {photos.length > 1 && (
                  <>
                    <View style={styles.photoCounter}>
                      <Text style={styles.photoCounterText}>
                        {activePhotoIndex + 1} / {photos.length}
                      </Text>
                    </View>
                    <View style={styles.photoDots}>
                      {photos.map((_, i) => (
                        <View
                          key={i}
                          style={[styles.photoDot, activePhotoIndex === i && styles.photoDotActive]}
                        />
                      ))}
                    </View>
                  </>
                )}
                <View style={styles.photoZoomHint} pointerEvents="none">
                  <Ionicons name="expand-outline" size={14} color="#fff" />
                </View>
              </>
            ) : (
              <View style={styles.photoEmpty}>
                <Ionicons name="image-outline" size={48} color={c.textTertiary} />
              </View>
            )}
          </View>

          <View style={styles.modalContent}>
            <View style={styles.titleBlock}>
              {(setName || setCode || cardNumber) && (
                <Text style={styles.itemSet} numberOfLines={1}>
                  {[setName, setCode, cardNumber].filter(Boolean).join(' · ')}
                </Text>
              )}
              <Text style={styles.itemName}>{name}</Text>
              <View style={styles.modalBadgesRow}>
                {isGraded && item.grade && (
                  <View style={[styles.modalBadge, { backgroundColor: '#DC2626' }]}>
                    <Ionicons name="ribbon" size={11} color="#fff" />
                    <Text style={styles.modalBadgeText}>
                      {item.gradeProvider || item.gradingCompany || ''} {item.gradeValue || item.grade}
                    </Text>
                  </View>
                )}
                {isSealed && (
                  <View style={[styles.modalBadge, { backgroundColor: '#7C3AED' }]}>
                    <Ionicons name="cube" size={11} color="#fff" />
                    <Text style={styles.modalBadgeText}>SEALED</Text>
                  </View>
                )}
                {!isGraded && !isSealed && item.condition && (
                  <View style={[styles.modalBadge, styles.modalBadgeNeutral]}>
                    <Text style={[styles.modalBadgeText, { color: c.textSecondary }]}>
                      {item.condition}
                    </Text>
                  </View>
                )}
                <View style={[styles.modalBadge, styles.modalBadgeNeutral]}>
                  <Ionicons name="cube-outline" size={11} color={c.textSecondary} />
                  <Text style={[styles.modalBadgeText, { color: c.textSecondary }]}>
                    {item.quantity > 1 ? `${item.quantity} in stock` : '1 in stock'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.priceCard}>
              <View style={styles.priceTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.priceLabel}>Asking Price</Text>
                  <Text style={styles.priceValue}>
                    {listingPrice ? `$${listingPrice.toLocaleString('en-US')}` : 'On inquiry'}
                  </Text>
                </View>
                {marketPrice ? (
                  <View style={styles.priceMarketBlock}>
                    <Text style={styles.priceMarketLabel}>Market</Text>
                    <Text style={styles.priceMarketValue}>
                      ${marketPrice.toLocaleString('en-US')}
                    </Text>
                  </View>
                ) : null}
              </View>
              {priceDelta !== null && priceDeltaPct !== null ? (
                <View style={styles.priceDeltaRow}>
                  <Ionicons
                    name={priceDelta < 0 ? 'trending-down' : priceDelta > 0 ? 'trending-up' : 'remove'}
                    size={14}
                    color={priceDelta < 0 ? c.success : priceDelta > 0 ? c.warning : c.textTertiary}
                  />
                  <Text
                    style={[
                      styles.priceDeltaText,
                      { color: priceDelta < 0 ? c.success : priceDelta > 0 ? c.warning : c.textTertiary },
                    ]}
                  >
                    {priceDelta < 0 ? 'Below' : priceDelta > 0 ? 'Above' : 'Matches'} market
                    {priceDelta !== 0 ? ` by $${Math.abs(priceDelta).toLocaleString('en-US')} (${Math.abs(priceDeltaPct).toFixed(0)}%)` : ''}
                  </Text>
                </View>
              ) : null}
            </View>

            {item.sellingDescription ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Description</Text>
                <Text style={styles.sectionBody}>{item.sellingDescription}</Text>
              </View>
            ) : null}

            <View style={styles.detailsCard}>
              {setName ? <DetailRow label="Set" value={setName} /> : null}
              {cardNumber ? <DetailRow label="Number" value={`${setCode ? setCode + ' ' : ''}${cardNumber}`} /> : null}
              {item.cardProfile?.rarity ? <DetailRow label="Rarity" value={item.cardProfile.rarity} /> : null}
              {!isGraded && !isSealed && item.condition ? <DetailRow label="Condition" value={item.condition} /> : null}
              {isGraded && item.gradingCompany ? <DetailRow label="Grading Company" value={item.gradingCompany} /> : null}
              {isGraded && item.grade ? <DetailRow label="Grade" value={String(item.gradeValue || item.grade)} /> : null}
              {isGraded && item.certNumber ? <DetailRow label="Cert #" value={item.certNumber} /> : null}
              {isSealed && item.productType ? <DetailRow label="Product Type" value={item.productType} /> : null}
              <DetailRow label="Quantity" value={`${item.quantity}`} />
            </View>

            <Pressable
              style={({ pressed }) => [styles.sellerCard, { opacity: pressed ? 0.85 : 1 }]}
              onPress={onClose}
              accessibilityLabel="Back to shop"
            >
              <View style={styles.sellerAvatar}>
                {profile.avatarUrl ? (
                  <Image source={{ uri: profile.avatarUrl }} style={styles.sellerAvatarImage} />
                ) : (
                  <Text style={styles.sellerAvatarText}>
                    {(profile.shopName || 'V')[0].toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.sellerInfo}>
                <View style={styles.sellerNameRow}>
                  <Text style={styles.sellerName} numberOfLines={1}>{profile.shopName}</Text>
                  {profile.facebookVerifiedAt && (
                    <Ionicons name="checkmark-circle" size={14} color={c.info} />
                  )}
                </View>
                <Text style={styles.sellerHandle} numberOfLines={1}>
                  @{profile.handle}{profile.location ? ` · ${profile.location}` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={c.textTertiary} />
            </Pressable>
          </View>
        </ScrollView>

        {hasContact && (
          <View style={[styles.ctaBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={styles.ctaPriceBlock}>
              <Text style={styles.ctaPriceLabel}>Price</Text>
              <Text style={styles.ctaPriceValue}>
                {listingPrice ? `$${listingPrice.toLocaleString('en-US')}` : 'On inquiry'}
              </Text>
            </View>
            <View style={styles.ctaButtons}>
              {profile.facebookProfileUrl && profile.email ? (
                <>
                  <Pressable
                    style={({ pressed }) => [styles.ctaSecondaryBtn, { opacity: pressed ? 0.8 : 1 }]}
                    onPress={handleInquireEmail}
                    accessibilityLabel="Email seller"
                  >
                    <Ionicons name="mail-outline" size={18} color={c.text} />
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.ctaPrimaryBtn, { opacity: pressed ? 0.8 : 1 }]}
                    onPress={handleInquireFacebook}
                  >
                    <Ionicons name="logo-facebook" size={18} color="#fff" />
                    <Text style={styles.ctaPrimaryText}>Message</Text>
                  </Pressable>
                </>
              ) : primaryContact === 'facebook' ? (
                <Pressable
                  style={({ pressed }) => [styles.ctaPrimaryBtn, styles.ctaPrimaryBtnFull, { opacity: pressed ? 0.8 : 1 }]}
                  onPress={handleInquireFacebook}
                >
                  <Ionicons name="logo-facebook" size={18} color="#fff" />
                  <Text style={styles.ctaPrimaryText}>Message on Facebook</Text>
                </Pressable>
              ) : primaryContact === 'email' ? (
                <Pressable
                  style={({ pressed }) => [styles.ctaPrimaryBtn, styles.ctaPrimaryBtnFull, styles.ctaPrimaryBtnEmail, { opacity: pressed ? 0.8 : 1 }]}
                  onPress={handleInquireEmail}
                >
                  <Ionicons name="mail-outline" size={18} color={c.accentText} />
                  <Text style={[styles.ctaPrimaryText, { color: c.accentText }]}>Email Seller</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        )}
      </View>
      <ImageZoomModal
        isVisible={!!zoomImageUri}
        onClose={() => setZoomImageUri(null)}
        imageUri={zoomImageUri}
      />
    </Modal>
  );
}

export default function VendorRoute() {
  const { handle, item } = useLocalSearchParams<{ handle: string; item?: string }>();
  if (!handle) return null;
  return <VendorShopView handle={handle} initialItemId={item} />;
}

export function VendorShopView({
  handle,
  initialItemId,
  hideBackButton = false,
}: {
  handle: string;
  initialItemId?: string;
  hideBackButton?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const itemParam = initialItemId;
  const { profile: myProfile, updateProfile } = useApp();
  const queryClient = useQueryClient();
  const isOwner = !!myProfile?.handle && myProfile.handle === handle;
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<VendorItem | null>(null);
  const autoOpenedRef = React.useRef<string | null>(null);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['vendor-page', handle],
    queryFn: () => getVendorPage(handle!),
    enabled: !!handle,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    if (!handle) return;
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [handle, refetch]);

  useFocusEffect(
    useCallback(() => {
      if (handle) {
        queryClient.invalidateQueries({ queryKey: ['vendor-page', handle] });
      }
    }, [handle, queryClient])
  );

  React.useEffect(() => {
    if (handle) {
      trackShopEvent({ type: 'VIEW_SHOP', handle });
    }
  }, [handle]);

  const profile = data?.profile;
  const items = data?.items || [];
  const listedStatuses = data?.listedStatuses || [];

  React.useEffect(() => {
    if (!itemParam || !handle || autoOpenedRef.current === itemParam) return;
    const match = items.find((i) => i.id === itemParam);
    if (match) {
      autoOpenedRef.current = itemParam;
      setSelectedItem(match);
      trackShopEvent({ type: 'VIEW_ITEM', handle, itemId: match.id });
    }
  }, [itemParam, items, handle]);

  const statusCountMap = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach(i => {
      if (i.statusId) map.set(i.statusId, (map.get(i.statusId) || 0) + 1);
    });
    return map;
  }, [items]);

  const tabs = useMemo(() => {
    type Tab = { id: string; label: string; color?: string | null; count: number; icon?: 'heart-outline' };
    const result: Tab[] = [{ id: 'all', label: 'All', count: items.length }];
    listedStatuses.forEach(s =>
      result.push({ id: s.id, label: s.name, color: s.color, count: statusCountMap.get(s.id) || 0 })
    );
    if (profile?.wishlistText || isOwner) result.push({ id: 'wishlist', label: 'Wishlist', count: 0, icon: 'heart-outline' });
    return result;
  }, [listedStatuses, profile?.wishlistText, items.length, statusCountMap, isOwner]);

  const filteredItems = useMemo(() => {
    if (activeTab === 'all' || activeTab === 'wishlist') return items;
    return items.filter(i => i.statusId === activeTab);
  }, [items, activeTab]);

  const handleShare = useCallback(async () => {
    if (!handle) return;
    const url = `https://slabhub.gg/vendor/${handle}`;
    if (Platform.OS === 'web') {
      try { await navigator.clipboard.writeText(url); } catch {}
    } else {
      await Share.share({ url, message: `Check out this shop on SlabHub: ${url}` });
    }
  }, [handle]);

  const handleItemPress = useCallback((item: VendorItem) => {
    setSelectedItem(item);
    trackShopEvent({ type: 'VIEW_ITEM', handle: handle!, itemId: item.id });
  }, [handle]);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopInset, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopInset, justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="storefront-outline" size={48} color={c.textTertiary} />
        <Text style={{ color: c.textSecondary, fontSize: 16, marginTop: 12 }}>Shop not found</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: c.accent, fontSize: 15, fontWeight: '600' }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const renderItem = ({ item }: { item: VendorItem }) => {
    const imageUrl = (item.photos && item.photos.length > 0) ? item.photos[0] : item.cardProfile?.imageUrl || item.frontMediaUrl;
    const name = item.cardProfile?.name || item.productName || 'Unknown';
    const set = item.cardProfile?.set || '';
    const isGraded = item.type === 'SINGLE_CARD_GRADED';
    const isSealed = item.type === 'SEALED_PRODUCT';

    return (
      <Pressable
        style={({ pressed }) => [styles.gridItem, { opacity: pressed ? 0.8 : 1 }]}
        onPress={() => handleItemPress(item)}
      >
        <View style={styles.gridItemImage}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <Ionicons name="image-outline" size={24} color={c.textTertiary} />
          )}
          {isGraded && (
            <View style={styles.gridTypeBadge}>
              <Text style={styles.gridTypeBadgeText}>GRADED</Text>
            </View>
          )}
          {isSealed && (
            <View style={[styles.gridTypeBadge, { backgroundColor: '#7C3AED' }]}>
              <Text style={styles.gridTypeBadgeText}>SEALED</Text>
            </View>
          )}
          {isGraded && item.grade && (
            <View style={styles.gridGradeBadge}>
              <Text style={styles.gridGradeBadgeText}>
                {item.gradeProvider || item.gradingCompany || ''} {item.gradeValue || item.grade}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.gridItemInfo}>
          <Text style={styles.gridItemName} numberOfLines={2}>{name}</Text>
          {set ? <Text style={styles.gridItemSet} numberOfLines={1}>{set}</Text> : null}
          <View style={styles.gridItemPriceRow}>
            <Text style={styles.gridItemPrice}>
              {item.listingPrice ? `$${Number(item.listingPrice).toLocaleString('en-US')}` : '—'}
            </Text>
            {item.quantity > 1 && <Text style={styles.gridItemQty}>x{item.quantity}</Text>}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      {hideBackButton ? (
        <View style={styles.tabHeader}>
          <View>
            <Text style={styles.tabBrand}>SlabHub</Text>
            <Text style={styles.tabTitle}>Shop</Text>
          </View>
          <View style={styles.navActions}>
            {isOwner && (
              <Pressable
                style={({ pressed }) => [styles.navBtn, { opacity: pressed ? 0.7 : 1 }]}
                onPress={() => router.push('/shop-settings' as any)}
                accessibilityLabel="Shop settings"
              >
                <Ionicons name="settings-outline" size={20} color={c.accent} />
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [styles.navBtn, { opacity: pressed ? 0.7 : 1 }]}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={20} color={c.accent} />
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.navBar}>
          <Pressable
            style={({ pressed }) => [styles.navBtn, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color={c.text} />
          </Pressable>
          <View style={styles.navTitleBlock}>
            <Text style={styles.navBrand}>SlabHub</Text>
            <Text style={styles.navSubtitle}>Shop</Text>
          </View>
          <View style={styles.navActions}>
            {isOwner && (
              <Pressable
                style={({ pressed }) => [styles.navBtn, { opacity: pressed ? 0.7 : 1 }]}
                onPress={() => router.push('/shop-settings' as any)}
                accessibilityLabel="Shop settings"
              >
                <Ionicons name="settings-outline" size={20} color={c.accent} />
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [styles.navBtn, { opacity: pressed ? 0.7 : 1 }]}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={20} color={c.accent} />
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.stickyHeader}>
        <VendorHeader profile={profile} />
      </View>

      {tabs.length > 1 && (
        <View style={styles.stickyTabs}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContainer}
          >
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              const isWishlist = tab.id === 'wishlist';
              return (
                <Pressable
                  key={tab.id}
                  style={[
                    styles.stageTab,
                    isActive && styles.stageTabActive,
                    isActive && tab.color ? { borderColor: tab.color } : null,
                  ]}
                  onPress={() => setActiveTab(tab.id)}
                >
                  {tab.icon ? (
                    <Ionicons
                      name={tab.icon}
                      size={12}
                      color={isActive ? c.accent : c.textSecondary}
                    />
                  ) : tab.color ? (
                    <View style={[styles.stageDot, { backgroundColor: tab.color }]} />
                  ) : null}
                  <Text style={[styles.stageTabText, isActive && styles.stageTabTextActive]}>
                    {tab.label}
                  </Text>
                  {!isWishlist && (
                    <View style={[styles.stageBadge, isActive && styles.stageBadgeActive]}>
                      <Text style={[styles.stageBadgeText, isActive && styles.stageBadgeTextActive]}>
                        {tab.count}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={activeTab === 'wishlist' ? [] : filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={c.accent}
            colors={[c.accent]}
          />
        }
        ListHeaderComponent={
          activeTab === 'wishlist' ? (
            isOwner ? (
              <WishlistEditor
                initialValue={profile.wishlistText || ''}
                onSave={async (text) => {
                  await updateProfile({ wishlist: text });
                  queryClient.setQueryData(['vendor-page', handle], (prev: any) =>
                    prev ? { ...prev, profile: { ...prev.profile, wishlistText: text } } : prev,
                  );
                }}
              />
            ) : profile.wishlistText ? (
              <View style={styles.wishlistCard}>
                <Ionicons name="heart-outline" size={16} color={c.accent} />
                <Text style={styles.wishlistText}>{profile.wishlistText}</Text>
              </View>
            ) : null
          ) : null
        }
        ListEmptyComponent={
          activeTab !== 'wishlist' ? (
            <View style={styles.emptyList}>
              <Ionicons name="cube-outline" size={36} color={c.textTertiary} />
              <Text style={styles.emptyListText}>No items listed</Text>
            </View>
          ) : null
        }
      />

      <ItemDetailModal
        item={selectedItem}
        profile={profile}
        visible={!!selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  tabBrand: {
    fontSize: 13,
    color: c.accent,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  tabTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: c.text,
    marginTop: 2,
  },
  navTitleBlock: {
    flex: 1,
    alignItems: 'center',
  },
  navBrand: {
    fontSize: 11,
    color: c.accent,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  navSubtitle: {
    fontSize: 15,
    fontWeight: '700',
    color: c.text,
    marginTop: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  // Vendor Header
  vendorHeader: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: c.borderLight,
    gap: 12,
    marginBottom: 4,
  },
  vendorHeaderTop: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  vendorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: c.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: c.accent,
  },
  vendorAvatarImage: {
    width: '100%',
    height: '100%',
  },
  vendorAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: c.accent,
  },
  vendorInfo: {
    flex: 1,
    gap: 2,
  },
  vendorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vendorName: {
    fontSize: 20,
    fontWeight: '700',
    color: c.text,
  },
  vendorHandle: {
    fontSize: 14,
    color: c.textSecondary,
  },
  vendorLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  vendorLocationText: {
    fontSize: 12,
    color: c.textTertiary,
  },
  vendorBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  vendorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: c.surfaceHighlight,
    borderWidth: 1,
    borderColor: c.border,
  },
  vendorBadgeText: {
    fontSize: 11,
    color: c.info,
    fontWeight: '500',
  },
  eventsSection: {
    gap: 6,
  },
  eventsSectionLabel: {
    fontSize: 11,
    color: c.textTertiary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventText: {
    fontSize: 13,
    color: c.text,
    flex: 1,
  },
  eventDate: {
    fontSize: 12,
    color: c.textTertiary,
  },
  stickyHeader: {
    backgroundColor: c.background,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  // Tabs
  stickyTabs: {
    backgroundColor: c.background,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  stageTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderLight,
    gap: 6,
  },
  stageTabActive: {
    backgroundColor: c.surfaceHighlight,
    borderColor: c.accent,
  },
  stageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stageTabText: {
    fontSize: 13,
    color: c.textSecondary,
    fontWeight: '500',
  },
  stageTabTextActive: {
    color: c.text,
  },
  stageBadge: {
    backgroundColor: c.surfaceHighlight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  stageBadgeActive: {
    backgroundColor: c.accent + '30',
  },
  stageBadgeText: {
    fontSize: 11,
    color: c.textTertiary,
    fontWeight: '600',
  },
  stageBadgeTextActive: {
    color: c.accent,
  },
  // Grid
  gridRow: {
    gap: 12,
  },
  gridItem: {
    flex: 1,
    maxWidth: '48.5%',
    backgroundColor: c.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: c.borderLight,
    marginBottom: 12,
  },
  gridItemImage: {
    width: '100%',
    aspectRatio: 0.85,
    backgroundColor: c.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gridTypeBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gridTypeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  gridGradeBadge: {
    position: 'absolute',
    top: 24,
    right: 6,
    backgroundColor: '#DC2626',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gridGradeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  gridItemInfo: {
    padding: 10,
    gap: 2,
  },
  gridItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: c.text,
    lineHeight: 17,
  },
  gridItemSet: {
    fontSize: 11,
    color: c.textTertiary,
  },
  gridItemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  gridItemPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: c.text,
  },
  gridItemQty: {
    fontSize: 12,
    color: c.textSecondary,
    fontWeight: '500',
  },
  // Wishlist
  wishlistCard: {
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: c.borderLight,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  wishlistText: {
    flex: 1,
    fontSize: 14,
    color: c.textSecondary,
    lineHeight: 20,
  },
  wishlistInput: {
    fontSize: 14,
    color: c.text,
    lineHeight: 20,
    minHeight: 60,
    padding: 0,
  },
  wishlistEditorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  wishlistSaveBtn: {
    backgroundColor: c.accent,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  wishlistSaveText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  wishlistCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.borderLight,
  },
  wishlistCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textSecondary,
  },
  wishlistEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.borderLight,
    backgroundColor: c.surfaceHighlight,
  },
  wishlistEditBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.accent,
  },
  // Empty
  emptyList: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyListText: {
    fontSize: 14,
    color: c.textTertiary,
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: c.background,
  },
  modalHeader: {
    paddingTop: 8,
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  modalDragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.border,
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.borderLight,
  },
  modalScroll: {
    flex: 1,
  },
  photoGallery: {
    width: '100%',
    height: 380,
    backgroundColor: c.surfaceHighlight,
    position: 'relative',
  },
  photoSlide: {
    width: SCREEN_WIDTH,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoDots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  photoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: c.border,
  },
  photoDotActive: {
    backgroundColor: c.accent,
    width: 18,
  },
  photoCounter: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  photoCounterText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  photoZoomHint: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    padding: 20,
    gap: 16,
  },
  titleBlock: {
    gap: 6,
  },
  itemSet: {
    fontSize: 12,
    color: c.textTertiary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemName: {
    fontSize: 22,
    fontWeight: '700',
    color: c.text,
    lineHeight: 28,
  },
  modalBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  modalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modalBadgeNeutral: {
    backgroundColor: c.surfaceHighlight,
    borderWidth: 1,
    borderColor: c.borderLight,
  },
  modalBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  priceCard: {
    backgroundColor: c.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: c.borderLight,
    gap: 8,
  },
  priceTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
  },
  priceLabel: {
    fontSize: 12,
    color: c.textTertiary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 28,
    fontWeight: '700',
    color: c.text,
    lineHeight: 32,
  },
  priceMarketBlock: {
    alignItems: 'flex-end',
  },
  priceMarketLabel: {
    fontSize: 11,
    color: c.textTertiary,
    fontWeight: '500',
  },
  priceMarketValue: {
    fontSize: 14,
    color: c.textSecondary,
    fontWeight: '600',
  },
  priceDeltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: c.borderLight,
  },
  priceDeltaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    color: c.textTertiary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionBody: {
    fontSize: 14,
    color: c.textSecondary,
    lineHeight: 20,
  },
  detailsCard: {
    backgroundColor: c.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: c.borderLight,
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  detailLabel: {
    fontSize: 13,
    color: c.textSecondary,
  },
  detailValue: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    color: c.text,
    textAlign: 'right',
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: 14,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: c.borderLight,
  },
  sellerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sellerAvatarImage: {
    width: '100%',
    height: '100%',
  },
  sellerAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: c.accent,
  },
  sellerInfo: {
    flex: 1,
    gap: 2,
  },
  sellerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sellerName: {
    fontSize: 14,
    fontWeight: '600',
    color: c.text,
    flexShrink: 1,
  },
  sellerHandle: {
    fontSize: 12,
    color: c.textSecondary,
  },
  ctaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: c.surface,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  ctaPriceBlock: {
    flex: 1,
  },
  ctaPriceLabel: {
    fontSize: 11,
    color: c.textTertiary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ctaPriceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: c.text,
  },
  ctaButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  ctaSecondaryBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: c.surfaceHighlight,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1877F2',
  },
  ctaPrimaryBtnFull: {
    flex: 1,
  },
  ctaPrimaryBtnEmail: {
    backgroundColor: c.accent,
  },
  ctaPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
